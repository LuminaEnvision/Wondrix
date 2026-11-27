"use client";

import type { MouseEvent } from "react";
import { choiceEmoji } from "@/lib/choice-art";
import { useLang, useT } from "@/lib/use-client-state";
import { speak, unlockAudio } from "@/lib/voice";

const TILE_COLORS = ["#1A6B8A", "#0f6b63", "#b85c38", "#e8913a", "#5A6B6E"] as const;

/**
 * Picture-first answer for non-readers: big emoji, optional short label,
 * and a Listen control that speaks without selecting.
 */
export function PictureChoiceButton({
  id,
  label,
  index = 0,
  onChoose,
  disabled = false,
  hideLabel = false,
  dashed = false,
  selected = false,
  toneClassName,
}: {
  id: string;
  label: string;
  index?: number;
  onChoose: () => void;
  disabled?: boolean;
  /** Hide visible text (still spoken + in aria). */
  hideLabel?: boolean;
  dashed?: boolean;
  selected?: boolean;
  toneClassName?: string;
}) {
  const tr = useT();
  const lang = useLang();
  const emoji = choiceEmoji(label, index);
  const color = TILE_COLORS[index % TILE_COLORS.length]!;

  async function play(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    await unlockAudio();
    speak(label, { id: `choice-play-${id}`, lang });
  }

  return (
    <div
      className={`flex min-h-20 items-stretch gap-2 rounded-[1.5rem] border-2 bg-[var(--world-surface)] shadow-[var(--shadow-card)] ${
        dashed ? "border-dashed border-stroke" : "border-stroke"
      } ${selected ? "ring-2 ring-[var(--world-accent)]" : ""} ${toneClassName ?? ""}`}
    >
      <button
        type="button"
        data-testid="choice"
        disabled={disabled}
        onClick={onChoose}
        aria-label={label}
        className="wx-tap flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-start disabled:opacity-60"
      >
        <span
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl text-3xl text-white"
          style={{ background: color }}
          aria-hidden
        >
          {emoji}
        </span>
        {hideLabel ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="line-clamp-2 text-lg font-bold text-[var(--world-ink)]">{label}</span>
        )}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => void play(e)}
        aria-label={`${tr("common.playChoice")}: ${label}`}
        className="wx-tap flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-s border-stroke text-[var(--world-accent)] disabled:opacity-60"
      >
        <span className="text-2xl leading-none" aria-hidden>
          ▶
        </span>
        <span className="text-[0.65rem] font-bold uppercase tracking-wide">
          {tr("common.playChoice")}
        </span>
      </button>
    </div>
  );
}
