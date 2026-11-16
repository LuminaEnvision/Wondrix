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
  talk0: "/art/owl/talk-0.webp",
  talk1: "/art/owl/talk-1.webp",
  talk2: "/art/owl/talk-2.webp",
} as const;
type Frame = keyof typeof FRAMES;

/** Mouth shapes while talking — closed → half → open → half (hard-cut swaps). */
const TALK: Frame[] = ["talk0", "talk1", "talk2", "talk1"];

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
export function Mascot({
  busy,
  listening,
  happy = false,
  size = "lg",
  speechId,
  followSpeech = true,
}: {
  busy: boolean;
  listening: boolean;
  happy?: boolean;
  /** lg = hero; md = chat bubble; sm = compact */
  size?: "lg" | "md" | "sm";
  /**
   * When set, mouth only syncs while this speech id is active
   * (so only one chat owl talks — not every bubble).
   */
  speechId?: string;
  /** Sync mouth to TTS (default true). */
  followSpeech?: boolean;
}) {
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const activeSpeechId = "id" in speech ? speech.id : undefined;
  const idMatches = speechId == null || activeSpeechId === speechId;
  // Mouth only while audio is actually playing — not during prepare / unavailable.
  const isSpeaking =
    followSpeech && speech.state === "speaking" && idMatches;
  const isPreparing =
    followSpeech && speech.state === "preparing" && idMatches;

  const state: MascotState = listening
    ? "listening"
    : isSpeaking
      ? "speaking"
      : busy || isPreparing
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
    const id = setInterval(() => setTick((t) => t + 1), 140);
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
  const box =
    size === "sm"
      ? "h-9 w-9 shrink-0"
      : size === "md"
        ? "h-14 w-12 shrink-0 sm:h-16 sm:w-14"
        : "h-28 w-24 shrink-0 sm:h-40 sm:w-36";
  const showFx = size === "lg" || size === "md";

  return (
    <div className={`wx-mascot wx-mascot-${state} relative ${box}`} data-state={state} data-frame={frame} data-size={size}>
      {size === "lg" ? (
        <div className="wx-mascot-glow absolute inset-x-2 bottom-2 top-6 rounded-full" aria-hidden />
      ) : null}
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
      {showFx && state === "thinking" ? (
        <div
          className={`wx-mascot-dots absolute -top-1 start-0 flex gap-1 rounded-full bg-card px-2 py-1 shadow ${
            size === "md" ? "scale-75 origin-bottom-start" : ""
          }`}
          aria-hidden
        >
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {showFx && state === "speaking" ? (
        <svg
          className={`wx-mascot-waves absolute text-extra ${
            size === "md" ? "-end-2 top-3 h-7 w-4" : "-end-3 top-6 h-10 w-6"
          }`}
          viewBox="0 0 24 40"
          aria-hidden
        >
          <path d="M4 14 q6 6 0 12" />
          <path d="M10 9 q10 11 0 22" />
          <path d="M16 4 q14 16 0 32" />
        </svg>
      ) : null}
    </div>
  );
}
