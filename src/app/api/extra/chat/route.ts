import { NextResponse } from "next/server";
import { aiProvider, hasFastModeration, isFlagged } from "@/lib/ai";
import { aiExtraReply, type ExtraChatMessage } from "@/lib/extra-agent";
import { localExtraReply } from "@/lib/extra-reply";
import { SAFE_REDIRECT, safetyCheck } from "@/lib/safety";
import type { ParentProfile } from "@/lib/types";

type Body = {
  message?: string;
  topicId?: string | null;
  history?: ExtraChatMessage[];
  profile?: ParentProfile;
  /** Child's local weekday and time, e.g. "Thursday 22:47". */
  localTime?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim().slice(0, 500) ?? "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  const topicId = body.topicId ?? null;

  // 1. Fast keyword gate (works with or without a key).
  const gate = safetyCheck(message);
  if (!gate.ok) {
    return NextResponse.json({ text: gate.redirect, source: "safety" });
  }

  // 2. Live agent.
  //    With an OpenAI key (whatever model writes the chat): the free moderation endpoint
  //    checks the child's turn in parallel with the reply.
  //    Otherwise (e.g. Z.ai alone): the agent flags unsafe input in its own JSON,
  //    so we never fire two requests at once on the free tier's low concurrency.
  const provider = aiProvider();
  if (provider) {
    const history = Array.isArray(body.history) ? body.history : [];
    const localTime =
      typeof body.localTime === "string" && /^[A-Za-z]{3,9} \d{1,2}:\d{2}$/.test(body.localTime) ? body.localTime : undefined;
    const agentCall = aiExtraReply({ message, topicId, history, profile: body.profile, localTime });
    const [inputFlagged, reply] = hasFastModeration()
      ? await Promise.all([isFlagged(message), agentCall])
      : [null, await agentCall];

    if (inputFlagged || reply?.unsafeInput) {
      return NextResponse.json({ text: SAFE_REDIRECT, source: "safety" });
    }

    if (reply) {
      // 3. Check the agent's own output before a child sees it.
      // (Moderation/classifier only: the keyword list would block innocent science like "germs kill".)
      if (await isFlagged([reply.text, ...reply.suggestions].join("\n"))) {
        return NextResponse.json({ text: SAFE_REDIRECT, source: "safety" });
      }
      const { unsafeInput: _unsafe, ...publicReply } = reply;
      publicReply.suggestions = publicReply.suggestions.filter((s) => safetyCheck(s).ok);
      void _unsafe;
      return NextResponse.json({ ...publicReply, source: provider.id });
    }
  }

  // 4. Local fallback (no key, timeout or API error).
  const hadHistory = Array.isArray(body.history) && body.history.length > 0;
  const local = localExtraReply(message, topicId, hadHistory);
  return NextResponse.json({ ...local, source: "local" });
}
