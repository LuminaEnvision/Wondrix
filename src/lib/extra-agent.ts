/**
 * Extra agent (canvas: "answer once, then gently follow up").
 * Builds the prompt from the child's profile and validates the model output.
 * Server only (used by /api/extra/chat).
 */

import { chatJSON, cleanKidText, type AiMessage } from "./ai";
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
    profile?.gradeLabel ? `School level: ${profile.gradeLabel}.` : "",
    topic ? `The child picked the interest: ${topic}.` : "",
    calm,
    "Job: answer the child's question clearly and correctly FIRST. Then ask exactly ONE gentle follow-up question that invites them to think or notice something in real life. followUp is a single sentence that ends with a question mark.",
    "Accuracy first: if you are not sure, say so simply. Do not invent facts or mix up ideas (for example a fridge door is steel that a magnet attracts; it is not a magnet itself).",
    "If the child answers your previous follow-up, react to their idea kindly (even if partly wrong, gently correct) before continuing.",
    "Rules: no em dashes, no markdown, no lists, no emojis. Never scold. Never promise images or links. Do not ask for personal details (name, school, address, photos).",
    "Safety: only educational, age-appropriate content. If the topic is unsafe (violence, self-harm, sexual, drugs, hate, relationships), do not engage: kindly steer to a safe science question instead.",
    'Reply ONLY as JSON: {"unsafe": boolean, "answer": string, "followUp": string, "topic": string, "draw": boolean}. "unsafe" is true only if the child\'s latest message asks about an unsafe topic (then answer with the kind redirect). "topic" is a 2 to 5 word label of what was explored, for the parent summary. "draw" is true only when a simple diagram (steps of a process, a cycle, a comparison, sizes, or parts of a thing) would really help the child see the idea; false for greetings, opinions and small talk.',
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
    ...input.history.slice(-8).map<AiMessage>((m) => ({
      role: m.role === "child" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: input.message },
  ];

  const raw = await chatJSON<Partial<Record<keyof ExtraAgentReply | "unsafe", unknown>>>(messages, {
    tag: "extra.chat",
    temperature: 0.6,
    maxTokens: 300,
    // Free-tier latency spikes past 12s now and then; give the main answer a bit more room.
    timeoutMs: 15000,
  });
  if (!raw) return null;

  const answer = typeof raw.answer === "string" ? cleanKidText(raw.answer) : "";
  const followUp = typeof raw.followUp === "string" ? cleanKidText(raw.followUp) : "";
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
          'Reply ONLY as JSON: {"visual": object or null}. The diagram must match the answer exactly; do not add new facts.',
        ].join("\n"),
      },
      { role: "user", content: `Child's question: ${input.question}\nAnswer given: ${input.answer}` },
    ],
    { tag: "extra.visual", temperature: 0.3, maxTokens: 260 },
  );
  return raw ? parseVisual(raw.visual) : null;
}
