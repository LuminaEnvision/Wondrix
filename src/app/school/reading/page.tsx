"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadProfile, profileAgeMode } from "@/lib/demo-store";
import { READING_STORIES } from "@/lib/reading-stories";
import { useHydrated, useT } from "@/lib/use-client-state";
import { speak, stopSpeaking, unlockAudio } from "@/lib/voice";

export default function ReadingPage() {
  const tr = useT();
  const hydrated = useHydrated();
  const story = READING_STORIES[0];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.9);
  const teen = hydrated ? profileAgeMode(loadProfile()) === "teen" : false;

  const speakCurrent = useCallback(
    (i: number) => {
      const sentence = story.sentences[i];
      if (!sentence) return;
      void unlockAudio();
      setPlaying(true);
      speak(sentence, {
        id: `read-${story.id}-${i}`,
        rate,
        onEnd: () => setPlaying(false),
      });
    },
    [rate, story],
  );

  useEffect(() => () => stopSpeaking(), []);

  function playFromHere() {
    speakCurrent(index);
  }

  function pause() {
    stopSpeaking();
    setPlaying(false);
  }

  function repeatLast() {
    const i = Math.max(0, index);
    speakCurrent(i);
  }

  function continueNext() {
    const next = Math.min(index + 1, story.sentences.length - 1);
    setIndex(next);
    speakCurrent(next);
  }

  return (
    <AppShell backHref="/school" world="school" dense={teen}>
      <div className="wx-enter space-y-5 pb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--world-ink)]">
            {tr("school.doorReading")}
          </h1>
          <p className="mt-1 text-sm text-[var(--world-ink-soft)]">{tr("reading.intro")}</p>
        </div>

        <div className="wx-reading-stage rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--school)]">
            {tr(story.titleKey)}
          </p>
          <div className="mt-4 space-y-3" aria-live="polite">
            {story.sentences.map((sentence, i) => (
              <button
                key={sentence}
                type="button"
                onClick={() => {
                  setIndex(i);
                  speakCurrent(i);
                }}
                className={`block w-full rounded-2xl px-3 py-2 text-start transition ${
                  i === index
                    ? "bg-[color-mix(in_srgb,var(--school)_18%,var(--world-surface))] font-semibold text-[var(--world-ink)] shadow-[var(--shadow-card)]"
                    : "text-[var(--world-ink-soft)]"
                } ${teen ? "text-base" : "text-lg"}`}
              >
                {sentence}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {playing ? (
            <button
              type="button"
              onClick={pause}
              className="rounded-full bg-[var(--school)] px-4 py-2 text-sm font-bold text-white"
            >
              {tr("reading.pause")}
            </button>
          ) : (
            <button
              type="button"
              onClick={playFromHere}
              className="rounded-full bg-[var(--school)] px-4 py-2 text-sm font-bold text-white"
            >
              {tr("reading.play")}
            </button>
          )}
          <button
            type="button"
            onClick={continueNext}
            className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-[var(--world-ink)]"
          >
            {tr("reading.continue")}
          </button>
          <button
            type="button"
            onClick={repeatLast}
            className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-[var(--world-ink)]"
          >
            {tr("reading.repeat")}
          </button>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--world-ink)]">
          <span className="font-bold text-[var(--world-ink-soft)]">{tr("reading.speed")}</span>
          <input
            type="range"
            min={0.7}
            max={1.2}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 font-semibold">{rate.toFixed(2)}×</span>
        </label>
      </div>
    </AppShell>
  );
}
