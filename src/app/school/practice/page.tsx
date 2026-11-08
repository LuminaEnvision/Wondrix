"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SpeakButton } from "@/components/SpeakButton";
import { gradeName } from "@/lib/curriculum";
import { loadMastery, loadProfile, recordPracticeSession, setSkillMastery } from "@/lib/demo-store";
import type { SchoolGradeResult, SchoolQuestionPayload } from "@/lib/school-agent";
import { skillTitle } from "@/lib/skills";
import type { SkillId } from "@/lib/types";
import { useLang, useT } from "@/lib/use-client-state";

/** One practice session = a few questions, then it ends (Anastasia: "a session should stop"). */
const SESSION_LENGTH = 5;
const CALM_SESSION_LENGTH = 3;

function PracticeInner() {
  const params = useSearchParams();
  const skillId = (params.get("skill") as SkillId) || "measure-length";
  // A new skill remounts the session, so its state starts fresh.
  return <PracticeSession key={skillId} skillId={skillId} />;
}

async function post<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: loadProfile(), ...body }),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The bank question, at once: the model's lead-in is fetched afterwards (ai: false). */
function requestQuestion(skillId: SkillId, avoid: string[]) {
  return post<SchoolQuestionPayload>({ action: "question", skillId, avoidIds: avoid, ai: false });
}

function PracticeSession({ skillId }: { skillId: SkillId }) {
  const tr = useT();
  const lang = useLang();
  const [profile] = useState(() => loadProfile());
  const total = profile.calmMode ? CALM_SESSION_LENGTH : SESSION_LENGTH;
  const gradeLabel = gradeName(profile.gradeLabel, profile.curriculum, lang);

  const [question, setQuestion] = useState<SchoolQuestionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<SchoolGradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  /** Which question the async lead-in / explanation belongs to (late replies are dropped). */
  const currentId = useRef<string | null>(null);

  function show(q: SchoolQuestionPayload | null) {
    setLoading(false);
    setPicked(null);
    setResult(null);
    if (!q) {
      // Nothing new left at this grade: the session ends here.
      setQuestion(null);
      setFinished(true);
      return;
    }
    currentId.current = q.questionId;
    setQuestion(q);
    setAsked((prev) => [...prev, q.questionId]);
    // The coach line from the model, swapped in only if it arrives before the child answers.
    void post<{ coachLead: string | null }>({ action: "lead", questionId: q.questionId }).then((r) => {
      if (r?.coachLead && currentId.current === q.questionId) {
        setQuestion((cur) => (cur && cur.questionId === q.questionId ? { ...cur, coachLead: r.coachLead! } : cur));
      }
    });
  }

  // First question: setState only in the promise callback.
  useEffect(() => {
    let cancelled = false;
    void requestQuestion(skillId, []).then((q) => {
      if (!cancelled) show(q);
    });
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  async function choose(choiceId: string | "idk") {
    if (!question || grading || result) return;
    setPicked(choiceId);
    setGrading(true);
    const qid = question.questionId;
    const data = await post<SchoolGradeResult>({
      action: "grade",
      ai: false,
      mastery: loadMastery(),
      questionId: qid,
      choiceId,
      avoidIds: asked,
    });
    setGrading(false);
    if (!data) {
      setPicked(null);
      return;
    }
    setResult(data);
    setSkillMastery(skillId, data.mastery);
    setAnswered((n) => n + 1);
    if (data.correct) setCorrectCount((n) => n + 1);
    // The local explanation shows at once; the model's gentler one replaces it when ready.
    void post<{ explanation: string | null }>({ action: "explain", questionId: qid, choiceId }).then((r) => {
      if (r?.explanation && currentId.current === qid) {
        setResult((cur) => (cur ? { ...cur, explanation: r.explanation! } : cur));
      }
    });
  }

  const lastQuestion = answered >= total;

  function nextRound() {
    if (lastQuestion || !result?.nextQuestion) {
      finish();
      return;
    }
    show(result.nextQuestion);
  }

  function finish() {
    recordPracticeSession({ skillId, answered, correct: correctCount });
    setFinished(true);
  }

  const spokenQuestion = question
    ? [
        question.coachLead,
        question.prompt,
        ...question.choices.map((c, i) => tr("practice.choiceSpoken", { n: i + 1, label: c.label })),
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <AppShell backHref="/school">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-school">{tr("practice.kicker")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{skillTitle(skillId, lang)}</h1>
          <p className="mt-2 text-ink-soft">
            {gradeLabel ? `${gradeLabel}. ` : ""}
            {tr("practice.idkOk")}
          </p>
        </div>

        {finished ? (
          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-6" data-testid="practice-done">
            <p className="font-display text-2xl font-semibold text-ink">{tr("practice.doneTitle")}</p>
            {answered ? <p className="text-ink">{tr("practice.doneScore", { n: answered })}</p> : null}
            <p className="text-ink-soft">
              {answered && correctCount < answered
                ? tr("practice.doneShaky", { skill: skillTitle(skillId, lang) })
                : answered
                  ? tr("practice.doneAllGood")
                  : tr("practice.noQuestions")}
            </p>
            <p className="text-ink-soft">{tr("practice.comeBack")}</p>
            <Link href="/school" className="inline-flex rounded-full bg-school px-5 py-2.5 font-bold text-white">
              {tr("practice.backWeek")}
            </Link>
          </div>
        ) : loading ? (
          <p className="text-ink-soft">{tr("practice.picking")}</p>
        ) : question ? (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-school">
                {tr("practice.progress", { n: Math.min(answered + (result ? 0 : 1), total), total })}
              </p>
              <SpeakButton id={`q-${question.questionId}`} text={spokenQuestion} label={tr("practice.listenQuestion")} />
            </div>
            {question.coachLead ? <p className="mt-3 text-sm text-ink-soft">{question.coachLead}</p> : null}
            <p className="mt-3 text-lg font-semibold text-ink">{question.prompt}</p>
            <div className="mt-5 space-y-3">
              {question.choices.map((choice) => {
                const selected = picked === choice.id;
                const isRight = result?.correctChoiceId === choice.id;
                // After an answer: the right option gets a clear outline and a tick, a wrong
                // pick a calm marker. No red, no "win" colours.
                let tone = "border-stroke bg-bg/60";
                if (result && isRight) tone = "border-2 border-school bg-school/10";
                else if (result && selected) tone = "border-dashed border-ink-soft/50 bg-bg-deep/40 text-ink-soft";
                else if (result) tone = "border-stroke bg-bg/60 opacity-60";
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={Boolean(result) || grading}
                    onClick={() => void choose(choice.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start font-semibold text-ink ${tone}`}
                    data-testid="choice"
                    data-correct={result ? String(isRight) : undefined}
                  >
                    <span>{choice.label}</span>
                    {result && isRight ? (
                      <span className="shrink-0 text-xs font-bold text-school" aria-label={tr("practice.rightAnswer")}>
                        ✓ {tr("practice.rightAnswer")}
                      </span>
                    ) : result && selected ? (
                      <span className="shrink-0 text-xs font-bold text-ink-soft">{tr("practice.yourAnswer")}</span>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={Boolean(result) || grading}
                onClick={() => void choose("idk")}
                className={`block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-start text-ink-soft ${
                  result && picked === "idk" ? "bg-bg-deep/40" : ""
                }`}
              >
                {tr("practice.idk")}
              </button>
            </div>

            {result ? (
              <div
                className={`mt-6 space-y-3 rounded-2xl p-4 ${result.correct ? "bg-school/10" : "border border-stroke bg-bg-deep/50"}`}
                data-result={result.correct ? "right" : "look-again"}
              >
                {result.correct ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                      <Image src="/art/state-growth.jpg" alt="" fill className="object-cover" sizes="64px" />
                    </div>
                    <p className="font-display text-xl font-semibold text-school">{tr("practice.right")}</p>
                  </div>
                ) : (
                  <p className="font-display text-xl font-semibold text-ink">{tr("practice.lookAgain")}</p>
                )}
                <p className="text-ink">{result.explanation}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <SpeakButton id={`x-${question.questionId}`} text={result.explanation} label={tr("practice.listenExplain")} />
                  <button type="button" onClick={nextRound} className="rounded-full bg-school px-4 py-2 text-sm font-bold text-white">
                    {lastQuestion || !result.nextQuestion ? tr("practice.finish") : tr("practice.next")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
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
