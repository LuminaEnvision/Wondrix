/**
 * Soft safety gate for Extra (and School chat if added later).
 * Prototype: keyword redirect. Real classifier is a later AI-API task.
 */

const UNSAFE =
  /\b(kill|suicide|self[- ]?harm|sex|nude|porn|weapon|bomb|drug deal|hate)\b/i;

export function safetyCheck(text: string): { ok: true } | { ok: false; redirect: string } {
  if (!UNSAFE.test(text)) return { ok: true };
  return {
    ok: false,
    redirect:
      "That topic isn't something I can explore here. Let's pick something curious and safe instead — stars, robots, plants, or how something works. What are you wondering about?",
  };
}
