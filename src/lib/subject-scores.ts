import { SKILL_GRAPH } from "@/lib/skills";
import type { MasteryLevel, SkillId } from "@/lib/types";

const LEVEL_SCORE: Record<MasteryLevel, number> = {
  unknown: 35,
  shaky: 25,
  growing: 65,
  secure: 92,
};

/** 0–100 score per subject from mastery (missing skills count as unknown). */
export function subjectScores(
  mastery: Partial<Record<SkillId, MasteryLevel>>,
  subjects: Array<"math" | "science">,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const subject of subjects) {
    const skills = SKILL_GRAPH.filter((s) => s.subject === subject);
    if (!skills.length) {
      out[subject] = 0;
      continue;
    }
    let sum = 0;
    for (const s of skills) {
      sum += LEVEL_SCORE[mastery[s.id] ?? "unknown"];
    }
    out[subject] = Math.round(sum / skills.length);
  }
  return out;
}

/** Subjects that look neglected (low score or never practiced). */
export function neglectedSubjects(
  scores: Record<string, number>,
  threshold = 45,
): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score < threshold)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

const LAST_TOUCH_KEY = "wondrix-subject-touch";

export function markSubjectTouched(subject: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LAST_TOUCH_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[subject] = Date.now();
    localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Subjects not opened in `days` (default 5). */
export function staleSubjects(subjects: string[], days = 5): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LAST_TOUCH_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return subjects.filter((s) => !map[s] || map[s] < cutoff);
  } catch {
    return subjects;
  }
}
