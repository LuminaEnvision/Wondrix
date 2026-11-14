"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SpeakButton } from "@/components/SpeakButton";
import { gradeName } from "@/lib/curriculum";
import { loadMastery, loadProfile, recordPracticeSession, setSkillMastery } from "@/lib/demo-store";
import { PRACTICE_SESSION_LIMIT, type SchoolGradeResult, type SchoolQuestionPayload } from "@/lib/school-agent";
import type { SkillId } from "@/lib/types";
import { skillTitle } from "@/lib/skills";
import { useLang, useT } from "@/lib/use-client-state";

function PracticeInner() {
  const params = useSearchParams();
  const skillId = (params.get("skill") as SkillId) || "measure-length";
  return <PracticeSession key={skillId} skillId={skillId} />;
}

type QuestionResult = { question: SchoolQuestionPayload | null; gradeLabel: string };

async function requestQuestion(skillId: SkillId, avoid: string[]): Promise<QuestionResult> {
  const profile = loadProfile();
  const lang = profile.language === "ar" ? "ar" : "en";
  const gradeLabel = gradeName(profile.gradeLabel, profile.curriculum, lang);
  try {
    const res = await fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "question", profile, skillId, avoidIds: avoid }),
    });
    if (!res.ok) throw new Error("fail");
    return { question: (await res.json()) as SchoolQuestionPayload, gradeLabel };
  } catch {
    return { question: null, gradeLabel };
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

  const answered = avoidIds.length;
  // Which question is on screen, so a late AI explanation never lands on the next one.
  const questionRef = useRef<string | null>(null);
  useEffect(() => {
    questionRef.current = question?.questionId ?? null;
  }, [question]);
  const [correctCount, setCorrectCount] = useState(0);
  const sessionDone = !loading && !question && answered > 0;

  const showQuestion = useCallback((r: QuestionResult) => {
    setGradeLabel(r.gradeLabel);
    setQuestion(r.question);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void requestQuestion(skillId, []).then((r) => {
      if (!cancelled) showQuestion(r);
    });
    return () => {
      cancelled = true;
    };
  }, [skillId, showQuestion]);

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
          // The bank's explanation comes back at once; the model's gentler one follows.
          ai: false,
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
      if (data.correct) setCorrectCount((n) => n + 1);
      const qid = question.questionId;
      void fetch("/api/school/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "explain", profile, questionId: qid, choiceId }),
      })
        .then((r) => (r.ok ? (r.json() as Promise<{ explanation: string | null }>) : null))
        .then((r) => {
          // Swap in only while the child is still on this question.
          if (r?.explanation) setResult((cur) => (cur && questionRef.current === qid ? { ...cur, explanation: r.explanation! } : cur));
        })
        .catch(() => {});
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
    if (answered >= PRACTICE_SESSION_LIMIT || !result?.nextQuestion) {
      // Session over: the parent summary says how many were done today.
      recordPracticeSession({ skillId, answered, correct: correctCount });
      setQuestion(null);
      setPicked(null);
      setResult(null);
      return;
    }
    setQuestion(result.nextQuestion);
    setPicked(null);
    setResult(null);
  }

  const canContinue =
    Boolean(result?.nextQuestion) && answered < PRACTICE_SESSION_LIMIT;

  return (
    <AppShell backHref="/school" world="school">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold text-school">{tr("practice.kicker")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">
            {question ? skillTitle(question.skillId, lang) : tr("practice.title")}
          </h1>
          <p className="mt-2 text-ink-soft">
            {gradeLabel ? `${gradeLabel}. ` : ""}
            {tr("practice.idkOk")}
            {answered > 0
              ? ` · ${tr("practice.progress", { n: answered, max: PRACTICE_SESSION_LIMIT })}`
              : ""}
          </p>
        </div>

        {loading ? (
          <p className="text-ink-soft">{tr("practice.picking")}</p>
        ) : sessionDone ? (
          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-6">
            <p className="font-display text-xl font-semibold text-ink">{tr("practice.allDone")}</p>
            <p className="text-sm text-ink-soft">{tr("practice.sessionTip")}</p>
            <Link
              href="/school"
              className="inline-flex font-bold text-school underline-offset-4 hover:underline"
            >
              {tr("practice.backWeek")}
            </Link>
          </div>
        ) : !question ? (
          <p className="text-ink-soft">{tr("practice.noQuestions")}</p>
        ) : (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-lg font-semibold text-ink">{question.prompt}</p>
              <SpeakButton
                id={`q-${question.questionId}`}
                text={question.prompt}
                tone="brand"
                label={tr("practice.listenQuestion")}
              />
            </div>
            <div className="mt-5 space-y-3">
              {question.choices.map((choice) => {
                const selected = picked === choice.id;
                const showRight =
                  Boolean(result) &&
                  !result!.correct &&
                  result!.correctChoiceId === choice.id;
                let tone = "border-stroke bg-bg/60";
                if (result) {
                  if (result.correct && selected) tone = "border-brand bg-brand/10";
                  else if (!result.correct && selected) tone = "border-extra/50 bg-[var(--world-surface)]";
                  if (showRight) tone = "border-brand bg-brand/15 ring-1 ring-brand/25";
                }
                return (
                  <button
                    key={choice.id}
                    type="button"
                    data-testid="choice"
                    data-correct={result ? String(result.correctChoiceId === choice.id) : undefined}
                    disabled={Boolean(result) || grading}
                    onClick={() => void choose(choice.id)}
                    className={`block w-full rounded-2xl border px-4 py-3 text-start font-semibold text-ink ${tone}`}
                  >
                    {choice.label}
                    {showRight ? (
                      <span className="ms-2 text-xs font-bold text-brand">
                        {tr("practice.correctMark")}
                      </span>
                    ) : null}
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
              <div
                className={`mt-6 space-y-3 rounded-2xl p-4 ${
                  result.correct
                    ? "border border-brand/25 bg-brand/5"
                    : "border border-stroke bg-[var(--world-bg)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.correct ? null : (
                    // Calm owl for "look again" (docs/ART_NEEDED.md): not praise, not a scold.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/art/owl/calm.webp" alt="" className="h-16 w-14 shrink-0 object-contain" data-testid="owl-calm" />
                  )}
                  <p
                    className={`text-sm font-bold ${
                      result.correct ? "text-brand" : "text-[var(--world-ink-soft)]"
                    }`}
                  >
                    {result.correct ? tr("practice.feedbackOk") : tr("practice.feedbackLook")}
                  </p>
                </div>
                <p className="font-semibold text-ink">{result.explanation}</p>
                <SpeakButton
                  id={`explain-${question.questionId}`}
                  text={result.explanation}
                  tone="brand"
                  label={tr("practice.listenExplain")}
                />
                {result.nextCoach ? (
                  <p className="text-sm text-ink-soft">{result.nextCoach}</p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {canContinue ? (
                    <button
                      type="button"
                      onClick={nextRound}
                      className="rounded-full bg-school px-4 py-2 text-sm font-bold text-white"
                    >
                      {tr("practice.next")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={nextRound}
                      className="rounded-full bg-school px-4 py-2 text-sm font-bold text-white"
                    >
                      {tr("practice.finishSession")}
                    </button>
                  )}
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
        <AppShell backHref="/school" world="school">
          <p className="text-ink-soft">{tr("practice.loading")}</p>
        </AppShell>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
