export type AgeBand = "young" | "middle" | "teen";

/**
 * UI chrome mode (separate from AI ageBand and from Reading level).
 * Little ≈ 5–7; Explorer ≈ 8–10; Teen ≈ 11–17 — tap size, nav, picture-first shell.
 */
export type AgeMode = "little" | "explorer" | "teen";

/**
 * How much text the child can handle (Reading difficulty + on-screen copy).
 * Independent of ageMode: a 9-year-old Explorer can still be "not-yet" or "with-help".
 */
export type ReadingLevel = "not-yet" | "with-help" | "alone";

/** Shell world for theming: home doors, school, wonder (extra), parent. */
export type WorldId = "home" | "school" | "wonder" | "parent";

export type SkillId =
  | "measure-length"
  | "halves-quarters"
  | "living-things"
  | "materials"
  | "day-night"
  | "add-within-100"
  | "shapes-angles"
  | "habitats"
  | "multiply-basics"
  | "fractions-compare"
  | "percentages"
  | "forces-motion"
  | "solar-system"
  | "algebra-intro"
  | "cells-micro"
  | "equations-linear"
  | "ratio-rate"
  | "stats-data"
  | "energy-electricity"
  | "chemical-reactions"
  | "genetics-intro";

export type MasteryLevel = "unknown" | "shaky" | "growing" | "secure";

export type SkillNode = {
  id: SkillId;
  title: string;
  subject: "math" | "science";
  prerequisites: SkillId[];
  /** Lowest grade id this skill is meant for */
  fromGrade: string;
};

export type RadarItem = {
  id: string;
  skillId: SkillId;
  prompt: string;
  choices: { id: string; label: string; correct: boolean }[];
  /** Grade ids that may see this item */
  grades: string[];
  explainCorrect: string;
  explainWrong: string;
};

export type ParentProfile = {
  /** Present when stored as a household child. */
  id?: string;
  childNickname: string;
  /** Parent-entered age (separate from grade/class). */
  age?: string;
  /** Child photo or chosen avatar (data URL or /public path). */
  avatarUrl?: string;
  /** School curriculum: changes grade names and AI wording only (see src/lib/curriculum.ts). */
  curriculum?: import("./curriculum").Curriculum;
  ageBand: AgeBand;
  /**
   * UI age mode (tap size, nav, owl role). Missing → derived from grade/age.
   * AI prompts still use ageBand.
   */
  ageMode?: AgeMode;
  /**
   * Reading difficulty / how much text to show. Missing → derived from age.
   * Does not change ageMode chrome by itself.
   */
  readingLevel?: ReadingLevel;
  /**
   * Dark surfaces for any age mode (Explorer or Teen).
   * Legacy profiles may still store this as `teenDark`.
   */
  darkMode?: boolean;
  /** @deprecated Prefer darkMode — kept for reading old localStorage. */
  teenDark?: boolean;
  gradeLabel: string;
  subjects: Array<"math" | "science">;
  oneLiner: string;
  calmMode: boolean;
  /**
   * Optional free-text unit/book note (e.g. "fractions chapter 4").
   * Steers AI wording only — not a textbook catalogue.
   */
  unitNote?: string;
  /** Up to five textbook / workbook photo data URLs. */
  textbookPhotos?: string[];
  /** App language (UI + Extra answers). Missing = English. */
  language?: import("./i18n").Lang;
};

/** One child in the household store. */
export type ChildProfile = ParentProfile & { id: string };

export type Household = {
  children: ChildProfile[];
  activeChildId: string | null;
};

export const MAX_TEXTBOOK_PHOTOS = 5;

/** Subject chip on Parent: practiceable now, or shown as coming later. */
export type SubjectOffer = {
  id: "math" | "science" | "english" | "arabic" | "social";
  available: boolean;
};

export const PROFILE_CHANGED_EVENT = "wondrix-profile-changed";

export function notifyProfileChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  }
}
