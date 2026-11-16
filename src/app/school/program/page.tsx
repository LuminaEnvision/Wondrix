"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { loadMastery, loadProfile, pickFocusSkills, profileAgeMode, skillsForProfile } from "@/lib/demo-store";
import { getSkill, skillTitle } from "@/lib/skills";
import { markSubjectTouched, subjectScores } from "@/lib/subject-scores";
import type { SkillId } from "@/lib/types";
import { useLang, useProfileKey, useT } from "@/lib/use-client-state";

export default function SchoolProgramPage() {
  const profileKey = useProfileKey();
  const tr = useT();
  const lang = useLang();

  const data = useMemo(() => {
    if (!profileKey) return null;
    const profile = loadProfile();
    const mastery = loadMastery();
    const focus = pickFocusSkills(mastery, profile);
    const ids = skillsForProfile(profile);
    const bySubject: Record<string, SkillId[]> = {};
    for (const id of ids) {
      const sub = getSkill(id).subject;
      (bySubject[sub] ??= []).push(id);
    }
    return {
      profile,
      focus,
      bySubject,
      scores: subjectScores(mastery, profile.subjects),
      teen: profileAgeMode(profile) === "teen",
    };
  }, [profileKey]);

  if (!data) {
    return (
      <AppShell backHref="/school" world="school">
        <p className="text-ink-soft">{tr("common.loading")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell backHref="/school" world="school" dense={data.teen}>
      <div className="wx-enter space-y-5 pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--world-ink)]">
            {tr("school.doorProgram")}
          </h1>
          <p className="mt-1 text-sm text-[var(--world-ink-soft)]">{tr("school.programIntro")}</p>
        </div>

        {Object.entries(data.bySubject).map(([subject, skills]) => {
          const startId = data.focus.find((id) => getSkill(id).subject === subject) ?? skills[0];
          return (
            <section key={subject} className="wx-preview-tile space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-[var(--world-ink)]">
                  {tr(subject === "math" ? "subject.math" : "subject.science")}
                </h2>
                <span className="text-sm font-bold text-[var(--world-accent)]">
                  {data.scores[subject] ?? 0}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {skills.slice(0, 6).map((id) => (
                  <li key={id} className="wx-week-chip text-[0.7rem]">
                    {skillTitle(id, lang)}
                  </li>
                ))}
              </ul>
              {startId ? (
                <Link
                  href={`/school/practice?skill=${startId}`}
                  onClick={() => markSubjectTouched(subject)}
                  className="wx-cta inline-flex w-full justify-center text-sm"
                >
                  {tr("school.programStart", {
                    subject: tr(subject === "math" ? "subject.math" : "subject.science"),
                  })}
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
