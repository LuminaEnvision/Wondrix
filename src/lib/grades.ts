import type { AgeBand, SkillId } from "./types";

export type GradeOption = {
  id: string;
  label: string;
  ageBand: AgeBand;
  defaultSkills: SkillId[];
  blurb: string;
};

export const GRADE_OPTIONS: GradeOption[] = [
  {
    id: "y1-2",
    label: "Year 1–2",
    ageBand: "young",
    defaultSkills: ["living-things", "measure-length", "add-within-100"],
    blurb: "Counting, living things, simple measuring",
  },
  {
    id: "y3",
    label: "Year 3",
    ageBand: "young",
    defaultSkills: ["measure-length", "halves-quarters", "living-things", "day-night"],
    blurb: "Measuring, fractions, living things",
  },
  {
    id: "y4",
    label: "Year 4",
    ageBand: "middle",
    defaultSkills: ["halves-quarters", "multiply-basics", "materials", "habitats"],
    blurb: "Times tables, fractions, materials",
  },
  {
    id: "y5",
    label: "Year 5",
    ageBand: "middle",
    defaultSkills: ["fractions-compare", "shapes-angles", "forces-motion", "solar-system"],
    blurb: "Fractions, forces, solar system",
  },
  {
    id: "y6",
    label: "Year 6",
    ageBand: "middle",
    defaultSkills: ["percentages", "shapes-angles", "forces-motion", "habitats"],
    blurb: "Percentages, geometry, forces",
  },
  {
    id: "y7+",
    label: "Year 7+",
    ageBand: "teen",
    defaultSkills: ["algebra-intro", "percentages", "cells-micro", "solar-system"],
    blurb: "Algebra intro, cells, space",
  },
];

const GRADE_ORDER = GRADE_OPTIONS.map((g) => g.id);

export function gradeFromLabel(label: string): GradeOption {
  const exact = GRADE_OPTIONS.find((g) => g.label === label || g.id === label);
  if (exact) return exact;
  const lower = label.toLowerCase();
  if (/year\s*7|y7|grade\s*7|secondary|teen/.test(lower)) return GRADE_OPTIONS[5];
  if (/year\s*6|y6|grade\s*6/.test(lower)) return GRADE_OPTIONS[4];
  if (/year\s*5|y5|grade\s*5/.test(lower)) return GRADE_OPTIONS[3];
  if (/year\s*4|y4|grade\s*4/.test(lower)) return GRADE_OPTIONS[2];
  if (/year\s*1|year\s*2|y1|y2|grade\s*[12]/.test(lower)) return GRADE_OPTIONS[0];
  return GRADE_OPTIONS[1];
}

export function gradeIndex(gradeId: string): number {
  const i = GRADE_ORDER.indexOf(gradeId);
  return i >= 0 ? i : 1;
}

/** True if skill is appropriate for this grade or earlier entry grades. */
export function skillAllowedForGrade(skillFromGrade: string, gradeId: string): boolean {
  return gradeIndex(gradeId) >= gradeIndex(skillFromGrade);
}
