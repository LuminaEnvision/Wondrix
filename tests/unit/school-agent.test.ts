import { describe, expect, it } from "vitest";
import { RADAR_BANK } from "@/lib/radar";
import {
  defaultFocusFromProfile,
  localGradeAnswer,
  localNextQuestion,
  localSchoolPlan,
  nextMastery,
} from "@/lib/school-agent";
import type { ParentProfile } from "@/lib/types";

const profile: ParentProfile = {
  childNickname: "Alex",
  ageBand: "young",
  gradeLabel: "Year 3",
  subjects: ["math", "science"],
  oneLiner: "",
  calmMode: false,
};

describe("nextMastery (quiet mastery, one step per answer)", () => {
  it.each([
    [undefined, "correct", "growing"],
    ["unknown", "correct", "growing"],
    ["shaky", "correct", "growing"],
    ["growing", "correct", "secure"],
    ["secure", "correct", "secure"],
    [undefined, "wrong", "shaky"],
    ["growing", "wrong", "shaky"],
    ["secure", "wrong", "growing"],
    ["secure", "idk", "growing"],
    ["growing", "idk", "shaky"],
  ] as const)("%s + %s → %s", (prev, outcome, expected) => {
    expect(nextMastery(prev, outcome)).toBe(expected);
  });
});

describe("localGradeAnswer (correctness always from the bank)", () => {
  const item = RADAR_BANK.find((r) => r.id === "r-halves-1")!;
  const right = item.choices.find((c) => c.correct)!.id;
  const wrong = item.choices.find((c) => !c.correct)!.id;

  it("correct answer → explainCorrect and mastery up", () => {
    const r = localGradeAnswer(profile, item.id, right, [], "growing")!;
    expect(r.correct).toBe(true);
    expect(r.explanation).toBe(item.explainCorrect);
    expect(r.mastery).toBe("secure");
  });

  it("wrong answer → explainWrong and shaky", () => {
    const r = localGradeAnswer(profile, item.id, wrong, [])!;
    expect(r.correct).toBe(false);
    expect(r.explanation).toBe(item.explainWrong);
    expect(r.mastery).toBe("shaky");
  });

  it("'I don't know' is never counted correct", () => {
    const r = localGradeAnswer(profile, item.id, "idk", [])!;
    expect(r.correct).toBe(false);
    expect(r.nextCoach).toMatch(/another/i);
  });

  it("next question never repeats the current one", () => {
    const r = localGradeAnswer(profile, item.id, right, [])!;
    if (r.nextQuestion) expect(r.nextQuestion.questionId).not.toBe(item.id);
  });

  it("unknown question id → null", () => {
    expect(localGradeAnswer(profile, "nope", "a", [])).toBeNull();
  });
});

describe("local School plan and questions", () => {
  it("plan lists focus titles in the coach note", () => {
    const plan = localSchoolPlan(profile, ["measure-length", "living-things"]);
    expect(plan.source).toBe("local");
    expect(plan.focus.map((f) => f.id)).toEqual(["measure-length", "living-things"]);
    expect(plan.coachNote).toBe("Today: Measuring length · Living things.");
  });

  it("teacher note is reflected in the 'why'", () => {
    const plan = localSchoolPlan({ ...profile, oneLiner: "trouble with fractions" }, ["halves-quarters"]);
    expect(plan.focus[0].why).toMatch(/teacher/i);
  });

  it("question payload never leaks which choice is correct", () => {
    const q = localNextQuestion(profile, "halves-quarters")!;
    for (const c of q.choices) expect(Object.keys(c).sort()).toEqual(["id", "label"]);
  });

  it("default focus respects subjects and calm mode", () => {
    expect(defaultFocusFromProfile({ ...profile, calmMode: true })).toHaveLength(1);
    expect(defaultFocusFromProfile({ ...profile, subjects: [] })).toEqual([]);
  });
});

describe("localNextQuestion recycling (small banks)", () => {
  const y6 = { ...profile, gradeLabel: "Year 6" };

  it("after every question was seen, recycles but never repeats the last one", () => {
    const a = localNextQuestion(y6, "forces-motion", [])!;
    const b = localNextQuestion(y6, "forces-motion", [a.questionId])!;
    expect(b.questionId).not.toBe(a.questionId);
    const c = localNextQuestion(y6, "forces-motion", [a.questionId, b.questionId])!;
    expect(c.questionId).toBe(a.questionId);
  });

  it("a skill with a single question returns null after it (UI shows 'done for today')", () => {
    const y4 = { ...profile, gradeLabel: "Year 4" };
    const only = localNextQuestion(y4, "halves-quarters", [])!;
    expect(localNextQuestion(y4, "halves-quarters", [only.questionId])).toBeNull();
  });
});
