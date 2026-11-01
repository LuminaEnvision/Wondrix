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

export type VisualKind = "steps" | "cycle" | "compare" | "scale" | "web";

export type Visual =
  | { kind: "steps"; title: string; items: { label: string; note?: string }[] }
  | { kind: "cycle"; title: string; items: { label: string }[] }
  | { kind: "compare"; title: string; columns: { label: string; points: string[] }[] }
  | { kind: "scale"; title: string; unit?: string; items: { label: string; value: number }[] }
  | { kind: "web"; title: string; center: string; items: { label: string }[] };

/** Compact schema text for the agent prompt (keep in sync with parseVisual). */
export const VISUAL_PROMPT = [
  'Optionally add "visual": a simple diagram that helps a child SEE the idea. Use null when a picture would not really help (greetings, opinions, follow-up chat).',
  "Pick ONE kind:",
  '- steps: a process in order. {"kind":"steps","title":string,"items":[{"label":string,"note":string}]} 2 to 5 items.',
  '- cycle: something that repeats. {"kind":"cycle","title":string,"items":[{"label":string}]} 3 to 6 items.',
  '- compare: two or three things side by side. {"kind":"compare","title":string,"columns":[{"label":string,"points":[string]}]} 2 to 3 columns, 1 to 3 points each.',
  '- scale: sizes or amounts. {"kind":"scale","title":string,"unit":string,"items":[{"label":string,"value":number}]} 2 to 6 items, real approximate values.',
  '- web: parts of one thing. {"kind":"web","title":string,"center":string,"items":[{"label":string}]} 3 to 6 items.',
  "Labels max 4 words, notes and points max 8 words, title max 6 words. Facts must match your answer. No emojis.",
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
        .map((i) => ({ label: clean(obj(i).label, MAX_LABEL), note: clean(obj(i).note, MAX_NOTE) }))
        .filter((i) => i.label)
        .slice(0, 5)
        .map((i) => (i.note ? i : { label: i.label }));
      return items.length >= 2 ? { kind: "steps", title, items } : null;
    }
    case "cycle": {
      const items = arr(v.items)
        .map((i) => ({ label: clean(obj(i).label, MAX_LABEL) }))
        .filter((i) => i.label)
        .slice(0, 6);
      return items.length >= 3 ? { kind: "cycle", title, items } : null;
    }
    case "compare": {
      const columns = arr(v.columns)
        .map((c) => ({
          label: clean(obj(c).label, MAX_LABEL),
          points: arr(obj(c).points)
            .map((p) => clean(p, MAX_NOTE))
            .filter(Boolean)
            .slice(0, 3),
        }))
        .filter((c) => c.label && c.points.length)
        .slice(0, 3);
      return columns.length >= 2 ? { kind: "compare", title, columns } : null;
    }
    case "scale": {
      const items = arr(v.items)
        .map((i) => ({ label: clean(obj(i).label, MAX_LABEL), value: Number(obj(i).value) }))
        .filter((i) => i.label && Number.isFinite(i.value) && i.value >= 0)
        .slice(0, 6);
      if (items.length < 2 || !items.some((i) => i.value > 0)) return null;
      const unit = clean(v.unit, 16);
      return unit ? { kind: "scale", title, unit, items } : { kind: "scale", title, items };
    }
    case "web": {
      const center = clean(v.center, MAX_LABEL);
      const items = arr(v.items)
        .map((i) => ({ label: clean(obj(i).label, MAX_LABEL) }))
        .filter((i) => i.label)
        .slice(0, 6);
      return center && items.length >= 3 ? { kind: "web", title, center, items } : null;
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
  return parts.filter(Boolean).join(". ");
}
