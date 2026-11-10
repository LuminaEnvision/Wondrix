import { clampSubjectsToProgramme } from "./curriculum";
import { defaultAgeMode, gradeFromLabel, skillAllowedForGrade } from "./grades";
import { skillsFromParentNote, skillTitle as skillName, SKILL_GRAPH } from "./skills";
import type { AgeMode, MasteryLevel, ParentProfile, SkillId } from "./types";
import { notifyProfileChanged } from "./types";

export const PROFILE_KEY = "wondrix-profile";
export const MASTERY_KEY = "wondrix-mastery";
const EXTRA_TOPIC_KEY = "wondrix-extra-topic";
const SAFETY_KEY = "wondrix-safety-redirects";

export const DEFAULT_PROFILE: ParentProfile = {
  childNickname: "Alex",
  ageBand: "young",
  ageMode: "explorer",
  teenDark: false,
  gradeLabel: "Year 3",
  curriculum: "uk",
  subjects: ["math", "science"],
  oneLiner: "",
  unitNote: "",
  calmMode: false,
};

function normalizeAgeMode(value: unknown, gradeLabel: string): AgeMode {
  if (value === "explorer" || value === "teen") return value;
  return defaultAgeMode(gradeLabel);
}

export function loadProfile(): ParentProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as ParentProfile;
    const grade = gradeFromLabel(parsed.gradeLabel);
    return {
      ...parsed,
      ageBand: grade.ageBand,
      gradeLabel: grade.label,
      ageMode: normalizeAgeMode(parsed.ageMode, grade.label),
      teenDark: Boolean(parsed.teenDark),
      unitNote: typeof parsed.unitNote === "string" ? parsed.unitNote : "",
      subjects: clampSubjectsToProgramme(parsed.subjects, parsed.curriculum, grade.label),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: ParentProfile) {
  const grade = gradeFromLabel(profile.gradeLabel);
  const next: ParentProfile = {
    ...profile,
    ageBand: grade.ageBand,
    gradeLabel: grade.label,
    ageMode: normalizeAgeMode(profile.ageMode, grade.label),
    teenDark: Boolean(profile.teenDark),
    unitNote: typeof profile.unitNote === "string" ? profile.unitNote : "",
    subjects: clampSubjectsToProgramme(profile.subjects, profile.curriculum, grade.label),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  notifyProfileChanged();
}

/** Resolved UI mode for chrome (never undefined). */
export function profileAgeMode(profile: ParentProfile = loadProfile()): AgeMode {
  return normalizeAgeMode(profile.ageMode, profile.gradeLabel);
}

export function loadMastery(): Partial<Record<SkillId, MasteryLevel>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveMastery(mastery: Partial<Record<SkillId, MasteryLevel>>) {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

export function setSkillMastery(skillId: SkillId, level: MasteryLevel) {
  const next = { ...loadMastery(), [skillId]: level };
  saveMastery(next);
  return next;
}

/** Skills allowed by subject + grade level. */
export function skillsForProfile(
  profile: Pick<ParentProfile, "gradeLabel" | "subjects">,
): SkillId[] {
  const grade = gradeFromLabel(profile.gradeLabel);
  return SKILL_GRAPH.filter(
    (s) =>
      profile.subjects.includes(s.subject) && skillAllowedForGrade(s.fromGrade, grade.id),
  ).map((s) => s.id);
}

/**
 * Pick 1–2 focus skills.
 * Grade defaults come first so changing Year 3 → Year 7+ actually changes practice.
 * Teacher note and shaky skills (only if still grade-appropriate) refine the pick.
 */
export function pickFocusSkills(
  mastery: Partial<Record<SkillId, MasteryLevel>>,
  profile: Pick<ParentProfile, "gradeLabel" | "oneLiner" | "subjects" | "calmMode">,
): SkillId[] {
  const grade = gradeFromLabel(profile.gradeLabel);
  const allowed = new Set(skillsForProfile(profile));
  const fromNote = skillsFromParentNote(profile.oneLiner).filter((id) => allowed.has(id));

  const shaky = (Object.entries(mastery) as [SkillId, MasteryLevel][])
    .filter(([id, level]) => allowed.has(id) && (level === "shaky" || level === "unknown"))
    .map(([id]) => id);

  const gradeDefaults = grade.defaultSkills.filter((id) => allowed.has(id));
  const limit = profile.calmMode ? 1 : 2;

  // Grade pool first so parent grade change is always visible
  const ordered = [...gradeDefaults, ...fromNote, ...shaky] as SkillId[];
  const unique: SkillId[] = [];
  for (const id of ordered) {
    if (!allowed.has(id)) continue;
    if (!unique.includes(id)) unique.push(id);
    if (unique.length >= limit) break;
  }
  return unique.length ? unique : gradeDefaults.slice(0, limit);
}

export function buildDaySummary(input: {
  nickname: string;
  gradeLabel: string;
  focus: SkillId[];
  extraTopic?: string;
  calmMode: boolean;
  /** Questions the safety gate redirected today (never the question text itself). */
  safetyRedirects?: number;
  /** Summary language; the grade label should already be in this language. */
  lang?: "en" | "ar";
}): string {
  if (input.lang === "ar") return buildDaySummaryAr(input);
  const focusText = input.focus.map(skillTitle).join(", ") || "general practice";
  const extra = input.extraTopic
    ? `Extra explored: ${input.extraTopic}.`
    : "Extra: not opened today.";
  const calm = input.calmMode ? " Calm mode was on." : "";
  const n = input.safetyRedirects ?? 0;
  const safety =
    n > 0
      ? ` Wondrix gently redirected ${n === 1 ? "1 question" : `${n} questions`} to safer topics today; a calm chat about it may help.`
      : "";
  return `${input.nickname} (${input.gradeLabel}) practiced: ${focusText}. ${extra}${calm}${safety} Tip: ask one dinner question about today's focus.`;
}

function buildDaySummaryAr(input: Parameters<typeof buildDaySummary>[0]): string {
  const focusText = input.focus.map((id) => skillName(id, "ar")).join("، ") || "تدريب عام";
  const extra = input.extraTopic ? `استكشف في قسم إضافي: ${input.extraTopic}.` : "لم يُفتح قسم إضافي اليوم.";
  const calm = input.calmMode ? " كان الوضع الهادئ مفعّلًا." : "";
  const n = input.safetyRedirects ?? 0;
  const safety =
    n > 0
      ? ` وجّه ووندريكس بلطف ${n === 1 ? "سؤالًا واحدًا" : `${n} أسئلة`} إلى مواضيع أكثر أمانًا اليوم، وقد يفيد حديث هادئ عن ذلك.`
      : "";
  return `${input.nickname} (${input.gradeLabel}) تدرّب على: ${focusText}. ${extra}${calm}${safety} نصيحة: اطرح على العشاء سؤالًا واحدًا عن مهارة اليوم.`;
}

function skillTitle(id: SkillId): string {
  return SKILL_GRAPH.find((s) => s.id === id)?.title ?? id;
}

export function saveExtraTopic(label: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXTRA_TOPIC_KEY, label);
}

export function loadExtraTopic(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(EXTRA_TOPIC_KEY) || undefined;
}

/**
 * Count safety redirects per day for the parent summary. Only a number is kept:
 * the unsafe question itself is never stored or shown as an "explored" topic.
 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordSafetyRedirect() {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(localStorage.getItem(SAFETY_KEY) || "{}") as { day?: string; count?: number };
    const count = raw.day === todayKey() ? (raw.count ?? 0) + 1 : 1;
    localStorage.setItem(SAFETY_KEY, JSON.stringify({ day: todayKey(), count }));
  } catch {
    /* storage unavailable */
  }
}

export function loadSafetyRedirects(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem(SAFETY_KEY) || "{}") as { day?: string; count?: number };
    return raw.day === todayKey() ? (raw.count ?? 0) : 0;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Extra chat history (localStorage) + active chat per tab (sessionStorage) */
/* ------------------------------------------------------------------ */

const CHATS_KEY = "wondrix-extra-chats";
const ACTIVE_CHAT_KEY = "wondrix-extra-active";
const LEGACY_CHAT_KEY = "wondrix-extra-chat"; // single-chat format before history existed

/** Kept on the device: the 20 most recent chats per language, 30 messages each. */
export const MAX_SAVED_CHATS = 20;
export const MAX_SAVED_MESSAGES = 30;

export type SavedChatMessage = {
  id: number;
  role: "child" | "agent";
  text: string;
  visual?: unknown;
};

export type SavedChat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: SavedChatMessage[];
  /** App language when the chat was saved. Missing on older chats → guessed from text. */
  lang?: "en" | "ar";
};

function isMessage(m: unknown): m is SavedChatMessage {
  const x = m as SavedChatMessage;
  return Boolean(x) && typeof x.id === "number" && (x.role === "child" || x.role === "agent") && typeof x.text === "string";
}

/** Guess language for chats saved before we stored `lang`. */
function guessChatLang(messages: SavedChatMessage[]): "en" | "ar" {
  const sample = messages.map((m) => m.text).join(" ");
  return /[\u0600-\u06FF]/.test(sample) ? "ar" : "en";
}

export function chatLang(chat: SavedChat): "en" | "ar" {
  return chat.lang === "ar" || chat.lang === "en" ? chat.lang : guessChatLang(chat.messages);
}

function profileLang(): "en" | "ar" {
  try {
    return loadProfile().language === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function readChats(): SavedChat[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c): c is SavedChat => Boolean(c) && typeof c.id === "string" && Array.isArray(c.messages))
      .map((c) => {
        const messages = c.messages.filter(isMessage);
        return { ...c, messages, lang: c.lang === "ar" || c.lang === "en" ? c.lang : guessChatLang(messages) };
      });
  } catch {
    return [];
  }
}

function writeChats(chats: SavedChat[]) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    /* storage full: drop the oldest chat and retry once */
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, -1)));
    } catch {
      /* give up silently; the current chat still works in memory */
    }
  }
}

/** Title shown in "Past chats": the child's first question. */
export function chatTitle(messages: SavedChatMessage[]): string {
  const first = messages.find((m) => m.role === "child")?.text.trim() ?? "New chat";
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

export function newChatId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Every saved chat (all languages), most recent first. */
export function listAllChats(): SavedChat[] {
  if (typeof window === "undefined") return [];
  migrateLegacyChat();
  return readChats().sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Saved chats for one language (defaults to the profile language), most recent first.
 * Switching English ↔ Arabic must not surface the other language's history.
 */
export function listChats(lang: "en" | "ar" = profileLang()): SavedChat[] {
  return listAllChats().filter((c) => chatLang(c) === lang);
}

export function loadChat(id: string): SavedChat | undefined {
  if (typeof window === "undefined") return undefined;
  migrateLegacyChat();
  return readChats().find((c) => c.id === id);
}

/** Create or update a chat. Empty chats are not stored. Caps per language. */
export function saveChat(id: string, messages: SavedChatMessage[], lang: "en" | "ar" = profileLang()) {
  if (typeof window === "undefined" || !messages.length) return;
  const slim = messages
    .slice(-MAX_SAVED_MESSAGES)
    .map(({ id: mid, role, text, visual }) => ({ id: mid, role, text, visual: visual ?? null }));
  const now = Date.now();
  const all = readChats();
  const existing = all.find((c) => c.id === id);
  const updated: SavedChat = {
    id,
    title: chatTitle(slim),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages: slim,
    lang,
  };
  const sameLang = [updated, ...all.filter((c) => c.id !== id && chatLang(c) === lang)].slice(0, MAX_SAVED_CHATS);
  const otherLang = all.filter((c) => c.id !== id && chatLang(c) !== lang);
  writeChats([...sameLang, ...otherLang]);
}

export function deleteChat(id: string) {
  if (typeof window === "undefined") return;
  writeChats(readChats().filter((c) => c.id !== id));
}

/** Parent control: remove every saved chat on this device. */
export function clearAllChats() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHATS_KEY);
    sessionStorage.removeItem(ACTIVE_CHAT_KEY);
    sessionStorage.removeItem(LEGACY_CHAT_KEY);
  } catch {
    /* ignore */
  }
}

/** The chat open in this tab (so a reload continues it). */
export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ACTIVE_CHAT_KEY);
  } catch {
    return null;
  }
}

export function setActiveChatId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(ACTIVE_CHAT_KEY, id);
    else sessionStorage.removeItem(ACTIVE_CHAT_KEY);
  } catch {
    /* ignore */
  }
}

/** One-time import of the old single-chat (sessionStorage) format into the history. */
function migrateLegacyChat() {
  try {
    const raw = sessionStorage.getItem(LEGACY_CHAT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(LEGACY_CHAT_KEY);
    const msgs = (JSON.parse(raw) as unknown[]).filter(isMessage);
    if (!msgs.length) return;
    const id = newChatId();
    const now = Date.now();
    const lang = guessChatLang(msgs);
    writeChats([{ id, title: chatTitle(msgs), createdAt: now, updatedAt: now, messages: msgs, lang }, ...readChats()].slice(0, MAX_SAVED_CHATS * 2));
    if (!sessionStorage.getItem(ACTIVE_CHAT_KEY)) sessionStorage.setItem(ACTIVE_CHAT_KEY, id);
  } catch {
    /* ignore */
  }
}
