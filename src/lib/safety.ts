/**
 * Soft safety gate for Extra (and School chat if added later).
 * Layer 1: keyword/phrase redirect (always on, works offline, also guards the local fallback).
 * Layer 2: AI check on input + output when a key is set (see /api/extra/chat).
 *
 * Layer 1 targets harmful *intent* phrases so normal science passes
 * ("white blood cells kill germs", "how does a volcano explode").
 */

const UNSAFE: RegExp[] = [
  /\b(suicide|suicidal|self[- ]?harm|cut(ting)? myself|kill(ing)? (myself|yourself))\b/i,
  /\b(sex|sexy|nude|nudes|naked|porn)\b/i,
  /\b(kill|hurt|harm|stab|shoot|poison|beat up|attack)\b.{0,30}\b(someone|somebody|people|person|him|her|them|my|a kid|kids|classmate|teacher|friend|brother|sister|mom|dad)\b/i,
  // Same intent with the person first: "make my classmate get hurt", "want my brother to get hurt".
  // Needs an intent verb, so "my friend got hurt, how do bones heal?" still passes.
  /\b(make|want|wish|let)\b.{0,25}\b(someone|somebody|people|person|him|her|them|a kid|kids|classmate|teacher|friend|brother|sister|mom|dad)\b.{0,15}\b(get|be)\s+(hurt|killed|harmed|beaten up|stabbed|poisoned)\b/i,
  // Secret harm: "how can a kid be poisoned without anyone knowing".
  /\b(hurt|kill|harm|poison|stab)\w*\b.{0,40}\bwithout (anyone|anybody|them|people|getting caught)\b/i,
  /\b(make|build|get|buy)\b.{0,20}\b(gun|weapon|bomb|explosive)s?\b/i,
  /\b(drug deal|buy drugs|sell drugs|get high)\b/i,
  /\b(hate (all|those)|racist joke)\b/i,
];

export const SAFE_REDIRECT =
  "That topic isn't something I can explore here. Let's pick something curious and safe instead: stars, robots, plants, or how something works. What are you wondering about?";

export function safetyCheck(text: string): { ok: true } | { ok: false; redirect: string } {
  if (!UNSAFE.some((re) => re.test(text))) return { ok: true };
  return { ok: false, redirect: SAFE_REDIRECT };
}
