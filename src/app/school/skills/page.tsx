"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { WxGlyph } from "@/components/WxGlyph";
import { loadMastery, loadProfile, profileAgeMode, skillsForProfile } from "@/lib/demo-store";
import { getSkill, skillTitle } from "@/lib/skills";
import { markSubjectTouched, subjectScores } from "@/lib/subject-scores";
import type { MasteryLevel, SkillId } from "@/lib/types";
import { useLang, useProfileKey, useT } from "@/lib/use-client-state";

const LEVEL_LABEL: Record<MasteryLevel, "school.levelUnknown" | "school.levelShaky" | "school.levelGrowing" | "school.levelSecure"> = {
  unknown: "school.levelUnknown",
  shaky: "school.levelShaky",
  growing: "school.levelGrowing",
  secure: "school.levelSecure",
};

export default function SkillsBuilderPage() {
  const profileKey = useProfileKey();
  const tr = useT();
  const lang = useLang();

  const data = useMemo(() => {
    if (!profileKey) return null;
    const profile = loadProfile();
    const mastery = loadMastery();
    const ids = skillsForProfile(profile);
    const scores = subjectScores(mastery, profile.subjects);
    const bySubject: Record<string, SkillId[]> = {};
    for (const id of ids) {
      const sub = getSkill(id).subject;
      (bySubject[sub] ??= []).push(id);
    }
    return { profile, mastery, scores, bySubject, teen: profileAgeMode(profile) === "teen" };
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
            {tr("school.doorSkills")}
          </h1>
          <p className="mt-1 text-sm text-[var(--world-ink-soft)]">{tr("school.skillsIntro")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data.profile.subjects.map((sub) => (
            <div key={sub} className="wx-preview-tile text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--world-ink-soft)]">
                {tr(sub === "math" ? "subject.math" : "subject.science")}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--world-accent)]">
                {data.scores[sub] ?? 0}
              </p>
              <p className="text-[0.65rem] font-semibold text-[var(--world-ink-soft)]">
                {tr("school.subjectScore")}
              </p>
            </div>
          ))}
        </div>

        {Object.entries(data.bySubject).map(([subject, skills]) => (
          <section key={subject} className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-[var(--world-ink)]">
              {tr(subject === "math" ? "subject.math" : "subject.science")}
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {skills.map((id) => {
                const level = (data.mastery[id] ?? "unknown") as MasteryLevel;
                return (
                  <li key={id}>
                    <Link
                      href={`/school/practice?skill=${id}`}
                      onClick={() => markSubjectTouched(subject)}
                      className="wx-school-skill-card flex items-center gap-3 p-3"
                    >
                      <span className="wx-skill-glyph">
                        <WxGlyph name={subject === "math" ? "math" : "science"} size={40} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-[var(--world-ink)]">
                          {skillTitle(id, lang)}
                        </span>
                        <span className="text-xs font-bold text-[var(--world-ink-soft)]">
                          {tr(LEVEL_LABEL[level])}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
