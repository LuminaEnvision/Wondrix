"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type UIEvent,
} from "react";
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
  profileAgeMode,
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
import { WxGlyph } from "@/components/WxGlyph";
import { localExtraReply } from "@/lib/extra-reply";
import { safetyCheck } from "@/lib/safety";
import {
  canListen,
  canSpeak,
  startDictation,
  type DictationHandle,
  speak,
  stopSpeaking,
  unlockAudio,
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
  drawing?: boolean;
  suggestions?: string[];
  intent?: string;
};

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

const FOLLOW_EXPLORER = ["Why?", "Show me", "Tell me more"] as const;
const FOLLOW_TEEN = ["Explain simpler", "Give an example", "Test me"] as const;
const ASK_BACK_EN = "What do you wonder next?";
const ASK_BACK_AR = "ماذا تتساءل بعد ذلك؟";

function IdeaChips({
  ideas,
  onPick,
  disabled,
  big = false,
}: {
  ideas: string[];
  onPick: (q: string) => void;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ideas.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          dir="auto"
          className={`rounded-full border border-[var(--world-accent)]/35 bg-[var(--world-surface)] text-start font-semibold text-[var(--world-ink)] disabled:opacity-60 ${
            big ? "min-h-12 px-4 py-2.5 text-sm" : "min-h-11 px-3 py-1.5 text-xs"
          }`}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function toMsgs(chat: SavedChat): Msg[] {
  return chat.messages.map((m) => ({ ...m, visual: (m.visual as Visual | null) ?? null }));
}

function nowMs(): number {
  return Date.now();
}

function followUpsFor(msg: Msg | undefined, explorer: boolean, lang: "en" | "ar"): string[] {
  if (msg?.suggestions?.length) return msg.suggestions.slice(0, 3);
  const askBack = lang === "ar" ? ASK_BACK_AR : ASK_BACK_EN;
  if (explorer) return [FOLLOW_EXPLORER[0], FOLLOW_EXPLORER[1], askBack];
  return [FOLLOW_TEEN[0], FOLLOW_TEEN[1], askBack];
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
  const [visit] = useState(() => nextExtraVisit());
  const [profile] = useState(() => loadProfile());
  const [ageBand] = useState(() => profile.ageBand);
  const explorer = profileAgeMode(profile) === "explorer";
  const teen = !explorer;
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const lastScrollTop = useRef(0);
  const programmaticScroll = useRef(false);

  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [autoVisualId, setAutoVisualId] = useState<number | null>(null);
  const [screen, setScreen] = useState<"chat" | "past">("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pastSearch, setPastSearch] = useState("");
  const [pastList, setPastList] = useState<SavedChat[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const hydrated = useHydrated();
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    setRestored(true);
    const active = getActiveChatId();
    const chat = active ? loadChat(active) : undefined;
    if (active && chat && chatLang(chat) === lang) {
      setActiveChatIdState(active);
      setMessages(toMsgs(chat));
    } else if (active) {
      storeActiveChatId(null);
    }
  }

  const langRef = useRef(lang);
  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;
    stopSpeaking();
    setActiveChatIdState(null);
    storeActiveChatId(null);
    setMessages([]);
    setScreen("chat");
    setAutoVisualId(null);
    setInput("");
    setVoiceHint("");
  }, [lang]);

  useEffect(() => {
    if (restored && activeChatId && messages.length) saveChat(activeChatId, messages, lang);
  }, [messages, restored, activeChatId, lang]);

  useEffect(() => {
    function onResize() {
      const vv = window.visualViewport;
      if (!vv) return;
      setKeyboardOpen(window.innerHeight - vv.height > 120);
    }
    onResize();
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = listRef.current;
    if (!el) return;
    programmaticScroll.current = true;
    el.scrollTop = el.scrollHeight;
    lastScrollTop.current = el.scrollTop;
    requestAnimationFrame(() => {
      programmaticScroll.current = false;
    });
  }, [messages, busy]);

  function openChat(id: string | null, msgs: Msg[]) {
    stopSpeaking();
    setActiveChatIdState(id);
    storeActiveChatId(id);
    setMessages(msgs);
    setScreen("chat");
    setMenuOpen(false);
    stickToBottom.current = true;
  }

  function openPast() {
    setPastList(listChats(lang));
    setPastSearch("");
    setScreen("past");
    setMenuOpen(false);
  }

  const micOk = canListen();
  const speakOk = canSpeak();
  const navHidden = keyboardOpen || scrolledDown;
  const empty = messages.length === 0;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
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
    if (lang === "ar") return;
    if (voiceOn && speakOk) speak(opening, { id: "opening" });
  }, [voiceOn, speakOk, opening, lang]);

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
    stickToBottom.current = true;

    const history = messagesRef.current;
    if (!activeChatId) {
      const id = newChatId();
      setActiveChatIdState(id);
      storeActiveChatId(id);
    }
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
    if (redirected) recordSafetyRedirect();
    else saveExtraTopic(topicLabel);
    say(reply.text, `msg-${agentMsg.id}`);
    setBusy(false);

    if (drawFor) void drawVisual(agentMsg.id, trimmed, drawFor);
  }

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
      // text answer already shown
    }
    setMessages((m) => m.map((msg) => (msg.id === msgId ? { ...msg, visual, drawing: false } : msg)));
    if (visual) setAutoVisualId(msgId);
  }

  function pickSuggestion(item: Interest) {
    router.replace(`/extra?topic=${item.id}`);
    saveExtraTopic(tr(item.label));
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
    lastSoundAt.current = nowMs();

    const handle = startDictation({
      lang: langInfo(lang).speech,
      onText: (t) => {
        lastSoundAt.current = nowMs();
        dictTextRef.current = t;
        setSendingSoon(false);
        setDictText(t);
      },
      onLevel: (level) => {
        if (level > 0.08) lastSoundAt.current = nowMs();
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
    const startedAt = nowMs();
    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((nowMs() - startedAt) / 1000));
      setQuiet(Boolean(dictTextRef.current) && nowMs() - lastSoundAt.current > 1200);
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

  function onListScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const top = el.scrollTop;
    const distBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distBottom < 80;
    if (programmaticScroll.current) {
      lastScrollTop.current = top;
      return;
    }
    if (!keyboardOpen) {
      if (distBottom < 80) setScrolledDown(false);
      else if (top > lastScrollTop.current + 24) setScrolledDown(true);
      else if (top < lastScrollTop.current - 24) setScrolledDown(false);
    }
    lastScrollTop.current = top;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const filteredPast = pastList.filter((c) => {
    if (!pastSearch.trim()) return true;
    return c.title.toLowerCase().includes(pastSearch.trim().toLowerCase());
  });

  const lastAgent = [...messages].reverse().find((m) => m.role === "agent");
  const composerPad = navHidden
    ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    : "pb-[calc(var(--nav-h)+0.5rem)]";

  const headerExtra = (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !voiceOn;
          setVoiceOn(next);
          if (!next) stopSpeaking();
          else void unlockAudio();
        }}
        aria-pressed={voiceOn}
        aria-label={voiceOn ? tr("extra.voiceOn") : tr("extra.voiceOff")}
        className="inline-flex size-11 items-center justify-center rounded-full"
      >
        <WxGlyph name={voiceOn ? "voiceOn" : "voiceOff"} size={40} />
      </button>
      <div className="relative">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={tr("extra.menu")}
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex size-11 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] text-[var(--world-ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
        {menuOpen ? (
          <div
            className="absolute end-0 top-12 z-40 min-w-[10.5rem] overflow-hidden rounded-[var(--radius-m)] border border-stroke bg-[var(--world-surface)] shadow-[var(--shadow-lift)]"
            role="menu"
          >
            {messages.length > 0 ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-3 text-start text-sm font-bold text-[var(--world-ink)]"
                onClick={() => openChat(null, [])}
              >
                {tr("extra.newChat")}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-3 text-start text-sm font-bold text-[var(--world-ink)]"
              onClick={openPast}
            >
              {tr("extra.pastChats")}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  const composer = (
    <div
      className={`shrink-0 border-t border-stroke bg-[var(--world-bg)]/95 px-3 pt-2 shadow-[var(--shadow-card)] backdrop-blur-md ${composerPad}`}
    >
      {voiceHint ? (
        <p className="mb-1 text-xs font-semibold text-[var(--world-accent)]">{voiceHint}</p>
      ) : null}
      {listening ? (
        <div className="mb-2">
          <DictationPanel
            text={dictText}
            levels={levels}
            seconds={seconds}
            quiet={quiet}
            sendingSoon={sendingSoon}
            onDone={finishMic}
            onCancel={cancelMic}
          />
        </div>
      ) : null}
      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          id="extra-question"
          name="question"
          rows={1}
          aria-label={tr("extra.inputLabel")}
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, explorer ? 112 : 96)}px`;
          }}
          placeholder={lang === "ar" ? tr("extra.placeholderAr") : tr("extra.placeholder")}
          dir="auto"
          disabled={busy}
          className={`min-h-11 min-w-0 flex-1 resize-none rounded-[1.25rem] border border-stroke bg-[var(--world-surface)] px-4 py-2.5 text-[var(--world-ink)] outline-none focus:border-[var(--world-accent)]/50 disabled:opacity-60 ${
            explorer ? "text-base" : "text-sm"
          }`}
        />
        <button
          type="button"
          onClick={startMic}
          aria-pressed={listening}
          disabled={busy || listening}
          className={`inline-flex shrink-0 items-center justify-center rounded-2xl disabled:opacity-60 ${
            explorer ? "size-14" : "size-11"
          } ${listening ? "ring-2 ring-[var(--world-accent)] ring-offset-2" : ""}`}
          title={tr("extra.micTitle")}
          aria-label={tr("extra.micLabel")}
        >
          <WxGlyph name="mic" size={explorer ? 52 : 40} />
        </button>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label={tr("extra.send")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl disabled:opacity-60"
        >
          <WxGlyph name="send" size={40} />
        </button>
      </form>
    </div>
  );

  const pastView = (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--world-bg)]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-stroke px-3">
        <button
          type="button"
          aria-label={tr("common.back")}
          onClick={() => setScreen("chat")}
          className="inline-flex size-11 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] text-[var(--world-ink)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="rtl:-scale-x-100">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="font-display flex-1 text-lg font-semibold text-[var(--world-ink)]">{tr("extra.pastChats")}</h2>
      </header>
      {teen ? (
        <div className="border-b border-stroke px-3 py-2">
          <input
            value={pastSearch}
            onChange={(e) => setPastSearch(e.target.value)}
            placeholder={tr("extra.searchChats")}
            className="min-h-11 w-full rounded-full border border-stroke bg-[var(--world-surface)] px-4 text-sm text-[var(--world-ink)] outline-none"
          />
        </div>
      ) : (
        <div className="flex justify-center px-4 pt-3">
          <div className="relative h-24 w-20">
            <Image src="/art/mascot-hero.png" alt="" fill className="object-contain object-bottom" sizes="80px" />
          </div>
        </div>
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${composerPad}`}>
        {filteredPast.length === 0 ? (
          <p className="text-sm text-[var(--world-ink-soft)]">{tr("extra.noPastChats")}</p>
        ) : (
          <ul className="space-y-2">
            {filteredPast.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openChat(c.id, toMsgs(c))}
                  className={`min-h-14 min-w-0 flex-1 rounded-[var(--radius-m)] border border-stroke px-3 py-2 text-start ${
                    c.id === activeChatId ? "bg-[var(--world-accent-soft)]" : "bg-[var(--world-surface)]"
                  }`}
                >
                  <span className="block truncate text-sm font-semibold text-[var(--world-ink)]">{c.title}</span>
                  <span className="block text-xs text-[var(--world-ink-soft)]">
                    {new Date(c.updatedAt).toLocaleDateString(lang === "ar" ? "ar-AE-u-nu-latn" : undefined, {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {tr("extra.messages", { n: c.messages.length })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteChat(c.id);
                    setPastList(listChats(lang));
                    if (c.id === activeChatId) openChat(null, []);
                  }}
                  className="inline-flex size-11 items-center justify-center rounded-full text-[var(--world-ink-soft)]"
                  aria-label={tr("extra.deleteChat", { title: c.title })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const chatView = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 overflow-y-auto px-1 py-3 sm:px-3"
        data-wx-messages
      >
        {empty ? (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <div className="flex items-end gap-2">
              <Mascot
                size={explorer ? "lg" : "md"}
                busy={busy}
                listening={listening}
                happy
                speechId="opening"
              />
              <div className="min-w-0 flex-1 space-y-2 rounded-[var(--radius-m)] bg-[var(--world-accent-soft)] px-4 py-3 text-[var(--world-ink)]">
                <p className={`leading-relaxed ${explorer ? "text-lg" : "text-base"}`} dir="auto">
                  {opening}
                </p>
                <SpeakButton id="opening" text={opening} tone="extra" label={tr("extra.listenStarter")} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-[var(--world-ink-soft)]">{tr("extra.topicIdeas")}</p>
              {explorer ? (
                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickSuggestion(item)}
                      data-topic={item.tone}
                      className="overflow-hidden rounded-[var(--radius-m)] border border-stroke bg-[var(--world-surface)] text-start"
                    >
                      <div className="relative h-20 w-full bg-[var(--world-bg)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.art} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="px-3 py-2 text-sm font-bold text-[var(--world-ink)]">{tr(item.label)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                  {INTERESTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickSuggestion(item)}
                      data-topic={item.tone}
                      className="w-28 shrink-0 overflow-hidden rounded-[var(--radius-m)] border border-stroke bg-[var(--world-surface)] text-start"
                    >
                      <div className="relative h-12 w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.art} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs font-bold text-[var(--world-ink)]">{tr(item.label)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <IdeaChips ideas={starters.slice(1, 3)} onPick={(q) => void send(q)} disabled={busy} big={explorer} />
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            {messages.map((msg) => {
              const isAgent = msg.role === "agent";
              const isLatestAgent = isAgent && msg.id === lastAgent?.id && !busy;
              return (
                <div
                  key={msg.id}
                  data-role={msg.role}
                  className={`flex gap-2 ${isAgent ? "items-end" : "justify-end"}`}
                >
                  {isAgent ? (
                    <Mascot
                      size="md"
                      busy={Boolean(msg.drawing) && isLatestAgent}
                      listening={false}
                      happy={["social", "goodbye"].includes(msg.intent ?? "")}
                      speechId={`msg-${msg.id}`}
                    />
                  ) : null}
                  <div
                    className={`max-w-[92%] space-y-2 rounded-[var(--radius-m)] px-4 py-3 leading-relaxed ${
                      isAgent
                        ? "bg-[var(--world-accent-soft)] text-[var(--world-ink)]"
                        : "bg-[var(--world-accent)] text-white"
                    } ${explorer ? "text-lg" : "text-base"}`}
                  >
                    <p dir="auto">{msg.text}</p>
                    {isAgent && msg.visual ? (
                      <ExtraVisual
                        visual={msg.visual}
                        autoPlay={voiceOn && speakOk && msg.id === autoVisualId}
                      />
                    ) : null}
                    {isAgent && msg.drawing ? (
                      <p className="flex items-center gap-2 text-xs font-semibold text-[var(--world-accent)]" role="status">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--world-accent)]" aria-hidden />
                        {tr("extra.drawing")}
                      </p>
                    ) : null}
                    {isAgent ? <SpeakButton id={`msg-${msg.id}`} text={msg.text} /> : null}
                    {isLatestAgent ? (
                      <IdeaChips
                        ideas={followUpsFor(msg, explorer, lang)}
                        onPick={(q) => void send(q)}
                        disabled={busy}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {busy ? (
              <p className="ps-16 text-sm text-[var(--world-ink-soft)]">{tr("extra.thinking")}</p>
            ) : null}
          </div>
        )}
      </div>
      {composer}
    </div>
  );

  return (
    <AppShell
      world="wonder"
      backHref="/"
      layout="fill"
      hideNav={navHidden}
      dense={teen}
      headerExtra={headerExtra}
    >
      <VoiceLoadingBubble enabled={voiceOn && lang === "en"} />
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default"
          aria-label={tr("common.close")}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      {screen === "past" ? (
        teen ? (
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 flex flex-col opacity-40">{chatView}</div>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/40"
              aria-label={tr("common.close")}
              onClick={() => setScreen("chat")}
            />
            <div className="absolute inset-y-0 end-0 z-30 flex w-[min(100%,22rem)] max-w-[85%] flex-col bg-[var(--world-bg)] shadow-[var(--shadow-lift)]">
              {pastView}
            </div>
          </div>
        ) : (
          pastView
        )
      ) : (
        chatView
      )}
    </AppShell>
  );
}

export default function ExtraPage() {
  const tr = useT();
  return (
    <Suspense
      fallback={
        <AppShell world="wonder" backHref="/" layout="fill">
          <p className="p-4 text-[var(--world-ink-soft)]">{tr("extra.loadingPage")}</p>
        </AppShell>
      }
    >
      <ExtraInner />
    </Suspense>
  );
}
