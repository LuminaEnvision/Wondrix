/**
 * Single server-side AI client for Wondrix agents (School + Extra).
 *
 * - Provider-agnostic: any OpenAI-compatible Chat Completions API.
 *   Default provider is Z.ai (free GLM Flash models); OpenAI also works.
 * - One place for provider, model, timeout, logging and JSON parsing.
 * - Every helper returns `null` on any failure so routes can fall back to
 *   the local banks (the app must keep working with no API key).
 * - Server only: never import this from a client component (it reads the
 *   API key, which must never reach the browser).
 */

export type AiProviderId = "zai" | "openai" | "openrouter";

type ProviderConfig = {
  id: AiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Extra body fields sent with every chat request. */
  extraBody: Record<string, unknown>;
  /** True when the provider has an OpenAI-style /moderations endpoint. */
  hasModerationEndpoint: boolean;
  /** Extra HTTP headers (OpenRouter app attribution). */
  headers?: Record<string, string>;
};

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatOptions = {
  /** Short label for logs, e.g. "extra.chat" or "school.explain". */
  tag: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 12000;

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * Pick the provider from env.
 * AI_PROVIDER=zai|openai|openrouter forces one; otherwise the first key found wins (Z.ai first).
 */
export function aiProvider(): ProviderConfig | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  const zaiKey = process.env.ZAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // OpenRouter: one key, many models (used to compare models; see docs/MODEL_TEST.md).
  if (openrouterKey && (forced === "openrouter" || (!forced && !zaiKey && !openaiKey))) {
    return {
      id: "openrouter",
      apiKey: openrouterKey,
      baseUrl: trimSlash(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"),
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
      extraBody: {
        // Kids chat needs fast short answers, not hidden reasoning. Some models cannot turn it
        // off (gpt-5-nano, glm-5.3-flash, gemini-3.8-flash): OPENROUTER_REASONING=minimal|low.
        reasoning: openrouterReasoning(process.env.OPENROUTER_REASONING),
        // Only providers that do not train on or store prompts (children's chats).
        provider: { data_collection: "deny" },
      },
      hasModerationEndpoint: false,
      headers: { "X-Title": "Wondrix" },
    };
  }

  if (zaiKey && (forced === "zai" || !forced || (forced === "openai" && !openaiKey))) {
    return {
      id: "zai",
      apiKey: zaiKey,
      baseUrl: trimSlash(process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4"),
      model: process.env.ZAI_MODEL || "glm-4.5-flash",
      // GLM Flash models can "think" before answering; kids chat needs speed, not long reasoning.
      extraBody: {
        thinking: { type: process.env.ZAI_THINKING === "enabled" ? "enabled" : "disabled" },
      },
      hasModerationEndpoint: false,
    };
  }

  if (openaiKey) {
    return {
      id: "openai",
      apiKey: openaiKey,
      baseUrl: trimSlash(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      extraBody: {},
      hasModerationEndpoint: true,
    };
  }

  return null;
}

function openrouterReasoning(value?: string): Record<string, unknown> {
  if (value === "enabled") return { enabled: true };
  if (value === "minimal" || value === "low" || value === "medium") return { effort: value };
  return { enabled: false };
}

export function aiEnabled(): boolean {
  return aiProvider() !== null;
}

function log(tag: string, ok: boolean, ms: number, detail?: string) {
  const p = aiProvider();
  const who = p ? `${p.id}:${p.model}` : "none";
  const line = `[ai] ${tag} ${ok ? "ok" : "fail"} ${ms}ms (${who})${detail ? ` · ${detail}` : ""}`;
  if (ok) console.info(line);
  else console.warn(line);
}

/* ------------------------------------------------------------------ */
/* Concurrency limiter + 429 retry                                     */
/* ------------------------------------------------------------------ */

/**
 * Free tiers (Z.ai GLM Flash) allow very few requests at the same time.
 * Requests from this server are queued so we never exceed the limit
 * (AI_MAX_CONCURRENCY; default 1 for Z.ai, 4 for OpenAI).
 */
let active = 0;
const waiting: (() => void)[] = [];

function maxConcurrency(provider: ProviderConfig): number {
  const env = Number(process.env.AI_MAX_CONCURRENCY);
  if (Number.isFinite(env) && env >= 1) return env;
  return provider.id === "zai" ? 1 : 4;
}

async function withSlot<T>(provider: ProviderConfig, fn: () => Promise<T>): Promise<T> {
  if (active >= maxConcurrency(provider)) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callChat(
  messages: AiMessage[],
  opts: ChatOptions,
  json: boolean,
): Promise<string | null> {
  const provider = aiProvider();
  if (!provider) return null;
  return withSlot(provider, async () => {
    // One retry on 429 (rate limit) after a short pause.
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await requestOnce(provider, messages, opts, json, attempt);
      if (result !== "rate-limited") return result;
      if (attempt === 0) await sleep(1500 + Math.round(Math.random() * 500));
    }
    return null;
  });
}

async function requestOnce(
  provider: ProviderConfig,
  messages: AiMessage[],
  opts: ChatOptions,
  json: boolean,
  attempt: number,
): Promise<string | null | "rate-limited"> {
  const tag = attempt ? `${opts.tag} (retry)` : opts.tag;
  const started = Date.now();
  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 200,
        messages,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        ...provider.extraBody,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (res.status === 429) {
      log(tag, false, Date.now() - started, "HTTP 429 rate limit");
      return "rate-limited";
    }
    if (!res.ok) {
      log(tag, false, Date.now() - started, `HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content?.trim() || null;
    const tokens = data.usage?.completion_tokens;
    log(tag, Boolean(content), Date.now() - started, content ? (tokens ? `${tokens} tok` : undefined) : "empty");
    return content;
  } catch (err) {
    const reason = err instanceof Error ? err.name : "error";
    log(tag, false, Date.now() - started, reason);
    return null;
  }
}

/** Plain text reply. */
export async function chatText(
  messages: AiMessage[],
  opts: ChatOptions,
): Promise<string | null> {
  const text = await callChat(messages, opts, false);
  return text ? cleanKidText(text) : null;
}

/** JSON reply (the prompt must ask for JSON). Returns the parsed object or null. */
export async function chatJSON<T>(
  messages: AiMessage[],
  opts: ChatOptions,
): Promise<T | null> {
  const r = await chatJSONOrText<T>(messages, opts);
  return r && "json" in r ? r.json : null;
}

/**
 * Like chatJSON, but when the model answers in plain text instead of JSON (small
 * models sometimes drift in long chats), returns that text so the caller can still
 * use it instead of discarding a good answer.
 */
export async function chatJSONOrText<T>(
  messages: AiMessage[],
  opts: ChatOptions,
): Promise<{ json: T } | { text: string } | null> {
  const raw = await callChat(messages, opts, true);
  if (!raw) return null;
  try {
    return { json: JSON.parse(extractJson(raw)) as T };
  } catch {
    log(opts.tag, false, 0, "bad JSON (plain text kept)");
    return { text: raw };
  }
}

/** Some models wrap JSON in ```json fences or add a sentence; keep the outer object. */
function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

/**
 * Safety check on a piece of text (child input or agent output).
 * - OpenAI: /moderations endpoint.
 * - Other providers (Z.ai): a tiny LLM classifier call.
 * Returns true when unsafe, false when clean, null when unavailable.
 * Callers decide what null means.
 */
export async function isFlagged(text: string): Promise<boolean | null> {
  const provider = aiProvider();
  if (!provider || !text.trim()) return null;
  const moderation = moderationConfig(provider);
  if (moderation) {
    const flagged = await moderationEndpoint(moderation, text);
    // OpenAI moderation down: fall back to the chat provider's classifier.
    if (flagged !== null || provider.hasModerationEndpoint) return flagged;
  }
  return classifierCheck(text);
}

/**
 * OpenAI's moderation endpoint is free, fast (< 0.5 s) and multilingual, so it is
 * used whenever an OpenAI key exists, whatever model writes the chat (Z.ai,
 * OpenRouter...). This also frees the chat provider's slot on free tiers.
 */
function moderationConfig(provider: ProviderConfig): { apiKey: string; baseUrl: string } | null {
  if (provider.hasModerationEndpoint) return { apiKey: provider.apiKey, baseUrl: provider.baseUrl };
  const key = process.env.OPENAI_API_KEY;
  return key ? { apiKey: key, baseUrl: "https://api.openai.com/v1" } : null;
}

/** True when the safety check is a fast moderation call (safe to run beside the chat call). */
export function hasFastModeration(): boolean {
  const provider = aiProvider();
  return Boolean(provider && moderationConfig(provider));
}

async function moderationEndpoint(provider: { apiKey: string; baseUrl: string }, text: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${provider.baseUrl}/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      log("moderation", false, Date.now() - started, `HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { results?: { flagged?: boolean }[] };
    const flagged = Boolean(data.results?.[0]?.flagged);
    log("moderation", true, Date.now() - started, flagged ? "flagged" : undefined);
    return flagged;
  } catch (err) {
    log("moderation", false, Date.now() - started, err instanceof Error ? err.name : "error");
    return null;
  }
}

async function classifierCheck(text: string): Promise<boolean | null> {
  const verdict = await chatJSON<{ unsafe?: unknown }>(
    [
      {
        role: "system",
        content:
          'You are a child-safety filter for a kids science learning app (ages 7-17). Decide if the TEXT is unsafe for a child: sexual content, self-harm, violence instructions, weapons, drugs, hate, bullying, adult relationships, or requests for personal data. Normal science (e.g. "white blood cells kill germs", "volcanoes explode") is SAFE. Reply ONLY as JSON: {"unsafe": true|false}.',
      },
      { role: "user", content: `TEXT: ${text.slice(0, 1500)}` },
    ],
    { tag: "safety.classify", temperature: 0, maxTokens: 20, timeoutMs: 4000 },
  );
  if (!verdict || typeof verdict.unsafe !== "boolean") return null;
  return verdict.unsafe;
}

/** House style: no em/en dashes, no stray quotes or markdown wrappers. */
export function cleanKidText(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\*\*|__|`/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
