import { gradeFromLabel } from "./grades";
import { pickQuestion, RADAR_BANK, shuffleChoices } from "./radar";
import { getSkill, SKILL_GRAPH } from "./skills";
import type { MasteryLevel, ParentProfile, RadarItem, SkillId } from "./types";

/** Where a School/Extra reply came from: local banks or a live provider. */
export type AgentSource = "local" | "zai" | "openai";

export type SchoolPlan = {
  gradeLabel: string;
  gradeId: string;
  focus: { id: SkillId; title: string; subject: string; why: string }[];
  coachNote: string;
  /** Present when the live agent chose the focus: what it saw and why it picked. */
  decision?: {
    candidates: { id: SkillId; mastery: MasteryLevel }[];
    picked: { id: SkillId; why: string }[];
  };
  source: AgentSource;
};

export type SchoolQuestionPayload = {
  questionId: string;
  skillId: SkillId;
  skillTitle: string;
  prompt: string;
  choices: { id: string; label: string }[];
  coachLead: string;
  source: AgentSource;
};

export type SchoolGradeResult = {
  correct: boolean;
  explanation: string;
  mastery: MasteryLevel;
  nextCoach: string;
  nextQuestion: SchoolQuestionPayload | null;
  source: AgentSource;
  /** Set after grading so the UI can mark the right option (never sent before answer). */
  correctChoiceId?: string;
};

function whyForSkill(id: SkillId, profile: ParentProfile): string {
  const skill = getSkill(id);
  const note = profile.oneLiner.toLowerCase();
  if (note && skillsMentioned(note, id)) {
    return "From teacher recommendations / parent note.";
  }
  return `Fits ${profile.gradeLabel} · ${skill.subject}.`;
}

function skillsMentioned(note: string, id: SkillId): boolean {
  const map: Record<SkillId, RegExp> = {
    "measure-length": /measur|ruler|length/,
    "halves-quarters": /fraction|half|quarter/,
    "add-within-100": /add|plus|number/,
    "shapes-angles": /shape|angle|turn/,
    "multiply-basics": /times|multipl/,
    "fractions-compare": /fraction|compare/,
    percentages: /percent|%/,
    "algebra-intro": /algebra|equation/,
    "equations-linear": /linear|equation|solve/,
    "ratio-rate": /ratio|rate|proportion/,
    "stats-data": /average|mean|data|statistic/,
    "living-things": /living|animal|plant/,
    materials: /material|solid|liquid/,
    "day-night": /day|night|earth|spin/,
    habitats: /habitat/,
    "forces-motion": /force|motion|gravity/,
    "solar-system": /planet|solar|moon|space/,
    "cells-micro": /cell|microbe/,
    "energy-electricity": /electric|energy|circuit/,
    "chemical-reactions": /reaction|chemical|acid/,
    "genetics-intro": /gene|dna|inherit/,
  };
  return map[id]?.test(note) ?? false;
}

export function localSchoolPlan(
  profile: ParentProfile,
  focusIds: SkillId[],
): SchoolPlan {
  const grade = gradeFromLabel(profile.gradeLabel);
  const focus = focusIds.map((id) => {
    const skill = getSkill(id);
    return {
      id,
      title: skill.title,
      subject: skill.subject,
      why: whyForSkill(id, profile),
    };
  });

  const titles = focus.map((f) => f.title).join(" · ") || "a short check-in";

  return {
    gradeLabel: grade.label,
    gradeId: grade.id,
    focus,
    coachNote: `Today: ${titles}.`,
    source: "local",
  };
}

export function toQuestionPayload(
  item: RadarItem,
  coachLead: string,
  source: AgentSource = "local",
): SchoolQuestionPayload {
  return {
    questionId: item.id,
    skillId: item.skillId,
    skillTitle: getSkill(item.skillId).title,
    prompt: item.prompt,
    // Fresh order every time the question is served (see shuffleChoices).
    choices: shuffleChoices(item.choices).map((c) => ({ id: c.id, label: c.label })),
    coachLead,
    source,
  };
}

/** Soft cap so a sitting ends even when the bank is deep. */
export const PRACTICE_SESSION_LIMIT = 5;

export function localNextQuestion(
  profile: ParentProfile,
  skillId: SkillId,
  avoidIds: string[] = [],
): SchoolQuestionPayload | null {
  // Session over: do not recycle forever — the child should see "enough for today".
  if (avoidIds.length >= PRACTICE_SESSION_LIMIT) return null;
  const item = pickQuestion(profile.gradeLabel, skillId, avoidIds);
  if (!item) return null;
  return toQuestionPayload(item, "");
}

/**
 * Quiet mastery update (canvas: "update mastery quietly").
 * One answer moves a skill one step, so a single lucky guess does not mark it secure
 * and a single slip does not erase a secure skill.
 */
export function nextMastery(prev: MasteryLevel | undefined, outcome: "correct" | "wrong" | "idk"): MasteryLevel {
  const p = prev ?? "unknown";
  if (outcome === "correct") {
    if (p === "growing" || p === "secure") return "secure";
    return "growing";
  }
  if (p === "secure") return "growing";
  return "shaky";
}

export function localGradeAnswer(
  profile: ParentProfile,
  questionId: string,
  choiceId: string | "idk",
  avoidIds: string[],
  prevMastery?: MasteryLevel,
): SchoolGradeResult | null {
  const item = RADAR_BANK.find((r) => r.id === questionId);
  if (!item) return null;

  const correctChoiceId = item.choices.find((c) => c.correct)?.id;

  if (choiceId === "idk") {
    const next = localNextQuestion(profile, item.skillId, [...avoidIds, questionId]);
    return {
      correct: false,
      explanation: item.explainWrong,
      mastery: nextMastery(prevMastery, "idk"),
      nextCoach: "Want another try?",
      nextQuestion: next,
      source: "local",
      correctChoiceId,
    };
  }

  const choice = item.choices.find((c) => c.id === choiceId);
  const correct = Boolean(choice?.correct);
  const next = localNextQuestion(profile, item.skillId, [...avoidIds, questionId]);

  return {
    correct,
    explanation: correct ? item.explainCorrect : item.explainWrong,
    mastery: nextMastery(prevMastery, correct ? "correct" : "wrong"),
    nextCoach: correct ? "Nice. One more?" : "Try another?",
    nextQuestion: next,
    source: "local",
    correctChoiceId,
  };
}

/** Prefer grade-default skills that match subjects. */
export function defaultFocusFromProfile(profile: ParentProfile): SkillId[] {
  const grade = gradeFromLabel(profile.gradeLabel);
  const allowedSubjects = new Set(profile.subjects);
  return grade.defaultSkills
    .filter((id) => {
      const skill = SKILL_GRAPH.find((s) => s.id === id);
      return skill && allowedSubjects.has(skill.subject);
    })
    .slice(0, profile.calmMode ? 1 : 2);
}
