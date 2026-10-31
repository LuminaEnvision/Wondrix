/**
 * Single server-side AI client for Wondrix agents (School + Extra).
 *
 * - One place for model, timeout, logging and JSON parsing.
 * - Every helper returns `null` on any failure so routes can fall back to
 *   the local banks (the app must keep working with no API key).
 * - Server only: never import this from a client component (it reads
 *   OPENAI_API_KEY, which must never reach the browser).
 */

const OPENAI_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 8000;

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatOptions = {
  /** Short label for logs, e.g. "extra.chat" or "school.explain". */
  tag: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function log(tag: string, ok: boolean, ms: number, detail?: string) {
  const line = `[ai] ${tag} ${ok ? "ok" : "fail"} ${ms}ms${detail ? ` · ${detail}` : ""}`;
  if (ok) console.info(line);
  else console.warn(line);
}

async function callChat(
  messages: AiMessage[],
  opts: ChatOptions,
  json: boolean,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const started = Date.now();
  try {
    const res = await fetch(`${OPENAI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel(),
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 200,
        messages,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
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
    return JSON.parse(raw) as T;
  } catch {
    log(opts.tag, false, 0, "bad JSON");
    return null;
  }
}

/**
 * OpenAI moderation check.
 * Returns true when flagged, false when clean, null when unavailable
 * (no key, timeout, error). Callers decide what null means.
 */
export async function isFlagged(text: string): Promise<boolean | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) return null;

  const started = Date.now();
  try {
    const res = await fetch(`${OPENAI_URL}/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

/** House style: no em/en dashes, no stray quotes or markdown wrappers. */
export function cleanKidText(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\*\*|__|`/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
