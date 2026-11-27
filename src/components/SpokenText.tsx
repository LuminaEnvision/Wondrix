"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerSpeech, getSpeech, subscribeSpeech } from "@/lib/voice";

/**
 * Large answer text that highlights words while Wondrix is speaking this id.
 */
export function SpokenText({
  id,
  text,
  className = "",
}: {
  id: string;
  text: string;
  className?: string;
}) {
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const mine = "id" in speech && speech.id === id && speech.state === "speaking";
  const words = text.trim().split(/\s+/).filter(Boolean);
  const runKey = mine && words.length > 0 ? `${id}:${text}` : "";
  const [idx, setIdx] = useState(-1);
  const [activeRun, setActiveRun] = useState("");

  // Reset highlight when this utterance starts or stops (render-time adjust).
  if (runKey !== activeRun) {
    setActiveRun(runKey);
    setIdx(runKey ? 0 : -1);
  }

  useEffect(() => {
    if (!runKey) return;
    const step = Math.max(280, Math.min(900, 4500 / Math.max(1, words.length)));
    const timer = window.setInterval(() => {
      setIdx((i) => (i + 1 >= words.length ? words.length - 1 : i + 1));
    }, step);
    return () => window.clearInterval(timer);
  }, [runKey, words.length]);

  return (
    <p dir="auto" className={className}>
      {words.map((w, i) => (
        <span
          key={`${i}-${w}`}
          className={
            mine && i === idx
              ? "rounded bg-[color-mix(in_srgb,var(--world-accent)_28%,transparent)] px-0.5 font-bold"
              : undefined
          }
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
