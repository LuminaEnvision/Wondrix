/**
 * On-the-spot visuals for Extra.
 *
 * The agent never writes SVG/HTML. It returns a tiny JSON "visual spec"
 * (one of a few diagram kinds + short labels); our own React components
 * draw it. That keeps it safe (no model-written markup), on-brand, cheap
 * in tokens, and readable at phone size.
 *
 * Shared by server (validation of model output) and client (rendering).
 */

import { asSceneId, SCENE_PROMPT, SCENES, type SceneId } from "./scenes";

export type VisualKind = "steps" | "cycle" | "compare" | "scale" | "web" | "scene";

/**
 * Picture words the agent may attach to any item. Each one is a hand-drawn,
 * animated icon in ExtraVisual, so children who cannot read yet still SEE
 * "sun shines → water rises → cloud → rain".
 */
export const ICON_NAMES = [
  "sun", "moon", "star", "earth", "planet", "rocket",
  "cloud", "rain", "drop", "steam", "ice", "wind", "fire", "thermometer", "lightning",
  "plant", "seed", "leaf", "flower", "root", "tree", "apple",
  "fish", "bird", "animal", "bug", "person", "heart", "bone", "eye", "ear", "food",
  "magnet", "bulb", "battery", "gear", "robot", "atom", "cell",
  "rock", "mountain", "ocean", "ruler", "clock", "balance", "wheel",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
const ICON_SET = new Set<string>(ICON_NAMES);

export type Visual =
  | { kind: "steps"; title: string; items: { label: string; note?: string; icon?: IconName }[] }
  | { kind: "cycle"; title: string; items: { label: string; icon?: IconName }[] }
  | { kind: "compare"; title: string; columns: { label: string; points: string[]; icon?: IconName }[] }
  | { kind: "scale"; title: string; unit?: string; items: { label: string; value: number; icon?: IconName }[] }
  | { kind: "web"; title: string; center: string; centerIcon?: IconName; items: { label: string; icon?: IconName }[] }
  /** Ready-made animated cartoon (src/lib/scenes.ts); items = one label per part, or [] for the defaults. */
  | { kind: "scene"; title: string; scene: SceneId; items: { label: string }[] };

/** Compact schema text for the agent prompt (keep in sync with parseVisual). */
export const VISUAL_PROMPT = [
  'Optionally add "visual": a simple diagram that helps a child SEE the idea. Use null when a picture would not really help (greetings, opinions, follow-up chat).',
  "Pick ONE kind:",
  '- steps: a process in order. {"kind":"steps","title":string,"items":[{"label":string,"note":string}]} 2 to 5 items.',
  '- cycle: something that repeats. {"kind":"cycle","title":string,"items":[{"label":string}]} 3 to 6 items.',
  '- compare: two or three things side by side. {"kind":"compare","title":string,"columns":[{"label":string,"points":[string]}]} 2 to 3 columns, 1 to 3 points each.',
  '- scale: sizes or amounts. {"kind":"scale","title":string,"unit":string,"items":[{"label":string,"value":number}]} 2 to 6 items, real approximate values.',
  '- web: parts of one thing. {"kind":"web","title":string,"center":string,"items":[{"label":string}]} 3 to 6 items.',
  SCENE_PROMPT,
  "Labels max 4 words (scene labels max 7 words), notes and points max 8 words, title max 6 words. Facts must match your answer. No emojis.",
  `Pictures: young children may not read yet, so give EVERY item (and each compare column, and the web center as "centerIcon") an "icon" that shows it, chosen from: ${ICON_NAMES.join(", ")}. Example water cycle: sun, steam, cloud, rain. Pick the closest picture; use the same icon twice only if it is really the same thing.`,
].join("\n");

const MAX_LABEL = 32;
const MAX_NOTE = 60;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[<>`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function icon(value: unknown): IconName | undefined {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ICON_SET.has(name) ? (name as IconName) : undefined;
}

/** Add `icon` only when it is a known picture (keeps specs without icons unchanged). */
function withIcon<T extends object>(item: T, raw: unknown): T & { icon?: IconName } {
  const i = icon(obj(raw).icon);
  return i ? { ...item, icon: i } : item;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Validate and normalise a model-provided visual. Returns null when the
 * spec is missing or does not meet the minimum shape for its kind.
 */
export function parseVisual(raw: unknown): Visual | null {
  const v = obj(raw);
  const title = clean(v.title, 48);
  switch (v.kind) {
    case "steps": {
      const items = arr(v.items)
        .map((i) => ({ raw: i, label: clean(obj(i).label, MAX_LABEL), note: clean(obj(i).note, MAX_NOTE) }))
        .filter((i) => i.label)
        .slice(0, 5)
        .map((i) => withIcon(i.note ? { label: i.label, note: i.note } : { label: i.label }, i.raw));
      return items.length >= 2 ? { kind: "steps", title, items } : null;
    }
    case "cycle": {
      const items = arr(v.items)
        .map((i) => withIcon({ label: clean(obj(i).label, MAX_LABEL) }, i))
        .filter((i) => i.label)
        .slice(0, 6);
      return items.length >= 3 ? { kind: "cycle", title, items } : null;
    }
    case "compare": {
      const columns = arr(v.columns)
        .map((c) =>
          withIcon({
          label: clean(obj(c).label, MAX_LABEL),
          points: arr(obj(c).points)
            .map((p) => clean(p, MAX_NOTE))
            .filter(Boolean)
            .slice(0, 3),
        }, c))
        .filter((c) => c.label && c.points.length)
        .slice(0, 3);
      return columns.length >= 2 ? { kind: "compare", title, columns } : null;
    }
    case "scale": {
      const items = arr(v.items)
        .map((i) => withIcon({ label: clean(obj(i).label, MAX_LABEL), value: Number(obj(i).value) }, i))
        .filter((i) => i.label && Number.isFinite(i.value) && i.value >= 0)
        .slice(0, 6);
      if (items.length < 2 || !items.some((i) => i.value > 0)) return null;
      const unit = clean(v.unit, 16);
      return unit ? { kind: "scale", title, unit, items } : { kind: "scale", title, items };
    }
    case "web": {
      const center = clean(v.center, MAX_LABEL);
      const items = arr(v.items)
        .map((i) => withIcon({ label: clean(obj(i).label, MAX_LABEL) }, i))
        .filter((i) => i.label)
        .slice(0, 6);
      if (!center || items.length < 3) return null;
      const centerIcon = icon(v.centerIcon);
      return centerIcon ? { kind: "web", title, center, centerIcon, items } : { kind: "web", title, center, items };
    }
    case "scene": {
      const scene = asSceneId(v.scene);
      if (!scene) return null;
      const labels = arr(v.items)
        .map((i) => ({ label: clean(obj(i).label, MAX_NOTE) }))
        .filter((i) => i.label);
      const items = labels.length === SCENES[scene].parts.length ? labels : [];
      return { kind: "scene", title, scene, items };
    }
    default:
      return null;
  }
}

/** All words in a visual, for the safety check and for screen readers. */
export function visualText(v: Visual): string {
  const parts: string[] = [v.title];
  if (v.kind === "steps") v.items.forEach((i, n) => parts.push(`${n + 1}. ${i.label}${i.note ? `: ${i.note}` : ""}`));
  if (v.kind === "cycle") parts.push(v.items.map((i) => i.label).join(", then "), "and back again");
  if (v.kind === "compare") v.columns.forEach((c) => parts.push(`${c.label}: ${c.points.join("; ")}`));
  if (v.kind === "scale") v.items.forEach((i) => parts.push(`${i.label}: ${i.value}${v.unit ? ` ${v.unit}` : ""}`));
  if (v.kind === "web") parts.push(`${v.center}: ${v.items.map((i) => i.label).join(", ")}`);
  if (v.kind === "scene") v.items.forEach((i, n) => parts.push(`${n + 1}. ${i.label}`));
  return parts.filter(Boolean).join(". ");
}

/** Keyword hints (English + a few Arabic) when the agent gave no icon. Order matters: first match wins. */
const ICON_HINTS: [RegExp, IconName][] = [
  [/evaporat|vapou?r|steam|rises|بخار|يتبخر/i, "steam"],
  [/rain|shower|falls? down|drizzle|مطر/i, "rain"],
  [/cloud|سحاب|غيم/i, "cloud"],
  [/sun|sunlight|daylight|\bday\b|شمس|نهار/i, "sun"],
  [/moon|crescent|قمر|هلال/i, "moon"],
  [/\bstars?\b|نجم/i, "star"],
  [/earth|world|globe|أرض/i, "earth"],
  [/planet|mars|jupiter|saturn|كوكب/i, "planet"],
  [/rocket|space ?ship|صاروخ/i, "rocket"],
  [/lightning|thunder|spark|برق/i, "lightning"],
  [/\bice\b|frozen|freez|snow|solid|ثلج|جليد/i, "ice"],
  [/water|liquid|drop|river|ماء|قطر/i, "drop"],
  [/sea|ocean|wave|بحر|محيط/i, "ocean"],
  [/wind|\bair\b|blow|breath|gas\b|رياح|هواء/i, "wind"],
  [/fire|burn|flame|\bhot\b|heat|نار|حرار/i, "fire"],
  [/temperature|degrees|°c|thermometer|حرارة/i, "thermometer"],
  [/root|جذر/i, "root"],
  [/seed|بذر/i, "seed"],
  [/leaf|leaves|ورق/i, "leaf"],
  [/flower|petal|bloom|زهر|ورد/i, "flower"],
  [/tree|forest|شجر/i, "tree"],
  [/plant|grow|stem|sprout|نبات/i, "plant"],
  [/fruit|apple|تفاح|فاكه/i, "apple"],
  [/food|\beat|meal|stomach|digest|طعام|أكل/i, "food"],
  [/fish|سمك/i, "fish"],
  [/bird|feather|wing|طائر|عصفور/i, "bird"],
  [/insect|bug|\bbees?\b|\bants?\b|butterfl|حشر|نحل/i, "bug"],
  [/animal|mammal|\bpets?\b|camel|\bcats?\b|\bdogs?\b|حيوان|جمل/i, "animal"],
  [/heart|blood|قلب|دم/i, "heart"],
  [/bone|skeleton|عظم|هيكل/i, "bone"],
  [/eye|see|sight|light|عين|يرى/i, "eye"],
  [/\bears?\b|hear|sound|أذن|صوت/i, "ear"],
  [/person|people|human|body|\byou\b|child|إنسان|جسم/i, "person"],
  [/magnet|مغناطيس/i, "magnet"],
  [/bulb|lamp|lights? up|مصباح/i, "bulb"],
  [/battery|electric|circuit|power|بطارية|كهرب/i, "battery"],
  [/gear|machine|motor|engine|ترس|محرك/i, "gear"],
  [/robot|sensor|روبوت/i, "robot"],
  [/atom|molecule|particle|ذرة|جزيء/i, "atom"],
  [/\bcells?\b|germ|microb|bacteri|خلية|جرثوم/i, "cell"],
  [/rock|stone|sand|soil|fossil|صخر|حجر|رمل/i, "rock"],
  [/mountain|hill|volcano|جبل|بركان/i, "mountain"],
  [/length|long|tall|metre|meter|\bcm\b|ruler|طول|متر/i, "ruler"],
  [/time|hour|minute|clock|year|month|وقت|ساعة/i, "clock"],
  [/weigh|mass|heavy|kg\b|gram|balance|وزن|ثقيل/i, "balance"],
  [/wheel|roll|\bcars?\b|bike|عجل|سيارة/i, "wheel"],
];

/** The icon to draw for an item: the agent's choice, else a keyword guess, else none. */
export function iconFor(label: string, given?: IconName): IconName | undefined {
  if (given) return given;
  return ICON_HINTS.find(([re]) => re.test(label))?.[1];
}

/**
 * Quality gate (Anastasia's review): a diagram must SHOW the idea, not add text.
 * Scenes always pass. Other diagrams need a real picture on every item, at least
 * two different pictures, and short words; otherwise no diagram is shown at all
 * (e.g. "What is a molecule?" came back as two text columns with one water drop).
 */
export function isUsefulVisual(v: Visual): boolean {
  if (v.kind === "scene") return true;
  const items: { text: string; icon?: IconName }[] =
    v.kind === "steps"
      ? v.items.map((i) => ({ text: `${i.label} ${i.note ?? ""}`, icon: i.icon }))
      : v.kind === "compare"
        ? v.columns.map((c) => ({ text: `${c.label} ${c.points.join(" ")}`, icon: c.icon }))
        : v.kind === "web"
          ? [{ text: v.center, icon: v.centerIcon }, ...v.items.map((i) => ({ text: i.label, icon: i.icon }))]
          : v.items.map((i) => ({ text: i.label, icon: i.icon }));
  const icons = items.map((i) => iconFor(i.text, i.icon));
  if (icons.some((i) => !i)) return false;
  if (new Set(icons).size < 2) return false;
  const words = items.reduce((n, i) => n + i.text.trim().split(/\s+/).length, 0);
  return words <= items.length * 8;
}
