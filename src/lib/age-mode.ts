import type { AgeMode } from "./types";

export function isAgeMode(value: unknown): value is AgeMode {
  return value === "little" || value === "explorer" || value === "teen";
}

export function isLittle(mode: AgeMode | null | undefined): boolean {
  return mode === "little";
}

export function isTeen(mode: AgeMode | null | undefined): boolean {
  return mode === "teen";
}

/** Explorer only — not Little. */
export function isExplorer(mode: AgeMode | null | undefined): boolean {
  return mode === "explorer";
}

/** Chunkier child chrome (Little or Explorer). */
export function isChildChrome(mode: AgeMode | null | undefined): boolean {
  return mode === "little" || mode === "explorer";
}

/** Light haptic + optional click for Little taps. */
export function littleTapFeedback() {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}
