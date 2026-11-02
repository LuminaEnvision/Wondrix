"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { saveMastery, loadMastery } from "@/lib/demo-store";
import { radarForGrade, seededRandom, shuffleChoices } from "@/lib/radar";
import { nextMastery } from "@/lib/school-agent";
import { getSkill } from "@/lib/skills";
import type { MasteryLevel, SkillId } from "@/lib/types";
import { useProfileGradeLabel, useProfileGradeName, useT } from "@/lib/use-client-state";

export default function RadarPage() {
  // Live grade from the saved profile; a grade change remounts the run (fresh radar).
  const gradeLabel = useProfileGradeLabel();
  return <RadarRun key={gradeLabel} gradeLabel={gradeLabel} />;
}

function RadarRun({ gradeLabel }: { gradeLabel: string }) {
  const gradeShown = useProfileGradeName();
  const tr = useT();
  // One random seed per radar run: options are shuffled once and stay put while answering.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const bank = useMemo(() => {
    if (!gradeLabel) return [];
    const rand = seededRandom(seed);
    return radarForGrade(gradeLabel, 5).map((item) => ({ ...item, choices: shuffleChoices(item.choices, rand) }));
  }, [gradeLabel, seed]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shaky, setShaky] = useState<SkillId[]>([]);

  const item = bank[index];

  function answer(choiceId: string | "idk") {
    if (!item) return;
    const mastery = loadMastery();
    const correct =
      choiceId !== "idk" &&
      Boolean(item.choices.find((c) => c.id === choiceId)?.correct);
    const level: MasteryLevel = nextMastery(
      mastery[item.skillId],
      choiceId === "idk" ? "idk" : correct ? "correct" : "wrong",
    );
    mastery[item.skillId] = level;
    saveMastery(mastery);

    const nextShaky = correct ? shaky : [...new Set([...shaky, item.skillId])];
    setShaky(nextShaky);

    if (index + 1 >= bank.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <AppShell backHref="/school">
      <div className="space-y-6">
        <div className="relative h-40 overflow-hidden rounded-3xl border border-stroke">
          <Image
            src="/art/radar-lighthouse.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 672px"
            priority
          />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-school">{tr("radar.kicker")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{tr("radar.title")}</h1>
          <p className="mt-2 text-ink-soft">
            {tr("radar.intro", { grade: gradeShown || tr("radar.yourGrade") })}
          </p>
        </div>

        {finished ? (
          <div className="space-y-4 rounded-3xl border border-stroke bg-card p-6">
            <p className="font-display text-2xl font-semibold text-ink">{tr("radar.complete")}</p>
            {shaky.length === 0 ? (
              <p className="text-ink-soft">{tr("radar.nothingShaky")}</p>
            ) : (
              <p className="text-ink-soft">
                {tr("radar.worth")}{" "}
                <span className="font-semibold text-ink">
                  {shaky.map((id) => getSkill(id).title).join(", ")}
                </span>
              </p>
            )}
            <Link
              href="/school"
              className="inline-flex rounded-full bg-school px-5 py-2.5 font-bold text-white"
            >
              {tr("radar.openWeek")}
            </Link>
          </div>
        ) : !item ? (
          <p className="text-ink-soft">{tr("radar.loading")}</p>
        ) : (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            <p className="text-sm font-bold text-ink-soft">
              {index + 1} / {bank.length} · {getSkill(item.skillId).title}
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">{item.prompt}</p>
            <div className="mt-5 space-y-3">
              {item.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => answer(choice.id)}
                  className="block w-full rounded-2xl border border-stroke bg-bg/50 px-4 py-3 text-start font-semibold text-ink"
                >
                  {choice.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => answer("idk")}
                className="block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-start text-ink-soft"
              >
                {tr("practice.idk")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
