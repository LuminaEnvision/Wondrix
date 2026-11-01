"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  clearExtraChat,
  loadExtraChat,
  loadProfile,
  recordSafetyRedirect,
  saveExtraChat,
  saveExtraTopic,
} from "@/lib/demo-store";
import { useHydrated } from "@/lib/use-client-state";
import { localExtraReply } from "@/lib/extra-reply";
import { safetyCheck } from "@/lib/safety";
import {
  canListen,
  canSpeak,
  startDictation,
  type DictationHandle,
  speak,
  stopSpeaking,
  warmUpVoice,
} from "@/lib/voice";
import { DictationPanel } from "@/components/DictationPanel";
import { ExtraVisual } from "@/components/ExtraVisual";
import { SpeakButton } from "@/components/SpeakButton";
import { VoiceLoadingBubble } from "@/components/VoiceLoadingBubble";
import type { Visual } from "@/lib/visual";

type Msg = {
  id: number;
  role: "child" | "agent";
  text: string;
  visual?: Visual | null;
  /** The agent is drawing a diagram for this answer. */
  drawing?: boolean;
};

const INTERESTS = [
  {
    id: "physics",
    label: "Physics",
    seed: "Why is the Earth moving?",
    art: "/art/topic-physics.jpg",
  },
  {
    id: "robots",
    label: "Robots",
    seed: "How does a robot know where to go?",
    art: "/art/topic-robots.jpg",
  },
  {
    id: "sky",
    label: "Astronomy",
    seed: "Why does the Moon change shape?",
    art: "/art/topic-astronomy.jpg",
  },
  {
    id: "life",
    label: "Living things",
    seed: "How do plants drink water?",
    art: "/art/topic-living.jpg",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    seed: "What is a molecule?",
    art: "/art/topic-physics.jpg",
  },
] as const;

type Interest = (typeof INTERESTS)[number];

const OPENING =
  "If you're not sure where to start… why is the sky blue in the day, but black at night?";

function ExtraInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topic");
  const topic = useMemo(
    () => INTERESTS.find((item) => item.id === topicId) ?? null,
    [topicId],
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const listenRef = useRef<DictationHandle | null>(null);
  // Dictation panel state (live words, mic meter, timer, "take your time" hint)
  const [dictText, setDictText] = useState("");
  const [levels, setLevels] = useState<number[]>(() => Array(18).fill(0));
  const [seconds, setSeconds] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const lastSoundAt = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didGreet = useRef(false);
  const messagesRef = useRef<Msg[]>([]);

  // Restore this visit's conversation after a reload (sessionStorage), so the
  // agent keeps its short-term context. Render-time adjustment, not an effect.
  const hydrated = useHydrated();
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    setRestored(true);
    const saved = loadExtraChat();
    if (saved.length) setMessages(saved.map((m) => ({ ...m, visual: (m.visual as Visual | null) ?? null })));
  }

  useEffect(() => {
    if (restored) saveExtraChat(messages);
  }, [messages, restored]);

  const micOk = canListen();
  const speakOk = canSpeak();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Start downloading the natural (Kokoro) voice in the background.
    warmUpVoice();
    return () => {
      stopSpeaking();
      listenRef.current?.cancel();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (voiceOn && speakOk) speak(OPENING, { id: "opening" });
  }, [voiceOn, speakOk]);

  // When the ?topic= changes, prefill its starter question (React's
  // "adjust state when a prop changes" pattern, instead of an effect).
  const [seededTopicId, setSeededTopicId] = useState<string | null>(null);
  if (topic && topic.id !== seededTopicId) {
    setSeededTopicId(topic.id);
    setInput(topic.seed);
  }

  function say(text: string, id?: string) {
    if (voiceOn && speakOk) speak(text, { id });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stopSpeaking();
    setBusy(true);
    setInput("");

    const history = messagesRef.current;
    // Ids continue after restored messages (keys + per-message voice state).
    const baseId = history.reduce((max, m) => Math.max(max, m.id), 0);
    const childMsg: Msg = { id: baseId + 1, role: "child", text: trimmed };
    setMessages((m) => [...m, childMsg]);

    let reply = localExtraReply(trimmed, topic?.id ?? null, history.length > 0);
    let topicLabel = topic?.label ?? trimmed.slice(0, 40);
    let drawFor: string | null = null;
    let redirected = safetyCheck(trimmed).ok === false;

    try {
      const res = await fetch("/api/extra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          topicId: topic?.id ?? null,
          history,
          profile: loadProfile(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          answer?: string;
          topic?: string;
          draw?: boolean;
          visual?: Visual | null;
          source?: string;
        };
        if (data.source === "safety") redirected = true;
        if (data.text) {
          // Local replies may carry a ready-made visual; live ones draw in a second step.
          reply = { text: data.text, visual: data.visual ?? undefined };
          if (data.draw) drawFor = data.answer || data.text;
        }
        if (data.topic) topicLabel = data.topic;
      }
    } catch {
      // keep local reply
    }

    const agentMsg: Msg = {
      id: baseId + 2,
      role: "agent",
      text: reply.text,
      visual: reply.visual ?? null,
      drawing: Boolean(drawFor),
    };
    setMessages((m) => [...m, agentMsg]);
    // A redirected question is not an "explored topic": only count it for the parent.
    if (redirected) recordSafetyRedirect();
    else saveExtraTopic(topicLabel);
    say(reply.text, `msg-${agentMsg.id}`);
    setBusy(false);

    if (drawFor) void drawVisual(agentMsg.id, trimmed, drawFor);
  }

  /** Second step: ask the agent to draw the answer, then attach it to that message. */
  async function drawVisual(msgId: number, question: string, answer: string) {
    let visual: Visual | null = null;
    try {
      const res = await fetch("/api/extra/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, profile: loadProfile() }),
      });
      if (res.ok) visual = ((await res.json()) as { visual?: Visual | null }).visual ?? null;
    } catch {
      // no drawing this time; the text answer is already shown
    }
    setMessages((m) => m.map((msg) => (msg.id === msgId ? { ...msg, visual, drawing: false } : msg)));
  }

  function pickSuggestion(item: Interest) {
    router.replace(`/extra?topic=${item.id}`);
    setInput(item.seed);
    saveExtraTopic(item.label);
    say(`How about this: ${item.seed}`);
  }

  function stopDictationUi() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    listenRef.current = null;
    setListening(false);
  }

  /** One tap starts listening; the child taps Done (or Cancel) when finished. */
  function startMic() {
    if (listening || busy) return;
    if (!micOk) {
      setVoiceHint("Voice input needs Chrome or Edge with mic permission. You can still type below.");
      return;
    }
    stopSpeaking();
    setVoiceHint("");
    setDictText("");
    setLevels(Array(18).fill(0));
    setSeconds(0);
    setQuiet(false);
    lastSoundAt.current = Date.now();

    const handle = startDictation({
      onText: (t) => {
        lastSoundAt.current = Date.now();
        setDictText(t);
      },
      onLevel: (level) => {
        if (level > 0.08) lastSoundAt.current = Date.now();
        setLevels((prev) => [...prev.slice(1), level]);
      },
      onDone: (t) => {
        stopDictationUi();
        const question = t.trim();
        if (!question) {
          setVoiceHint("I didn't catch that. Tap Mic to try again, or type your question.");
          return;
        }
        setInput(question);
        void send(question);
      },
      onError: (message) => {
        stopDictationUi();
        setVoiceHint(message);
      },
    });
    if (!handle) return;
    listenRef.current = handle;
    setListening(true);
    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
      setQuiet(Date.now() - lastSoundAt.current > 8000);
    }, 500);
  }

  function finishMic() {
    listenRef.current?.finish();
  }

  function cancelMic() {
    listenRef.current?.cancel();
    stopDictationUi();
    setDictText("");
  }

  return (
    <AppShell backHref="/">
      <VoiceLoadingBubble enabled={voiceOn} />
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-end gap-3 sm:gap-5">
          <div className="relative min-w-0 flex-1 rounded-3xl border border-stroke bg-card px-5 py-5 sm:px-6 sm:py-6">
            <span
              className="absolute -right-2 bottom-10 hidden h-4 w-4 rotate-45 border-r border-t border-stroke bg-card sm:block"
              aria-hidden
            />
            <p className="text-sm font-bold uppercase tracking-wide text-extra">Extra</p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-ink">
              {topic ? topic.label : "Let's wonder"}
            </h1>
            <p className="mt-2 text-ink-soft">{OPENING}</p>
            <div className="mt-2">
              <SpeakButton id="opening" text={OPENING} tone="extra" label="Listen to the starter question" />
            </div>
          </div>
          <div className="relative h-28 w-24 shrink-0 sm:h-40 sm:w-36">
            <Image
              src="/art/mascot-hero.png"
              alt="Wondrix"
              fill
              className="object-contain object-bottom"
              sizes="144px"
              priority
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next) stopSpeaking();
            }}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              voiceOn
                ? "border-brand/30 bg-brand text-white"
                : "border-stroke bg-card text-ink-soft"
            }`}
          >
            {voiceOn ? "Voice answers on" : "Voice answers off"}
          </button>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setMessages([]);
                clearExtraChat();
              }}
              className="rounded-full border border-stroke bg-card px-4 py-2 text-sm font-bold text-ink-soft"
              title="Start a fresh conversation"
            >
              New chat
            </button>
          ) : null}
        </div>

        <div className="flex min-h-[260px] flex-1 flex-col gap-3 rounded-3xl border border-stroke bg-card p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center gap-2 text-ink-soft">
              <p>Wondrix is ready. Ask anything with the mic, or type below.</p>
              <p className="text-sm">Or tap a topic idea under the chat if you want a starter.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "child"
                    ? "ml-auto bg-extra text-white"
                    : "bg-bg-deep text-ink"
                }`}
              >
                <p>{msg.text}</p>
                {msg.role === "agent" && msg.visual ? <ExtraVisual visual={msg.visual} /> : null}
                {msg.role === "agent" && msg.drawing ? (
                  <p className="flex items-center gap-2 text-xs font-semibold text-extra" role="status">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-extra" aria-hidden />
                    Wondrix is drawing it for you…
                  </p>
                ) : null}
                {msg.role === "agent" ? <SpeakButton id={`msg-${msg.id}`} text={msg.text} /> : null}
              </div>
            ))
          )}
          {busy ? <p className="text-sm text-ink-soft">Wondrix is thinking…</p> : null}
        </div>

        {voiceHint ? <p className="text-sm font-semibold text-extra">{voiceHint}</p> : null}

        {listening ? (
          <DictationPanel
            text={dictText}
            levels={levels}
            seconds={seconds}
            quiet={quiet}
            onDone={finishMic}
            onCancel={cancelMic}
          />
        ) : null}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <button
            type="button"
            onClick={startMic}
            aria-pressed={listening}
            disabled={busy || listening}
            className={`rounded-full px-4 py-3 font-bold text-white disabled:opacity-60 ${
              listening ? "bg-extra" : "bg-ink"
            }`}
            title="Tap once and ask with your voice"
            aria-label="Ask with your voice"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
              </svg>
              {listening ? "Recording" : "Mic"}
            </span>
          </button>
          <input
            id="extra-question"
            name="question"
            aria-label="Your question for Wondrix"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything curious…"
            disabled={busy}
            className="min-w-0 flex-1 rounded-full border border-stroke bg-card px-4 py-3 text-ink outline-none focus:border-extra/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-extra px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            Send
          </button>
        </form>

        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-soft">Topic ideas</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERESTS.map((item) => {
              const active = topic?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickSuggestion(item)}
                  className={`overflow-hidden rounded-3xl border bg-card text-left transition ${
                    active
                      ? "border-extra ring-2 ring-extra/30"
                      : "border-stroke hover:border-extra/40"
                  }`}
                >
                  <div className="relative h-24 w-full">
                    <Image
                      src={item.art}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 320px"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <p className="font-display text-lg font-semibold text-ink">{item.label}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{item.seed}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ExtraPage() {
  return (
    <Suspense
      fallback={
        <AppShell backHref="/">
          <p className="text-ink-soft">Loading Extra…</p>
        </AppShell>
      }
    >
      <ExtraInner />
    </Suspense>
  );
}
