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
/** Whole model download + init; stalled HF/CDN connections used to hang forever. */
const LOAD_TIMEOUT_MS = 90_000;
/** If progress % never moves after load starts, treat as stuck. */
const LOAD_STALL_MS = 15_000;

let ttsPromise: Promise<KokoroTTS> | null = null;
const files = new Map<string, { loaded: number; total: number }>();
let lastPct = 0;
let currentId = 0;
/** Bumped when a load attempt is abandoned so late HF callbacks cannot revive UI. */
let loadGen = 0;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
let hardTimer: ReturnType<typeof setTimeout> | null = null;

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

function clearLoadWatches() {
  if (stallTimer) clearTimeout(stallTimer);
  if (hardTimer) clearTimeout(hardTimer);
  stallTimer = null;
  hardTimer = null;
}

function makeProgressCallback(gen: number, onProgressBump: () => void) {
  return (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
    if (gen !== loadGen) return;
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
      onProgressBump();
      ctx.postMessage({ type: "status", status: "loading", progress: pct });
    }
  };
}

async function loadModel(progress_callback: (p: {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
}) => void): Promise<KokoroTTS> {
  // WebGPU (fp32) when a real adapter exists; otherwise, or if it fails, WASM (q8, smaller).
  if (await webgpuUsable()) {
    try {
      return await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "fp32",
        device: "webgpu",
        progress_callback,
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
    progress_callback,
  });
}

function load(): Promise<KokoroTTS> {
  if (ttsPromise) return ttsPromise;
  const gen = ++loadGen;
  files.clear();
  lastPct = 0;
  ctx.postMessage({ type: "status", status: "loading", progress: 0 });

  ttsPromise = new Promise<KokoroTTS>((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      if (loadGen === gen) loadGen++; // invalidate late progress callbacks
      clearLoadWatches();
      reject(err);
    };

    const armStall = () => {
      if (settled || loadGen !== gen) return;
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        fail(new Error("Kokoro download stalled (no progress)"));
      }, LOAD_STALL_MS);
    };

    hardTimer = setTimeout(() => {
      fail(new Error("Kokoro download timed out"));
    }, LOAD_TIMEOUT_MS);
    armStall();

    const progress_callback = makeProgressCallback(gen, armStall);

    void loadModel(progress_callback)
      .then((tts) => {
        if (settled || loadGen !== gen) return;
        settled = true;
        clearLoadWatches();
        resolve(tts);
      })
      .catch((err: unknown) => {
        fail(err instanceof Error ? err : new Error(String(err)));
      });
  })
    .then((tts) => {
      clearLoadWatches();
      ctx.postMessage({ type: "status", status: "ready" });
      return tts;
    })
    .catch((err: unknown) => {
      clearLoadWatches();
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
