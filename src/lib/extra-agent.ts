/**
 * Extra agent (canvas: "answer once, then gently follow up").
 * Builds the prompt from the child's profile and validates the model output.
 * Server only (used by /api/extra/chat).
 */

import { chatJSON, chatJSONOrText, cleanKidText, type AiMessage } from "./ai";
import { curriculumPromptLine } from "./curriculum";
import { asLang, languagePromptLine } from "./i18n";
import type { AgeBand, ParentProfile } from "./types";
import { isUsefulVisual, parseVisual, VISUAL_PROMPT, type Visual } from "./visual";

export type ExtraChatMessage = { role: "child" | "agent"; text: string };

export type ExtraAgentReply = {
  /** Full text shown and spoken: answer + follow-up. */
  text: string;
  answer: string;
  followUp: string;
  /** Short topic label for the parent day summary, e.g. "Why wheels are round". */
  topic: string;
  /** The agent thinks a simple diagram would help; the client then asks /api/extra/visual. */
  draw: boolean;
  /** The agent judged the child's message unsafe (used when the provider has no moderation endpoint). */
  unsafeInput: boolean;
  /** What the child wanted: a curiosity question, a chat, saying goodbye, or not knowing what to ask. */
  intent: ExtraIntent;
  /** Up to 3 short questions the child can tap (offered when they are stuck or after small talk). */
  suggestions: string[];
};

export type ExtraIntent = "question" | "social" | "goodbye" | "stuck";
const INTENTS = new Set<ExtraIntent>(["question", "social", "goodbye", "stuck"]);

/** Short-term memory: how many previous turns are sent, and max characters per turn. */
export const HISTORY_TURNS = 12;
export const HISTORY_CHARS = 400;

const TOPIC_LABELS: Record<string, string> = {
  physics: "Physics",
  robots: "Robots",
  sky: "Astronomy",
  life: "Living things",
  chemistry: "Chemistry",
};

const AGE_STYLE: Record<AgeBand, string> = {
  young:
    "The child is 7 to 9. Use very simple words, short sentences, and one everyday comparison (toys, food, playground). 2 to 3 sentences.",
  middle:
    "The child is 10 to 13. Use clear words, one concrete example, and name the real science idea once. 2 to 4 sentences.",
  teen:
    "The learner is 14 to 17. Be precise, use correct terms, and add one 'why it matters' detail. 3 to 4 sentences.",
};

/** Wondrix's character: the same friend every time (Anastasia: "interactive and playful, not boring"). */
const PERSONA = [
  "You are Wondrix, the friendly mascot of a kids learning app: a small, curious explorer friend who loves big questions, carries a little bag for collecting ideas, and gets excited about how things work.",
  "Personality: warm, playful and a bit funny, like a kind older friend. Sound natural and varied, never like a textbook. Small jokes, playful comparisons and a little wonder are welcome (\"Ooh, I love this one!\"), but keep facts exact.",
  "If asked who you are or your name, say you are Wondrix with a playful one-line intro, then ask what they are curious about. You may use the child's nickname now and then, not every time.",
].join(" ");

/** Line about the child's local time, so bedtime and greetings make sense. */
function timeLine(localTime?: string): string {
  return localTime ? `The child's local time is ${localTime}. Use it only when it matters (good morning, bedtime, a late hour).` : "";
}

/** The agent's last follow-up questions, so it does not ask them the same way again. */
function recentFollowUps(history: ExtraChatMessage[]): string[] {
  return history
    .filter((m) => m.role === "agent")
    .slice(-4)
    .map((m) => String(m.text ?? "").match(/[^.!?؟]*[?؟]\s*$/)?.[0]?.trim() ?? "")
    .filter(Boolean);
}

function systemPrompt(
  profile: ParentProfile | undefined,
  topicId: string | null,
  extra: { localTime?: string; recent?: string[] } = {},
) {
  const band: AgeBand = profile?.ageBand ?? "young";
  const topic = topicId ? TOPIC_LABELS[topicId] : null;
  const calm = profile?.calmMode
    ? "Calm mode is ON: keep it extra short, gentle and low pressure. Make the follow-up optional in tone."
    : "";

  return [
    PERSONA,
    profile?.childNickname ? `The child's nickname is ${profile.childNickname.slice(0, 30)}.` : "",
    AGE_STYLE[band],
    profile?.gradeLabel ? curriculumPromptLine(profile) : "",
    topic ? `The child picked the interest: ${topic}.` : "",
    calm,
    languagePromptLine(asLang(profile?.language)),
    timeLine(extra.localTime),
    "First decide the child's intent:",
    '- "question": they are curious about something. Answer clearly and correctly FIRST. Then ask exactly ONE gentle follow-up question that invites them to think or notice something in real life. followUp is a single sentence that ends with a question mark.',
    '- "social": hello, who are you, a joke, how are you, an opinion, "I like...". Reply like a friend in 1 or 2 short sentences, no lesson. followUp may be a light, fun question, and offer 3 suggestions.',
    '- "goodbye": they want to stop, go to bed, eat, play, or say bye or good night. AGREE and support it warmly (for example: you are right, it is late and sleep gives you energy for tomorrow; sleep well). followUp MUST be empty, suggestions empty, and never try to keep them talking.',
    '- "stuck": they do not know what to ask or seem lost. Be encouraging in one sentence and give 3 easy, exciting suggestions to tap. followUp empty.',
    "Vary how you speak: do not start two replies the same way, and vary the follow-up form (a tiny experiment to try, a guess to make, something to look for at home, a \"which do you think\" choice). Never start the follow-up with \"Have you ever noticed\".",
    extra.recent?.length ? `Your recent follow-up questions (ask differently this time): ${extra.recent.map((q) => `"${q.slice(0, 90)}"`).join(", ")}.` : "",
    "Accuracy first: if you are not sure, say so simply. Do not invent facts or mix up ideas (for example a fridge door is steel that a magnet attracts; it is not a magnet itself).",
    "If the child answers your previous follow-up, react to their idea kindly (even if partly wrong, gently correct) before continuing.",
    "Conversation memory: this is one ongoing chat. Short replies like yes, no, ok, sure, why, or a single word answer YOUR last follow-up question, so continue that thread. Do not repeat facts you already explained; build on them and go one step deeper. If the child asks about something you already covered, remind them in ONE short sentence (for example: like we said, the light travels through more air) and then add ONE new detail they have not heard yet.",
    "Rules: no em dashes, no markdown, no lists, no emojis. Never scold. Never promise images or links. Do not ask for personal details (name, school, address, photos).",
    "Safety: only educational, age-appropriate content. If the topic is unsafe (violence, self-harm, sexual, drugs, hate, relationships), do not engage: kindly steer to a safe science question instead.",
    'Reply ONLY as JSON: {"intent": "question" | "social" | "goodbye" | "stuck", "unsafe": boolean, "answer": string, "followUp": string, "suggestions": string[], "topic": string, "draw": boolean}. "suggestions" are 0 to 3 short questions the child could ask next (max 8 words each, ending with a question mark, written as the child would ask them), and empty for "goodbye". "unsafe" is true only if the child\'s latest message asks about an unsafe topic (then answer with the kind redirect). "topic" is a 2 to 5 word label of what was explored, for the parent summary. "draw" is true only when a picture would SHOW the child something words cannot: a process or cycle with visible stages (how rain happens, how plants drink, moon phases, day and night), why the sky is blue, how magnets push and pull, a comparison of things you can see (solid vs liquid vs gas), sizes (Sun vs Earth), or the parts of a real object (parts of a flower). "draw" is false for definitions and abstract ideas ("what is a molecule", "what is energy"), greetings, opinions, small talk and yes/no facts.',
  ]
    .filter(Boolean)
    .join("\n");
}

export async function aiExtraReply(input: {
  message: string;
  topicId: string | null;
  history: ExtraChatMessage[];
  profile?: ParentProfile;
  /** Child's local time, e.g. "Thursday 22:47" (from the browser). */
  localTime?: string;
}): Promise<ExtraAgentReply | null> {
  const messages: AiMessage[] = [
    {
      role: "system",
      content: systemPrompt(input.profile, input.topicId, { localTime: input.localTime, recent: recentFollowUps(input.history) }),
    },
    // Short-term memory for this session: the last turns, trimmed to keep tokens low.
    ...input.history.slice(-HISTORY_TURNS).map<AiMessage>((m) => ({
      role: m.role === "child" ? "user" : "assistant",
      content: String(m.text ?? "").slice(0, HISTORY_CHARS),
    })),
    { role: "user", content: input.message },
  ];
  // Earlier assistant turns are plain text; in long chats the model may copy that
  // format. A short reminder after the history keeps the JSON shape.
  if (input.history.length) {
    messages.push({ role: "system", content: "Reply ONLY with the JSON object described in the first message." });
  }

  const result = await chatJSONOrText<Partial<Record<keyof ExtraAgentReply | "unsafe", unknown>>>(messages, {
    tag: "extra.chat",
    // A little more variety in wording (facts stay pinned by the prompt).
    temperature: 0.75,
    maxTokens: 360,
    // Free-tier latency spikes past 12s now and then; give the main answer a bit more room.
    timeoutMs: 15000,
  });
  if (!result) return null;
  // Plain-text answer (format drift): keep it, split off the last question as the follow-up.
  const raw: Partial<Record<keyof ExtraAgentReply | "unsafe", unknown>> =
    "json" in result ? result.json : splitPlainAnswer(result.text);

  const answer = typeof raw.answer === "string" ? cleanKidText(raw.answer) : "";
  const intent: ExtraIntent = INTENTS.has(raw.intent as ExtraIntent) ? (raw.intent as ExtraIntent) : "question";
  // Goodbye means goodbye: never a question that keeps the child talking.
  const followUp =
    intent !== "goodbye" && typeof raw.followUp === "string" ? varyFollowUp(oneQuestion(cleanKidText(raw.followUp))) : "";
  if (!answer) return null;
  const suggestions = intent === "goodbye" ? [] : cleanSuggestions(raw.suggestions);

  const topic =
    (typeof raw.topic === "string" && cleanKidText(raw.topic).slice(0, 60)) ||
    (input.topicId ? TOPIC_LABELS[input.topicId] : "") ||
    input.message.slice(0, 40);

  return {
    text: followUp ? `${answer} ${followUp}` : answer,
    answer,
    followUp,
    topic,
    draw: raw.unsafe !== true && intent === "question" && raw.draw === true,
    unsafeInput: raw.unsafe === true,
    intent,
    suggestions: raw.unsafe === true ? [] : suggestions,
  };
}

/**
 * The model keeps opening follow-ups with "Have you ever noticed…" even when told
 * not to (live check, Nov 2026). Swap that opener for one of a few natural ones,
 * picked from the text itself so the same reply always reads the same.
 */
export function varyFollowUp(text: string): string {
  const m = text.match(/^have you ever noticed\s+/i);
  if (!m) return text;
  const rest = text.slice(m[0].length);
  const openers = ["Have you seen", "Did you ever spot", "Next time, can you check"];
  const pick = openers[[...rest].reduce((n, c) => n + c.charCodeAt(0), 0) % openers.length];
  return `${pick} ${rest}`;
}

/** 0 to 3 short, clean tap-able questions. */
export function cleanSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string")
    .map((s) => cleanKidText(s).replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 4 && s.length <= 70)
    .slice(0, 3);
}

/**
 * Second, short call: turn the answer into a diagram spec.
 * Runs only when the chat reply said draw=true, after the text is shown,
 * so the chat stays fast and requests never overlap on the free tier.
 */
export async function aiExtraVisual(input: {
  question: string;
  answer: string;
  profile?: ParentProfile;
}): Promise<Visual | null> {
  const band: AgeBand = input.profile?.ageBand ?? "young";
  const raw = await chatJSON<{ visual?: unknown }>(
    [
      {
        role: "system",
        content: [
          "You draw simple teaching diagrams for a kids science app. You do not write SVG; you only describe the diagram as JSON.",
          AGE_STYLE[band],
          VISUAL_PROMPT,
          languagePromptLine(asLang(input.profile?.language)),
          'Reply ONLY as JSON: {"visual": object or null}. The diagram must match the answer exactly; do not add new facts.',
        ].filter(Boolean).join("\n"),
      },
      { role: "user", content: `Child's question: ${input.question}\nAnswer given: ${input.answer}` },
    ],
    { tag: "extra.visual", temperature: 0.3, maxTokens: 260 },
  );
  if (!raw) return null;
  const visual = parseVisual(raw.visual);
  if (!visual && raw.visual) {
    console.warn(`[ai] extra.visual invalid spec dropped · ${JSON.stringify(raw.visual).slice(0, 160)}`);
  }
  // A diagram that only adds text (no real pictures) is worse than none.
  if (visual && !isUsefulVisual(visual)) {
    console.info(`[ai] extra.visual not picture-like, not shown · ${JSON.stringify(visual).slice(0, 160)}`);
    return null;
  }
  return visual;
}

/**
 * Canvas rule "exactly ONE follow-up": small models sometimes ask two.
 * Keep everything up to and including the first question.
 */
export function oneQuestion(text: string): string {
  const i = text.search(/[?؟]/); // Arabic uses ؟
  return i === -1 ? text : text.slice(0, i + 1).trim();
}

/** Turn a plain-text reply into { answer, followUp } (the last question, if any). */
export function splitPlainAnswer(text: string): { answer: string; followUp: string; draw: boolean } {
  const clean = text.replace(/^```\w*|```$/g, "").trim();
  const sentences = clean.split(/(?<=[.!?؟])\s+/).filter(Boolean);
  const last = sentences.at(-1) ?? "";
  if (sentences.length > 1 && /[?؟]$/.test(last.trim())) {
    return { answer: sentences.slice(0, -1).join(" "), followUp: last, draw: false };
  }
  return { answer: clean, followUp: "", draw: false };
}
