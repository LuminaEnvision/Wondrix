import { gradeFromLabel, gradeIndex } from "./grades";
import type { RadarItem, SkillId } from "./types";

/** Gap radar + practice bank. Each item is tied to grades so Year 7 ≠ Year 3 questions. */
export const RADAR_BANK: RadarItem[] = [
  // —— Year 1–3 ——
  {
    id: "r-measure-1",
    skillId: "measure-length",
    grades: ["y1-2", "y3"],
    prompt: "Which tool is best to measure how long a pencil is?",
    choices: [
      { id: "a", label: "A ruler", correct: true },
      { id: "b", label: "A clock", correct: false },
      { id: "c", label: "A thermometer", correct: false },
    ],
    explainCorrect: "A ruler measures length in centimetres or inches.",
    explainWrong: "Clocks measure time and thermometers measure temperature. Length needs a ruler.",
  },
  {
    id: "r-halves-1",
    skillId: "halves-quarters",
    grades: ["y1-2", "y3", "y4"],
    prompt: "A pizza is cut into 4 equal slices. One slice is…",
    choices: [
      { id: "a", label: "One half", correct: false },
      { id: "b", label: "One quarter", correct: true },
      { id: "c", label: "The whole pizza", correct: false },
    ],
    explainCorrect: "Four equal parts means each part is one quarter.",
    explainWrong: "Half would be 2 equal parts. Four equal parts = quarters.",
  },
  {
    id: "r-add-1",
    skillId: "add-within-100",
    grades: ["y1-2", "y3"],
    prompt: "What is 40 + 25?",
    choices: [
      { id: "a", label: "55", correct: false },
      { id: "b", label: "65", correct: true },
      { id: "c", label: "75", correct: false },
    ],
    explainCorrect: "40 + 20 = 60, then + 5 = 65.",
    explainWrong: "Try 40 + 20 first (60), then add the leftover 5.",
  },
  {
    id: "r-living-1",
    skillId: "living-things",
    grades: ["y1-2", "y3"],
    prompt: "Which one is a living thing?",
    choices: [
      { id: "a", label: "A rock", correct: false },
      { id: "b", label: "A tree", correct: true },
      { id: "c", label: "A plastic cup", correct: false },
    ],
    explainCorrect: "Trees grow, need water and light, and can make seeds.",
    explainWrong: "Rocks and plastic cups do not grow or need food.",
  },
  {
    id: "r-materials-1",
    skillId: "materials",
    grades: ["y3", "y4"],
    prompt: "Water in a glass is usually a…",
    choices: [
      { id: "a", label: "Solid", correct: false },
      { id: "b", label: "Liquid", correct: true },
      { id: "c", label: "Gas you can hold", correct: false },
    ],
    explainCorrect: "Liquid water takes the shape of its container.",
    explainWrong: "Ice is solid water. Steam is a gas. In a glass, water is liquid.",
  },
  {
    id: "r-day-1",
    skillId: "day-night",
    grades: ["y3", "y4"],
    prompt: "Day and night happen mainly because Earth…",
    choices: [
      { id: "a", label: "Spins / turns", correct: true },
      { id: "b", label: "Gets bigger", correct: false },
      { id: "c", label: "Stops moving", correct: false },
    ],
    explainCorrect: "Earth rotates so one side faces the Sun (day) while the other is in shadow (night).",
    explainWrong: "Earth does not grow or stop. It spins once about every 24 hours.",
  },
  // —— Year 4–5 ——
  {
    id: "r-mult-1",
    skillId: "multiply-basics",
    grades: ["y4", "y5", "y6"],
    prompt: "What is 7 × 8?",
    choices: [
      { id: "a", label: "54", correct: false },
      { id: "b", label: "56", correct: true },
      { id: "c", label: "64", correct: false },
    ],
    explainCorrect: "7 × 8 = 56. You can think 7 × 10 = 70, then subtract 7 × 2 = 14 → 56.",
    explainWrong: "7 eights: 8, 16, 24, 32, 40, 48, 56.",
  },
  {
    id: "r-habitats-1",
    skillId: "habitats",
    grades: ["y4", "y5", "y6"],
    prompt: "A camel's habitat is most likely…",
    choices: [
      { id: "a", label: "Deep ocean", correct: false },
      { id: "b", label: "Hot desert", correct: true },
      { id: "c", label: "Frozen ice sheet only", correct: false },
    ],
    explainCorrect: "Camels are adapted for dry, hot deserts (hump fat, water-saving).",
    explainWrong: "Habitat means where a living thing naturally lives and thrives.",
  },
  {
    id: "r-frac-cmp-1",
    skillId: "fractions-compare",
    grades: ["y5", "y6"],
    prompt: "Which fraction is larger?",
    choices: [
      { id: "a", label: "1/2", correct: true },
      { id: "b", label: "1/5", correct: false },
      { id: "c", label: "1/8", correct: false },
    ],
    explainCorrect: "Same numerator: smaller denominator means larger pieces. 1/2 > 1/5 > 1/8.",
    explainWrong: "Imagine a pizza. Half is bigger than a fifth or an eighth.",
  },
  {
    id: "r-shapes-1",
    skillId: "shapes-angles",
    grades: ["y5", "y6", "y7+"],
    prompt: "A right angle measures…",
    choices: [
      { id: "a", label: "45 degrees", correct: false },
      { id: "b", label: "90 degrees", correct: true },
      { id: "c", label: "180 degrees", correct: false },
    ],
    explainCorrect: "A right angle is exactly 90°. A straight line is 180°.",
    explainWrong: "Corner of a square = 90°. Half of that would be 45°.",
  },
  {
    id: "r-forces-1",
    skillId: "forces-motion",
    grades: ["y5", "y6", "y7+"],
    prompt: "If you push a book across a table and it slows down, what mostly slows it?",
    choices: [
      { id: "a", label: "Friction", correct: true },
      { id: "b", label: "Sound", correct: false },
      { id: "c", label: "Colour of the book", correct: false },
    ],
    explainCorrect: "Friction between book and table opposes the motion and slows it.",
    explainWrong: "Forces change motion. Friction is a contact force that resists sliding.",
  },
  {
    id: "r-solar-1",
    skillId: "solar-system",
    grades: ["y5", "y6", "y7+"],
    prompt: "Which planet is closest to the Sun?",
    choices: [
      { id: "a", label: "Earth", correct: false },
      { id: "b", label: "Mercury", correct: true },
      { id: "c", label: "Neptune", correct: false },
    ],
    explainCorrect: "Order from the Sun: Mercury, Venus, Earth, Mars…",
    explainWrong: "Earth is third. Neptune is farthest of the eight planets.",
  },
  // —— Year 6–7+ advanced ——
  {
    id: "r-pct-1",
    skillId: "percentages",
    grades: ["y6", "y7+"],
    prompt: "What is 25% of 80?",
    choices: [
      { id: "a", label: "15", correct: false },
      { id: "b", label: "20", correct: true },
      { id: "c", label: "40", correct: false },
    ],
    explainCorrect: "25% = 1/4. A quarter of 80 is 20.",
    explainWrong: "Percent means per hundred. 25% = 25/100 = 1/4.",
  },
  {
    id: "r-pct-2",
    skillId: "percentages",
    grades: ["y6", "y7+"],
    prompt: "A jacket costs 200 AED. It is 10% off. How much do you save?",
    choices: [
      { id: "a", label: "10 AED", correct: false },
      { id: "b", label: "20 AED", correct: true },
      { id: "c", label: "200 AED", correct: false },
    ],
    explainCorrect: "10% of 200 = 20. You save 20 AED.",
    explainWrong: "10% means 10 per 100, so for 200 it is twice 10 = 20.",
  },
  {
    id: "r-alg-1",
    skillId: "algebra-intro",
    grades: ["y7+"],
    prompt: "If 3x + 2 = 14, what is x?",
    choices: [
      { id: "a", label: "3", correct: false },
      { id: "b", label: "4", correct: true },
      { id: "c", label: "6", correct: false },
    ],
    explainCorrect: "Subtract 2: 3x = 12. Divide by 3: x = 4.",
    explainWrong: "Undo addition first (subtract 2), then undo multiply (divide by 3).",
  },
  {
    id: "r-alg-2",
    skillId: "algebra-intro",
    grades: ["y7+"],
    prompt: "Simplify: 2(a + 5)",
    choices: [
      { id: "a", label: "2a + 5", correct: false },
      { id: "b", label: "2a + 10", correct: true },
      { id: "c", label: "a + 10", correct: false },
    ],
    explainCorrect: "Distribute: 2 × a + 2 × 5 = 2a + 10.",
    explainWrong: "Both terms inside the brackets get multiplied by 2.",
  },
  {
    id: "r-cells-1",
    skillId: "cells-micro",
    grades: ["y7+"],
    prompt: "What is the basic unit of life in plants and animals?",
    choices: [
      { id: "a", label: "The atom", correct: false },
      { id: "b", label: "The cell", correct: true },
      { id: "c", label: "The organ only", correct: false },
    ],
    explainCorrect: "Cells are the smallest living units that make up tissues and organs.",
    explainWrong: "Atoms are chemistry. Organs are made of many cells working together.",
  },
  {
    id: "r-cells-2",
    skillId: "cells-micro",
    grades: ["y7+"],
    prompt: "Which structure is found in plant cells but not animal cells?",
    choices: [
      { id: "a", label: "Nucleus", correct: false },
      { id: "b", label: "Cell wall (and usually chloroplasts)", correct: true },
      { id: "c", label: "Cell membrane", correct: false },
    ],
    explainCorrect: "Plant cells have a rigid cell wall and chloroplasts for photosynthesis.",
    explainWrong: "Both plant and animal cells have a nucleus and membrane.",
  },
  {
    id: "r-forces-2",
    skillId: "forces-motion",
    grades: ["y6", "y7+"],
    prompt: "On Earth, gravity pulls objects…",
    choices: [
      { id: "a", label: "Toward Earth's centre", correct: true },
      { id: "b", label: "Only sideways", correct: false },
      { id: "c", label: "Away into space always", correct: false },
    ],
    explainCorrect: "Gravity is an attractive force toward Earth's centre of mass.",
    explainWrong: "Without a huge upward force, dropped objects fall toward Earth.",
  },
  {
    id: "r-solar-2",
    skillId: "solar-system",
    grades: ["y6", "y7+"],
    prompt: "Why do we see phases of the Moon?",
    choices: [
      { id: "a", label: "Earth's shadow always covers half the Moon", correct: false },
      { id: "b", label: "We see different amounts of the Moon's sunlit side", correct: true },
      { id: "c", label: "The Moon turns off its light", correct: false },
    ],
    explainCorrect: "The Moon reflects sunlight; as it orbits, we see different lit portions.",
    explainWrong: "Lunar eclipse (Earth's shadow) is rare. Phases happen every month from geometry.",
  },
];

export function itemsForGrade(gradeLabel: string, skillId?: SkillId): RadarItem[] {
  const grade = gradeFromLabel(gradeLabel);
  let items = RADAR_BANK.filter((r) => r.grades.includes(grade.id));
  if (skillId) items = items.filter((r) => r.skillId === skillId);
  return items;
}

export function pickQuestion(
  gradeLabel: string,
  skillId: SkillId,
  avoidIds: string[] = [],
): RadarItem | null {
  const pool = itemsForGrade(gradeLabel, skillId).filter((r) => !avoidIds.includes(r.id));
  if (!pool.length) {
    const any = RADAR_BANK.filter((r) => r.skillId === skillId && !avoidIds.includes(r.id));
    if (!any.length) return null;
    // Prefer closest grade-appropriate item
    const grade = gradeFromLabel(gradeLabel);
    const gi = gradeIndex(grade.id);
    any.sort((a, b) => {
      const da = Math.min(...a.grades.map((g) => Math.abs(gradeIndex(g) - gi)));
      const db = Math.min(...b.grades.map((g) => Math.abs(gradeIndex(g) - gi)));
      return da - db;
    });
    return any[0];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function radarForGrade(gradeLabel: string, limit = 4): RadarItem[] {
  const items = itemsForGrade(gradeLabel);
  const bySkill = new Map<SkillId, RadarItem>();
  for (const item of items) {
    if (!bySkill.has(item.skillId)) bySkill.set(item.skillId, item);
  }
  return [...bySkill.values()].slice(0, limit);
}
