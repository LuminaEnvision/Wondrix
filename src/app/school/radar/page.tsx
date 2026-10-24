"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadProfile, saveMastery, loadMastery } from "@/lib/demo-store";
import { radarForGrade } from "@/lib/radar";
import { getSkill } from "@/lib/skills";
import { PROFILE_CHANGED_EVENT, type MasteryLevel, type RadarItem, type SkillId } from "@/lib/types";

export default function RadarPage() {
  const [bank, setBank] = useState<RadarItem[]>([]);
  const [gradeLabel, setGradeLabel] = useState("");
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shaky, setShaky] = useState<SkillId[]>([]);

  const refresh = useCallback(() => {
    const profile = loadProfile();
    setGradeLabel(profile.gradeLabel);
    setBank(radarForGrade(profile.gradeLabel, 5));
    setIndex(0);
    setFinished(false);
    setShaky([]);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
  }, [refresh]);

  const item = bank[index];

  function answer(choiceId: string | "idk") {
    if (!item) return;
    const mastery = loadMastery();
    const correct =
      choiceId !== "idk" &&
      Boolean(item.choices.find((c) => c.id === choiceId)?.correct);
    const level: MasteryLevel = correct ? "growing" : "shaky";
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
          <p className="text-sm font-bold uppercase tracking-wide text-school">Gap radar</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">Find quiet delays</h1>
          <p className="mt-2 text-ink-soft">
            Short checks for {gradeLabel || "your grade"}. Built for kids who prefer not to speak up
            about what&apos;s hard.
          </p>
        </div>

        {finished ? (
          <div className="space-y-4 rounded-3xl border border-stroke bg-card p-6">
            <p className="font-display text-2xl font-semibold text-ink">Radar complete</p>
            {shaky.length === 0 ? (
              <p className="text-ink-soft">Nothing shaky this round. Nice baseline.</p>
            ) : (
              <p className="text-ink-soft">
                Worth gentle practice:{" "}
                <span className="font-semibold text-ink">
                  {shaky.map((id) => getSkill(id).title).join(", ")}
                </span>
              </p>
            )}
            <Link
              href="/school"
              className="inline-flex rounded-full bg-school px-5 py-2.5 font-bold text-white"
            >
              Open this week
            </Link>
          </div>
        ) : !item ? (
          <p className="text-ink-soft">Loading radar for your grade…</p>
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
                  className="block w-full rounded-2xl border border-stroke bg-bg/50 px-4 py-3 text-left font-semibold text-ink"
                >
                  {choice.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => answer("idk")}
                className="block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-left text-ink-soft"
              >
                I don&apos;t know yet
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
