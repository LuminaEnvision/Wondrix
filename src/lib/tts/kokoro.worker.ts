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

/** True only if the browser really hands out a WebGPU adapter (old GPUs often don't). */
async function webgpuUsable(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function onProgress(p: { status?: string; file?: string; loaded?: number; total?: number }) {
  // Several files download in parallel; report one overall % that never goes backwards.
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
}

async function loadModel(): Promise<KokoroTTS> {
  // WebGPU (fp32) when a real adapter exists; otherwise, or if it fails, WASM (q8, smaller).
  if (await webgpuUsable()) {
    try {
      return await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "fp32",
        device: "webgpu",
        progress_callback: onProgress,
      });
    } catch (err) {
      console.warn("[kokoro] WebGPU failed, falling back to WASM", err);
      files.clear();
      lastPct = 0;
    }
  }
  return KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: "q8",
    device: "wasm",
    progress_callback: onProgress,
  });
}

function load(): Promise<KokoroTTS> {
  if (ttsPromise) return ttsPromise;
  ctx.postMessage({ type: "status", status: "loading", progress: 0 });
  ttsPromise = loadModel()
    .then((tts) => {
      ctx.postMessage({ type: "status", status: "ready" });
      return tts;
    })
    .catch((err: unknown) => {
      ttsPromise = null;
      // Log the real reason in the browser console (DevTools → Console) for diagnosis.
      console.error("[kokoro] natural voice could not load", err);
      ctx.postMessage({ type: "status", status: "failed" });
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
