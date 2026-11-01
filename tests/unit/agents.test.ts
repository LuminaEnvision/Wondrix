import { beforeEach, describe, expect, it } from "vitest";
import { aiExtraReply, aiExtraVisual } from "@/lib/extra-agent";
import { aiExplain, aiLeadIn, aiPlanFocus } from "@/lib/school-agent-ai";
import { RADAR_BANK } from "@/lib/radar";
import type { ParentProfile } from "@/lib/types";
import { chatResponse, fakeFetch, lastUser, muteLogs, systemPrompt, useZai } from "../helpers/fake-ai";

const profile = (over: Partial<ParentProfile> = {}): ParentProfile => ({
  childNickname: "Sara",
  ageBand: "middle",
  gradeLabel: "Year 4",
  subjects: ["math", "science"],
  oneLiner: "",
  calmMode: false,
  ...over,
});

beforeEach(() => {
  muteLogs();
  useZai();
});

describe("Extra agent prompt", () => {
  it.each([
    ["young", "7 to 9"],
    ["middle", "10 to 13"],
    ["teen", "14 to 17"],
  ] as const)("age band %s → age style %s", async (ageBand, expected) => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t","draw":false}'));
    await aiExtraReply({ message: "why?", topicId: null, history: [], profile: profile({ ageBand }) });
    expect(systemPrompt(calls[0])).toContain(expected);
  });

  it("uses the family's curriculum grade name in the prompt", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t"}'));
    await aiExtraReply({ message: "why?", topicId: null, history: [], profile: profile({ curriculum: "us" }) });
    const sys = systemPrompt(calls[0]);
    expect(sys).toContain('"Grade 3"');
    expect(sys).toContain("American English");
  });

  it("includes grade, picked interest and calm mode", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t"}'));
    await aiExtraReply({ message: "why?", topicId: "sky", history: [], profile: profile({ calmMode: true }) });
    const sys = systemPrompt(calls[0]);
    expect(sys).toContain("Year 4");
    expect(sys).toContain("Astronomy");
    expect(sys).toMatch(/Calm mode is ON/);
  });

  it("sends the last 12 history turns (short-term memory), mapped to chat roles", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t"}'));
    const history = Array.from({ length: 16 }, (_, i) => ({
      role: (i % 2 ? "agent" : "child") as "agent" | "child",
      text: `turn ${i}`,
    }));
    await aiExtraReply({ message: "now", topicId: null, history, profile: profile() });
    const messages = calls[0].body.messages as { role: string; content: string }[];
    // system + 12 history + child message + JSON-format reminder
    expect(messages).toHaveLength(1 + 12 + 1 + 1);
    expect(messages[1].content).toBe("turn 4");
    expect(messages.slice(1, 13).every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    expect(lastUser(calls[0])).toBe("now");
    expect(messages.at(-1)).toEqual({ role: "system", content: expect.stringMatching(/JSON/) });
  });

  it("plain-text answer (format drift in long chats) is kept, not thrown away", async () => {
    fakeFetch(() => chatResponse("Sunsets look red because light travels through more air. Have you seen a purple sky?"));
    const r = await aiExtraReply({
      message: "why?",
      topicId: null,
      history: [{ role: "agent", text: "Blue light scatters most." }],
      profile: profile(),
    });
    expect(r).toMatchObject({
      answer: "Sunsets look red because light travels through more air.",
      followUp: "Have you seen a purple sky?",
      draw: false,
    });
  });

  it("trims long history turns to keep tokens low", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t"}'));
    await aiExtraReply({
      message: "yes",
      topicId: null,
      history: [{ role: "agent", text: "x".repeat(2000) }],
      profile: profile(),
    });
    const messages = calls[0].body.messages as { role: string; content: string }[];
    expect(messages[1].content).toHaveLength(400);
  });

  it("prompt tells the agent to treat short replies as answers to its last question", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?","topic":"t"}'));
    await aiExtraReply({ message: "yes", topicId: null, history: [], profile: profile() });
    const sys = systemPrompt(calls[0]);
    expect(sys).toMatch(/Short replies like yes/);
    expect(sys).toMatch(/Do not repeat facts you already explained/);
  });
});

describe("Extra agent output", () => {
  it("joins answer + follow-up, cleans text, keeps topic and draw flag", async () => {
    fakeFetch(() =>
      chatResponse('{"unsafe":false,"answer":"The Moon — lit by the Sun.","followUp":"What do you see tonight?","topic":"Moon phases","draw":true}'),
    );
    const r = await aiExtraReply({ message: "moon?", topicId: null, history: [], profile: profile() });
    expect(r).toEqual({
      text: "The Moon, lit by the Sun. What do you see tonight?",
      answer: "The Moon, lit by the Sun.",
      followUp: "What do you see tonight?",
      topic: "Moon phases",
      draw: true,
      unsafeInput: false,
    });
  });

  it("unsafe flag from the agent → unsafeInput and never draw", async () => {
    fakeFetch(() => chatResponse('{"unsafe":true,"answer":"Let us pick a safe topic.","followUp":"Stars?","topic":"x","draw":true}'));
    const r = await aiExtraReply({ message: "bad", topicId: null, history: [], profile: profile() });
    expect(r?.unsafeInput).toBe(true);
    expect(r?.draw).toBe(false);
  });

  it("missing answer → null (route falls back to local)", async () => {
    fakeFetch(() => chatResponse('{"followUp":"?"}'));
    expect(await aiExtraReply({ message: "x", topicId: null, history: [], profile: profile() })).toBeNull();
  });

  it("topic falls back to the picked interest", async () => {
    fakeFetch(() => chatResponse('{"answer":"A.","followUp":"B?"}'));
    const r = await aiExtraReply({ message: "x", topicId: "robots", history: [], profile: profile() });
    expect(r?.topic).toBe("Robots");
  });
});

describe("Extra visual agent", () => {
  it("returns a validated spec and sends question + answer", async () => {
    const { calls } = fakeFetch(() =>
      chatResponse('{"visual":{"kind":"cycle","title":"Water cycle","items":[{"label":"Evaporation"},{"label":"Clouds"},{"label":"Rain"}]}}'),
    );
    const v = await aiExtraVisual({ question: "rain?", answer: "Water rises and falls.", profile: profile() });
    expect(v?.kind).toBe("cycle");
    expect(lastUser(calls[0])).toContain("Water rises and falls.");
    expect(systemPrompt(calls[0])).toContain('"kind":"steps"');
  });

  it("invalid or null visual → null", async () => {
    fakeFetch(() => chatResponse('{"visual":{"kind":"svg","markup":"<svg/>"}}'));
    expect(await aiExtraVisual({ question: "q", answer: "a" })).toBeNull();
    fakeFetch(() => chatResponse('{"visual":null}'));
    expect(await aiExtraVisual({ question: "q", answer: "a" })).toBeNull();
  });
});

describe("School agent: focus planner", () => {
  it("only keeps allowed skill ids, no duplicates, respects the limit", async () => {
    fakeFetch(() =>
      chatResponse(
        '{"focus":[{"id":"algebra-intro","why":"too advanced"},{"id":"halves-quarters","why":"Teacher note"},{"id":"halves-quarters","why":"dup"},{"id":"materials","why":"Radar gap"},{"id":"habitats","why":"extra"}],"coachNote":"Today: fractions and materials."}',
      ),
    );
    const d = await aiPlanFocus({ profile: profile(), mastery: { materials: "shaky" } });
    // algebra-intro is Year 7+ (not allowed in Year 4); limit is 2 without calm mode.
    expect(d?.picked).toEqual([
      { id: "halves-quarters", why: "Teacher note" },
      { id: "materials", why: "Radar gap" },
    ]);
    expect(d?.coachNote).toBe("Today: fractions and materials.");
  });

  it("calm mode → exactly one skill", async () => {
    fakeFetch(() => chatResponse('{"focus":[{"id":"materials","why":"a"},{"id":"habitats","why":"b"}],"coachNote":"Today: x."}'));
    const d = await aiPlanFocus({ profile: profile({ calmMode: true }), mastery: {} });
    expect(d?.picked).toHaveLength(1);
  });

  it("sends mastery, teacher note and Extra topic as candidates/context", async () => {
    const { calls } = fakeFetch(() => chatResponse('{"focus":[{"id":"materials","why":"a"}],"coachNote":"Today: x."}'));
    await aiPlanFocus({
      profile: profile({ oneLiner: "struggles with fractions" }),
      mastery: { materials: "shaky", "multiply-basics": "secure" },
      extraTopic: "Volcanoes",
    });
    const user = lastUser(calls[0]);
    expect(user).toContain("materials | Materials and matter | mastery=shaky");
    expect(user).toContain("multiply-basics | Times tables basics | mastery=secure");
    expect(user).toMatch(/halves-quarters .*teacher note/);
    expect(user).toContain("Extra interest today: Volcanoes");
  });

  it("no valid picks → null (local plan is used)", async () => {
    fakeFetch(() => chatResponse('{"focus":[{"id":"not-a-skill"}],"coachNote":"x"}'));
    expect(await aiPlanFocus({ profile: profile(), mastery: {} })).toBeNull();
  });
});

describe("School agent: lead-in and explanation", () => {
  const item = RADAR_BANK.find((r) => r.id === "r-halves-1")!;

  it("lead-in gets the real question text", async () => {
    const { calls } = fakeFetch(() => chatResponse("Think about sharing a pizza."));
    expect(await aiLeadIn(profile(), item)).toBe("Think about sharing a pizza.");
    expect(lastUser(calls[0])).toContain(item.prompt);
    expect(systemPrompt(calls[0])).toMatch(/Never hint which choice is right/);
  });

  it("explanation gets question, choices, correct answer, child's answer and teacher fact", async () => {
    const { calls } = fakeFetch(() => chatResponse("A half is 2 parts. Four parts make quarters."));
    const text = await aiExplain({ profile: profile(), questionId: item.id, choiceId: "a", correct: false });
    expect(text).toBe("A half is 2 parts. Four parts make quarters.");
    const user = lastUser(calls[0]);
    expect(user).toContain(item.prompt);
    expect(user).toContain("Correct answer: One quarter");
    expect(user).toContain("Child's answer: One half");
    expect(user).toContain(`Teacher fact: ${item.explainWrong}`);
    expect(systemPrompt(calls[0])).toMatch(/wrong answer/);
  });

  it("'I don't know' gets the teaching prompt", async () => {
    const { calls } = fakeFetch(() => chatResponse("Quarters are four equal parts."));
    await aiExplain({ profile: profile(), questionId: item.id, choiceId: "idk", correct: false });
    expect(lastUser(calls[0])).toContain("Child's answer: I don't know yet");
    expect(systemPrompt(calls[0])).toMatch(/don't know yet/);
  });

  it("runaway output → null", async () => {
    fakeFetch(() => chatResponse("x ".repeat(400)));
    expect(await aiExplain({ profile: profile(), questionId: item.id, choiceId: "b", correct: true })).toBeNull();
  });
});

describe("oneQuestion (exactly one follow-up)", () => {
  it("keeps only up to the first question", async () => {
    const { oneQuestion } = await import("@/lib/extra-agent");
    expect(oneQuestion("Have you seen ice melt? What happens to the molecules?")).toBe("Have you seen ice melt?");
    expect(oneQuestion("Black holes spin fast too. Have you seen a spinning top?")).toBe("Black holes spin fast too. Have you seen a spinning top?");
    expect(oneQuestion("No question here.")).toBe("No question here.");
  });

  it("is applied to the agent output", async () => {
    fakeFetch(() => chatResponse('{"answer":"Molecules are tiny.","followUp":"Seen ice melt? Why?","topic":"Molecules"}'));
    const r = await aiExtraReply({ message: "molecule?", topicId: null, history: [], profile: profile() });
    expect(r?.followUp).toBe("Seen ice melt?");
    expect(r?.text).toBe("Molecules are tiny. Seen ice melt?");
  });
});
