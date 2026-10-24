export type AgeBand = "young" | "middle" | "teen";

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
  | "cells-micro";

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
  childNickname: string;
  ageBand: AgeBand;
  gradeLabel: string;
  subjects: Array<"math" | "science">;
  oneLiner: string;
  calmMode: boolean;
};

export const PROFILE_CHANGED_EVENT = "wondrix-profile-changed";

export function notifyProfileChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  }
}
