import { describe, expect, it } from "vitest";
import { buildDaySummary, pickFocusSkills, skillsForProfile } from "@/lib/demo-store";
import { GRADE_OPTIONS, gradeFromLabel, skillAllowedForGrade } from "@/lib/grades";
import { itemsForGrade, pickQuestion, RADAR_BANK, radarForGrade } from "@/lib/radar";
import { getSkill, SKILL_GRAPH, skillsFromParentNote } from "@/lib/skills";
import type { ParentProfile } from "@/lib/types";

const profile = (over: Partial<ParentProfile> = {}): ParentProfile => ({
  childNickname: "Alex",
  ageBand: "young",
  gradeLabel: "Year 3",
  subjects: ["math", "science"],
  oneLiner: "",
  calmMode: false,
  ...over,
});

describe("grades", () => {
  it("maps labels and loose text to grade options", () => {
    expect(gradeFromLabel("Year 4").id).toBe("y4");
    expect(gradeFromLabel("y5").id).toBe("y5");
    expect(gradeFromLabel("grade 6").id).toBe("y6");
    expect(gradeFromLabel("secondary school").id).toBe("y7+");
    expect(gradeFromLabel("Year 2").id).toBe("y1-2");
    expect(gradeFromLabel("???").id).toBe("y3");
  });

  it("age bands match the canvas skins", () => {
    expect(gradeFromLabel("Year 3").ageBand).toBe("young");
    expect(gradeFromLabel("Year 5").ageBand).toBe("middle");
    expect(gradeFromLabel("Year 7+").ageBand).toBe("teen");
  });

  it("a skill is allowed from its entry grade upwards", () => {
    expect(skillAllowedForGrade("y5", "y4")).toBe(false);
    expect(skillAllowedForGrade("y5", "y5")).toBe(true);
    expect(skillAllowedForGrade("y1-2", "y7+")).toBe(true);
  });

  it("every grade default skill exists in the skill graph", () => {
    for (const g of GRADE_OPTIONS) {
      for (const id of g.defaultSkills) expect(() => getSkill(id)).not.toThrow();
    }
  });
});

describe("skill graph", () => {
  it("prerequisites point at real skills", () => {
    const ids = new Set(SKILL_GRAPH.map((s) => s.id));
    for (const s of SKILL_GRAPH) for (const p of s.prerequisites) expect(ids.has(p)).toBe(true);
  });

  it("parent/teacher notes map to skills", () => {
    expect(skillsFromParentNote("struggles with fractions")).toContain("halves-quarters");
    expect(skillsFromParentNote("needs help with percent")).toContain("percentages");
    expect(skillsFromParentNote("loves the moon and planets")).toContain("solar-system");
    expect(skillsFromParentNote("")).toEqual([]);
  });
});

describe("radar bank", () => {
  it("every item has exactly one correct choice and both explanations", () => {
    for (const item of RADAR_BANK) {
      expect(item.choices.filter((c) => c.correct), item.id).toHaveLength(1);
      expect(item.explainCorrect.length, item.id).toBeGreaterThan(5);
      expect(item.explainWrong.length, item.id).toBeGreaterThan(5);
    }
  });

  it("ids are unique and grades are valid", () => {
    const ids = RADAR_BANK.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const gradeIds = new Set(GRADE_OPTIONS.map((g) => g.id));
    for (const item of RADAR_BANK) for (const g of item.grades) expect(gradeIds.has(g), item.id).toBe(true);
  });

  it("Year 3 and Year 7+ get different radar items (grade-matched)", () => {
    const y3 = radarForGrade("Year 3", 5).map((r) => r.id);
    const y7 = radarForGrade("Year 7+", 5).map((r) => r.id);
    expect(y3.length).toBeGreaterThan(0);
    expect(y7.length).toBeGreaterThan(0);
    expect(y3).not.toEqual(y7);
    for (const id of y7) expect(RADAR_BANK.find((r) => r.id === id)!.grades).toContain("y7+");
  });

  it("pickQuestion respects avoidIds and falls back to the closest grade", () => {
    const pool = itemsForGrade("Year 4", "halves-quarters");
    const first = pickQuestion("Year 4", "halves-quarters", []);
    expect(first).not.toBeNull();
    const avoided = pickQuestion("Year 4", "halves-quarters", pool.map((p) => p.id));
    if (avoided) expect(pool.map((p) => p.id)).not.toContain(avoided.id);
    expect(pickQuestion("Year 3", "algebra-intro", [])?.skillId).toBe("algebra-intro");
  });
});

describe("focus picking (local School plan)", () => {
  it("grade change changes the focus", () => {
    const y3 = pickFocusSkills({}, profile({ gradeLabel: "Year 3" }));
    const y7 = pickFocusSkills({}, profile({ gradeLabel: "Year 7+" }));
    expect(y3).not.toEqual(y7);
  });

  it("calm mode limits focus to one skill", () => {
    expect(pickFocusSkills({}, profile({ calmMode: true }))).toHaveLength(1);
    expect(pickFocusSkills({}, profile())).toHaveLength(2);
  });

  it("only picks subjects the parent chose", () => {
    const ids = pickFocusSkills({}, profile({ subjects: ["science"] }));
    for (const id of ids) expect(getSkill(id).subject).toBe("science");
  });

  it("skillsForProfile never includes skills above the grade", () => {
    const y3 = skillsForProfile(profile({ gradeLabel: "Year 3" }));
    expect(y3).not.toContain("algebra-intro");
    expect(skillsForProfile(profile({ gradeLabel: "Year 7+" }))).toContain("algebra-intro");
  });

  it("day summary mentions child, grade, focus and Extra topic", () => {
    const s = buildDaySummary({
      nickname: "Sara",
      gradeLabel: "Year 4",
      focus: ["halves-quarters"],
      extraTopic: "Moon phases",
      calmMode: true,
    });
    expect(s).toContain("Sara (Year 4)");
    expect(s).toContain("Halves and quarters");
    expect(s).toContain("Extra explored: Moon phases.");
    expect(s).toContain("Calm mode was on.");
    expect(s).not.toMatch(/redirected/);
  });

  it("day summary counts safety redirects without repeating the question", () => {
    const one = buildDaySummary({ nickname: "Sara", gradeLabel: "Year 4", focus: [], calmMode: false, safetyRedirects: 1 });
    expect(one).toContain("gently redirected 1 question");
    const two = buildDaySummary({ nickname: "Sara", gradeLabel: "Year 4", focus: [], calmMode: false, safetyRedirects: 2 });
    expect(two).toContain("gently redirected 2 questions");
  });
});

describe("question bank (phase 1)", () => {
  it("has at least 5 items per skill overall", () => {
    for (const skill of SKILL_GRAPH) {
      const n = RADAR_BANK.filter((r) => r.skillId === skill.id).length;
      expect(n, skill.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("only lists grades where the skill is taught (not before the skill's entry grade)", () => {
    for (const item of RADAR_BANK.filter((r) => r.id.startsWith("q-"))) {
      const skill = getSkill(item.skillId);
      for (const g of item.grades) expect(skillAllowedForGrade(skill.fromGrade, g), `${item.id} in ${g}`).toBe(true);
    }
  });

  it("follows the Dubai-ready writing rules (metric, no em dashes, short prompts)", () => {
    for (const item of RADAR_BANK.filter((r) => r.id.startsWith("q-"))) {
      const all = [item.prompt, item.explainCorrect, item.explainWrong, ...item.choices.map((c) => c.label)].join(" ");
      expect(all, item.id).not.toMatch(/[—–]/);
      expect(all, item.id).not.toMatch(/\d[\d,.]*\s*(miles?|inch(es)?|in\.|feet|foot|ft|pounds?|lbs?|°F|\$)/i);
      expect(all, item.id).not.toMatch(/\bdollars?\b|°F/i);
      expect(item.prompt.length, item.id).toBeLessThanOrEqual(110);
      expect(item.choices).toHaveLength(3);
    }
  });

  it("every grade has practice for each of its default focus skills", () => {
    for (const g of GRADE_OPTIONS) {
      for (const skillId of g.defaultSkills) {
        expect(itemsForGrade(g.label, skillId).length, `${g.label} ${skillId}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("answer position (review fix: correct answer was first in 44/75)", () => {
  it("shuffleChoices keeps every option and changes order", async () => {
    const { shuffleChoices, seededRandom } = await import("@/lib/radar");
    const items = ["a", "b", "c"];
    const rand = seededRandom(42);
    const orders = new Set(Array.from({ length: 30 }, () => shuffleChoices(items, rand).join("")));
    expect(orders.size).toBeGreaterThan(3);
    for (const o of orders) expect([...o].sort().join("")).toBe("abc");
  });

  it("served questions put the correct answer in every position, about equally", async () => {
    const { localNextQuestion } = await import("@/lib/school-agent");
    const profile = { childNickname: "A", ageBand: "middle" as const, gradeLabel: "Year 5", subjects: ["math", "science"] as ("math" | "science")[], oneLiner: "", calmMode: false };
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const q = localNextQuestion(profile, "solar-system", [])!;
      const item = RADAR_BANK.find((r) => r.id === q.questionId)!;
      const correctId = item.choices.find((c) => c.correct)!.id;
      counts[q.choices.findIndex((c) => c.id === correctId)]++;
    }
    for (const c of counts) expect(c).toBeGreaterThan(50); // ~100 each if uniform
  });
});

describe("distractor quality (review)", () => {
  const silly = ["Sand", "Plastic", "Nothing at all", "Nowhere", "It is on fire", "Balls get tired", "Things grow at night", "Four cakes"];
  it("no throwaway distractors in questions for Year 5 and above", () => {
    const upper = new Set(["y5", "y6", "y7+"]);
    for (const item of RADAR_BANK.filter((r) => r.id.startsWith("q-") && r.grades.some((g) => upper.has(g)))) {
      for (const c of item.choices) expect(silly, `${item.id}: "${c.label}"`).not.toContain(c.label);
    }
  });
});
