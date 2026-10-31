/**
 * Soft safety gate for Extra (and School chat if added later).
 * Layer 1: keyword redirect (always on, works offline).
 * Layer 2: OpenAI moderation on input + output when a key is set (see /api/extra/chat).
 */

const UNSAFE =
  /\b(kill|suicide|self[- ]?harm|sex|nude|porn|weapon|bomb|drug deal|hate)\b/i;

export const SAFE_REDIRECT =
  "That topic isn't something I can explore here. Let's pick something curious and safe instead: stars, robots, plants, or how something works. What are you wondering about?";

export function safetyCheck(text: string): { ok: true } | { ok: false; redirect: string } {
  if (!UNSAFE.test(text)) return { ok: true };
  return { ok: false, redirect: SAFE_REDIRECT };
}
