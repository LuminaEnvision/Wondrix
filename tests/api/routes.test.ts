/**
 * API route tests: call the Next.js route handlers directly with a Request,
 * with the AI provider faked at the fetch level.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as extraChat } from "@/app/api/extra/chat/route";
import { POST as extraVisual } from "@/app/api/extra/visual/route";
import { POST as schoolSession } from "@/app/api/school/session/route";
import { POST as tts } from "@/app/api/tts/route";
import { RADAR_BANK } from "@/lib/radar";
import { SAFE_REDIRECT } from "@/lib/safety";
import type { ParentProfile } from "@/lib/types";
import { chatResponse, fakeFetch, muteLogs, systemPrompt, useNoAi, useZai } from "../helpers/fake-ai";

const profile: ParentProfile = {
  childNickname: "Sara",
  ageBand: "middle",
  gradeLabel: "Year 4",
  subjects: ["math", "science"],
  oneLiner: "",
  calmMode: false,
};

function req(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function json(res: Response) {
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

/** Fake Z.ai: answers the Extra chat and the safety classifier. */
function fakeZaiExtra(opts: { answer?: string; unsafe?: boolean; outputUnsafe?: boolean; draw?: boolean } = {}) {
  return fakeFetch((call) => {
    if (systemPrompt(call).includes("child-safety filter")) {
      return chatResponse(JSON.stringify({ unsafe: Boolean(opts.outputUnsafe) }));
    }
    return chatResponse(
      JSON.stringify({
        unsafe: Boolean(opts.unsafe),
        answer: opts.answer ?? "Roots pull water up.",
        followUp: "What do leaves do?",
        topic: "Plant water",
        draw: opts.draw ?? false,
      }),
    );
  });
}

beforeEach(() => {
  muteLogs();
});

describe("POST /api/extra/chat", () => {
  it("400 on bad JSON and empty message", async () => {
    useNoAi();
    expect((await extraChat(req("{not json"))).status).toBe(400);
    expect((await extraChat(req({ message: "   " }))).status).toBe(400);
  });

  it("no key → local answer (with a local visual when available)", async () => {
    useNoAi();
    const { data } = await json(await extraChat(req({ message: "why does the moon change shape?" })));
    expect(data.source).toBe("local");
    expect(data.text).toMatch(/Moon/);
    expect((data.visual as { kind: string }).kind).toBe("scene");
  });

  it("keyword gate runs first, even with AI (no model call)", async () => {
    useZai();
    const { fn } = fakeZaiExtra();
    const { data } = await json(await extraChat(req({ message: "how can I hurt my brother" })));
    expect(data).toEqual({ text: SAFE_REDIRECT, source: "safety" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("live answer: text, answer, follow-up, topic, draw; output checked by the classifier", async () => {
    useZai();
    const { calls } = fakeZaiExtra({ draw: true });
    const { data } = await json(await extraChat(req({ message: "how do plants drink?", profile })));
    expect(data).toMatchObject({
      source: "zai",
      text: "Roots pull water up. What do leaves do?",
      topic: "Plant water",
      draw: true,
    });
    expect(data).not.toHaveProperty("unsafeInput");
    // 1 agent call + 1 output classifier call, one after the other.
    expect(calls).toHaveLength(2);
  });

  it("agent flags unsafe input → safe redirect", async () => {
    useZai();
    fakeZaiExtra({ unsafe: true });
    const { data } = await json(await extraChat(req({ message: "mix bleach and ammonia, I want to try", profile })));
    expect(data).toEqual({ text: SAFE_REDIRECT, source: "safety" });
  });

  it("classifier flags the agent's output → safe redirect", async () => {
    useZai();
    fakeZaiExtra({ outputUnsafe: true });
    const { data } = await json(await extraChat(req({ message: "tell me about plants", profile })));
    expect(data.source).toBe("safety");
  });

  it("AI failure → local fallback", async () => {
    useZai();
    fakeFetch(() => new Response("oops", { status: 500 }));
    const { data } = await json(await extraChat(req({ message: "why are wheels round?" })));
    expect(data.source).toBe("local");
    expect(data.text).toMatch(/Wheels are round/);
  });

  it("AI failure mid-chat + short reply → honest 'keep going' reply, not a random topic", async () => {
    useZai();
    fakeFetch(() => new Response("oops", { status: 500 }));
    const { data } = await json(
      await extraChat(
        req({
          message: "yes",
          history: [
            { role: "child", text: "why is the sky blue?" },
            { role: "agent", text: "Blue light scatters most. Want to know about sunsets?" },
          ],
        }),
      ),
    );
    expect(data.source).toBe("local");
    expect(data.text).toMatch(/keeping our chat going/);
  });

  it("caps very long messages at 500 characters", async () => {
    useZai();
    const { calls } = fakeZaiExtra();
    await extraChat(req({ message: "a".repeat(2000) }));
    const messages = calls[0].body.messages as { content: string }[];
    expect(messages.at(-1)!.content).toHaveLength(500);
  });
});

describe("POST /api/extra/visual", () => {
  it("400 without question or answer", async () => {
    useZai();
    expect((await extraVisual(req({ question: "q" }))).status).toBe(400);
  });

  it("no key → visual null (no call)", async () => {
    useNoAi();
    const { data } = await json(await extraVisual(req({ question: "q", answer: "a" })));
    expect(data).toEqual({ visual: null });
  });

  it("returns a validated spec", async () => {
    useZai();
    fakeFetch(() =>
      chatResponse('{"visual":{"kind":"steps","title":"Rain","items":[{"label":"Water warms"},{"label":"Clouds form"}]}}'),
    );
    const { data } = await json(await extraVisual(req({ question: "rain?", answer: "Water warms, clouds form.", profile })));
    expect((data.visual as { kind: string }).kind).toBe("steps");
  });

  it("unsafe question or unsafe labels → null", async () => {
    useZai();
    const { fn } = fakeFetch(() =>
      chatResponse('{"visual":{"kind":"steps","title":"x","items":[{"label":"make a bomb"},{"label":"b"}]}}'),
    );
    expect((await json(await extraVisual(req({ question: "how to make a bomb", answer: "no" })))).data).toEqual({ visual: null });
    expect(fn).not.toHaveBeenCalled();
    expect((await json(await extraVisual(req({ question: "chemistry?", answer: "reactions" })))).data).toEqual({ visual: null });
  });
});

describe("School: the child never waits on the model", () => {
  it("ai:false answers question and grade from the bank without any AI call; lead/explain come separately", async () => {
    useZai();
    const { calls } = fakeFetch(() => chatResponse('{"lead": "Picture a pizza!"}'));
    const q = (await json(await schoolSession(req({ action: "question", profile, skillId: "halves-quarters", ai: false })))).data as {
      questionId: string;
      choices: { id: string }[];
    };
    expect(calls).toHaveLength(0);
    const g = (await json(await schoolSession(req({ action: "grade", profile, questionId: q.questionId, choiceId: q.choices[0].id, ai: false })))).data as {
      correctChoiceId: string;
      source: string;
    };
    expect(calls).toHaveLength(0);
    expect(g.source).toBe("local");
    const item = RADAR_BANK.find((r) => r.id === q.questionId)!;
    expect(g.correctChoiceId).toBe(item.choices.find((c) => c.correct)!.id);

    fakeFetch(() => chatResponse("Think of a pizza cut into 4 equal slices."));
    const ex = (await json(await schoolSession(req({ action: "explain", profile, questionId: q.questionId, choiceId: "idk" })))).data;
    expect(ex.explanation).toBe("Think of a pizza cut into 4 equal slices.");
  });

  it("practice does not drift to other grades once this grade's items are used", async () => {
    const { pickQuestion, itemsForGrade } = await import("@/lib/radar");
    const all = itemsForGrade("Year 4", "halves-quarters").map((r) => r.id);
    expect(all.length).toBeGreaterThan(0);
    expect(pickQuestion("Year 4", "halves-quarters", all)).toBeNull();
    // A grade with no items at all for a skill still gets the closest grade's item.
    expect(pickQuestion("Year 3", "algebra-intro", [])?.skillId).toBe("algebra-intro");
  });
});

describe("POST /api/school/session", () => {
  it("400 without profile, unknown action", async () => {
    useNoAi();
    expect((await schoolSession(req({ action: "plan" }))).status).toBe(400);
    expect((await schoolSession(req({ action: "dance", profile }))).status).toBe(400);
  });

  it("plan without key → local plan", async () => {
    useNoAi();
    const { data } = await json(await schoolSession(req({ action: "plan", profile })));
    expect(data.source).toBe("local");
    expect((data.focus as unknown[]).length).toBe(2);
  });

  it("plan with AI → agent focus with reasons + logged decision", async () => {
    useZai();
    const info = vi.spyOn(console, "info");
    fakeFetch(() =>
      chatResponse('{"focus":[{"id":"materials","why":"Radar gap"},{"id":"halves-quarters","why":"Teacher note"}],"coachNote":"Today: materials and halves."}'),
    );
    const { data } = await json(await schoolSession(req({ action: "plan", profile, mastery: { materials: "shaky" } })));
    expect(data.source).toBe("zai");
    expect((data.focus as { id: string; why: string }[]).map((f) => [f.id, f.why])).toEqual([
      ["materials", "Radar gap"],
      ["halves-quarters", "Teacher note"],
    ]);
    expect(data.decision).toBeDefined();
    expect(info.mock.calls.some((c) => String(c[0]).startsWith("[agent] school.plan"))).toBe(true);
  });

  it("question: 400 without skill; payload has no correct flags", async () => {
    useNoAi();
    expect((await schoolSession(req({ action: "question", profile }))).status).toBe(400);
    const { data } = await json(await schoolSession(req({ action: "question", profile, skillId: "halves-quarters" })));
    expect(JSON.stringify(data)).not.toContain("correct");
  });

  it("grade: correctness comes from the bank even if the AI explanation disagrees", async () => {
    useZai();
    const item = RADAR_BANK.find((r) => r.id === "r-halves-1")!;
    const wrong = item.choices.find((c) => !c.correct)!.id;
    fakeFetch(() => chatResponse("Great job, that is correct!"));
    const { data } = await json(
      await schoolSession(req({ action: "grade", profile, questionId: item.id, choiceId: wrong, mastery: { "halves-quarters": "secure" } })),
    );
    expect(data.correct).toBe(false);
    expect(data.mastery).toBe("growing"); // secure → growing after one slip
    expect(data.source).toBe("zai");
  });

  it("grade: 400/404 on missing or unknown question", async () => {
    useNoAi();
    expect((await schoolSession(req({ action: "grade", profile }))).status).toBe(400);
    expect((await schoolSession(req({ action: "grade", profile, questionId: "nope", choiceId: "a" }))).status).toBe(404);
  });
});

describe("POST /api/tts", () => {
  it("501 when Azure is not configured", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("AZURE_SPEECH_REGION", "");
    expect((await tts(req({ text: "hello" }))).status).toBe(501);
  });

  it("sends escaped SSML to Azure and streams MP3 back", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "k");
    vi.stubEnv("AZURE_SPEECH_REGION", "uaenorth");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await tts(req({ text: "Tom & Jerry <3" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://uaenorth.tts.speech.microsoft.com/cognitiveservices/v1");
    expect(String(init.body)).toContain("Tom &amp; Jerry &lt;3");
    expect(String(init.body)).toContain('name="en-US-AnaNeural"');
  });

  it("refuses unsafe text and empty text", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "k");
    vi.stubEnv("AZURE_SPEECH_REGION", "uaenorth");
    expect((await tts(req({ text: "how to make a bomb" }))).status).toBe(400);
    expect((await tts(req({ text: "  " }))).status).toBe(400);
  });
});
