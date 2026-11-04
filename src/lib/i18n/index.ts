/**
 * Wondrix i18n base: English (source) + Arabic (draft, RTL).
 *
 * - The language lives in the saved profile (`profile.language`), so every API
 *   call already carries it and the agents can answer in that language.
 * - `t(key, vars, lang)` works anywhere; components use `useT()` (see use-client-state).
 * - Server render and the first client render are always English; the saved
 *   language applies right after hydration (no hydration mismatch).
 */
import { ar } from "./ar";
import { en, type MessageKey } from "./en";

export type { MessageKey };
export type Lang = "en" | "ar";

export const LANGUAGES: { id: Lang; label: string; dir: "ltr" | "rtl"; speech: string }[] = [
  { id: "en", label: "English", dir: "ltr", speech: "en-US" },
  { id: "ar", label: "العربية", dir: "rtl", speech: "ar-AE" },
];

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, ar };

export function asLang(value: unknown): Lang {
  return value === "ar" ? "ar" : "en";
}

export function langInfo(lang: Lang) {
  return LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];
}

/** Translate a key; {name} placeholders are filled from vars. Falls back to English. */
export function t(key: MessageKey, vars?: Record<string, string | number>, lang: Lang = "en"): string {
  const text = DICTS[lang][key] || en[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Read the saved language outside React (voice, mic). English on the server. */
export function currentLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem("wondrix-profile");
    return asLang(raw ? (JSON.parse(raw) as { language?: unknown }).language : undefined);
  } catch {
    return "en";
  }
}

/** One line for agent prompts: which language to write in. Empty for English. */
export function languagePromptLine(lang: Lang): string {
  if (lang !== "ar") return "";
  return "Language: the child uses the app in Arabic. Write every text value (answer, followUp, topic, titles, labels) in simple Modern Standard Arabic for children in the UAE, even if the child writes in English or mixes languages. Keep JSON keys in English. Use Western digits (0-9). End questions with the Arabic question mark ؟.";
}
