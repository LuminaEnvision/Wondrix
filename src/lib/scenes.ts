/**
 * Ready-made animated scenes for the most common Extra topics.
 *
 * A scene is a hand-drawn cartoon of one idea (the water cycle, day and
 * night...) split into a fixed number of parts. The agent only picks the scene
 * and writes one short label per part, in the child's language; we draw it.
 * "Show me" lights up each part while Wondrix says its label.
 *
 * Shared by server (prompt + validation) and client (drawing).
 * Full list, status and the science check for reviewers: docs/SCENES.md.
 */

export const SCENE_IDS = [
  "water-cycle",
  "day-night",
  "moon-phases",
  "plant-food",
  "states-of-matter",
  "sky-colours",
  "magnets",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

type SceneDef = {
  /** What the scene shows, for the agent prompt. */
  about: string;
  /** Default part labels, in order (used when the agent's labels are missing or the wrong count). */
  parts: { en: string; ar: string }[];
};

export const SCENES: Record<SceneId, SceneDef> = {
  "water-cycle": {
    about: "rain, clouds, evaporation, where rain comes from",
    parts: [
      { en: "The Sun warms the sea", ar: "الشمس تُدفئ البحر" },
      { en: "Water rises as vapour", ar: "الماء يصعد بخارًا" },
      { en: "Vapour cools into clouds", ar: "البخار يبرد ويصير سحابًا" },
      { en: "Rain falls back down", ar: "المطر ينزل من جديد" },
    ],
  },
  "day-night": {
    about: "why we have day and night, Earth spinning",
    parts: [
      { en: "The Sun lights one side of Earth", ar: "الشمس تضيء جانبًا من الأرض" },
      { en: "That side has day", ar: "في ذلك الجانب نهار" },
      { en: "The other side has night", ar: "في الجانب الآخر ليل" },
      { en: "Earth spins once a day", ar: "الأرض تدور دورة كل يوم" },
    ],
  },
  "moon-phases": {
    about: "why the Moon changes shape, moon phases",
    parts: [
      // Child-level words as in English (school terms: المحاق، التربيع الأول، البدر، التربيع الأخير).
      { en: "New moon", ar: "قمر جديد" },
      { en: "Half moon (growing)", ar: "نصف يكبر" },
      { en: "Full moon", ar: "بدر" },
      { en: "Half moon (shrinking)", ar: "نصف يصغر" },
    ],
  },
  "plant-food": {
    about: "how plants drink water and make food, photosynthesis",
    parts: [
      { en: "Roots drink water", ar: "الجذور تشرب الماء" },
      { en: "The stem carries it up", ar: "الساق تنقله إلى الأعلى" },
      { en: "Leaves catch sunlight", ar: "الأوراق تلتقط ضوء الشمس" },
      { en: "Leaves make food and oxygen", ar: "الأوراق تصنع الغذاء والأكسجين" },
    ],
  },
  "states-of-matter": {
    about: "solid, liquid, gas, melting, boiling, ice and steam",
    parts: [
      { en: "Ice is a solid", ar: "الجليد مادة صلبة" },
      { en: "Heat melts it into liquid water", ar: "الحرارة تذيبه فيصير ماءً سائلًا" },
      { en: "More heat makes it a gas (steam)", ar: "حرارة أكثر تجعله غازًا (بخارًا)" },
      { en: "Cooling turns it back", ar: "التبريد يعيده كما كان" },
    ],
  },
  "sky-colours": {
    about: "why the sky is blue, why sunsets are orange or red",
    parts: [
      { en: "Sunlight has all the colours", ar: "ضوء الشمس فيه كل الألوان" },
      { en: "Air scatters blue light the most", ar: "الهواء يبعثر الضوء الأزرق أكثر" },
      { en: "So the sky looks blue", ar: "لذلك تبدو السماء زرقاء" },
      { en: "At sunset, orange and red reach us", ar: "عند الغروب يصلنا البرتقالي والأحمر" },
    ],
  },
  magnets: {
    about: "how magnets work, what magnets attract, poles, push and pull",
    parts: [
      { en: "Magnets pull iron and steel", ar: "المغناطيس يجذب الحديد والفولاذ" },
      { en: "Every magnet has two poles, N and S", ar: "لكل مغناطيس قطبان: شمالي وجنوبي" },
      { en: "Same poles push apart", ar: "القطبان المتشابهان يتنافران" },
      { en: "Different poles pull together", ar: "القطبان المختلفان يتجاذبان" },
    ],
  },
};

const SCENE_SET = new Set<string>(SCENE_IDS);

export function asSceneId(value: unknown): SceneId | null {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return SCENE_SET.has(id) ? (id as SceneId) : null;
}

/** Part labels to show: the agent's when it gave exactly one per part, else the defaults. */
export function sceneLabels(id: SceneId, given: string[] | undefined, lang: "en" | "ar"): string[] {
  const parts = SCENES[id].parts;
  if (given && given.length === parts.length && given.every(Boolean)) return given;
  return parts.map((p) => p[lang]);
}

/** Prompt lines describing the scenes (keep in sync with parseVisual). */
export const SCENE_PROMPT = [
  "- scene: a ready-made animated cartoon. USE IT whenever the answer is mainly about one of these topics (it beats any other kind):",
  ...SCENE_IDS.map(
    (id) => `  ${id} (${SCENES[id].about}): exactly ${SCENES[id].parts.length} labels in this order: ${SCENES[id].parts.map((p) => p.en).join(" / ")}`,
  ),
  '  {"kind":"scene","title":string,"scene":one of the ids above,"items":[{"label":string}]}. Write the labels in your own words for this child, same order and count.',
].join("\n");
