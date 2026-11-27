/**
 * Lightweight English syllable splits for School reading karaoke.
 * Kids see Mon-key / au-to-ma-ted; highlight advances while TTS plays.
 */

/** Hand fixes for words the heuristic often misses (kids stories + Wondrix). */
const EXCEPTIONS: Record<string, string[]> = {
  wondrix: ["Won", "drix"],
  monkey: ["Mon", "key"],
  automated: ["au", "to", "ma", "ted"],
  colour: ["col", "our"],
  color: ["col", "or"],
  little: ["lit", "tle"],
  notebook: ["note", "book"],
  question: ["ques", "tion"],
  smiled: ["smiled"],
  walked: ["walked"],
  landed: ["land", "ed"],
  spun: ["spun"],
  leaf: ["leaf"],
  leaves: ["leaves"],
  change: ["change"],
  sunny: ["sun", "ny"],
  along: ["a", "long"],
  path: ["path"],
  stone: ["stone"],
  night: ["night"],
  blanket: ["blan", "ket"],
  tiny: ["ti", "ny"],
  lights: ["lights"],
  blinked: ["blinked"],
  stars: ["stars"],
  very: ["ver", "y"],
  away: ["a", "way"],
  whispered: ["whis", "pered"],
  tomorrow: ["to", "mor", "row"],
  learn: ["learn"],
  more: ["more"],
  those: ["those"],
  looked: ["looked"],
  dark: ["dark"],
  one: ["one"],
};

const VOWELS = /[aeiouy]/i;

function titleCaseParts(parts: string[], original: string): string[] {
  if (!parts.length) return parts;
  if (original === original.toUpperCase()) return parts.map((p) => p.toUpperCase());
  if (original[0] === original[0]?.toUpperCase()) {
    return parts.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p.toLowerCase()));
  }
  return parts.map((p) => p.toLowerCase());
}

/** Split a single English word into syllable-ish chunks for display. */
export function splitWordSyllables(word: string): string[] {
  const core = word.replace(/[^A-Za-z']/g, "");
  if (!core) return [word];
  const key = core.toLowerCase();
  if (EXCEPTIONS[key]) return titleCaseParts(EXCEPTIONS[key], core);

  // Very short words stay whole.
  if (core.length <= 3) return [core];

  const lower = key;
  const breaks: number[] = [];

  // Classic onset rule: split before a consonant+vowel when mid-word.
  for (let i = 1; i < lower.length - 1; i++) {
    const prev = lower[i - 1]!;
    const cur = lower[i]!;
    const next = lower[i + 1]!;
    if (VOWELS.test(prev) && !VOWELS.test(cur) && VOWELS.test(next)) {
      // Prefer split before double consonant second letter: lit-tle
      if (i + 2 < lower.length && cur === next && !VOWELS.test(lower[i + 2]!)) {
        breaks.push(i + 1);
        i++;
        continue;
      }
      breaks.push(i);
    }
  }

  // Collapse breaks that leave a 1-letter syllable in the middle when avoidable.
  const parts: string[] = [];
  let start = 0;
  for (const b of breaks) {
    if (b - start < 1) continue;
    // Skip if remaining would be a single trailing consonant (keep with previous).
    if (lower.length - b === 1 && !VOWELS.test(lower[b]!)) continue;
    parts.push(core.slice(start, b));
    start = b;
  }
  parts.push(core.slice(start));

  const cleaned = parts.filter(Boolean);
  return cleaned.length ? cleaned : [core];
}

export type ReadingToken =
  | { kind: "word"; raw: string; syllables: string[] }
  | { kind: "gap"; raw: string };

/** True when the line is mostly Arabic script (highlight whole words, no EN syllable splits). */
export function isArabicReading(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const ar = (letters.match(/[\u0600-\u06FF]/g) ?? []).length;
  return ar / letters.length >= 0.4;
}

/** Tokenize a sentence into words (with syllables) and gaps (spaces / punctuation). */
export function tokenizeForReading(sentence: string): ReadingToken[] {
  const tokens: ReadingToken[] = [];
  // Latin words get syllable splits; Arabic (and other scripts) stay whole words for karaoke.
  const re =
    /([A-Za-z][A-Za-z']*)|([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)|([^\p{L}]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    if (m[1]) {
      tokens.push({ kind: "word", raw: m[1], syllables: splitWordSyllables(m[1]) });
    } else if (m[2]) {
      tokens.push({ kind: "word", raw: m[2], syllables: [m[2]] });
    } else if (m[3]) {
      tokens.push({ kind: "gap", raw: m[3] });
    }
  }
  return tokens;
}

/** Map a character index (Web Speech boundary) to a flat syllable/word highlight index. */
export function highlightIndexAtChar(sentence: string, charIndex: number): number {
  const tokens = tokenizeForReading(sentence);
  let pos = 0;
  let flat = 0;
  for (const tok of tokens) {
    if (tok.kind === "gap") {
      pos += tok.raw.length;
      continue;
    }
    const start = pos;
    const end = pos + tok.raw.length;
    if (charIndex < end) {
      if (tok.syllables.length <= 1 || charIndex <= start) return flat;
      const into = Math.max(0, charIndex - start);
      const ratio = into / Math.max(1, tok.raw.length);
      return flat + Math.min(tok.syllables.length - 1, Math.floor(ratio * tok.syllables.length));
    }
    flat += tok.syllables.length;
    pos = end;
  }
  return Math.max(0, flat - 1);
}

/** Map 0→1 audio progress onto a flat syllable/word index. */
export function highlightIndexAtProgress(sentence: string, ratio: number): number {
  const parts = flattenSyllables(sentence);
  if (!parts.length) return -1;
  const r = Math.min(1, Math.max(0, ratio));
  if (r >= 0.999) return parts.length - 1;
  return Math.min(parts.length - 1, Math.floor(r * parts.length));
}

/** Flat list of speakable syllable chunks for highlight timing. */
export function flattenSyllables(sentence: string): string[] {
  return tokenizeForReading(sentence).flatMap((t) => (t.kind === "word" ? t.syllables : []));
}

/**
 * Fallback estimate when the engine gives no progress (rare).
 * Tuned closer to ElevenLabs / neural pace than the old slow guess.
 */
export function estimateLineMs(sentence: string, rate: number): number {
  const r = Math.max(0.5, rate || 1);
  // ~14 chars/sec at 1×, plus a short lead-in.
  return Math.max(1200, Math.ceil(sentence.length / 14) * (1000 / r) + 350);
}
