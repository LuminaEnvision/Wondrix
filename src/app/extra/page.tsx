"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadProfile, saveExtraTopic } from "@/lib/demo-store";
import { localExtraReply } from "@/lib/extra-reply";
import {
  canListen,
  canSpeak,
  listenOnce,
  speak,
  stopSpeaking,
  warmUpVoice,
} from "@/lib/voice";
import { ExtraVisual } from "@/components/ExtraVisual";
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
  const listenRef = useRef<ReturnType<typeof listenOnce> | null>(null);
  const didGreet = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const nextId = useRef(1);

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
      listenRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    if (voiceOn && speakOk) speak(OPENING);
  }, [voiceOn, speakOk]);

  // When the ?topic= changes, prefill its starter question (React's
  // "adjust state when a prop changes" pattern, instead of an effect).
  const [seededTopicId, setSeededTopicId] = useState<string | null>(null);
  if (topic && topic.id !== seededTopicId) {
    setSeededTopicId(topic.id);
    setInput(topic.seed);
  }

  function say(text: string) {
    if (voiceOn && speakOk) speak(text);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stopSpeaking();
    setBusy(true);
    setInput("");

    const childMsg: Msg = { id: nextId.current++, role: "child", text: trimmed };
    const history = messagesRef.current;
    setMessages((m) => [...m, childMsg]);

    let reply = localExtraReply(trimmed, topic?.id ?? null);
    let topicLabel = topic?.label ?? trimmed.slice(0, 40);
    let drawFor: string | null = null;

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
        };
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
      id: nextId.current++,
      role: "agent",
      text: reply.text,
      visual: reply.visual ?? null,
      drawing: Boolean(drawFor),
    };
    setMessages((m) => [...m, agentMsg]);
    saveExtraTopic(topicLabel);
    say(reply.text);
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

  function toggleMic() {
    if (listening) {
      listenRef.current?.stop();
      setListening(false);
      return;
    }
    if (!micOk) {
      setVoiceHint("Voice input needs Chrome or Edge with mic permission. You can still type below.");
      return;
    }
    stopSpeaking();
    setVoiceHint("Listening… ask your question out loud.");
    listenRef.current = listenOnce({
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: (message) => {
        setVoiceHint(message);
        setListening(false);
      },
      onResult: (transcript) => {
        setVoiceHint("");
        setInput(transcript);
        void send(transcript);
      },
    });
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
                {msg.role === "agent" ? (
                  <button
                    type="button"
                    onClick={() => say(msg.text)}
                    className="text-xs font-bold text-brand underline-offset-2 hover:underline"
                  >
                    Hear again
                  </button>
                ) : null}
              </div>
            ))
          )}
          {busy ? <p className="text-sm text-ink-soft">Wondrix is thinking…</p> : null}
        </div>

        {voiceHint ? <p className="text-sm font-semibold text-extra">{voiceHint}</p> : null}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={listening}
            disabled={busy}
            className={`rounded-full px-4 py-3 font-bold text-white ${
              listening ? "bg-brand animate-pulse" : "bg-ink"
            }`}
            title="Ask with your voice"
          >
            {listening ? "Listening…" : "Mic"}
          </button>
          <input
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
