import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiEnabled, aiProvider, chatJSON, chatText, cleanKidText, isFlagged } from "@/lib/ai";
import { chatResponse, fakeFetch, jsonResponse, muteLogs, useNoAi, useZai } from "../helpers/fake-ai";

const msgs = [{ role: "user" as const, content: "hi" }];

beforeEach(() => {
  muteLogs();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("aiProvider", () => {
  it("no keys → no provider (local mode)", () => {
    useNoAi();
    expect(aiProvider()).toBeNull();
    expect(aiEnabled()).toBe(false);
  });

  it("Z.ai is the default when its key is set", () => {
    useZai();
    vi.stubEnv("OPENAI_API_KEY", "sk-openai");
    const p = aiProvider()!;
    expect(p.id).toBe("zai");
    expect(p.model).toBe("glm-4.5-flash");
    expect(p.baseUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(p.extraBody).toEqual({ thinking: { type: "disabled" } });
    expect(p.hasModerationEndpoint).toBe(false);
  });

  it("OpenAI when only its key is set, or when forced", () => {
    useNoAi();
    vi.stubEnv("OPENAI_API_KEY", "sk-openai");
    expect(aiProvider()!.id).toBe("openai");
    vi.stubEnv("ZAI_API_KEY", "z");
    vi.stubEnv("AI_PROVIDER", "openai");
    expect(aiProvider()!.id).toBe("openai");
  });

  it("env overrides: model, base URL (trailing slash trimmed), thinking", () => {
    useZai();
    vi.stubEnv("ZAI_MODEL", "glm-4.7-flash");
    vi.stubEnv("ZAI_BASE_URL", "http://localhost:9999/v4/");
    vi.stubEnv("ZAI_THINKING", "enabled");
    const p = aiProvider()!;
    expect(p.model).toBe("glm-4.7-flash");
    expect(p.baseUrl).toBe("http://localhost:9999/v4");
    expect(p.extraBody).toEqual({ thinking: { type: "enabled" } });
  });
});

describe("chat requests", () => {
  it("sends model, auth, thinking=disabled and JSON mode to Z.ai", async () => {
    useZai();
    const { calls, fn } = fakeFetch(() => chatResponse('{"ok":true}'));
    await chatJSON(msgs, { tag: "t", maxTokens: 50, temperature: 0.2 });
    expect(calls[0].url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(calls[0].body).toMatchObject({
      model: "glm-4.5-flash",
      max_tokens: 50,
      temperature: 0.2,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
    });
    const headers = fn.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-zai");
  });

  it("chatJSON parses fenced JSON and text around it", async () => {
    useZai();
    fakeFetch(() => chatResponse('Sure!\n```json\n{"answer":"Roots drink."}\n```'));
    expect(await chatJSON(msgs, { tag: "t" })).toEqual({ answer: "Roots drink." });
  });

  it("chatJSON returns null on invalid JSON", async () => {
    useZai();
    fakeFetch(() => chatResponse("not json at all"));
    expect(await chatJSON(msgs, { tag: "t" })).toBeNull();
  });

  it("chatText cleans house style", async () => {
    useZai();
    fakeFetch(() => chatResponse('"Wheels roll — **smoothly**."'));
    expect(await chatText(msgs, { tag: "t" })).toBe("Wheels roll, smoothly.");
  });

  it("returns null with no provider (no network call)", async () => {
    useNoAi();
    const { fn } = fakeFetch(() => chatResponse("x"));
    expect(await chatText(msgs, { tag: "t" })).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("returns null on HTTP errors and network errors", async () => {
    useZai();
    fakeFetch(() => jsonResponse({ error: "boom" }, 500));
    expect(await chatText(msgs, { tag: "t" })).toBeNull();
    fakeFetch(() => {
      throw new DOMException("timed out", "TimeoutError");
    });
    expect(await chatText(msgs, { tag: "t" })).toBeNull();
  });

  it("retries once after HTTP 429, then succeeds", async () => {
    useZai();
    vi.useFakeTimers();
    let n = 0;
    const { calls } = fakeFetch(() => (n++ === 0 ? jsonResponse({ error: { code: "1302" } }, 429) : chatResponse("ok now")));
    const p = chatText(msgs, { tag: "t" });
    await vi.advanceTimersByTimeAsync(2500);
    expect(await p).toBe("ok now");
    expect(calls).toHaveLength(2);
  });

  it("gives up after a second 429", async () => {
    useZai();
    vi.useFakeTimers();
    const { calls } = fakeFetch(() => jsonResponse({}, 429));
    const p = chatText(msgs, { tag: "t" });
    await vi.advanceTimersByTimeAsync(2500);
    expect(await p).toBeNull();
    expect(calls).toHaveLength(2);
  });
});

describe("concurrency queue", () => {
  async function maxInFlight(parallel: number) {
    let inFlight = 0;
    let max = 0;
    fakeFetch(async () => {
      inFlight++;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return chatResponse("ok");
    });
    const results = await Promise.all(Array.from({ length: parallel }, () => chatText(msgs, { tag: "t" })));
    return { max, results };
  }

  it("Z.ai free tier: never more than 1 request at a time", async () => {
    useZai();
    const { max, results } = await maxInFlight(4);
    expect(max).toBe(1);
    expect(results).toEqual(["ok", "ok", "ok", "ok"]);
  });

  it("AI_MAX_CONCURRENCY raises the limit", async () => {
    useZai();
    vi.stubEnv("AI_MAX_CONCURRENCY", "3");
    const { max } = await maxInFlight(4);
    expect(max).toBe(3);
  });
});

describe("isFlagged", () => {
  it("OpenAI → /moderations endpoint", async () => {
    useNoAi();
    vi.stubEnv("OPENAI_API_KEY", "sk");
    const { calls } = fakeFetch(() => jsonResponse({ results: [{ flagged: true }] }));
    expect(await isFlagged("bad text")).toBe(true);
    expect(calls[0].url).toBe("https://api.openai.com/v1/moderations");
  });

  it("Z.ai → small classifier call", async () => {
    useZai();
    const { calls } = fakeFetch(() => chatResponse('{"unsafe": false}'));
    expect(await isFlagged("how do cells divide?")).toBe(false);
    expect(calls[0].url).toMatch(/chat\/completions$/);
    expect(calls[0].body).toMatchObject({ temperature: 0, max_tokens: 20 });
  });

  it("Z.ai chat + an OpenAI key → the free OpenAI moderation, not a Z.ai call", async () => {
    useZai();
    vi.stubEnv("OPENAI_API_KEY", "sk");
    expect(aiProvider()?.id).toBe("zai");
    const { calls } = fakeFetch(() => jsonResponse({ results: [{ flagged: false }] }));
    expect(await isFlagged("how do volcanoes erupt?")).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/moderations");
  });

  it("OpenAI moderation down → falls back to the chat provider's classifier", async () => {
    useZai();
    vi.stubEnv("OPENAI_API_KEY", "sk");
    const { calls } = fakeFetch((c) => (c.url.endsWith("/moderations") ? jsonResponse({}, 500) : chatResponse('{"unsafe": true}')));
    expect(await isFlagged("bad")).toBe(true);
    expect(calls.map((c) => c.url)).toEqual(["https://api.openai.com/v1/moderations", expect.stringMatching(/z\.ai.*chat\/completions$/)]);
  });

  it("OpenRouter provider: model from env, no reasoning, no data collection, app title", async () => {
    useNoAi();
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_MODEL", "anthropic/claude-haiku-5.5");
    const { calls, fn } = fakeFetch(() => chatResponse('{"ok": true}'));
    await chatJSON(msgs, { tag: "t" });
    expect(calls[0].url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(calls[0].body).toMatchObject({ model: "anthropic/claude-haiku-5.5", reasoning: { enabled: false }, provider: { data_collection: "deny" } });
    expect((fn.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "X-Title": "Wondrix" });
  });

  it("null when unavailable or the verdict is malformed", async () => {
    useNoAi();
    expect(await isFlagged("x")).toBeNull();
    useZai();
    fakeFetch(() => chatResponse('{"unsafe": "maybe"}'));
    expect(await isFlagged("x")).toBeNull();
    expect(await isFlagged("   ")).toBeNull();
  });
});

describe("cleanKidText", () => {
  it("removes em/en dashes, markdown and wrapping quotes", () => {
    expect(cleanKidText('"The Sun — a star – is **hot**."')).toBe("The Sun, a star, is hot.");
    expect(cleanKidText("`code`  and   spaces")).toBe("code and spaces");
  });
});
