import { gradeFromLabel, skillAllowedForGrade } from "./grades";
import { skillsFromParentNote, SKILL_GRAPH } from "./skills";
import type { MasteryLevel, ParentProfile, SkillId } from "./types";
import { notifyProfileChanged } from "./types";

export const PROFILE_KEY = "wondrix-profile";
export const MASTERY_KEY = "wondrix-mastery";
const EXTRA_TOPIC_KEY = "wondrix-extra-topic";
const SAFETY_KEY = "wondrix-safety-redirects";

export const DEFAULT_PROFILE: ParentProfile = {
  childNickname: "Alex",
  ageBand: "young",
  gradeLabel: "Year 3",
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

export function buildDaySummary(input: {
  nickname: string;
  gradeLabel: string;
  focus: SkillId[];
  extraTopic?: string;
  calmMode: boolean;
  /** Questions the safety gate redirected today (never the question text itself). */
  safetyRedirects?: number;
}): string {
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
