import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai";
import { aiExtraVisual } from "@/lib/extra-agent";
import { safetyCheck } from "@/lib/safety";
import type { ParentProfile } from "@/lib/types";
import { visualText } from "@/lib/visual";

/**
 * On-the-spot visual for an Extra answer that is already shown.
 * The client calls this only when /api/extra/chat said draw=true.
 */
export async function POST(request: Request) {
  let body: { question?: string; answer?: string; profile?: ParentProfile };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = body.question?.trim().slice(0, 500) ?? "";
  const answer = body.answer?.trim().slice(0, 1200) ?? "";
  if (!question || !answer) {
    return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
  }
  if (!aiEnabled() || !safetyCheck(question).ok || !safetyCheck(answer).ok) {
    return NextResponse.json({ visual: null });
  }

  const visual = await aiExtraVisual({ question, answer, profile: body.profile });
  // Labels come from an answer that already passed the output check; a cheap
  // keyword pass is enough here (no extra model call on the free tier).
  if (!visual || !safetyCheck(visualText(visual)).ok) {
    return NextResponse.json({ visual: null });
  }
  return NextResponse.json({ visual });
}
