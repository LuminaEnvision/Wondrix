"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { gradeName } from "@/lib/curriculum";
import { loadMastery, loadProfile, setSkillMastery } from "@/lib/demo-store";
import type { SchoolGradeResult, SchoolQuestionPayload } from "@/lib/school-agent";
import type { SkillId } from "@/lib/types";
import { skillTitle } from "@/lib/skills";
import { useLang, useT } from "@/lib/use-client-state";

function PracticeInner() {
  const params = useSearchParams();
  const skillId = (params.get("skill") as SkillId) || "measure-length";
  // A new skill remounts the session, so its state starts fresh.
  return <PracticeSession key={skillId} skillId={skillId} />;
}

type QuestionResult = { question: SchoolQuestionPayload | null; gradeLabel: string };

/** Ask the School agent for a question (pure: no React state). */
async function requestQuestion(skillId: SkillId, avoid: string[]): Promise<QuestionResult> {
  const profile = loadProfile();
  try {
    const res = await fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "question", profile, skillId, avoidIds: avoid }),
    });
    if (!res.ok) throw new Error("fail");
    const lang = profile.language === "ar" ? "ar" : "en";
    return { question: (await res.json()) as SchoolQuestionPayload, gradeLabel: gradeName(profile.gradeLabel, profile.curriculum, lang) };
  } catch {
    return { question: null, gradeLabel: gradeName(profile.gradeLabel, profile.curriculum, profile.language === "ar" ? "ar" : "en") };
  }
}

function PracticeSession({ skillId }: { skillId: SkillId }) {
  const tr = useT();
  const lang = useLang();
  const [question, setQuestion] = useState<SchoolQuestionPayload | null>(null);
  const [avoidIds, setAvoidIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<SchoolGradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [gradeLabel, setGradeLabel] = useState("");

  const showQuestion = useCallback((r: QuestionResult) => {
    setGradeLabel(r.gradeLabel);
    setQuestion(r.question);
    setLoading(false);
  }, []);

  // First question for this skill. setState only runs in the promise callback.
  useEffect(() => {
    let cancelled = false;
    void requestQuestion(skillId, []).then((r) => {
      if (!cancelled) showQuestion(r);
    });
    return () => {
      cancelled = true;
    };
  }, [skillId, showQuestion]);

  function fetchQuestion(avoid: string[]) {
    void requestQuestion(skillId, avoid).then(showQuestion);
  }

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
          mastery: loadMastery(),
          questionId: question.questionId,
          choiceId,
          avoidIds: [...avoidIds, question.questionId],
        }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as SchoolGradeResult;
      setResult(data);
      setSkillMastery(skillId, data.mastery);
      setAvoidIds((prev) => [...prev, question.questionId]);
    } catch {
      setResult({
        correct: false,
        explanation: tr("practice.error"),
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
      return;
    }
    setLoading(true);
    setPicked(null);
    setResult(null);
    fetchQuestion([...avoidIds, question?.questionId ?? ""]);
  }

  return (
    <AppShell backHref="/school">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-school">
            {tr("practice.kicker")}
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold">
            {question ? skillTitle(question.skillId, lang) : tr("practice.title")}
          </h1>
          <p className="mt-2 text-ink-soft">
            {gradeLabel ? `${gradeLabel}. ` : ""}
            {tr("practice.idkOk")}
          </p>
        </div>

        {loading ? (
          <p className="text-ink-soft">{tr("practice.picking")}</p>
        ) : !question ? (
          avoidIds.length ? (
            <div className="space-y-3 rounded-3xl border border-stroke bg-card p-6">
              <p className="font-display text-xl font-semibold text-ink">
                {tr("practice.allDone")}
              </p>
              <Link
                href="/school"
                className="inline-flex font-bold text-school underline-offset-4 hover:underline"
              >
                {tr("practice.backWeek")}
              </Link>
            </div>
          ) : (
            <p className="text-ink-soft">
              {tr("practice.noQuestions")}
            </p>
          )
        ) : (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            {question.coachLead ? (
              <p className="text-sm text-ink-soft">{question.coachLead}</p>
            ) : null}
            <p className={`text-lg font-semibold text-ink ${question.coachLead ? "mt-3" : ""}`}>
              {question.prompt}
            </p>
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
                    className={`block w-full rounded-2xl border px-4 py-3 text-start font-semibold text-ink ${tone}`}
                  >
                    {choice.label}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={Boolean(result) || grading}
                onClick={() => void choose("idk")}
                className="block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-start text-ink-soft"
              >
                {tr("practice.idk")}
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
                    {tr("practice.next")}
                  </button>
                  <Link
                    href="/school"
                    className="inline-flex items-center font-bold text-school underline-offset-4 hover:underline"
                  >
                    {tr("practice.backWeek")}
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
  const tr = useT();
  return (
    <Suspense
      fallback={
        <AppShell backHref="/school">
          <p className="text-ink-soft">{tr("practice.loading")}</p>
        </AppShell>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
