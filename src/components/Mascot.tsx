"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { getServerSpeech, getSpeech, subscribeSpeech } from "@/lib/voice";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Wondrix comes alive with the conversation: breathes gently when idle,
 * leans in while the mic listens, tilts with thinking dots while the answer
 * is coming, and bobs with sound waves while it speaks. Pure CSS on the
 * existing art (globals.css "wx-mascot"); still under reduced motion.
 * Later: swap in mouth frames from the illustrator for real lip movement.
 */
export function Mascot({ busy, listening }: { busy: boolean; listening: boolean }) {
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const state: MascotState = listening
    ? "listening"
    : speech.state === "speaking"
      ? "speaking"
      : busy || speech.state === "preparing"
        ? "thinking"
        : "idle";

  return (
    <div className={`wx-mascot wx-mascot-${state} relative h-28 w-24 shrink-0 sm:h-40 sm:w-36`} data-state={state}>
      <div className="wx-mascot-glow absolute inset-x-2 bottom-2 top-6 rounded-full" aria-hidden />
      <div className="wx-mascot-body absolute inset-0">
        <Image src="/art/mascot-hero.png" alt="Wondrix" fill className="object-contain object-bottom" sizes="144px" priority />
      </div>
      {state === "thinking" ? (
        <div className="wx-mascot-dots absolute -top-1 end-0 flex gap-1 rounded-full bg-card px-2 py-1 shadow" aria-hidden>
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
