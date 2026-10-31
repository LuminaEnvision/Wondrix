/// <reference lib="webworker" />
/**
 * Kokoro TTS worker: runs the 82M Kokoro model fully in the browser
 * (WebGPU when available, otherwise WASM), off the main thread.
 *
 * The model (~80 MB q8 on WASM) is downloaded once from Hugging Face and
 * cached by the browser. No API key, no server, audio never leaves the device.
 *
 * Protocol:
 *   in:  { type: "load" } | { type: "speak", id, sentences, voice, speed }
 *   out: { type: "status", status, progress? } |
 *        { type: "chunk", id, index, audio: Float32Array, sampleRate } |
 *        { type: "done", id } | { type: "error", id?, message }
 */

import { KokoroTTS } from "kokoro-js";

type InMsg =
  | { type: "load" }
  | { type: "speak"; id: number; sentences: string[]; voice: string; speed: number };

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

let ttsPromise: Promise<KokoroTTS> | null = null;
const files = new Map<string, { loaded: number; total: number }>();
let lastPct = 0;
let currentId = 0;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function load(): Promise<KokoroTTS> {
  if (ttsPromise) return ttsPromise;
  const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
  ctx.postMessage({ type: "status", status: "loading", progress: 0 });
  ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
    // fp32 is recommended on WebGPU; q8 keeps the WASM download small.
    dtype: hasWebGPU ? "fp32" : "q8",
    device: hasWebGPU ? "webgpu" : "wasm",
    // Several files download in parallel; report one overall % that never goes backwards.
    progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let loaded = 0;
      let total = 0;
      files.forEach((f) => {
        loaded += f.loaded;
        total += f.total;
      });
      const pct = Math.min(99, Math.round((loaded / total) * 100));
      if (pct > lastPct) {
        lastPct = pct;
        ctx.postMessage({ type: "status", status: "loading", progress: pct });
      }
    },
  })
    .then((tts) => {
      ctx.postMessage({ type: "status", status: "ready" });
      return tts;
    })
    .catch((err: unknown) => {
      ttsPromise = null;
      ctx.postMessage({
        type: "status",
        status: "failed",
      });
      throw err;
    });
  return ttsPromise;
}

ctx.onmessage = async (event: MessageEvent<InMsg>) => {
  const msg = event.data;
  if (msg.type === "load") {
    load().catch(() => {});
    return;
  }
  if (msg.type !== "speak") return;

  // A newer request cancels older ones between sentences.
  // An empty request is a pure "stop" and must not trigger the model download.
  currentId = msg.id;
  if (!msg.sentences.length) return;
  try {
    const tts = await load();
    for (let index = 0; index < msg.sentences.length; index++) {
      if (currentId !== msg.id) return;
      const audio = await tts.generate(msg.sentences[index], {
        // Voice ids are validated by kokoro-js; the env value is trusted config.
        voice: msg.voice as "af_heart",
        speed: msg.speed,
      });
      if (currentId !== msg.id) return;
      const samples = audio.audio as Float32Array;
      ctx.postMessage(
        { type: "chunk", id: msg.id, index, audio: samples, sampleRate: audio.sampling_rate },
        [samples.buffer],
      );
    }
    ctx.postMessage({ type: "done", id: msg.id });
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : "Kokoro failed",
    });
  }
};
