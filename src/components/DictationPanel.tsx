"use client";

import { useT } from "@/lib/use-client-state";

/**
 * What the child sees while the mic is on:
 * a live volume meter (proof the mic hears them), the words so far,
 * a timer, a gentle "take your time" hint, and big Done / Cancel buttons.
 * Nothing is sent until the child taps Done.
 */
export function DictationPanel({
  text,
  levels,
  seconds,
  quiet,
  onDone,
  onCancel,
}: {
  text: string;
  /** Recent mic levels, 0..1, oldest first. */
  levels: number[];
  seconds: number;
  /** No sound for a while: show the reassuring hint. */
  quiet: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const tr = useT();
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div
      className="space-y-3 rounded-3xl border-2 border-extra/40 bg-card p-4"
      role="region"
      aria-label={tr("dict.region")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-extra" role="status" aria-live="polite">
          <span className="relative inline-flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-extra opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-extra" />
          </span>
          {tr("dict.listening")}
        </p>
        <span className="font-mono text-sm text-ink-soft" aria-label={tr("dict.time")} dir="ltr">
          {mm}:{ss}
        </span>
      </div>

      {/* Live volume meter */}
      <div className="flex h-12 items-center justify-center gap-1" aria-hidden data-testid="mic-meter">
        {levels.map((l, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-extra transition-[height] duration-75"
            style={{ height: `${Math.max(8, Math.round(l * 100))}%`, opacity: 0.35 + l * 0.65 }}
          />
        ))}
      </div>

      <p className="min-h-[1.5rem] text-center text-ink" data-testid="dictation-text">
        {text ? `“${text}”` : <span className="text-ink-soft">{tr("dict.prompt")}</span>}
      </p>

      <p className="text-center text-xs text-ink-soft">
        {quiet
          ? tr("dict.quietHint")
          : tr("dict.hint")}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-stroke bg-card py-3 font-bold text-ink-soft"
        >
          {tr("dict.cancel")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-[2] rounded-full bg-extra py-3 font-bold text-white"
        >
          {tr("dict.done")}
        </button>
      </div>
    </div>
  );
}
