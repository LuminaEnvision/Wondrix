"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  chatLang,
  deleteChat,
  getActiveChatId,
  listChats,
  loadChat,
  newChatId,
  setActiveChatId as storeActiveChatId,
  loadProfile,
  recordSafetyRedirect,
  saveChat,
  type SavedChat,
  saveExtraTopic,
} from "@/lib/demo-store";
import { langInfo, type MessageKey } from "@/lib/i18n";
import { nextExtraVisit, startersForVisit } from "@/lib/starters";
import { topicSeedFor, type TopicId } from "@/lib/topic-seeds";
import { useHydrated, useLang, useT } from "@/lib/use-client-state";
import { Mascot } from "@/components/Mascot";
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
  /** Short questions the child can tap next (shown under the newest answer). */
  suggestions?: string[];
  /** What the child wanted (question, social, goodbye, stuck): Wondrix waves for hello and goodbye. */
  intent?: string;
};

/** "Thursday 22:47": lets Wondrix say good night at bedtime. */
function localTimeLabel(d = new Date()): string {
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  return `${day} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const INTERESTS = [
  { id: "physics", label: "interest.physics", art: "/art/topics/physics.svg", tone: "physics" },
  { id: "robots", label: "interest.robots", art: "/art/topics/robots.svg", tone: "robots" },
  { id: "sky", label: "interest.sky", art: "/art/topics/astronomy.svg", tone: "sky" },
  { id: "life", label: "interest.life", art: "/art/topics/living.svg", tone: "life" },
  { id: "chemistry", label: "interest.chemistry", art: "/art/topics/chemistry.svg", tone: "chemistry" },
] as const satisfies readonly { id: TopicId; label: MessageKey; art: string; tone: string }[];

type Interest = (typeof INTERESTS)[number];

/** Tap-able questions: the child can start or continue without typing or reading much. */
function IdeaChips({ ideas, onPick, disabled, big = false }: { ideas: string[]; onPick: (q: string) => void; disabled?: boolean; big?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ideas.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          dir="auto"
          className={`rounded-full border border-extra/40 bg-card text-start font-semibold text-ink hover:border-extra disabled:opacity-60 ${
            big ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"
          }`}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/** Saved chat → page messages (no "drawing" flags on restore). */
function toMsgs(chat: SavedChat): Msg[] {
  return chat.messages.map((m) => ({ ...m, visual: (m.visual as Visual | null) ?? null }));
}

function ExtraInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topic");
  const topic = useMemo(
    () => INTERESTS.find((item) => item.id === topicId) ?? null,
    [topicId],
  );

  const tr = useT();
  const lang = useLang();
  // A different opening line and starter ideas on every visit (per age band and language).
  const [visit] = useState(() => nextExtraVisit());
  const [ageBand] = useState(() => loadProfile().ageBand);
  const [topicTap, setTopicTap] = useState(0);
  const starters = startersForVisit(ageBand, lang, visit, 4);
  const opening = tr("extra.opening", { q: starters[0] });
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
  const [sendingSoon, setSendingSoon] = useState(false);
  const lastSoundAt = useRef(0);
  const dictTextRef = useRef("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didGreet = useRef(false);
  const messagesRef = useRef<Msg[]>([]);

  // Chat history: every conversation is saved on the device (localStorage); this tab
  // remembers which one is open (sessionStorage), so a reload continues it with context.
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  // The newest diagram walks itself through (with voice) once the answer is spoken.
  const [autoVisualId, setAutoVisualId] = useState<number | null>(null);
  const [pastChats, setPastChats] = useState<SavedChat[] | null>(null); // null = panel closed
  const hydrated = useHydrated();
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    // Render-time adjustment (not an effect): restore the open chat once after hydration.
    setRestored(true);
    const active = getActiveChatId();
    const chat = active ? loadChat(active) : undefined;
    // Only restore a chat that matches the current app language.
    if (active && chat && chatLang(chat) === lang) {
      setActiveChatIdState(active);
      setMessages(toMsgs(chat));
    } else if (active) {
      storeActiveChatId(null);
    }
  }

  // Language switch: drop the on-screen thread so Arabic never shows English replies (and vice versa).
  const langRef = useRef(lang);
  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;
    stopSpeaking();
    setActiveChatIdState(null);
    storeActiveChatId(null);
    setMessages([]);
    setPastChats(null);
    setAutoVisualId(null);
    setInput("");
    setVoiceHint("");
  }, [lang]);

  useEffect(() => {
    if (restored && activeChatId && messages.length) saveChat(activeChatId, messages, lang);
  }, [messages, restored, activeChatId, lang]);

  function openChat(id: string | null, msgs: Msg[]) {
    stopSpeaking();
    setActiveChatIdState(id);
    storeActiveChatId(id);
    setMessages(msgs);
    setPastChats(null);
  }

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
    // Arabic needs a real Arabic system/Azure voice; auto-greet with an English voice is garbled.
    if (lang === "ar") return;
    if (voiceOn && speakOk) speak(opening, { id: "opening" });
  }, [voiceOn, speakOk, opening, lang]);

  // When the ?topic= changes, remember which topic is active (React's
  // "adjust state when a prop changes" pattern, instead of an effect).
  const [seededTopicId, setSeededTopicId] = useState<string | null>(null);
  if (topic && topic.id !== seededTopicId) {
    setSeededTopicId(topic.id);
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
    if (!activeChatId) {
      const id = newChatId();
      setActiveChatIdState(id);
      storeActiveChatId(id);
    }
    // Ids continue after restored messages (keys + per-message voice state).
    const baseId = history.reduce((max, m) => Math.max(max, m.id), 0);
    const childMsg: Msg = { id: baseId + 1, role: "child", text: trimmed };
    setMessages((m) => [...m, childMsg]);

    let reply = localExtraReply(trimmed, topic?.id ?? null, history.length > 0, lang);
    let topicLabel = topic ? tr(topic.label) : trimmed.slice(0, 40);
    let drawFor: string | null = null;
    let redirected = safetyCheck(trimmed).ok === false;
    let replyIntent: string | undefined;

    try {
      const res = await fetch("/api/extra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          topicId: topic?.id ?? null,
          history,
          profile: loadProfile(),
          localTime: localTimeLabel(),
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
          suggestions?: string[];
          intent?: string;
        };
        if (data.source === "safety") redirected = true;
        if (data.text) {
          // Local replies may carry a ready-made visual; live ones draw in a second step.
          reply = { text: data.text, visual: data.visual ?? undefined, suggestions: data.suggestions };
          replyIntent = data.intent;
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
      suggestions: reply.suggestions?.length ? reply.suggestions : undefined,
      intent: replyIntent,
    };
    setMessages((m) => [...m, agentMsg]);
    if (agentMsg.visual) setAutoVisualId(agentMsg.id);
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
    if (visual) setAutoVisualId(msgId);
  }

  function pickSuggestion(item: Interest) {
    router.replace(`/extra?topic=${item.id}`);
    saveExtraTopic(tr(item.label));
    // Age-banded seed; re-taps rotate so the same card does not always ask the same thing.
    const seed = topicSeedFor(item.id, ageBand, lang, visit + topicTap);
    setTopicTap((n) => n + 1);
    void send(seed);
  }

  function stopDictationUi() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    listenRef.current = null;
    setListening(false);
  }

  /** One tap starts listening; a short pause after speech auto-sends (Done is optional). */
  function startMic() {
    if (listening || busy) return;
    if (!micOk) {
      setVoiceHint(tr("extra.micNeeds"));
      return;
    }
    stopSpeaking();
    setVoiceHint("");
    setDictText("");
    setLevels(Array(18).fill(0));
    setSeconds(0);
    setQuiet(false);
    setSendingSoon(false);
    lastSoundAt.current = Date.now();

    const handle = startDictation({
      lang: langInfo(lang).speech,
      onText: (t) => {
        lastSoundAt.current = Date.now();
        dictTextRef.current = t;
        setSendingSoon(false);
        setDictText(t);
      },
      onLevel: (level) => {
        if (level > 0.08) lastSoundAt.current = Date.now();
        setLevels((prev) => [...prev.slice(1), level]);
      },
      onAutoSendSoon: () => setSendingSoon(true),
      onDone: (t) => {
        stopDictationUi();
        setSendingSoon(false);
        dictTextRef.current = "";
        const question = t.trim();
        if (!question) {
          setVoiceHint(lang === "ar" ? tr("extra.micNoCatchAr") : tr("extra.micNoCatch"));
          return;
        }
        setInput(question);
        void send(question);
      },
      onError: (message) => {
        stopDictationUi();
        setSendingSoon(false);
        dictTextRef.current = "";
        setVoiceHint(message);
      },
    });
    if (!handle) return;
    listenRef.current = handle;
    setListening(true);
    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
      // Soft “still listening” cue before the ~2s auto-send kicks in.
      setQuiet(Boolean(dictTextRef.current) && Date.now() - lastSoundAt.current > 1200);
    }, 400);
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
    <AppShell backHref="/" world="wonder">
      <VoiceLoadingBubble enabled={voiceOn && lang === "en"} />
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-end gap-3">
          <div className="wx-surface relative min-w-0 flex-1 px-4 py-3">
            <span
              className="absolute -end-2 bottom-10 hidden h-4 w-4 rotate-45 border-e border-t border-stroke bg-[var(--world-surface)] rtl:rotate-[225deg] sm:block"
              aria-hidden
            />
            <h1 className="font-display text-xl font-semibold text-[var(--world-ink)] sm:text-3xl">
              {topic ? tr(topic.label) : tr("extra.letsWonder")}
            </h1>
            <p className="mt-1 line-clamp-3 text-sm text-[var(--world-ink-soft)] sm:text-base">{opening}</p>
            <div className="mt-1">
              <SpeakButton id="opening" text={opening} tone="extra" label={tr("extra.listenStarter")} />
            </div>
          </div>
          <Mascot
            busy={busy}
            listening={listening}
            happy={messages.length === 0 || ["social", "goodbye"].includes(messages.at(-1)?.intent ?? "")}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            {voiceOn ? tr("extra.voiceOn") : tr("extra.voiceOff")}
          </button>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => openChat(null, [])}
              className="rounded-full border border-stroke bg-card px-4 py-2 text-sm font-bold text-ink-soft"
              title={tr("extra.newChatTitle")}
            >
              {tr("extra.newChat")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPastChats(pastChats ? null : listChats(lang))}
            aria-expanded={Boolean(pastChats)}
            className="rounded-full border border-stroke bg-card px-4 py-2 text-sm font-bold text-ink-soft"
          >
            {tr("extra.pastChats")}
          </button>
        </div>

        {pastChats ? (
          <div className="space-y-2 rounded-3xl border border-stroke bg-card p-4" role="region" aria-label={tr("extra.pastChats")}>
            <p className="text-sm font-bold text-ink-soft">{tr("extra.yourPastChats")}</p>
            {pastChats.length === 0 ? (
              <p className="text-sm text-ink-soft">{tr("extra.noPastChats")}</p>
            ) : (
              <ul className="space-y-2">
                {pastChats.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openChat(c.id, toMsgs(c))}
                      className={`min-w-0 flex-1 rounded-2xl px-3 py-2 text-start ${
                        c.id === activeChatId ? "bg-extra/10 ring-1 ring-extra/30" : "bg-bg-deep/50"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                      <span className="block text-xs text-ink-soft">
                        {new Date(c.updatedAt).toLocaleDateString(lang === "ar" ? "ar-AE-u-nu-latn" : undefined, { day: "numeric", month: "short" })} ·{" "}
                        {tr("extra.messages", { n: c.messages.length })}
                        {c.id === activeChatId ? ` · ${tr("extra.openNow")}` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteChat(c.id);
                        if (c.id === activeChatId) openChat(null, []);
                        setPastChats(listChats());
                      }}
                      className="rounded-full px-2 py-1 text-sm text-ink-soft hover:text-ink"
                      aria-label={tr("extra.deleteChat", { title: c.title })}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="wx-surface flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-end gap-2 py-1 text-[var(--world-ink-soft)]">
              <p className="text-sm sm:text-base">{tr("extra.ready")}</p>
              <p className="text-sm font-bold">{tr("extra.tryOne")}</p>
              <IdeaChips ideas={starters.slice(1, 3)} onPick={(q) => void send(q)} disabled={busy} big />
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] space-y-2 rounded-[var(--radius-m)] px-4 py-3 text-base leading-relaxed ${
                  msg.role === "child"
                    ? "ms-auto bg-[var(--world-accent)] text-white"
                    : "bg-[var(--world-accent-soft)] text-[var(--world-ink)]"
                }`}
              >
                <p dir="auto">{msg.text}</p>
                {msg.role === "agent" && msg.visual ? <ExtraVisual visual={msg.visual} autoPlay={voiceOn && speakOk && msg.id === autoVisualId} /> : null}
                {msg.role === "agent" && msg.drawing ? (
                  <p className="flex items-center gap-2 text-xs font-semibold text-[var(--world-accent)]" role="status">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--world-accent)]" aria-hidden />
                    {tr("extra.drawing")}
                  </p>
                ) : null}
                {msg.role === "agent" ? <SpeakButton id={`msg-${msg.id}`} text={msg.text} /> : null}
                {msg.role === "agent" && msg.suggestions?.length && msg.id === messages.at(-1)?.id && !busy ? (
                  <IdeaChips ideas={msg.suggestions} onPick={(q) => void send(q)} disabled={busy} />
                ) : null}
              </div>
            ))
          )}
          {busy ? <p className="text-sm text-[var(--world-ink-soft)]">{tr("extra.thinking")}</p> : null}
        </div>

        {voiceHint ? <p className="text-sm font-semibold text-[var(--world-accent)]">{voiceHint}</p> : null}

        {listening ? (
          <DictationPanel
            text={dictText}
            levels={levels}
            seconds={seconds}
            quiet={quiet}
            sendingSoon={sendingSoon}
            onDone={finishMic}
            onCancel={cancelMic}
          />
        ) : null}

        <div className="z-30 -mx-1 shrink-0 space-y-1.5 border-t border-stroke bg-[var(--world-bg)]/95 px-1 pb-1 pt-2 backdrop-blur-md">
          <p className="text-xs font-bold text-[var(--world-ink-soft)]">{tr("extra.topicIdeas")}</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {INTERESTS.map((item) => {
              const active = topic?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickSuggestion(item)}
                  data-topic={item.tone}
                  className={`w-[7.5rem] shrink-0 overflow-hidden rounded-[var(--radius-m)] border text-start transition ${
                    active
                      ? "border-[var(--world-accent)] ring-2 ring-[var(--world-accent)]/30"
                      : "border-stroke"
                  }`}
                >
                  <div className="relative flex h-14 w-full items-center justify-center bg-[var(--world-surface)]">
                    {/* SVG topic art — plain img so we do not need Next SVG config */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.art} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-bold text-[var(--world-ink)]">{tr(item.label)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <form
            className="flex items-center gap-2"
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
              className={`wx-tap inline-flex items-center justify-center rounded-full px-4 font-bold text-white disabled:opacity-60 ${
                listening ? "bg-[var(--world-accent)]" : "bg-ink"
              }`}
              title={tr("extra.micTitle")}
              aria-label={tr("extra.micLabel")}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                </svg>
                {listening ? tr("extra.recording") : tr("extra.mic")}
              </span>
            </button>
            <input
              id="extra-question"
              name="question"
              aria-label={tr("extra.inputLabel")}
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "ar" ? tr("extra.placeholderAr") : tr("extra.placeholder")}
              dir="auto"
              disabled={busy}
              className="wx-tap min-w-0 flex-1 rounded-full border border-stroke bg-[var(--world-surface)] px-4 text-[var(--world-ink)] outline-none focus:border-[var(--world-accent)]/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy}
              className="wx-cta disabled:opacity-60"
            >
              {tr("extra.askOwl")}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

export default function ExtraPage() {
  const tr = useT();
  return (
    <Suspense
      fallback={
        <AppShell backHref="/" world="wonder">
          <p className="text-ink-soft">{tr("extra.loadingPage")}</p>
        </AppShell>
      }
    >
      <ExtraInner />
    </Suspense>
  );
}
