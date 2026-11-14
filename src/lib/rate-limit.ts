/**
 * Small per-IP rate limit for the AI routes, so a public test link cannot burn the
 * AI budget (OpenRouter key also has a hard $ limit). In-memory: each server
 * instance counts on its own, which is enough to stop loops and copy-paste abuse.
 */
const hits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || request.headers.get("x-real-ip") || "local").trim();
}

/** true = allowed. Default: 40 AI requests per minute per IP (a child chats far below that). */
export function allowRequest(key: string, limit = Number(process.env.AI_RATE_LIMIT_PER_MIN) || 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // never grow without bound
  return true;
}
