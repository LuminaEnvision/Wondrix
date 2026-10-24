import { NextResponse } from "next/server";
import {
  defaultFocusFromProfile,
  localGradeAnswer,
  localNextQuestion,
  localSchoolPlan,
} from "@/lib/school-agent";
import { getSkill } from "@/lib/skills";
import type { ParentProfile, SkillId } from "@/lib/types";

type Body = {
  action?: "plan" | "question" | "grade";
  profile?: ParentProfile;
  focusIds?: SkillId[];
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
  const apiKey = process.env.OPENAI_API_KEY;

  if (action === "plan") {
    const focusIds =
      body.focusIds?.length ? body.focusIds : defaultFocusFromProfile(profile);
    const plan = localSchoolPlan(profile, focusIds);

    if (apiKey) {
      try {
        const enriched = await openaiCoachNote(apiKey, profile, focusIds);
        if (enriched) {
          return NextResponse.json({ ...plan, coachNote: enriched, source: "openai" });
        }
      } catch {
        // local plan
      }
    }
    return NextResponse.json(plan);
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

    if (apiKey) {
      try {
        const lead = await openaiLeadIn(apiKey, profile, skillId, local.prompt);
        if (lead) {
          return NextResponse.json({ ...local, coachLead: lead, source: "openai" });
        }
      } catch {
        // local
      }
    }
    return NextResponse.json(local);
  }

  if (action === "grade") {
    if (!body.questionId || !body.choiceId) {
      return NextResponse.json({ error: "Missing question or choice" }, { status: 400 });
    }
    const result = localGradeAnswer(
      profile,
      body.questionId,
      body.choiceId,
      body.avoidIds ?? [],
    );
    if (!result) {
      return NextResponse.json({ error: "Unknown question" }, { status: 404 });
    }

    if (apiKey) {
      try {
        const tip = await openaiExplain(
          apiKey,
          profile,
          body.questionId,
          body.choiceId,
          result.correct,
          result.explanation,
        );
        if (tip) {
          return NextResponse.json({
            ...result,
            explanation: tip,
            source: "openai",
          });
        }
      } catch {
        // local
      }
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function openaiCoachNote(
  apiKey: string,
  profile: ParentProfile,
  focusIds: SkillId[],
): Promise<string | null> {
  const titles = focusIds.map((id) => getSkill(id).title).join(", ");
  return chat(apiKey, [
    {
      role: "system",
      content:
        "You are Wondrix School agent. Reply in ONE short sentence only. Format: Today: skill · skill. No em dashes. No pep talk.",
    },
    {
      role: "user",
      content: `Grade: ${profile.gradeLabel}. Focus: ${titles}.`,
    },
  ]);
}

async function openaiLeadIn(
  apiKey: string,
  profile: ParentProfile,
  skillId: SkillId,
  prompt: string,
): Promise<string | null> {
  const skill = getSkill(skillId);
  return chat(apiKey, [
    {
      role: "system",
      content:
        "You are Wondrix School agent. One short sentence introducing a practice question. No spoilers of the answer. No em dashes.",
    },
    {
      role: "user",
      content: `Grade ${profile.gradeLabel}. Skill: ${skill.title}. Question preview: ${prompt}`,
    },
  ]);
}

async function openaiExplain(
  apiKey: string,
  profile: ParentProfile,
  questionId: string,
  choiceId: string,
  correct: boolean,
  fallback: string,
): Promise<string | null> {
  return chat(apiKey, [
    {
      role: "system",
      content:
        "You are Wondrix School agent. Explain in 2 short sentences for a child. If wrong, teach gently. No em dashes. Stay accurate.",
    },
    {
      role: "user",
      content: `Grade ${profile.gradeLabel}. Question id ${questionId}. Choice ${choiceId}. Correct=${correct}. Fact tip: ${fallback}`,
    },
  ]);
}

async function chat(
  apiKey: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 160,
      messages,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}
