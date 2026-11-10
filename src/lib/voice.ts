/**
 * Wondrix voice: text-to-speech with a chain of engines, plus mic input.
 *
 * Engines (NEXT_PUBLIC_TTS_ENGINE picks the first one; the others are fallbacks):
 *   - "kokoro"  (default) Kokoro 82M running in the browser via a Web Worker.
 *               Free, no key, private (audio never leaves the device), natural voice.
 *               First use downloads the model (~80 MB, then cached). Until it is
 *               ready, the browser voice speaks so the child never waits.
 *   - "azure"   Server route /api/tts (Azure Speech neural voices). Prepared for
 *               the demo; needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION on the server.
 *   - "browser" Web Speech API with the best available voice (Edge "Natural",
 *               Google, Samantha...). Always the last fallback.
 *
 * Mic input stays on the Web Speech API (Chrome/Edge/Safari).
 *
 * Arabic (profile.language = "ar"): Kokoro has no Arabic voice, so the chain is
 * Azure (ar-AE voice, when configured) then the best installed Arabic browser voice.
 * The mic tries ar-AE → ar-SA → ar-EG → ar (Chrome's Arabic support varies by dialect tag).
 */

import { currentLang, langInfo, t, type MessageKey } from "./i18n";

type Engine = "kokoro" | "azure" | "browser";

export type VoiceStatus =
  | { engine: Engine; state: "idle" | "ready" | "failed" }
  | { engine: "kokoro"; state: "loading"; progress: number };

type SpeakOpts = {
  rate?: number;
  pitch?: number;
  /** Which message is being read (lets the UI show a per-message play state). */
  id?: string;
  /** Called once when this text finished playing, or could not play (not when stopped or replaced). */
  onEnd?: () => void;
};

/** onEnd of the text playing now (cleared when something else starts or it is stopped). */
let pendingOnEnd: { token: number; fn: () => void } | null = null;

/** What the voice is doing right now (for play buttons and "speaking" indicators). */
export type SpeechState =
  | { state: "idle" }
  | { state: "preparing"; id?: string }
  | { state: "speaking"; id?: string; engine: Engine }
  | { state: "unavailable"; id?: string };

/** Max wait for Kokoro's first sentence before the browser voice takes over. */
// Give the natural voice time on WASM machines; browser fallback is much more robotic.
const KOKORO_FIRST_CHUNK_MS = 9000;

const KOKORO_VOICE = process.env.NEXT_PUBLIC_KOKORO_VOICE || "af_heart";

function engineChain(): Engine[] {
  const primary = (process.env.NEXT_PUBLIC_TTS_ENGINE || "kokoro").toLowerCase() as Engine;
  if (currentLang() !== "en") return primary === "azure" ? ["azure", "browser"] : ["browser"];
  if (primary === "browser") return ["browser"];
  if (primary === "azure") return ["azure", "kokoro", "browser"];
  return ["kokoro", "browser"];
}

/* ------------------------------------------------------------------ */
/* Shared state                                                        */
/* ------------------------------------------------------------------ */

let playToken = 0;
let audioCtx: AudioContext | null = null;
let activeSources: AudioBufferSourceNode[] = [];
let audioEl: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

const IDLE: SpeechState = { state: "idle" };
let speech: SpeechState = IDLE;
const speechListeners = new Set<() => void>();

function setSpeech(next: SpeechState) {
  speech = next;
  speechListeners.forEach((fn) => fn());
}

/** useSyncExternalStore-friendly subscription to the speech state. */
export function subscribeSpeech(fn: () => void): () => void {
  speechListeners.add(fn);
  return () => speechListeners.delete(fn);
}

export function getSpeech(): SpeechState {
  return speech;
}

export function getServerSpeech(): SpeechState {
  return IDLE;
}

const statusListeners = new Set<(s: VoiceStatus) => void>();
let lastStatus: VoiceStatus = { engine: "kokoro", state: "idle" };

function emit(status: VoiceStatus) {
  lastStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

/** Subscribe to voice engine status (e.g. "natural voice loading 40%"). Returns unsubscribe. */
export function subscribeVoiceStatus(fn: (s: VoiceStatus) => void): () => void {
  statusListeners.add(fn);
  fn(lastStatus);
  return () => statusListeners.delete(fn);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || "AudioContext" in window);
}

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getRecognitionCtor());
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?؟])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Public speak / stop                                                 */
/* ------------------------------------------------------------------ */

export function stopSpeaking() {
  playToken++;
  stopAllAudio();
  if (speech.state !== "idle") setSpeech(IDLE);
}

function stopAllAudio() {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  activeSources.forEach((s) => {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  });
  activeSources = [];
  if (audioEl) {
    audioEl.pause();
    audioEl = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  kokoroWorker?.postMessage({ type: "speak", id: -1, sentences: [], voice: KOKORO_VOICE, speed: 1 });
}

/** Speak text out loud with the best engine available (kids-friendly pace). */
export function speak(text: string, opts?: SpeakOpts) {
  if (typeof window === "undefined" || !text.trim()) return;
  stopSpeaking();
  const token = playToken;
  const id = opts?.id;
  pendingOnEnd = opts?.onEnd ? { token, fn: opts.onEnd } : null;
  setSpeech({ state: "preparing", id });
  const started = Date.now();
  void (async () => {
    for (const engine of engineChain()) {
      if (token !== playToken) return;
      try {
        const ok = await ENGINES[engine](text, opts ?? {}, token);
        if (ok) {
          console.info(`[voice] ${engine} started after ${Date.now() - started} ms`);
          return;
        }
      } catch (err) {
        console.warn(`[voice] ${engine} failed`, err);
      }
    }
    if (token === playToken) {
      console.warn("[voice] no voice could play on this device");
      setSpeech({ state: "unavailable", id });
      finishOnEnd(token);
    }
  })();
}

/** Called by an engine when its audio really starts / ends. */
function markSpeaking(token: number, engine: Engine, id?: string) {
  if (token === playToken) setSpeech({ state: "speaking", id, engine });
}

function markDone(token: number) {
  if (token === playToken) setSpeech(IDLE);
  finishOnEnd(token);
}

function finishOnEnd(token: number) {
  if (pendingOnEnd?.token !== token || token !== playToken) return;
  const fn = pendingOnEnd.fn;
  pendingOnEnd = null;
  fn();
}

/** Start loading the natural voice early (call when a voice screen opens). */
export function warmUpVoice() {
  if (typeof window === "undefined") return;
  if (engineChain().includes("kokoro")) getKokoroWorker()?.postMessage({ type: "load" });
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
}

/** Each engine resolves true only once audio has actually started. */
const ENGINES: Record<Engine, (text: string, opts: SpeakOpts, token: number) => Promise<boolean>> = {
  kokoro: speakKokoro,
  azure: speakAzure,
  browser: speakBrowser,
};

/* ------------------------------------------------------------------ */
/* Engine: Kokoro (in-browser, Web Worker)                             */
/* ------------------------------------------------------------------ */

let kokoroWorker: Worker | null = null;
let kokoroState: "idle" | "loading" | "ready" | "failed" = "idle";
let kokoroReqId = 0;
/** Times Kokoro was too slow for the first sentence; after 2 we stop using it this session. */
let kokoroSlowStrikes = 0;

function getKokoroWorker(): Worker | null {
  if (kokoroState === "failed" || kokoroSlowStrikes >= 2) return null;
  if (kokoroWorker) return kokoroWorker;
  if (typeof Worker === "undefined") {
    kokoroState = "failed";
    return null;
  }
  try {
    kokoroWorker = new Worker(new URL("./tts/kokoro.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    kokoroState = "failed";
    emit({ engine: "kokoro", state: "failed" });
    return null;
  }
  kokoroWorker.addEventListener("message", (e: MessageEvent) => {
    const m = e.data as { type: string; status?: string; progress?: number };
    if (m.type !== "status") return;
    if (m.status === "loading") {
      kokoroState = "loading";
      emit({ engine: "kokoro", state: "loading", progress: m.progress ?? 0 });
    } else if (m.status === "ready") {
      kokoroState = "ready";
      emit({ engine: "kokoro", state: "ready" });
    } else if (m.status === "failed") {
      kokoroState = "failed";
      emit({ engine: "kokoro", state: "failed" });
    }
  });
  kokoroWorker.addEventListener("error", () => {
    kokoroState = "failed";
    emit({ engine: "kokoro", state: "failed" });
  });
  return kokoroWorker;
}

async function getAudioCtx(): Promise<AudioContext | null> {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  audioCtx ??= new AudioContext();
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      /* needs a user gesture */
    }
  }
  return audioCtx.state === "running" ? audioCtx : null;
}

async function speakKokoro(text: string, opts: SpeakOpts, token: number): Promise<boolean> {
  const worker = getKokoroWorker();
  if (!worker) return false;
  if (kokoroState !== "ready") {
    // Not ready yet: start/continue loading and let the next engine speak now.
    worker.postMessage({ type: "load" });
    return false;
  }
  const ctx = await getAudioCtx();
  if (!ctx || token !== playToken) return false;

  const id = ++kokoroReqId;
  const sentences = splitSentences(text);
  let nextStart = ctx.currentTime + 0.05;

  return new Promise<boolean>((resolve) => {
    let gotAudio = false;
    let allQueued = false;
    // Slow devices (no AVX, WASM only) can need many seconds per sentence:
    // don't leave the child in silence, let the browser voice take over.
    const timer = setTimeout(() => {
      if (gotAudio) return;
      kokoroSlowStrikes++;
      console.warn(
        `[voice] kokoro too slow (> ${KOKORO_FIRST_CHUNK_MS} ms for the first sentence), using the browser voice` +
          (kokoroSlowStrikes >= 2 ? "; natural voice turned off for this session" : ""),
      );
      cleanup();
      worker.postMessage({ type: "speak", id: -1, sentences: [], voice: KOKORO_VOICE, speed: 1 });
      resolve(false);
    }, KOKORO_FIRST_CHUNK_MS);
    const finishIfDone = () => {
      if (allQueued && activeSources.length === 0) markDone(token);
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data as {
        type: string;
        id?: number;
        audio?: Float32Array;
        sampleRate?: number;
      };
      if (m.id !== id) return;
      if (token !== playToken) {
        cleanup();
        resolve(gotAudio);
        return;
      }
      if (m.type === "chunk" && m.audio && m.sampleRate) {
        const buffer = ctx.createBuffer(1, m.audio.length, m.sampleRate);
        buffer.copyToChannel(new Float32Array(m.audio), 0);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        const at = Math.max(nextStart, ctx.currentTime + 0.02);
        src.start(at);
        nextStart = at + buffer.duration + 0.08; // small pause between sentences
        activeSources.push(src);
        src.onended = () => {
          activeSources = activeSources.filter((s) => s !== src);
          finishIfDone();
        };
        if (!gotAudio) {
          gotAudio = true;
          clearTimeout(timer);
          markSpeaking(token, "kokoro", opts.id);
          resolve(true);
        }
      } else if (m.type === "done" || m.type === "error") {
        allQueued = true;
        cleanup();
        finishIfDone();
        resolve(gotAudio);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({
      type: "speak",
      id,
      sentences,
      voice: KOKORO_VOICE,
      speed: opts.rate ?? 1,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Engine: Azure Speech via /api/tts (prepared, off by default)        */
/* ------------------------------------------------------------------ */

let azureUnavailable = false;

async function speakAzure(text: string, opts: SpeakOpts, token: number): Promise<boolean> {
  if (azureUnavailable) return false;
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang: currentLang() }),
  });
  if (res.status === 501) {
    azureUnavailable = true; // not configured on the server
    return false;
  }
  if (!res.ok || token !== playToken) return false;
  const blob = await res.blob();
  if (token !== playToken) return false;
  audioUrl = URL.createObjectURL(blob);
  audioEl = new Audio(audioUrl);
  audioEl.onended = () => markDone(token);
  try {
    await audioEl.play();
    emit({ engine: "azure", state: "ready" });
    markSpeaking(token, "azure", opts.id);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Engine: browser Web Speech (best voice available)                   */
/* ------------------------------------------------------------------ */

function voiceLangMatches(voiceLang: string, appLang: string): boolean {
  const v = voiceLang.toLowerCase().replace("_", "-");
  const a = appLang.toLowerCase();
  return v === a || v.startsWith(`${a}-`);
}

/** Novelty / compact voices sound like a robot — never pick them for kids. */
const ROBOTIC_VOICE =
  /compact|espeak|eloquent|mbrola|whisper|zarvox|trinoids|bad news|good news|bells|bubbles|cellos|organ|albert|fred|junior|kathy|princess|pipe organ|ralph|bruce|agnes|deranged|boing|hysterical|superstar|bahh|jester|flo|gordon|grandma|grandpa|reed|rocko|shelley|eddy|sandy/i;

/** Rank voices for the app language: neural/natural first, then known good ones. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = currentLang();
  if (!voiceLangMatches(v.lang, lang)) return -1;
  if (ROBOTIC_VOICE.test(v.name)) return -1;
  if (lang === "ar" && /ar[-_]AE/i.test(v.lang)) return 60 + (/natural|neural|google/i.test(v.name) ? 50 : 0);
  let s = 0;
  if (/natural|neural|online \(natural\)/i.test(v.name)) s += 80; // Edge / Windows neural
  if (/google/i.test(v.name) && !/compact/i.test(v.name)) s += 45; // Chrome cloud English
  if (/samantha|ava|allison|serena|karen|moira|tessa|siri|nicky|zoe/i.test(v.name)) s += 40; // Apple
  if (/aria|jenny|guy|ryan|sonia|emma|libby|maged|naayf|laila|tarik|salma|shakir/i.test(v.name)) s += 25;
  if (v.localService === false) s += 15; // cloud voices are usually less robotic
  if (lang === "en" && /en[-_]US/i.test(v.lang)) s += 5;
  if (lang === "en" && /en[-_]GB/i.test(v.lang)) s += 3;
  return s;
}

function bestBrowserVoice(): Promise<SpeechSynthesisVoice | null> {
  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    const ranked = voices
      .map((v) => ({ v, s: scoreVoice(v) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s);
    return ranked[0]?.v ?? null;
  };
  const now = pick();
  if (now || window.speechSynthesis.getVoices().length) return Promise.resolve(now);
  // Voices load async in Chrome; wait briefly.
  return new Promise((resolve) => {
    const done = () => resolve(pick());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 800);
  });
}

async function speakBrowser(text: string, opts: SpeakOpts, token: number): Promise<boolean> {
  if (!("speechSynthesis" in window)) return false;
  const voice = await bestBrowserVoice();
  if (token !== playToken) return false;
  const appLang = currentLang();
  const hasArabicScript = /[\u0600-\u06FF]/.test(text);
  // Never let an English (or missing) voice "read" Arabic — it comes out as nonsense syllables.
  if ((appLang === "ar" || hasArabicScript) && (!voice || !voiceLangMatches(voice.lang, "ar"))) {
    console.warn("[voice] no Arabic system voice installed; skip speak (install an Arabic voice, or set Azure TTS)");
    return false;
  }
  if (!voice && window.speechSynthesis.getVoices().length === 0) {
    // Typical on Linux without speech-dispatcher: the API exists but has no voices.
    console.warn("[voice] the browser has no speech voices installed");
  }
  const sentences = splitSentences(text);
  return new Promise<boolean>((resolve) => {
    let started = false;
    // If nothing starts within a few seconds, the browser cannot speak here.
    const timer = setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel();
        resolve(false);
      }
    }, 4000);
    // One utterance per sentence: avoids Chrome cutting long text and sounds less flat.
    sentences.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      // Flat rate/pitch reads more natural than the old slightly pitched "kid" settings.
      u.rate = opts.rate ?? 1;
      u.pitch = opts.pitch ?? 1;
      u.lang = voice?.lang ?? langInfo(appLang).speech;
      if (voice) {
        try {
          u.voice = voice;
        } catch {
          /* unusual voice object: keep the default voice for this language */
        }
      }
      u.onstart = () => {
        if (started) return;
        started = true;
        clearTimeout(timer);
        emit({ engine: "browser", state: "ready" });
        markSpeaking(token, "browser", opts.id);
        resolve(true);
      };
      if (i === sentences.length - 1) u.onend = () => markDone(token);
      u.onerror = (e) => {
        if (!started && e.error !== "interrupted" && e.error !== "canceled") {
          clearTimeout(timer);
          resolve(false);
        }
      };
      window.speechSynthesis.speak(u);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Mic input (unchanged behaviour)                                     */
/* ------------------------------------------------------------------ */

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, MessageKey> = {
  "not-allowed": "mic.notAllowed",
  network: "mic.network",
  "service-not-allowed": "mic.serviceNotAllowed",
  "audio-capture": "mic.audioCapture",
  "language-not-supported": "mic.langNotSupported",
};

export type DictationHandle = {
  /** Child tapped "Done": stop listening and deliver the final text via onDone. */
  finish: () => void;
  /** Child tapped "Cancel": stop and discard. */
  cancel: () => void;
};

/** Chrome Arabic tags vary; try UAE first, then other common dialects. */
const ARABIC_SPEECH_LANGS = ["ar-AE", "ar-SA", "ar-EG", "ar"] as const;

function speechLangCandidates(preferred?: string): string[] {
  const primary = preferred || langInfo(currentLang()).speech;
  if (!primary.toLowerCase().startsWith("ar")) return [primary];
  const rest = ARABIC_SPEECH_LANGS.filter((l) => l.toLowerCase() !== primary.toLowerCase());
  return [primary, ...rest];
}

/** After the child has spoken, this long a quiet pause means they finished → auto-send. */
const SILENCE_SEND_MS = 2000;
/** If nothing was heard at all, stop and ask them to try again / type. */
const EMPTY_GIVE_UP_MS = 12000;

/**
 * Tap-to-talk dictation for kids.
 * - One tap starts listening.
 * - After they speak, a ~2s pause auto-sends the question (no second tap needed).
 * - Done still works as an optional "send now"; Cancel discards.
 * - Streams live transcript + mic level for the UI meter.
 * - Arabic: tries several speech locale tags if the browser rejects one.
 */
export function startDictation(options: {
  onText: (text: string) => void;
  onLevel?: (level: number) => void;
  /** True when a pause is about to auto-send (UI can say "Sending…"). */
  onAutoSendSoon?: () => void;
  onDone: (text: string) => void;
  onError: (message: string) => void;
  lang?: string;
}): DictationHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    options.onError(t("mic.needsBrowser", undefined, currentLang()));
    return null;
  }

  const langs = speechLangCandidates(options.lang);
  let langIndex = 0;
  let finalText = "";
  let interimText = "";
  let active = true; // false once finished/cancelled
  let delivering = false; // finish / auto-send: deliver on the next end
  let deliverTimer: ReturnType<typeof setTimeout> | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let emptyTimer: ReturnType<typeof setTimeout> | null = null;
  let stream: MediaStream | null = null;
  let levelCtx: AudioContext | null = null;
  let raf = 0;
  let heardSpeech = false;
  let autoSoonTold = false;
  const isArabic = langs[0].toLowerCase().startsWith("ar");

  const text = () => `${finalText} ${interimText}`.replace(/\s+/g, " ").trim();

  const recognition = new Ctor();
  recognition.lang = langs[langIndex];
  recognition.interimResults = true;
  // Arabic is more reliable as utterance chunks; English keeps continuous for long pauses.
  recognition.continuous = !isArabic;
  recognition.maxAlternatives = 1;

  function clearWatchers() {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (emptyTimer) clearTimeout(emptyTimer);
    if (deliverTimer) clearTimeout(deliverTimer);
    silenceTimer = null;
    emptyTimer = null;
    deliverTimer = null;
  }

  function requestFinish() {
    if (!active || delivering) return;
    delivering = true;
    clearWatchers();
    try {
      recognition.stop();
    } catch {
      deliverDone();
    }
  }

  /** After words arrive, wait for a pause, then send by itself. */
  function armSilenceSend() {
    if (!active || delivering || !heardSpeech) return;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (!active || delivering) return;
      if (!text()) return;
      if (!autoSoonTold) {
        autoSoonTold = true;
        options.onAutoSendSoon?.();
      }
      requestFinish();
    }, SILENCE_SEND_MS);
  }

  recognition.onresult = (event) => {
    interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const piece = r[0]?.transcript ?? "";
      if (r.isFinal) finalText = `${finalText} ${piece}`;
      else interimText += piece;
    }
    const next = text();
    if (next) {
      heardSpeech = true;
      autoSoonTold = false;
      if (emptyTimer) {
        clearTimeout(emptyTimer);
        emptyTimer = null;
      }
      armSilenceSend();
    }
    options.onText(next);
  };

  recognition.onerror = (event) => {
    const err = event.error;
    if (err === "aborted") return;
    if (err === "no-speech") {
      // Browser heard only silence for a stretch — if we already have words, send them.
      if (heardSpeech && text()) {
        requestFinish();
      }
      return;
    }
    // Try the next Arabic dialect tag before giving up.
    if (err === "language-not-supported" && langIndex < langs.length - 1) {
      langIndex += 1;
      recognition.lang = langs[langIndex];
      return;
    }
    active = false;
    clearWatchers();
    cleanupLevel();
    options.onError(t(MIC_ERRORS[err] ?? "mic.failed", undefined, currentLang()));
  };

  function deliverDone() {
    clearWatchers();
    delivering = false;
    active = false;
    cleanupLevel();
    options.onDone(text());
  }

  recognition.onend = () => {
    if (delivering) {
      // Chrome often finalizes the last bit after stop(); give it a short beat.
      if (text()) {
        deliverDone();
        return;
      }
      if (!deliverTimer) {
        deliverTimer = setTimeout(deliverDone, 450);
      }
      return;
    }
    // Browser ended on its own (common after a pause). If we have words, send;
    // otherwise keep listening so a shy child can still start.
    if (active) {
      if (heardSpeech && text()) {
        requestFinish();
        return;
      }
      try {
        recognition.start();
      } catch {
        /* already starting */
      }
    }
  };

  function cleanupLevel() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    void levelCtx?.close().catch(() => {});
    levelCtx = null;
    options.onLevel?.(0);
  }

  // Live volume meter (separate from recognition; purely visual).
  // Start after recognition so a second getUserMedia does not steal the first audio frame
  // (Arabic speech recognition is especially sensitive to that race on some browsers).
  if (options.onLevel && navigator.mediaDevices?.getUserMedia) {
    window.setTimeout(() => {
      if (!active) return;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          if (!active) {
            s.getTracks().forEach((track) => track.stop());
            return;
          }
          stream = s;
          levelCtx = new AudioContext();
          const analyser = levelCtx.createAnalyser();
          analyser.fftSize = 512;
          levelCtx.createMediaStreamSource(s).connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          let last = 0;
          const tick = (now: number) => {
            if (!active && !delivering) return;
            if (now - last > 60) {
              last = now;
              analyser.getByteTimeDomainData(data);
              let sum = 0;
              for (const v of data) sum += ((v - 128) / 128) ** 2;
              const rms = Math.sqrt(sum / data.length);
              options.onLevel?.(Math.min(1, rms * 4));
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        })
        .catch(() => {
          /* meter is optional; recognition still works */
        });
    }, isArabic ? 400 : 0);
  }

  try {
    recognition.start();
  } catch {
    options.onError(t("mic.failed", undefined, currentLang()));
    return null;
  }

  emptyTimer = setTimeout(() => {
    if (!active || delivering || heardSpeech) return;
    requestFinish(); // onDone("") → micNoCatch UI
  }, EMPTY_GIVE_UP_MS);

  return {
    finish: () => requestFinish(),
    cancel: () => {
      active = false;
      delivering = false;
      clearWatchers();
      cleanupLevel();
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
