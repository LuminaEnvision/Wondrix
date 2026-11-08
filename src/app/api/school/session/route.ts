import { NextResponse } from "next/server";
import { aiProvider } from "@/lib/ai";
import { RADAR_BANK } from "@/lib/radar";
import {
  defaultFocusFromProfile,
  localGradeAnswer,
  localNextQuestion,
  localSchoolPlan,
} from "@/lib/school-agent";
import { aiExplain, aiLeadIn, aiPlanFocus, type MasteryMap } from "@/lib/school-agent-ai";
import { getSkill } from "@/lib/skills";
import type { ParentProfile, SkillId } from "@/lib/types";

type Body = {
  action?: "plan" | "question" | "grade" | "lead" | "explain";
  /**
   * false = answer at once from the bank (the child never waits on the model);
   * the app then asks "lead" / "explain" separately and swaps the text in.
   * Default true keeps the one-call behaviour for other clients and the eval.
   */
  ai?: boolean;
  profile?: ParentProfile;
  focusIds?: SkillId[];
  /** Child's mastery map from localStorage (canvas loop step 1: read state). */
  mastery?: MasteryMap;
  /** Today's Extra topic, so School can link to the child's curiosity. */
  extraTopic?: string;
  skillId?: SkillId;
  questionId?: string;
  choiceId?: string | "idk";
  avoidIds?: string[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.profile?.gradeLabel) {
    return NextResponse.json({ error: "Missing profile" }, { status: 400 });
  }

  const profile = body.profile;
  const action = body.action ?? "plan";
  const provider = aiProvider();
  const mastery: MasteryMap =
    body.mastery && typeof body.mastery === "object" ? body.mastery : {};

  if (action === "plan") {
    const focusIds =
      body.focusIds?.length ? body.focusIds : defaultFocusFromProfile(profile);

    if (provider) {
      const decision = await aiPlanFocus({ profile, mastery, extraTopic: body.extraTopic });
      if (decision) {
        const plan = localSchoolPlan(
          profile,
          decision.picked.map((p) => p.id),
        );
        // Logged decision (canvas: "tuned model + logged decisions").
        console.info(
          `[agent] school.plan ${profile.gradeLabel} → ${decision.picked
            .map((p) => `${p.id} (${p.why})`)
            .join(", ")}`,
        );
        return NextResponse.json({
          ...plan,
          focus: plan.focus.map((f) => ({
            ...f,
            why: decision.picked.find((p) => p.id === f.id)?.why || f.why,
          })),
          coachNote: decision.coachNote,
          decision: {
            candidates: decision.candidates.map(({ id, mastery: m }) => ({ id, mastery: m })),
            picked: decision.picked,
          },
          source: provider.id,
        });
      }
    }
    return NextResponse.json(localSchoolPlan(profile, focusIds));
  }

  if (action === "question") {
    const skillId = body.skillId;
    if (!skillId) {
      return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
    }
    const local = localNextQuestion(profile, skillId, body.avoidIds ?? []);
    if (!local) {
      return NextResponse.json({ error: "No questions for skill" }, { status: 404 });
    }

    if (provider && body.ai !== false) {
      const item = RADAR_BANK.find((r) => r.id === local.questionId);
      const lead = item ? await aiLeadIn(profile, item) : null;
      if (lead) {
        return NextResponse.json({ ...local, coachLead: lead, source: provider.id });
      }
    }
    return NextResponse.json(local);
  }

  if (action === "grade") {
    if (!body.questionId || !body.choiceId) {
      return NextResponse.json({ error: "Missing question or choice" }, { status: 400 });
    }
    const item = RADAR_BANK.find((r) => r.id === body.questionId);
    // Correctness + mastery are always decided locally from the bank.
    const result = localGradeAnswer(
      profile,
      body.questionId,
      body.choiceId,
      body.avoidIds ?? [],
      item ? mastery[item.skillId] : undefined,
    );
    if (!result) {
      return NextResponse.json({ error: "Unknown question" }, { status: 404 });
    }

    console.info(
      `[agent] school.grade ${item ? getSkill(item.skillId).id : body.questionId} correct=${result.correct} → ${result.mastery}`,
    );

    if (provider && body.ai !== false) {
      const tip = await aiExplain({
        profile,
        questionId: body.questionId,
        choiceId: body.choiceId,
        correct: result.correct,
      });
      if (tip) {
        return NextResponse.json({ ...result, explanation: tip, source: provider.id });
      }
    }
    return NextResponse.json(result);
  }

  // Second step for the question card: the model's one-line coach lead-in.
  if (action === "lead") {
    const item = RADAR_BANK.find((r) => r.id === body.questionId);
    if (!item) return NextResponse.json({ error: "Unknown question" }, { status: 404 });
    const lead = provider ? await aiLeadIn(profile, item) : null;
    return NextResponse.json({ coachLead: lead ?? null, source: lead && provider ? provider.id : "local" });
  }

  // Second step after an answer: the model's gentle explanation (correctness stays local).
  if (action === "explain") {
    const item = RADAR_BANK.find((r) => r.id === body.questionId);
    if (!item || !body.choiceId) return NextResponse.json({ error: "Unknown question" }, { status: 404 });
    const correct = body.choiceId !== "idk" && Boolean(item.choices.find((c) => c.id === body.choiceId)?.correct);
    const tip = provider ? await aiExplain({ profile, questionId: item.id, choiceId: body.choiceId, correct }) : null;
    return NextResponse.json({ explanation: tip ?? null, source: tip && provider ? provider.id : "local" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
