/**
 * Extra agent (canvas: "answer once, then gently follow up").
 * Builds the prompt from the child's profile and validates the model output.
 * Server only (used by /api/extra/chat).
 */

import { chatJSON, chatJSONOrText, cleanKidText, type AiMessage } from "./ai";
import { curriculumPromptLine } from "./curriculum";
import { asLang, languagePromptLine } from "./i18n";
import type { AgeBand, ParentProfile } from "./types";
import { parseVisual, VISUAL_PROMPT, type Visual } from "./visual";

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
};

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

function systemPrompt(profile: ParentProfile | undefined, topicId: string | null) {
  const band: AgeBand = profile?.ageBand ?? "young";
  const topic = topicId ? TOPIC_LABELS[topicId] : null;
  const calm = profile?.calmMode
    ? "Calm mode is ON: keep it extra short, gentle and low pressure. Make the follow-up optional in tone."
    : "";

  return [
    "You are Wondrix Extra, a warm curiosity guide inside a kids learning app.",
    AGE_STYLE[band],
    profile?.gradeLabel ? curriculumPromptLine(profile) : "",
    topic ? `The child picked the interest: ${topic}.` : "",
    calm,
    languagePromptLine(asLang(profile?.language)),
    "Job: answer the child's question clearly and correctly FIRST. Then ask exactly ONE gentle follow-up question that invites them to think or notice something in real life. followUp is a single sentence that ends with a question mark.",
    "Accuracy first: if you are not sure, say so simply. Do not invent facts or mix up ideas (for example a fridge door is steel that a magnet attracts; it is not a magnet itself).",
    "If the child answers your previous follow-up, react to their idea kindly (even if partly wrong, gently correct) before continuing.",
    "Conversation memory: this is one ongoing chat. Short replies like yes, no, ok, sure, why, or a single word answer YOUR last follow-up question, so continue that thread. Do not repeat facts you already explained; build on them and go one step deeper. If the child asks about something you already covered, remind them in ONE short sentence (for example: like we said, the light travels through more air) and then add ONE new detail they have not heard yet.",
    "Rules: no em dashes, no markdown, no lists, no emojis. Never scold. Never promise images or links. Do not ask for personal details (name, school, address, photos).",
    "Safety: only educational, age-appropriate content. If the topic is unsafe (violence, self-harm, sexual, drugs, hate, relationships), do not engage: kindly steer to a safe science question instead.",
    'Reply ONLY as JSON: {"unsafe": boolean, "answer": string, "followUp": string, "topic": string, "draw": boolean}. "unsafe" is true only if the child\'s latest message asks about an unsafe topic (then answer with the kind redirect). "topic" is a 2 to 5 word label of what was explored, for the parent summary. "draw" is true when a simple diagram would help the child see the idea: a process or cycle (how rain happens, how plants drink, moon phases), a comparison (solid vs liquid vs gas), sizes or amounts (Sun vs Earth), or parts of a thing (parts of a flower or robot). "draw" is false for greetings, opinions, small talk and yes/no facts.',
  ]
    .filter(Boolean)
    .join("\n");
}

export async function aiExtraReply(input: {
  message: string;
  topicId: string | null;
  history: ExtraChatMessage[];
  profile?: ParentProfile;
}): Promise<ExtraAgentReply | null> {
  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt(input.profile, input.topicId) },
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
    temperature: 0.6,
    maxTokens: 300,
    // Free-tier latency spikes past 12s now and then; give the main answer a bit more room.
    timeoutMs: 15000,
  });
  if (!result) return null;
  // Plain-text answer (format drift): keep it, split off the last question as the follow-up.
  const raw: Partial<Record<keyof ExtraAgentReply | "unsafe", unknown>> =
    "json" in result ? result.json : splitPlainAnswer(result.text);

  const answer = typeof raw.answer === "string" ? cleanKidText(raw.answer) : "";
  const followUp = typeof raw.followUp === "string" ? oneQuestion(cleanKidText(raw.followUp)) : "";
  if (!answer) return null;

  const topic =
    (typeof raw.topic === "string" && cleanKidText(raw.topic).slice(0, 60)) ||
    (input.topicId ? TOPIC_LABELS[input.topicId] : "") ||
    input.message.slice(0, 40);

  return {
    text: followUp ? `${answer} ${followUp}` : answer,
    answer,
    followUp,
    topic,
    draw: raw.unsafe !== true && raw.draw === true,
    unsafeInput: raw.unsafe === true,
  };
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
