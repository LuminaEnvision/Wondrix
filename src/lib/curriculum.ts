/**
 * School curriculum (docs/CURRICULUM_RESEARCH.md).
 *
 * Dubai families follow many curricula (KHDA 2024-25: UK 37%, Indian 26%, US 14%, IB 7%...).
 * Content overlaps a lot (all are benchmarked on TIMSS), but GRADE NAMES and ages differ:
 * UK Year N ≈ US / IB / CBSE / UAE Grade (or Class) N-1.
 *
 * Wondrix keeps ONE internal grade scale (UK-style ids y1-2 … y11+, stored as gradeLabel)
 * and ONE question bank. The curriculum only changes how the grade is shown and how the AI
 * talks (grade name, spelling).
 */

import { gradeFromLabel, TEEN_GRADE_IDS } from "./grades";
import { CURRICULUM_LABELS_AR, GRADE_AGES_AR, GRADE_BLURBS_AR, GRADE_NAMES_AR } from "./i18n/content-ar";

type Lang = "en" | "ar";

export type Curriculum = "uk" | "us" | "indian" | "ib" | "uae" | "saudi" | "other";

export const DEFAULT_CURRICULUM: Curriculum = "uk";

export const CURRICULA: { id: Curriculum; label: string }[] = [
  { id: "uk", label: "British (UK National Curriculum)" },
  { id: "us", label: "American (US)" },
  { id: "indian", label: "Indian (CBSE / ICSE)" },
  { id: "ib", label: "International Baccalaureate (IB PYP / MYP)" },
  { id: "uae", label: "UAE Ministry of Education" },
  { id: "saudi", label: "Saudi Ministry of Education" },
  { id: "other", label: "Other / not sure" },
];

export type GradeId = "y1-2" | "y3" | "y4" | "y5" | "y6" | "y7" | "y8" | "y9" | "y10" | "y11+";

const NAMES: Record<Curriculum, Record<GradeId, string>> = {
  uk: {
    "y1-2": "Year 1–2",
    y3: "Year 3",
    y4: "Year 4",
    y5: "Year 5",
    y6: "Year 6",
    y7: "Year 7",
    y8: "Year 8",
    y9: "Year 9",
    y10: "Year 10",
    "y11+": "Year 11–13",
  },
  other: {
    "y1-2": "Year 1–2",
    y3: "Year 3",
    y4: "Year 4",
    y5: "Year 5",
    y6: "Year 6",
    y7: "Year 7",
    y8: "Year 8",
    y9: "Year 9",
    y10: "Year 10",
    "y11+": "Year 11–13",
  },
  us: {
    "y1-2": "Kindergarten–Grade 1",
    y3: "Grade 2",
    y4: "Grade 3",
    y5: "Grade 4",
    y6: "Grade 5",
    y7: "Grade 6",
    y8: "Grade 7",
    y9: "Grade 8",
    y10: "Grade 9",
    "y11+": "Grade 10–12",
  },
  ib: {
    "y1-2": "Kindergarten–Grade 1",
    y3: "Grade 2",
    y4: "Grade 3",
    y5: "Grade 4",
    y6: "Grade 5",
    y7: "MYP 1 (Grade 6)",
    y8: "MYP 2 (Grade 7)",
    y9: "MYP 3 (Grade 8)",
    y10: "MYP 4 (Grade 9)",
    "y11+": "MYP 5 / DP (Grade 10–12)",
  },
  indian: {
    "y1-2": "UKG–Class 1",
    y3: "Class 2",
    y4: "Class 3",
    y5: "Class 4",
    y6: "Class 5",
    y7: "Class 6",
    y8: "Class 7",
    y9: "Class 8",
    y10: "Class 9",
    "y11+": "Class 10–12",
  },
  saudi: {
    "y1-2": "KG3–Grade 1",
    y3: "Grade 2",
    y4: "Grade 3",
    y5: "Grade 4",
    y6: "Grade 5",
    y7: "Grade 6",
    y8: "Grade 7",
    y9: "Grade 8",
    y10: "Grade 9",
    "y11+": "Grade 10–12",
  },
  uae: {
    "y1-2": "KG2–Grade 1",
    y3: "Grade 2",
    y4: "Grade 3",
    y5: "Grade 4",
    y6: "Grade 5",
    y7: "Grade 6",
    y8: "Grade 7",
    y9: "Grade 8",
    y10: "Grade 9",
    "y11+": "Grade 10–12",
  },
};

export const GRADE_AGES: Record<GradeId, string> = {
  "y1-2": "age 5–7",
  y3: "age 7–8",
  y4: "age 8–9",
  y5: "age 9–10",
  y6: "age 10–11",
  y7: "age 11–12",
  y8: "age 12–13",
  y9: "age 13–14",
  y10: "age 14–15",
  "y11+": "age 15–17",
};

export function asCurriculum(value: unknown): Curriculum {
  return CURRICULA.some((c) => c.id === value) ? (value as Curriculum) : DEFAULT_CURRICULUM;
}

export function curriculumLabel(c: Curriculum | undefined, lang: Lang = "en"): string {
  if (lang === "ar") return CURRICULUM_LABELS_AR[asCurriculum(c)];
  return CURRICULA.find((x) => x.id === asCurriculum(c))?.label ?? CURRICULA[0].label;
}

/** Grade name in the family's curriculum, e.g. ("Year 4", "us") → "Grade 3". */
export function gradeName(gradeLabelOrId: string, curriculum?: Curriculum, lang: Lang = "en"): string {
  const id = gradeFromLabel(gradeLabelOrId).id as GradeId;
  if (lang === "ar") return GRADE_NAMES_AR[asCurriculum(curriculum)][id] ?? gradeLabelOrId;
  return NAMES[asCurriculum(curriculum)][id] ?? gradeLabelOrId;
}

/** Short list of what a grade practices ("Measuring, fractions, living things"). */
export function gradeBlurb(gradeLabelOrId: string, lang: Lang = "en"): string {
  const g = gradeFromLabel(gradeLabelOrId);
  return lang === "ar" ? GRADE_BLURBS_AR[g.id] : g.blurb;
}

/** "Grade 3 (age 8–9)". */
export function gradeNameWithAge(gradeLabelOrId: string, curriculum?: Curriculum, lang: Lang = "en"): string {
  const id = gradeFromLabel(gradeLabelOrId).id as GradeId;
  return `${gradeName(gradeLabelOrId, curriculum, lang)} (${lang === "ar" ? GRADE_AGES_AR[id] : GRADE_AGES[id]})`;
}

/** One line for the AI prompts: grade name, curriculum, spelling. */
export function curriculumPromptLine(profile: {
  gradeLabel: string;
  curriculum?: Curriculum;
  language?: string;
  unitNote?: string;
}): string {
  const c = asCurriculum(profile.curriculum);
  const name = gradeName(profile.gradeLabel, c);
  const uk = gradeName(profile.gradeLabel, "uk");
  const english = c === "us" ? "American English (math, color)" : "British English (maths, colour)";
  const same = name === uk ? "" : ` (same level as UK ${uk})`;
  const spelling = profile.language === "ar" ? "" : ` and use ${english}`;
  const unit = profile.unitNote?.trim()
    ? ` The family says they are working on: "${profile.unitNote.trim().slice(0, 120)}". Prefer skills that match that unit when possible.`
    : "";
  return `School level: ${name}${same}, ${curriculumLabel(c)} curriculum. Call the level "${name}"${spelling}.${unit}`;
}

/**
 * Which subjects Parent should show for this programme + grade.
 * Math and science are practiceable now; others appear as "coming later".
 */
export function subjectsForProgramme(
  curriculum: Curriculum | undefined,
  gradeLabelOrId: string,
): import("./types").SubjectOffer[] {
  const c = asCurriculum(curriculum);
  const id = gradeFromLabel(gradeLabelOrId).id as GradeId;
  const offers: import("./types").SubjectOffer[] = [
    { id: "math", available: true },
    { id: "science", available: true },
  ];
  if (id !== "y1-2") {
    offers.push({ id: "english", available: false });
  }
  if (c === "uae" || c === "saudi") {
    offers.push({ id: "arabic", available: false });
  }
  const teenish = (TEEN_GRADE_IDS as readonly string[]).includes(id) || id === "y5" || id === "y6";
  if (teenish) {
    offers.push({ id: "social", available: false });
  }
  return offers;
}

/** Keep only practiceable subjects that are offered for this programme/grade. */
export function clampSubjectsToProgramme(
  subjects: Array<"math" | "science">,
  curriculum: Curriculum | undefined,
  gradeLabelOrId: string,
): Array<"math" | "science"> {
  const offered = new Set(
    subjectsForProgramme(curriculum, gradeLabelOrId)
      .filter((s) => s.available)
      .map((s) => s.id),
  );
  const next = subjects.filter((s) => offered.has(s)) as Array<"math" | "science">;
  return next.length ? next : ["math"];
}
