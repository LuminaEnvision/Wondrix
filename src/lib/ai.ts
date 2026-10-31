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

export type AiProviderId = "zai" | "openai";

type ProviderConfig = {
  id: AiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Extra body fields sent with every chat request. */
  extraBody: Record<string, unknown>;
  /** True when the provider has an OpenAI-style /moderations endpoint. */
  hasModerationEndpoint: boolean;
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
 * AI_PROVIDER=zai|openai forces one; otherwise the first key found wins (Z.ai first).
 */
export function aiProvider(): ProviderConfig | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  const zaiKey = process.env.ZAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

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

async function callChat(
  messages: AiMessage[],
  opts: ChatOptions,
  json: boolean,
): Promise<string | null> {
  const provider = aiProvider();
  if (!provider) return null;

  const started = Date.now();
  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
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

    if (!res.ok) {
      // 429 = free-tier rate limit; the caller falls back to local content.
      log(opts.tag, false, Date.now() - started, `HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() || null;
    log(opts.tag, Boolean(content), Date.now() - started, content ? undefined : "empty");
    return content;
  } catch (err) {
    const reason = err instanceof Error ? err.name : "error";
    log(opts.tag, false, Date.now() - started, reason);
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
  const raw = await callChat(messages, opts, true);
  if (!raw) return null;
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    log(opts.tag, false, 0, "bad JSON");
    return null;
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
  return provider.hasModerationEndpoint
    ? moderationEndpoint(provider, text)
    : classifierCheck(text);
}

async function moderationEndpoint(provider: ProviderConfig, text: string) {
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
    { tag: "safety.classify", temperature: 0, maxTokens: 20, timeoutMs: 6000 },
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
