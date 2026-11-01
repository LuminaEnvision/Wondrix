/**
 * School curriculum (docs/CURRICULUM_RESEARCH.md).
 *
 * Dubai families follow many curricula (KHDA 2024-25: UK 37%, Indian 26%, US 14%, IB 7%...).
 * Content overlaps a lot (all are benchmarked on TIMSS), but GRADE NAMES and ages differ:
 * UK Year N ≈ US / IB / CBSE / UAE Grade (or Class) N-1.
 *
 * Wondrix keeps ONE internal grade scale (the UK-style ids y1-2 … y7+, stored as gradeLabel)
 * and ONE question bank. The curriculum only changes how the grade is shown and how the AI
 * talks (grade name, spelling). Grade equivalences are "background" in the research doc:
 * verify before the final submission.
 */

import { gradeFromLabel } from "./grades";

export type Curriculum = "uk" | "us" | "indian" | "ib" | "uae" | "other";

export const DEFAULT_CURRICULUM: Curriculum = "uk";

export const CURRICULA: { id: Curriculum; label: string }[] = [
  { id: "uk", label: "British (UK National Curriculum)" },
  { id: "us", label: "American (US)" },
  { id: "indian", label: "Indian (CBSE / ICSE)" },
  { id: "ib", label: "International Baccalaureate (IB PYP / MYP)" },
  { id: "uae", label: "UAE Ministry of Education" },
  { id: "other", label: "Other / not sure" },
];

type GradeId = "y1-2" | "y3" | "y4" | "y5" | "y6" | "y7+";

const NAMES: Record<Curriculum, Record<GradeId, string>> = {
  uk: { "y1-2": "Year 1–2", y3: "Year 3", y4: "Year 4", y5: "Year 5", y6: "Year 6", "y7+": "Year 7+" },
  other: { "y1-2": "Year 1–2", y3: "Year 3", y4: "Year 4", y5: "Year 5", y6: "Year 6", "y7+": "Year 7+" },
  us: { "y1-2": "Kindergarten–Grade 1", y3: "Grade 2", y4: "Grade 3", y5: "Grade 4", y6: "Grade 5", "y7+": "Grade 6+" },
  ib: { "y1-2": "Kindergarten–Grade 1", y3: "Grade 2", y4: "Grade 3", y5: "Grade 4", y6: "Grade 5", "y7+": "Grade 6+" },
  indian: { "y1-2": "UKG–Class 1", y3: "Class 2", y4: "Class 3", y5: "Class 4", y6: "Class 5", "y7+": "Class 6+" },
  uae: { "y1-2": "KG2–Grade 1", y3: "Grade 2", y4: "Grade 3", y5: "Grade 4", y6: "Grade 5", "y7+": "Grade 6+" },
};

export const GRADE_AGES: Record<GradeId, string> = {
  "y1-2": "age 5–7",
  y3: "age 7–8",
  y4: "age 8–9",
  y5: "age 9–10",
  y6: "age 10–11",
  "y7+": "age 11+",
};

export function asCurriculum(value: unknown): Curriculum {
  return CURRICULA.some((c) => c.id === value) ? (value as Curriculum) : DEFAULT_CURRICULUM;
}

export function curriculumLabel(c: Curriculum | undefined): string {
  return CURRICULA.find((x) => x.id === asCurriculum(c))?.label ?? CURRICULA[0].label;
}

/** Grade name in the family's curriculum, e.g. ("Year 4", "us") → "Grade 3". */
export function gradeName(gradeLabelOrId: string, curriculum?: Curriculum): string {
  const id = gradeFromLabel(gradeLabelOrId).id as GradeId;
  return NAMES[asCurriculum(curriculum)][id] ?? gradeLabelOrId;
}

/** "Grade 3 (age 8–9)". */
export function gradeNameWithAge(gradeLabelOrId: string, curriculum?: Curriculum): string {
  const id = gradeFromLabel(gradeLabelOrId).id as GradeId;
  return `${gradeName(gradeLabelOrId, curriculum)} (${GRADE_AGES[id]})`;
}

/** One line for the AI prompts: grade name, curriculum, spelling. */
export function curriculumPromptLine(profile: { gradeLabel: string; curriculum?: Curriculum }): string {
  const c = asCurriculum(profile.curriculum);
  const name = gradeName(profile.gradeLabel, c);
  const uk = gradeName(profile.gradeLabel, "uk");
  const english = c === "us" ? "American English (math, color)" : "British English (maths, colour)";
  const same = name === uk ? "" : ` (same level as UK ${uk})`;
  return `School level: ${name}${same}, ${curriculumLabel(c)} curriculum. Call the level "${name}" and use ${english}.`;
}
