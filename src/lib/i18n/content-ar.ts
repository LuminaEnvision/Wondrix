/**
 * Arabic names for content shown to parents and children (draft, for native review):
 * skills, grade blurbs, curriculum names and grade names per curriculum.
 * English lives next to the data (skills.ts, grades.ts, curriculum.ts).
 */
import type { SkillId } from "../types";
import type { GradeId } from "../curriculum";

export const SKILL_TITLES_AR: Record<SkillId, string> = {
  "measure-length": "قياس الطول",
  "halves-quarters": "الأنصاف والأرباع",
  "add-within-100": "الجمع حتى 100",
  "shapes-angles": "الأشكال والدورانات",
  "multiply-basics": "أساسيات جدول الضرب",
  "fractions-compare": "مقارنة الكسور",
  percentages: "النسب المئوية",
  "algebra-intro": "الجبر البسيط",
  "equations-linear": "المعادلات الخطية",
  "ratio-rate": "النسبة والمعدل",
  "stats-data": "البيانات والمتوسطات",
  "living-things": "الكائنات الحية",
  materials: "المواد وخصائصها",
  "day-night": "الليل والنهار",
  habitats: "البيئات الطبيعية",
  "forces-motion": "القوى والحركة",
  "solar-system": "المجموعة الشمسية",
  "cells-micro": "الخلايا والميكروبات",
  "energy-electricity": "الطاقة والكهرباء",
  "chemical-reactions": "التفاعلات الكيميائية",
  "genetics-intro": "الجينات والوراثة",
};

export const GRADE_BLURBS_AR: Record<string, string> = {
  "y1-2": "العدّ، الكائنات الحية، القياس البسيط",
  y3: "القياس، الكسور، الكائنات الحية",
  y4: "جدول الضرب، الكسور، المواد",
  y5: "الكسور، القوى، المجموعة الشمسية",
  y6: "النسب المئوية، الهندسة، القوى",
  y7: "مقدمة الجبر، الخلايا، الفضاء",
  y8: "المعادلات الخطية، الطاقة، الكهرباء",
  y9: "النسبة، التفاعلات، الطاقة",
  y10: "البيانات، الجينات، الكيمياء",
  "y11+": "أسس الرياضيات والعلوم للامتحانات",
};

export const CURRICULUM_LABELS_AR: Record<string, string> = {
  uk: "البريطاني (المنهج الوطني في المملكة المتحدة)",
  us: "الأمريكي",
  indian: "الهندي (CBSE / ICSE)",
  ib: "البكالوريا الدولية (IB PYP / MYP)",
  uae: "وزارة التربية والتعليم الإماراتية",
  saudi: "وزارة التعليم السعودية",
  other: "آخر / غير متأكد",
};

const GRADE_N: Record<GradeId, string> = {
  "y1-2": "الروضة–الصف 1",
  y3: "الصف 2",
  y4: "الصف 3",
  y5: "الصف 4",
  y6: "الصف 5",
  y7: "الصف 6",
  y8: "الصف 7",
  y9: "الصف 8",
  y10: "الصف 9",
  "y11+": "الصف 10–12",
};

export const GRADE_NAMES_AR: Record<string, Record<GradeId, string>> = {
  uk: {
    "y1-2": "السنة 1–2",
    y3: "السنة 3",
    y4: "السنة 4",
    y5: "السنة 5",
    y6: "السنة 6",
    y7: "السنة 7",
    y8: "السنة 8",
    y9: "السنة 9",
    y10: "السنة 10",
    "y11+": "السنة 11–13",
  },
  other: {
    "y1-2": "السنة 1–2",
    y3: "السنة 3",
    y4: "السنة 4",
    y5: "السنة 5",
    y6: "السنة 6",
    y7: "السنة 7",
    y8: "السنة 8",
    y9: "السنة 9",
    y10: "السنة 10",
    "y11+": "السنة 11–13",
  },
  us: GRADE_N,
  ib: GRADE_N,
  indian: { ...GRADE_N, "y1-2": "UKG–الصف 1" },
  uae: { ...GRADE_N, "y1-2": "الروضة 2–الصف 1" },
  saudi: { ...GRADE_N, "y1-2": "الروضة 3–الصف 1" },
};

export const GRADE_AGES_AR: Record<GradeId, string> = {
  "y1-2": "العمر 5–7",
  y3: "العمر 7–8",
  y4: "العمر 8–9",
  y5: "العمر 9–10",
  y6: "العمر 10–11",
  y7: "العمر 11–12",
  y8: "العمر 12–13",
  y9: "العمر 13–14",
  y10: "العمر 14–15",
  "y11+": "العمر 15–17",
};
