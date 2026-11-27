import { defaultReadingLevel, defaultReadingLevelFromAge } from "./grades";
import { loadProfile } from "./household";
import type { ParentProfile, ReadingLevel } from "./types";

export function isReadingLevel(value: unknown): value is ReadingLevel {
  return value === "not-yet" || value === "with-help" || value === "alone";
}

export function normalizeReadingLevel(
  value: unknown,
  gradeLabel: string,
  age?: string,
): ReadingLevel {
  if (isReadingLevel(value)) return value;
  if (age && /^\d{1,2}$/.test(age.trim())) return defaultReadingLevelFromAge(age);
  return defaultReadingLevel(gradeLabel);
}

export function profileReadingLevel(profile: ParentProfile = loadProfile()): ReadingLevel {
  return normalizeReadingLevel(profile.readingLevel, profile.gradeLabel, profile.age);
}

/** Less on-screen prose for weak readers (any ageMode). */
export function wantsMinimalText(level: ReadingLevel): boolean {
  return level === "not-yet" || level === "with-help";
}

/** School Reading: slower default pace + clearer karaoke for emerging readers. */
export function readingSpeechRate(level: ReadingLevel): number {
  if (level === "not-yet") return 0.8;
  if (level === "with-help") return 0.9;
  return 1;
}
