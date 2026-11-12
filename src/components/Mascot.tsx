"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerSpeech, getSpeech, subscribeSpeech } from "@/lib/voice";

export type MascotState = "idle" | "happy" | "listening" | "thinking" | "speaking";

/** Owl frames cut from Anastasia's character sheets (public/art/owl, same canvas size). */
const FRAMES = {
  idle: "/art/owl/idle.webp",
  happy: "/art/owl/happy.webp",
  listen: "/art/owl/listen.webp",
  think: "/art/owl/think.webp",
  talk1: "/art/owl/talk-1.webp",
  talk2: "/art/owl/talk-2.webp",
} as const;
type Frame = keyof typeof FRAMES;

/** Mouth shapes while talking — talk frames only; hard-cut swaps (no opacity fade). */
const TALK: Frame[] = ["talk1", "talk2"];

let framesWarmed = false;
function warmFrames() {
  if (framesWarmed || typeof window === "undefined") return;
  framesWarmed = true;
  (Object.values(FRAMES) as string[]).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

/**
 * Wondrix, alive with the conversation:
 * idle · happy · listening · thinking · speaking (beak open/close).
 * One opaque image at a time — no cross-fades (those washed the colors out).
 */
export function Mascot({ busy, listening, happy = false }: { busy: boolean; listening: boolean; happy?: boolean }) {
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const state: MascotState = listening
    ? "listening"
    : speech.state === "speaking"
      ? "speaking"
      : busy || speech.state === "preparing"
        ? "thinking"
        : happy
          ? "happy"
          : "idle";

  const [tick, setTick] = useState(0);
  useEffect(() => {
    warmFrames();
  }, []);
  useEffect(() => {
    if (state !== "speaking") return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 160);
    return () => clearInterval(id);
  }, [state]);

  const frame: Frame =
    state === "speaking"
      ? TALK[tick % TALK.length]
      : state === "listening"
        ? "listen"
        : state === "thinking"
          ? "think"
          : state === "happy"
            ? "happy"
            : "idle";

  // Side poses (think / listen) are drawn looking right; the bubble sits on the start side,
  // so mirror them in LTR so Wondrix looks toward the chat (RTL undoes the flip).
  const faceChat = frame === "think" || frame === "listen";

  return (
    <div className={`wx-mascot wx-mascot-${state} relative h-28 w-24 shrink-0 sm:h-40 sm:w-36`} data-state={state} data-frame={frame}>
      <div className="wx-mascot-glow absolute inset-x-2 bottom-2 top-6 rounded-full" aria-hidden />
      <div className="wx-mascot-body absolute inset-0" role="img" aria-label="Wondrix">
        {/* Single opaque img — hard-cut src swap. Stacked opacity fades made the owl look washed out. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FRAMES[frame]}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain object-bottom opacity-100 ${
            faceChat ? "-scale-x-100 rtl:scale-x-100" : ""
          }`}
        />
      </div>
      {state === "thinking" ? (
        <div className="wx-mascot-dots absolute -top-1 start-0 flex gap-1 rounded-full bg-card px-2 py-1 shadow" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {state === "speaking" ? (
        <svg className="wx-mascot-waves absolute -end-3 top-6 h-10 w-6 text-extra" viewBox="0 0 24 40" aria-hidden>
          <path d="M4 14 q6 6 0 12" />
          <path d="M10 9 q10 11 0 22" />
          <path d="M16 4 q14 16 0 32" />
        </svg>
      ) : null}
    </div>
  );
}
