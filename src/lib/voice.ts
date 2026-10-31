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
 */

type Engine = "kokoro" | "azure" | "browser";

export type VoiceStatus =
  | { engine: Engine; state: "idle" | "ready" | "failed" }
  | { engine: "kokoro"; state: "loading"; progress: number };

type SpeakOpts = { rate?: number; pitch?: number };

const KOKORO_VOICE = process.env.NEXT_PUBLIC_KOKORO_VOICE || "af_heart";

function engineChain(): Engine[] {
  const primary = (process.env.NEXT_PUBLIC_TTS_ENGINE || "kokoro").toLowerCase() as Engine;
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
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Public speak / stop                                                 */
/* ------------------------------------------------------------------ */

export function stopSpeaking() {
  playToken++;
  stopAllAudio();
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
  void (async () => {
    for (const engine of engineChain()) {
      if (token !== playToken) return;
      try {
        const ok = await ENGINES[engine](text, opts ?? {}, token);
        if (ok) return;
      } catch {
        /* try next engine */
      }
    }
  })();
}

/** Start loading the natural voice early (call when a voice screen opens). */
export function warmUpVoice() {
  if (typeof window === "undefined") return;
  if (engineChain().includes("kokoro")) getKokoroWorker()?.postMessage({ type: "load" });
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
}

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

function getKokoroWorker(): Worker | null {
  if (kokoroState === "failed") return null;
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
        };
        if (!gotAudio) {
          gotAudio = true;
          resolve(true);
        }
      } else if (m.type === "done" || m.type === "error") {
        cleanup();
        resolve(gotAudio);
      }
    };
    const cleanup = () => worker.removeEventListener("message", onMessage);
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

async function speakAzure(text: string, _opts: SpeakOpts, token: number): Promise<boolean> {
  if (azureUnavailable) return false;
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
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
  try {
    await audioEl.play();
    emit({ engine: "azure", state: "ready" });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Engine: browser Web Speech (best voice available)                   */
/* ------------------------------------------------------------------ */

/** Rank voices: neural/natural first, then known good ones, then any English. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  if (!/^en/i.test(v.lang)) return -1;
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 50; // Edge "Microsoft Aria Online (Natural)"
  if (/google/i.test(v.name)) s += 30; // Chrome "Google US English"
  if (/samantha|ava|allison|serena|karen|moira|tessa/i.test(v.name)) s += 25; // Apple
  if (/aria|jenny|ana|emma|libby|sonia/i.test(v.name)) s += 10; // friendly Microsoft voices
  if (/en[-_]US/i.test(v.lang)) s += 5;
  if (/en[-_]GB/i.test(v.lang)) s += 3;
  if (/compact|espeak/i.test(v.name)) s -= 40; // robotic
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
  // One utterance per sentence: avoids Chrome cutting long text and sounds less flat.
  for (const sentence of splitSentences(text)) {
    const u = new SpeechSynthesisUtterance(sentence);
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.05;
    u.lang = voice?.lang ?? "en-US";
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }
  emit({ engine: "browser", state: "ready" });
  return true;
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

export type ListenHandle = {
  stop: () => void;
};

/** One-shot listen: returns transcript when the child finishes speaking. */
export function listenOnce(options: {
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  lang?: string;
}): ListenHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    options.onError?.("Voice input needs Chrome, Edge, or Safari.");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = options.lang ?? "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => options.onStart?.();
  recognition.onend = () => options.onEnd?.();
  recognition.onerror = (event) => {
    const err = event.error;
    if (err === "aborted" || err === "no-speech") {
      options.onEnd?.();
      return;
    }
    const messages: Record<string, string> = {
      "not-allowed": "Please allow the microphone in the browser.",
      network:
        "Voice listening needs internet (Chrome sends audio to a speech service). Try Chrome outside Cursor, check wifi, or type your question.",
      "service-not-allowed": "This browser blocked speech recognition. Try Chrome on localhost, or type instead.",
      "audio-capture": "No microphone found. Check your device, or type instead.",
      "language-not-supported": "This language is not supported for voice. Type instead.",
    };
    options.onError?.(messages[err] ?? `Mic issue (${err}). You can still type your question.`);
    options.onEnd?.();
  };
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (text) options.onResult(text);
  };

  try {
    recognition.start();
  } catch {
    options.onError?.("Could not start the microphone.");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
