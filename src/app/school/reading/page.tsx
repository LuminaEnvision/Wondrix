"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/AppShell";
import { loadProfile, profileAgeMode } from "@/lib/demo-store";
import { READING_STORIES, storySentences } from "@/lib/reading-stories";
import {
  estimateLineMs,
  flattenSyllables,
  tokenizeForReading,
} from "@/lib/syllables";
import { useHydrated, useLang, useT } from "@/lib/use-client-state";
import {
  getServerSpeech,
  getSpeech,
  speak,
  stopSpeaking,
  subscribeSpeech,
  unlockAudio,
} from "@/lib/voice";

function SyllableLine({
  sentence,
  active,
  activeSyllable,
  teen,
}: {
  sentence: string;
  active: boolean;
  /** Flat syllable index within this sentence, or -1. */
  activeSyllable: number;
  teen: boolean;
}) {
  const tokens = tokenizeForReading(sentence);
  let sylCursor = 0;

  return (
    <span className={`${teen ? "text-base" : "text-lg"} leading-relaxed`}>
      {tokens.map((tok, ti) => {
        if (tok.kind === "gap") {
          return <span key={`g-${ti}`}>{tok.raw}</span>;
        }
        return (
          <span key={`w-${ti}`} className="inline-flex flex-wrap items-baseline">
            {tok.syllables.map((syl, si) => {
              const flat = sylCursor++;
              const on = active && flat === activeSyllable;
              const passed = active && activeSyllable >= 0 && flat < activeSyllable;
              return (
                <span key={`${ti}-${si}`} className="inline-flex items-baseline">
                  {si > 0 ? (
                    <span className="px-0.5 font-semibold text-[var(--school)] opacity-70" aria-hidden>
                      -
                    </span>
                  ) : null}
                  <span
                    className={`rounded-md px-0.5 transition ${
                      on
                        ? "bg-[var(--school)] font-bold text-white"
                        : passed
                          ? "bg-[color-mix(in_srgb,var(--school)_22%,transparent)] font-semibold text-[var(--world-ink)]"
                          : active
                            ? "text-[var(--world-ink)]"
                            : ""
                    }`}
                  >
                    {syl}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

export default function ReadingPage() {
  const tr = useT();
  const lang = useLang();
  const hydrated = useHydrated();
  const story = READING_STORIES[0];
  const lines = storySentences(story, lang);
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(0.9);
  const [activeSyllable, setActiveSyllable] = useState(-1);
  const teen = hydrated ? profileAgeMode(loadProfile()) === "teen" : false;
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const playing = (speech.state === "preparing" || speech.state === "speaking") &&
    Boolean(speech.id?.startsWith(`read-${story.id}-`));
  const timersRef = useRef<number[]>([]);
  const playIdRef = useRef<string | null>(null);

  // Keep line index valid when switching EN ↔ AR (different sentence counts).
  // Adjusted during render (React's "adjust state when props change" pattern), not in an effect.
  if (index > Math.max(0, lines.length - 1)) setIndex(Math.max(0, lines.length - 1));

  const clearHighlight = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setActiveSyllable(-1);
  }, []);

  const runSyllableHighlight = useCallback(
    (sentence: string, speechRate: number) => {
      clearHighlight();
      const parts = flattenSyllables(sentence);
      if (!parts.length) return;
      const totalWeight = parts.reduce((sum, p) => sum + Math.max(2, p.length), 0);
      const totalMs = estimateLineMs(sentence, speechRate);
      let elapsed = 80;
      parts.forEach((part, i) => {
        const share = Math.max(2, part.length) / totalWeight;
        const t = window.setTimeout(() => setActiveSyllable(i), elapsed);
        timersRef.current.push(t);
        elapsed += share * totalMs;
      });
      const done = window.setTimeout(() => setActiveSyllable(-1), elapsed + 40);
      timersRef.current.push(done);
    },
    [clearHighlight],
  );

  const speakCurrent = useCallback(
    (i: number) => {
      const sentence = lines[i];
      if (!sentence) return;
      void unlockAudio().then(() => {
        const id = `read-${story.id}-${i}`;
        playIdRef.current = id;
        clearHighlight();
        speak(sentence, {
          id,
          rate,
          lang,
          onEnd: () => {
            clearHighlight();
            playIdRef.current = null;
          },
        });
      });
    },
    [clearHighlight, lang, lines, rate, story.id],
  );

  // Re-sync highlight when the engine really starts (after Preparing…).
  useEffect(() => {
    if (speech.state !== "speaking") return;
    if (!("id" in speech) || speech.id !== playIdRef.current) return;
    const i = index;
    const sentence = lines[i];
    if (!sentence) return;
    const frame = requestAnimationFrame(() => runSyllableHighlight(sentence, rate));
    return () => cancelAnimationFrame(frame);
  }, [speech, index, rate, runSyllableHighlight, lines]);

  useEffect(() => () => {
    stopSpeaking();
    clearHighlight();
  }, [clearHighlight]);

  function playFromHere() {
    speakCurrent(index);
  }

  function pause() {
    stopSpeaking();
    clearHighlight();
    playIdRef.current = null;
  }

  function repeatLast() {
    speakCurrent(Math.max(0, index));
  }

  function continueNext() {
    const next = Math.min(index + 1, lines.length - 1);
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
            {lines.map((sentence, i) => (
              <button
                key={`${story.id}-${i}`}
                type="button"
                onClick={() => {
                  setIndex(i);
                  speakCurrent(i);
                }}
                className={`block w-full rounded-2xl px-3 py-2 text-start transition ${
                  i === index
                    ? "bg-[color-mix(in_srgb,var(--school)_18%,var(--world-surface))] shadow-[var(--shadow-card)]"
                    : "text-[var(--world-ink-soft)]"
                }`}
              >
                <SyllableLine
                  sentence={sentence}
                  active={i === index && playing}
                  activeSyllable={i === index ? activeSyllable : -1}
                  teen={teen}
                />
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
            onChange={(e) => {
              pause();
              setRate(Number(e.target.value));
            }}
            className="flex-1"
          />
          <span className="w-10 font-semibold">{rate.toFixed(2)}×</span>
        </label>
      </div>
    </AppShell>
  );
}
