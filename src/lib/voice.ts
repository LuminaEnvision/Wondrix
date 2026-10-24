/** Browser voice helpers (Web Speech API). Works in Chrome/Edge/Safari; needs mic permission. */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getRecognitionCtor());
}

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Speak text out loud (kids-friendly pace). */
export function speak(text: string, opts?: { rate?: number; pitch?: number }) {
  if (!canSpeak()) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts?.rate ?? 0.95;
  u.pitch = opts?.pitch ?? 1.05;
  u.lang = "en-US";
  // Prefer a softer English voice when available
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en(-|_)US/i.test(v.lang) && /female|samantha|google us/i.test(v.name)) ||
    voices.find((v) => /en(-|_)GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
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
