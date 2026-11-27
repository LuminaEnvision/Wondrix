/**
 * Picture cues for Little / non-readers when answer banks are still text.
 * Keyword match → large emoji (no new image assets required).
 */

const CUES: { re: RegExp; emoji: string }[] = [
  { re: /\bcamel\b/i, emoji: "🐪" },
  { re: /\bpalm|tree\b/i, emoji: "🌴" },
  { re: /\bstone|rock\b/i, emoji: "🪨" },
  { re: /\bclock\b/i, emoji: "🕐" },
  { re: /\bruler\b/i, emoji: "📏" },
  { re: /\bthermometer\b/i, emoji: "🌡️" },
  { re: /\bsquare\b/i, emoji: "⬜" },
  { re: /\btriangle\b/i, emoji: "🔺" },
  { re: /\bcircle|round\b/i, emoji: "⚪" },
  { re: /\brectangle\b/i, emoji: "▭" },
  { re: /\bhalf\b/i, emoji: "◐" },
  { re: /\bquarter\b/i, emoji: "◔" },
  { re: /\bwhole\b/i, emoji: "●" },
  { re: /\bsun\b/i, emoji: "☀️" },
  { re: /\bmoon\b/i, emoji: "🌙" },
  { re: /\bstar\b/i, emoji: "⭐" },
  { re: /\bwater|rain\b/i, emoji: "💧" },
  { re: /\bfish\b/i, emoji: "🐟" },
  { re: /\bbird\b/i, emoji: "🐦" },
  { re: /\bdog\b/i, emoji: "🐶" },
  { re: /\bcat\b/i, emoji: "🐱" },
  { re: /\bleaf\b/i, emoji: "🍃" },
  { re: /\bplant\b/i, emoji: "🌱" },
  { re: /\bflower\b/i, emoji: "🌸" },
  { re: /\bcake\b/i, emoji: "🎂" },
  { re: /\bapple\b/i, emoji: "🍎" },
  { re: /\bbook\b/i, emoji: "📖" },
  { re: /\bcar\b/i, emoji: "🚗" },
  { re: /\bbike\b/i, emoji: "🚲" },
  { re: /\bhouse\b/i, emoji: "🏠" },
  { re: /\bhand\b/i, emoji: "✋" },
  { re: /\bfoot\b/i, emoji: "🦶" },
  { re: /\beye\b/i, emoji: "👁️" },
  { re: /\bear\b/i, emoji: "👂" },
  { re: /\bcm\b|centimetre|centimeter/i, emoji: "📏" },
  { re: /\bkm\b|kilometre|kilometer/i, emoji: "🛣️" },
  { re: /\bkg\b|kilogram/i, emoji: "⚖️" },
  { re: /\bidk|don.?t know|not sure/i, emoji: "🤷" },
];

const FALLBACK = ["🔵", "🟢", "🟠", "🟣", "🟡"] as const;

/** Emoji picture for a choice label; stable fallback by index. */
export function choiceEmoji(label: string, index = 0): string {
  for (const cue of CUES) {
    if (cue.re.test(label)) return cue.emoji;
  }
  // Digits / short math answers → number tiles
  const num = label.trim().match(/^-?\d+[°%]?$/);
  if (num) return label.trim();
  return FALLBACK[index % FALLBACK.length]!;
}
