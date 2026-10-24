import { gradeFromLabel } from "./grades";
import { pickQuestion, RADAR_BANK } from "./radar";
import { getSkill, SKILL_GRAPH } from "./skills";
import type { MasteryLevel, ParentProfile, RadarItem, SkillId } from "./types";

export type SchoolPlan = {
  gradeLabel: string;
  gradeId: string;
  focus: { id: SkillId; title: string; subject: string; why: string }[];
  coachNote: string;
  source: "local" | "openai";
};

export type SchoolQuestionPayload = {
  questionId: string;
  skillId: SkillId;
  skillTitle: string;
  prompt: string;
  choices: { id: string; label: string }[];
  coachLead: string;
  source: "local" | "openai";
};

export type SchoolGradeResult = {
  correct: boolean;
  explanation: string;
  mastery: MasteryLevel;
  nextCoach: string;
  nextQuestion: SchoolQuestionPayload | null;
  source: "local" | "openai";
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
    "living-things": /living|animal|plant/,
    materials: /material|solid|liquid/,
    "day-night": /day|night|earth|spin/,
    habitats: /habitat/,
    "forces-motion": /force|motion|gravity/,
    "solar-system": /planet|solar|moon|space/,
    "cells-micro": /cell|microbe/,
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

  const advanced =
    grade.id === "y6" || grade.id === "y7+"
      ? " We'll stretch into harder ideas when you're ready."
      : "";

  return {
    gradeLabel: grade.label,
    gradeId: grade.id,
    focus,
    coachNote: `I'm your School agent for ${grade.label}. Today we practice: ${
      focus.map((f) => f.title).join(" and ") || "a gentle check-in"
    }.${advanced} No scary scores. "I don't know" is always ok.`,
    source: "local",
  };
}

export function toQuestionPayload(
  item: RadarItem,
  coachLead: string,
  source: "local" | "openai" = "local",
): SchoolQuestionPayload {
  return {
    questionId: item.id,
    skillId: item.skillId,
    skillTitle: getSkill(item.skillId).title,
    prompt: item.prompt,
    choices: item.choices.map((c) => ({ id: c.id, label: c.label })),
    coachLead,
    source,
  };
}

export function localNextQuestion(
  profile: ParentProfile,
  skillId: SkillId,
  avoidIds: string[] = [],
): SchoolQuestionPayload | null {
  const item = pickQuestion(profile.gradeLabel, skillId, avoidIds);
  if (!item) return null;
  const skill = getSkill(skillId);
  return toQuestionPayload(
    item,
    `Let's try ${skill.title} for ${profile.gradeLabel}. Take your time.`,
  );
}

export function localGradeAnswer(
  profile: ParentProfile,
  questionId: string,
  choiceId: string | "idk",
  avoidIds: string[],
): SchoolGradeResult | null {
  const item = RADAR_BANK.find((r) => r.id === questionId);
  if (!item) return null;

  if (choiceId === "idk") {
    const next = localNextQuestion(profile, item.skillId, [...avoidIds, questionId]);
    return {
      correct: false,
      explanation: item.explainWrong,
      mastery: "shaky",
      nextCoach: "Thanks for saying you don't know yet. That helps me teach better. Want another try?",
      nextQuestion: next,
      source: "local",
    };
  }

  const choice = item.choices.find((c) => c.id === choiceId);
  const correct = Boolean(choice?.correct);
  const next = localNextQuestion(profile, item.skillId, [...avoidIds, questionId]);

  return {
    correct,
    explanation: correct ? item.explainCorrect : item.explainWrong,
    mastery: correct ? "growing" : "shaky",
    nextCoach: correct
      ? "Nice. That skill is growing. Ready for one more?"
      : "Close. Read the tip, then we can try again gently.",
    nextQuestion: next,
    source: "local",
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
