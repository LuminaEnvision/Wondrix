"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadProfile, setSkillMastery } from "@/lib/demo-store";
import type { SchoolGradeResult, SchoolQuestionPayload } from "@/lib/school-agent";
import type { SkillId } from "@/lib/types";

function PracticeInner() {
  const params = useSearchParams();
  const skillId = (params.get("skill") as SkillId) || "measure-length";

  const [question, setQuestion] = useState<SchoolQuestionPayload | null>(null);
  const [avoidIds, setAvoidIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<SchoolGradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [agentSource, setAgentSource] = useState<"local" | "openai">("local");
  const [gradeLabel, setGradeLabel] = useState("");

  const fetchQuestion = useCallback(
    async (avoid: string[]) => {
      setLoading(true);
      setPicked(null);
      setResult(null);
      const profile = loadProfile();
      setGradeLabel(profile.gradeLabel);
      try {
        const res = await fetch("/api/school/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "question",
            profile,
            skillId,
            avoidIds: avoid,
          }),
        });
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as SchoolQuestionPayload;
        setQuestion(data);
        setAgentSource(data.source);
      } catch {
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    },
    [skillId],
  );

  useEffect(() => {
    void fetchQuestion([]);
  }, [fetchQuestion]);

  async function choose(choiceId: string | "idk") {
    if (!question || grading || result) return;
    setPicked(choiceId);
    setGrading(true);
    const profile = loadProfile();
    try {
      const res = await fetch("/api/school/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          profile,
          questionId: question.questionId,
          choiceId,
          avoidIds: [...avoidIds, question.questionId],
        }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as SchoolGradeResult;
      setResult(data);
      setAgentSource(data.source);
      setSkillMastery(skillId, data.mastery);
      setAvoidIds((prev) => [...prev, question.questionId]);
    } catch {
      setResult({
        correct: false,
        explanation: "Something went wrong. Try again in a moment.",
        mastery: "shaky",
        nextCoach: "",
        nextQuestion: null,
        source: "local",
      });
    } finally {
      setGrading(false);
    }
  }

  function nextRound() {
    if (result?.nextQuestion) {
      setAvoidIds((prev) => [...prev, question!.questionId]);
      setQuestion(result.nextQuestion);
      setPicked(null);
      setResult(null);
      setAgentSource(result.nextQuestion.source);
      return;
    }
    void fetchQuestion([...avoidIds, question?.questionId ?? ""]);
  }

  return (
    <AppShell backHref="/school">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-school">
            School agent · Practice
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">
            {question?.skillTitle ?? "Practice"}
          </h1>
          <p className="mt-2 text-ink-soft">
            {gradeLabel
              ? `Questions match ${gradeLabel}. `
              : ""}
            No scores that punish mistakes. &quot;I don&apos;t know&quot; is always ok.
            {agentSource === "openai" ? " Agent online." : " Demo agent (add OPENAI_API_KEY for live coach)."}
          </p>
        </div>

        {loading ? (
          <p className="text-ink-soft">School agent is picking a question…</p>
        ) : !question ? (
          <p className="text-ink-soft">
            No questions for this skill at your grade yet. Change grade in Parent, or try another focus.
          </p>
        ) : (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            <p className="text-sm text-ink-soft">{question.coachLead}</p>
            <p className="mt-3 text-lg font-semibold text-ink">{question.prompt}</p>
            <div className="mt-5 space-y-3">
              {question.choices.map((choice) => {
                const selected = picked === choice.id;
                let tone = "border-stroke bg-bg/60";
                if (result) {
                  if (result.correct && selected) tone = "border-brand bg-bg-deep";
                  if (!result.correct && selected) tone = "border-extra/50 bg-extra/10";
                }
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={Boolean(result) || grading}
                    onClick={() => void choose(choice.id)}
                    className={`block w-full rounded-2xl border px-4 py-3 text-left font-semibold text-ink ${tone}`}
                  >
                    {choice.label}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={Boolean(result) || grading}
                onClick={() => void choose("idk")}
                className="block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-left text-ink-soft"
              >
                I don&apos;t know yet
              </button>
            </div>

            {result ? (
              <div className="mt-6 space-y-3 rounded-2xl bg-bg-deep/60 p-4">
                <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-2xl">
                  <Image
                    src={
                      result.correct ? "/art/state-growth.jpg" : "/art/state-idontknow.jpg"
                    }
                    alt=""
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
                <p className="font-semibold text-ink">{result.explanation}</p>
                {result.nextCoach ? (
                  <p className="text-sm text-ink-soft">{result.nextCoach}</p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={nextRound}
                    className="rounded-full bg-school px-4 py-2 text-sm font-bold text-white"
                  >
                    Next question
                  </button>
                  <Link
                    href="/school"
                    className="inline-flex items-center font-bold text-school underline-offset-4 hover:underline"
                  >
                    Back to this week
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <AppShell backHref="/school">
          <p className="text-ink-soft">Loading practice…</p>
        </AppShell>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
