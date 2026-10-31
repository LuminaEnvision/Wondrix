/**
 * School agent: live-AI layer on top of the local School logic (school-agent.ts).
 *
 * Canvas loop: read state (skills, radar, Extra, calm mode) → offer today →
 * practice → update mastery quietly.
 *
 * Hard rule: the AI never decides if an answer is right. Correctness and
 * mastery come from the local question bank; the AI only chooses focus
 * (from an allowed list) and words the coaching.
 *
 * Server only (used by /api/school/session).
 */

import { chatJSON, chatText, cleanKidText } from "./ai";
import { skillsForProfile } from "./demo-store";
import { gradeFromLabel } from "./grades";
import { RADAR_BANK } from "./radar";
import { getSkill, skillsFromParentNote } from "./skills";
import type { AgeBand, MasteryLevel, ParentProfile, RadarItem, SkillId } from "./types";

export type MasteryMap = Partial<Record<SkillId, MasteryLevel>>;

export type FocusDecision = {
  /** Skills the agent could pick from (grade + subjects), with their state. */
  candidates: { id: SkillId; mastery: MasteryLevel; teacherNote: boolean; gradeDefault: boolean }[];
  picked: { id: SkillId; why: string }[];
  coachNote: string;
};

const AGE_VOICE: Record<AgeBand, string> = {
  young: "The child is 7 to 9: very simple words, short sentences.",
  middle: "The child is 10 to 13: clear words, one concrete example.",
  teen: "The learner is 14 to 17: precise and respectful, not childish.",
};

const STYLE =
  "No em dashes, no markdown, no emojis. Never scold. No pep talk or exaggerated praise.";

/* ------------------------------------------------------------------ */
/* Plan: pick today's focus skills from the allowed list, with reasons */
/* ------------------------------------------------------------------ */

export async function aiPlanFocus(input: {
  profile: ParentProfile;
  mastery: MasteryMap;
  extraTopic?: string;
}): Promise<FocusDecision | null> {
  const { profile, mastery } = input;
  const grade = gradeFromLabel(profile.gradeLabel);
  const allowed = skillsForProfile(profile);
  if (!allowed.length) return null;

  const fromNote = new Set(skillsFromParentNote(profile.oneLiner));
  const defaults = new Set(grade.defaultSkills);
  const candidates = allowed.map((id) => ({
    id,
    mastery: mastery[id] ?? ("unknown" as MasteryLevel),
    teacherNote: fromNote.has(id),
    gradeDefault: defaults.has(id),
  }));
  const limit = profile.calmMode ? 1 : 2;

  const list = candidates
    .map(
      (c) =>
        `- ${c.id} | ${getSkill(c.id).title} | mastery=${c.mastery}${c.teacherNote ? " | teacher note" : ""}${c.gradeDefault ? " | core for grade" : ""}`,
    )
    .join("\n");

  const raw = await chatJSON<{ focus?: { id?: unknown; why?: unknown }[]; coachNote?: unknown }>(
    [
      {
        role: "system",
        content: [
          "You are the Wondrix School agent. You pick today's practice focus for one child.",
          `Pick exactly ${limit} skill id(s) ONLY from the candidate list.`,
          "Priority: 1) skills the teacher/parent note points to, 2) shaky skills (silent gaps found by the radar or practice), 3) unknown core skills for the grade, 4) growing skills. Avoid secure skills unless nothing else fits.",
          profile.calmMode ? "Calm mode is on: pick the gentlest useful skill." : "",
          "For each pick, write a short reason for the PARENT (max 12 words, factual, e.g. 'Radar showed a gap; core for Year 4').",
          `Also write coachNote for the CHILD: one short sentence starting with "Today:". ${AGE_VOICE[profile.ageBand]} If it fits naturally, link to their Extra interest.`,
          STYLE,
          'Reply ONLY as JSON: {"focus": [{"id": string, "why": string}], "coachNote": string}.',
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        role: "user",
        content: [
          `Grade: ${grade.label}. Subjects: ${profile.subjects.join(", ")}.`,
          `Teacher/parent note: ${profile.oneLiner.trim() || "(none)"}`,
          `Extra interest today: ${input.extraTopic || "(none)"}`,
          "Candidates:",
          list,
        ].join("\n"),
      },
    ],
    { tag: "school.plan", temperature: 0.3, maxTokens: 220 },
  );
  if (!raw || !Array.isArray(raw.focus)) return null;

  // Validate: only allowed ids, no duplicates, respect the limit.
  const allowedSet = new Set(allowed);
  const picked: FocusDecision["picked"] = [];
  for (const f of raw.focus) {
    const id = f?.id as SkillId;
    if (typeof id !== "string" || !allowedSet.has(id) || picked.some((p) => p.id === id)) continue;
    picked.push({ id, why: typeof f.why === "string" ? cleanKidText(f.why).slice(0, 100) : "" });
    if (picked.length >= limit) break;
  }
  if (!picked.length) return null;

  const coachNote =
    typeof raw.coachNote === "string" && raw.coachNote.trim()
      ? cleanKidText(raw.coachNote)
      : `Today: ${picked.map((p) => getSkill(p.id).title).join(" · ")}.`;

  return { candidates, picked, coachNote };
}

/* ------------------------------------------------------------------ */
/* Question lead-in (no spoilers)                                      */
/* ------------------------------------------------------------------ */

export async function aiLeadIn(profile: ParentProfile, item: RadarItem): Promise<string | null> {
  return chatText(
    [
      {
        role: "system",
        content: `You are the Wondrix School agent. Write ONE short sentence (max 15 words) that sets up the practice question with a tiny real-life hook. Never hint which choice is right. ${AGE_VOICE[profile.ageBand]} ${STYLE}`,
      },
      {
        role: "user",
        content: `Skill: ${getSkill(item.skillId).title}. Question: ${item.prompt}`,
      },
    ],
    { tag: "school.lead", temperature: 0.6, maxTokens: 60, timeoutMs: 6000 },
  );
}

/* ------------------------------------------------------------------ */
/* Explain after grading (correctness already decided locally)         */
/* ------------------------------------------------------------------ */

export async function aiExplain(input: {
  profile: ParentProfile;
  questionId: string;
  choiceId: string | "idk";
  correct: boolean;
}): Promise<string | null> {
  const item = RADAR_BANK.find((r) => r.id === input.questionId);
  if (!item) return null;

  const right = item.choices.find((c) => c.correct)?.label ?? "";
  const chosen =
    input.choiceId === "idk"
      ? "I don't know yet"
      : (item.choices.find((c) => c.id === input.choiceId)?.label ?? "");
  const fact = input.correct ? item.explainCorrect : item.explainWrong;

  const situation = input.correct
    ? "The child chose the correct answer. Confirm briefly and add one reason it is right."
    : input.choiceId === "idk"
      ? "The child said they don't know yet. That is welcome. Teach the idea simply, with one everyday example, and give the answer."
      : "The child chose a wrong answer. Gently show why their choice does not fit, then explain the correct answer.";

  const text = await chatText(
    [
      {
        role: "system",
        content: `You are the Wondrix School agent explaining a practice answer. Max 2 short sentences. ${situation} Stay consistent with the correct answer and the fact given; do not add claims you are unsure of. ${AGE_VOICE[input.profile.ageBand]} ${STYLE}`,
      },
      {
        role: "user",
        content: [
          `Grade: ${input.profile.gradeLabel}. Skill: ${getSkill(item.skillId).title}.`,
          `Question: ${item.prompt}`,
          `Choices: ${item.choices.map((c) => c.label).join(" / ")}`,
          `Correct answer: ${right}`,
          `Child's answer: ${chosen}`,
          `Teacher fact: ${fact}`,
        ].join("\n"),
      },
    ],
    { tag: "school.explain", temperature: 0.4, maxTokens: 120 },
  );

  // Reject empty or runaway outputs; the local explanation is used instead.
  if (!text || text.length > 400) return null;
  return text;
}
