import { gradeFromLabel, skillAllowedForGrade } from "./grades";
import { skillsFromParentNote, skillTitle as skillName, SKILL_GRAPH } from "./skills";
import type { MasteryLevel, ParentProfile, SkillId } from "./types";
import { notifyProfileChanged } from "./types";

export const PROFILE_KEY = "wondrix-profile";
export const MASTERY_KEY = "wondrix-mastery";
const EXTRA_TOPIC_KEY = "wondrix-extra-topic";
const SAFETY_KEY = "wondrix-safety-redirects";
const PRACTICE_KEY = "wondrix-practice-today";

export const DEFAULT_PROFILE: ParentProfile = {
  childNickname: "Alex",
  ageBand: "young",
  gradeLabel: "Year 3",
  curriculum: "uk",
  subjects: ["math", "science"],
  oneLiner: "",
  calmMode: false,
};

export function loadProfile(): ParentProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as ParentProfile;
    const grade = gradeFromLabel(parsed.gradeLabel);
    return { ...parsed, ageBand: grade.ageBand, gradeLabel: grade.label };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: ParentProfile) {
  const grade = gradeFromLabel(profile.gradeLabel);
  const next = { ...profile, ageBand: grade.ageBand, gradeLabel: grade.label };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  notifyProfileChanged();
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

/** One finished School practice session (today only; the parent summary reads it). */
export type PracticeSession = { skillId: SkillId; answered: number; correct: number };

export function recordPracticeSession(session: PracticeSession) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(localStorage.getItem(PRACTICE_KEY) || "{}") as { day?: string; sessions?: PracticeSession[] };
    const sessions = raw.day === todayKey() ? (raw.sessions ?? []) : [];
    localStorage.setItem(PRACTICE_KEY, JSON.stringify({ day: todayKey(), sessions: [...sessions, session] }));
  } catch {
    // storage unavailable: nothing to keep
  }
}

export function loadPracticeSessions(): PracticeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(PRACTICE_KEY) || "{}") as { day?: string; sessions?: PracticeSession[] };
    return raw.day === todayKey() ? (raw.sessions ?? []) : [];
  } catch {
    return [];
  }
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
  /** Practice sessions finished today. */
  sessions?: PracticeSession[];
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
  const done = input.sessions ?? [];
  const answered = done.reduce((n, s) => n + s.answered, 0);
  const finished = done.length
    ? ` Finished ${done.length === 1 ? "1 practice session" : `${done.length} practice sessions`} (${answered} questions).`
    : "";
  return `${input.nickname} (${input.gradeLabel}) practiced: ${focusText}.${finished} ${extra}${calm}${safety} Tip: ask one dinner question about today's focus.`;
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
  const done = input.sessions ?? [];
  const answered = done.reduce((k, s) => k + s.answered, 0);
  const finished = done.length
    ? ` أنهى ${done.length === 1 ? "جلسة تدريب واحدة" : `${done.length} جلسات تدريب`} (${answered} أسئلة).`
    : "";
  return `${input.nickname} (${input.gradeLabel}) تدرّب على: ${focusText}.${finished} ${extra}${calm}${safety} نصيحة: اطرح على العشاء سؤالًا واحدًا عن مهارة اليوم.`;
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

/** Kept on the device: the 20 most recent chats, 30 messages each (browser storage is small). */
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
};

function isMessage(m: unknown): m is SavedChatMessage {
  const x = m as SavedChatMessage;
  return Boolean(x) && typeof x.id === "number" && (x.role === "child" || x.role === "agent") && typeof x.text === "string";
}

function readChats(): SavedChat[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c): c is SavedChat => Boolean(c) && typeof c.id === "string" && Array.isArray(c.messages))
      .map((c) => ({ ...c, messages: c.messages.filter(isMessage) }));
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

/** All saved chats, most recent first. */
export function listChats(): SavedChat[] {
  if (typeof window === "undefined") return [];
  migrateLegacyChat();
  return readChats().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadChat(id: string): SavedChat | undefined {
  return listChats().find((c) => c.id === id);
}

/** Create or update a chat. Empty chats are not stored. Keeps the newest MAX_SAVED_CHATS. */
export function saveChat(id: string, messages: SavedChatMessage[]) {
  if (typeof window === "undefined" || !messages.length) return;
  const slim = messages
    .slice(-MAX_SAVED_MESSAGES)
    .map(({ id: mid, role, text, visual }) => ({ id: mid, role, text, visual: visual ?? null }));
  const now = Date.now();
  const chats = listChats();
  const existing = chats.find((c) => c.id === id);
  const updated: SavedChat = {
    id,
    title: chatTitle(slim),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages: slim,
  };
  const rest = chats.filter((c) => c.id !== id);
  writeChats([updated, ...rest].slice(0, MAX_SAVED_CHATS));
}

export function deleteChat(id: string) {
  if (typeof window === "undefined") return;
  writeChats(listChats().filter((c) => c.id !== id));
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
    writeChats([{ id, title: chatTitle(msgs), createdAt: now, updatedAt: now, messages: msgs }, ...readChats()].slice(0, MAX_SAVED_CHATS));
    if (!sessionStorage.getItem(ACTIVE_CHAT_KEY)) sessionStorage.setItem(ACTIVE_CHAT_KEY, id);
  } catch {
    /* ignore */
  }
}
