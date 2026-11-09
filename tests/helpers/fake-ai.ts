import { vi } from "vitest";

export type FakeCall = { url: string; body: Record<string, unknown> };

type Responder = (call: FakeCall) => Response | Promise<Response>;

/** JSON chat-completions response with the given assistant content. */
export function chatResponse(content: string, tokens = 42): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], usage: { completion_tokens: tokens } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

/**
 * Replace global fetch with a fake AI provider. Returns the recorded calls.
 * The responder sees the URL and the parsed JSON body of each request.
 */
export function fakeFetch(responder: Responder) {
  const calls: FakeCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const call = { url, body };
    calls.push(call);
    return responder(call);
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn };
}

/** System prompt text of a recorded chat call. */
export function systemPrompt(call: FakeCall): string {
  const messages = call.body.messages as { role: string; content: string }[];
  return messages.find((m) => m.role === "system")?.content ?? "";
}

/** Last user message of a recorded chat call. */
export function lastUser(call: FakeCall): string {
  const messages = call.body.messages as { role: string; content: string }[];
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

/** Silence the [ai] / [agent] log lines during tests. */
export function muteLogs() {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

/** Use Z.ai with a fake key and no other provider. */
export function useZai() {
  vi.stubEnv("ZAI_API_KEY", "test-zai");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("ZAI_BASE_URL", "");
  vi.stubEnv("ZAI_MODEL", "");
  vi.stubEnv("AI_MAX_CONCURRENCY", "");
  vi.stubEnv("OPENROUTER_API_KEY", "");
}

/** No provider at all (local fallback mode). */
export function useNoAi() {
  vi.stubEnv("ZAI_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENROUTER_API_KEY", "");
  vi.stubEnv("AI_PROVIDER", "");
}
