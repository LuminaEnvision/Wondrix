import type { AgeBand, AgeMode, SkillId } from "./types";

export type GradeOption = {
  id: string;
  label: string;
  ageBand: AgeBand;
  defaultSkills: SkillId[];
  blurb: string;
};

/** Secondary / teen band on the UK Year scale (ages ~11–17). */
export const TEEN_GRADE_IDS = ["y7", "y8", "y9", "y10", "y11+"] as const;
export type TeenGradeId = (typeof TEEN_GRADE_IDS)[number];

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
    id: "y7",
    label: "Year 7",
    ageBand: "teen",
    defaultSkills: ["algebra-intro", "percentages", "cells-micro", "solar-system"],
    blurb: "Algebra intro, cells, space",
  },
  {
    id: "y8",
    label: "Year 8",
    ageBand: "teen",
    defaultSkills: ["equations-linear", "algebra-intro", "energy-electricity", "cells-micro"],
    blurb: "Linear equations, energy, electricity",
  },
  {
    id: "y9",
    label: "Year 9",
    ageBand: "teen",
    defaultSkills: ["ratio-rate", "equations-linear", "chemical-reactions", "energy-electricity"],
    blurb: "Ratio, reactions, energy",
  },
  {
    id: "y10",
    label: "Year 10",
    ageBand: "teen",
    defaultSkills: ["stats-data", "ratio-rate", "genetics-intro", "chemical-reactions"],
    blurb: "Data, genetics, chemistry",
  },
  {
    id: "y11+",
    label: "Year 11–13",
    ageBand: "teen",
    defaultSkills: ["stats-data", "equations-linear", "genetics-intro", "energy-electricity"],
    blurb: "Exam-ready maths & science foundations",
  },
];

const GRADE_ORDER = GRADE_OPTIONS.map((g) => g.id);

export function gradeFromLabel(label: string): GradeOption {
  const exact = GRADE_OPTIONS.find((g) => g.label === label || g.id === label);
  if (exact) return exact;
  const lower = label.toLowerCase();
  // Legacy bucket "Year 7+" → Year 7 (still teen).
  if (/year\s*7\+|y7\+/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y7")!;
  if (/year\s*11|year\s*12|year\s*13|y11|grade\s*1[0-2]|a-?level|sixth\s*form/.test(lower)) {
    return GRADE_OPTIONS.find((g) => g.id === "y11+")!;
  }
  if (/year\s*10|y10|grade\s*9/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y10")!;
  if (/year\s*9|y9|grade\s*8/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y9")!;
  if (/year\s*8|y8|grade\s*7/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y8")!;
  if (/year\s*7|y7|secondary|teen/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y7")!;
  if (/year\s*6|y6|grade\s*6/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y6")!;
  if (/year\s*5|y5|grade\s*5/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y5")!;
  if (/year\s*4|y4|grade\s*4/.test(lower)) return GRADE_OPTIONS.find((g) => g.id === "y4")!;
  if (/year\s*1|year\s*2|y1|y2|grade\s*[12]/.test(lower)) return GRADE_OPTIONS[0];
  return GRADE_OPTIONS[1];
}

export function gradeIndex(gradeId: string): number {
  // Treat legacy y7+ as y7 for skill gating.
  const id = gradeId === "y7+" ? "y7" : gradeId;
  const i = GRADE_ORDER.indexOf(id);
  return i >= 0 ? i : 1;
}

/** Default UI mode from grade: y1–y4 → explorer; y5+ → teen. */
export function defaultAgeMode(gradeLabel: string): AgeMode {
  const id = gradeFromLabel(gradeLabel).id;
  if (id === "y1-2" || id === "y3" || id === "y4") return "explorer";
  return "teen";
}

/** True if skill is appropriate for this grade or earlier entry grades. */
export function skillAllowedForGrade(skillFromGrade: string, gradeId: string): boolean {
  return gradeIndex(gradeId) >= gradeIndex(skillFromGrade);
}
