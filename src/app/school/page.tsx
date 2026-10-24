"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadMastery, loadProfile, pickFocusSkills } from "@/lib/demo-store";
import { gradeFromLabel } from "@/lib/grades";
import type { SchoolPlan } from "@/lib/school-agent";
import { getSkill } from "@/lib/skills";
import { PROFILE_CHANGED_EVENT, type SkillId } from "@/lib/types";

export default function SchoolHomePage() {
  const [focus, setFocus] = useState<SkillId[]>([]);
  const [calm, setCalm] = useState(false);
  const [nickname, setNickname] = useState("friend");
  const [gradeLabel, setGradeLabel] = useState("Year 3");
  const [gradeBlurb, setGradeBlurb] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const refresh = useCallback(() => {
    const profile = loadProfile();
    const mastery = loadMastery();
    const grade = gradeFromLabel(profile.gradeLabel);
    const focusIds = pickFocusSkills(mastery, profile);
    setNickname(profile.childNickname);
    setCalm(profile.calmMode);
    setGradeLabel(grade.label);
    setGradeBlurb(grade.blurb);
    setFocus(focusIds);

    void fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "plan", profile, focusIds }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const plan = (await res.json()) as SchoolPlan;
        setCoachNote(plan.coachNote);
        if (plan.focus?.length) {
          setFocus(plan.focus.map((f) => f.id));
        }
      })
      .catch(() => {
        setCoachNote(
          `Today: ${focusIds.map((id) => getSkill(id).title).join(" · ") || "practice"}.`,
        );
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return (
    <AppShell backHref="/">
      <div className="space-y-6">
        <div className="flex items-end gap-3 sm:gap-5">
          <div className="relative min-w-0 flex-1 rounded-3xl border border-stroke bg-card px-5 py-5 sm:px-6 sm:py-6">
            <span
              className="absolute -right-2 bottom-10 hidden h-4 w-4 rotate-45 border-r border-t border-stroke bg-card sm:block"
              aria-hidden
            />
            <p className="text-sm font-bold uppercase tracking-wide text-school">
              School agent
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-ink">
              This week for {nickname}
            </h1>
            <p className="mt-1 text-sm font-semibold text-school">
              {gradeLabel}
              {gradeBlurb ? ` · ${gradeBlurb}` : ""}
            </p>
            <p className="mt-2 text-ink-soft">
              {coachNote || (calm ? "Soft day. One focus skill." : "Pick a skill to start.")}
            </p>
          </div>
          <div className="relative h-28 w-24 shrink-0 sm:h-40 sm:w-36">
            <Image
              src="/art/mascot-hero.png"
              alt="Wondrix"
              fill
              className="object-contain object-bottom"
              sizes="144px"
              priority
            />
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-stroke bg-card p-5">
          <p className="text-sm font-bold text-ink-soft">Focus skills for {gradeLabel}</p>
          {focus.length === 0 ? (
            <p className="text-ink-soft">Loading…</p>
          ) : (
            focus.map((id) => {
              const skill = getSkill(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-bg-deep/50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-ink">{skill.title}</p>
                    <p className="text-sm capitalize text-ink-soft">{skill.subject}</p>
                  </div>
                  <Link
                    href={`/school/practice?skill=${id}`}
                    className="rounded-full bg-school px-4 py-2 text-sm font-bold text-white"
                  >
                    Start
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/school/radar"
            className="overflow-hidden rounded-3xl border border-stroke bg-card transition hover:border-school/40"
          >
            <div className="relative h-28 w-full">
              <Image
                src="/art/radar-lighthouse.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <div className="px-5 py-4">
              <p className="font-display text-xl font-semibold text-ink">Gap radar</p>
              <p className="mt-1 text-sm text-ink-soft">
                Grade-matched checks, including when speaking up feels hard.
              </p>
            </div>
          </Link>
          <Link
            href="/parent"
            className="overflow-hidden rounded-3xl border border-stroke bg-card transition hover:border-brand/40"
          >
            <div className="relative h-28 w-full bg-bg-deep">
              <Image
                src="/art/parent-phone.jpg"
                alt=""
                fill
                className="object-contain p-3"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <div className="px-5 py-4">
              <p className="font-display text-xl font-semibold text-ink">Parent note</p>
              <p className="mt-1 text-sm text-ink-soft">
                Change grade/subjects here. Teacher recommendations and calm mode.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
