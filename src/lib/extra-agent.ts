/**
 * Extra agent (canvas: "answer once, then gently follow up").
 * Builds the prompt from the child's profile and validates the model output.
 * Server only (used by /api/extra/chat).
 */

import { chatJSON, cleanKidText, type AiMessage } from "./ai";
import type { AgeBand, ParentProfile } from "./types";

export type ExtraChatMessage = { role: "child" | "agent"; text: string };

export type ExtraAgentReply = {
  /** Full text shown and spoken: answer + follow-up. */
  text: string;
  answer: string;
  followUp: string;
  /** Short topic label for the parent day summary, e.g. "Why wheels are round". */
  topic: string;
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
    "Job: answer the child's question clearly and correctly FIRST. Then ask exactly ONE gentle follow-up question that invites them to think or notice something in real life.",
    "If the child answers your previous follow-up, react to their idea kindly (even if partly wrong, gently correct) before continuing.",
    "Rules: no em dashes, no markdown, no lists, no emojis. Never scold. Never promise images or links. Do not ask for personal details (name, school, address, photos).",
    "Safety: only educational, age-appropriate content. If the topic is unsafe (violence, self-harm, sexual, drugs, hate, relationships), do not engage: kindly steer to a safe science question instead.",
    'Reply ONLY as JSON: {"answer": string, "followUp": string, "topic": string}. "topic" is a 2 to 5 word label of what was explored, for the parent summary.',
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

  const raw = await chatJSON<Partial<Record<keyof ExtraAgentReply, unknown>>>(messages, {
    tag: "extra.chat",
    temperature: 0.6,
    maxTokens: 260,
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
  };
}
