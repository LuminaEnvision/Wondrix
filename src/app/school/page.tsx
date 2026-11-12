"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadExtraTopic, loadMastery, loadProfile, pickFocusSkills, profileAgeMode } from "@/lib/demo-store";
import { gradeBlurb, gradeName } from "@/lib/curriculum";
import { gradeFromLabel } from "@/lib/grades";
import type { SchoolPlan } from "@/lib/school-agent";
import { getSkill, skillTitle } from "@/lib/skills";
import type { SkillId } from "@/lib/types";
import { useLang, useProfileKey, useT } from "@/lib/use-client-state";

type PlanView = {
  key: string;
  focus: SkillId[];
  why: Partial<Record<SkillId, string>>;
  coachNote: string;
};

export default function SchoolHomePage() {
  const profileKey = useProfileKey();
  const tr = useT();
  const lang = useLang();

  const local = useMemo(() => {
    if (!profileKey) return null;
    const profile = loadProfile();
    const mastery = loadMastery();
    return {
      profile,
      mastery,
      grade: gradeFromLabel(profile.gradeLabel),
      focusIds: pickFocusSkills(mastery, profile),
      ageMode: profileAgeMode(profile),
    };
  }, [profileKey]);

  const [plan, setPlan] = useState<PlanView | null>(null);

  useEffect(() => {
    if (!local) return;
    const controller = new AbortController();
    const fallbackNote = tr("school.today", {
      skills: local.focusIds.map((id) => skillTitle(id, lang)).join(" · ") || tr("school.practice"),
    });

    fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        action: "plan",
        profile: local.profile,
        focusIds: local.focusIds,
        mastery: local.mastery,
        extraTopic: loadExtraTopic(),
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as SchoolPlan;
        const hasFocus = Boolean(data.focus?.length);
        setPlan({
          key: profileKey,
          coachNote: data.coachNote,
          focus: hasFocus ? data.focus.map((f) => f.id) : local.focusIds,
          why:
            hasFocus && data.source !== "local"
              ? Object.fromEntries(data.focus.map((f) => [f.id, f.why]))
              : {},
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPlan({ key: profileKey, focus: local.focusIds, why: {}, coachNote: fallbackNote });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, profileKey]);

  const active = plan?.key === profileKey ? plan : null;
  const focus = active?.focus ?? local?.focusIds ?? [];
  const whyById = active?.why ?? {};
  const coachNote = active?.coachNote ?? "";
  const calm = local?.profile.calmMode ?? false;
  const nickname = local?.profile.childNickname || tr("school.friend");
  // Grade shown in the family's curriculum ("Year 4" / "Grade 3" / "Class 3").
  const gradeLabel = local ? gradeName(local.grade.label, local.profile.curriculum, lang) : "";
  const blurb = local ? gradeBlurb(local.grade.id, lang) : "";
  const teen = local?.ageMode === "teen";
  const primaryId = focus[0];
  const primarySkill = primaryId ? getSkill(primaryId) : null;
  const primaryTitle = primaryId ? skillTitle(primaryId, lang) : "";

  return (
    <AppShell backHref="/" world="school" dense={teen}>
      <div className="wx-enter space-y-4">
        <div className={`flex items-end gap-3 ${teen ? "" : "sm:gap-5"}`}>
          <div className="wx-surface relative min-w-0 flex-1 px-4 py-4 sm:px-5">
            <span
              className="absolute -end-2 bottom-10 hidden h-4 w-4 rotate-45 border-e border-t border-stroke bg-[var(--world-surface)] rtl:rotate-[225deg] sm:block"
              aria-hidden
            />
            <h1 className={`font-display font-semibold text-[var(--world-ink)] ${teen ? "text-2xl" : "text-3xl"}`}>
              {tr("school.weekFor", { name: nickname })}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--world-accent)]">
              {gradeLabel}
              {blurb ? ` · ${blurb}` : ""}
            </p>
            <p className={`mt-2 text-[var(--world-ink-soft)] ${teen ? "text-sm" : "text-base"}`}>
              {coachNote || (calm ? tr("school.softDay") : tr("school.pickSkill"))}
            </p>
            {lang === "ar" ? <p className="mt-2 text-xs font-semibold text-ink-soft">{tr("school.englishNote")}</p> : null}
          </div>
          {!teen ? (
            <div className="relative h-28 w-24 shrink-0 sm:h-36 sm:w-32">
              <Image
                src="/art/mascot-hero.png"
                alt="Wondrix"
                fill
                className="object-contain object-bottom"
                sizes="128px"
                priority
              />
            </div>
          ) : (
            <div className="relative h-14 w-12 shrink-0">
              <Image src="/art/mascot-icon.jpg" alt="" fill className="rounded-full object-cover" sizes="48px" />
            </div>
          )}
        </div>

        {teen ? (
          <div className="flex gap-2 rounded-full border border-stroke bg-[var(--world-surface)] p-1">
            <span className="flex-1 rounded-full bg-[var(--world-accent)] px-3 py-2 text-center text-sm font-bold text-white">
              {tr("school.segmentPractice")}
            </span>
            <Link
              href="/school/radar"
              className="flex-1 rounded-full px-3 py-2 text-center text-sm font-bold text-[var(--world-ink-soft)]"
            >
              {tr("school.segmentCheck")}
            </Link>
          </div>
        ) : null}

        {primarySkill && primaryId ? (
          <div className="wx-surface-lift wx-enter wx-enter-delay-1 space-y-3 border-[var(--world-accent)]/25 p-5">
            <p className="text-sm font-bold text-[var(--world-ink-soft)]">{tr("school.nextSkill")}</p>
            <h2 className={`font-display font-semibold text-[var(--world-ink)] ${teen ? "text-2xl" : "text-3xl"}`}>
              {primaryTitle}
            </h2>
            <p className="text-sm text-[var(--world-ink-soft)]">
              {tr(primarySkill.subject === "math" ? "subject.math" : "subject.science")}
              {whyById[primaryId] ? ` · ${whyById[primaryId]}` : ""}
            </p>
            <Link
              href={`/school/practice?skill=${primaryId}`}
              className="wx-cta w-full text-base"
            >
              {tr("school.startSkill", { skill: primaryTitle })}
            </Link>
          </div>
        ) : (
          <p className="text-[var(--world-ink-soft)]">{tr("common.loading")}</p>
        )}

        {focus.length > 1 ? (
          <div className="space-y-2">
            {focus.slice(1).map((id) => {
              const skill = getSkill(id);
              return (
                <div
                  key={id}
                  className="wx-surface flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--world-ink)]">{skillTitle(id, lang)}</p>
                    <p className="text-sm text-[var(--world-ink-soft)]">
                      {tr(skill.subject === "math" ? "subject.math" : "subject.science")}
                    </p>
                    {whyById[id] ? (
                      <p className="mt-1 text-xs text-[var(--world-ink-soft)]">{whyById[id]}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/school/practice?skill=${id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-stroke px-4 text-sm font-bold text-[var(--world-accent)]"
                  >
                    {tr("school.start")}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : null}

        <Link
          href="/school/radar"
          className="wx-door wx-surface flex items-center gap-4 overflow-hidden p-0 transition active:scale-[0.99]"
        >
          <div className="relative h-20 w-24 shrink-0 sm:h-24 sm:w-28">
            <Image
              src="/art/radar-lighthouse.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
          <div className="min-w-0 flex-1 py-3 pe-4">
            <p className="font-display text-lg font-semibold text-[var(--world-ink)]">
              {teen ? tr("school.radarTitleTeen") : tr("school.radarTitle")}
            </p>
            <p className="mt-0.5 text-sm text-[var(--world-ink-soft)]">{tr("school.radarBlurb")}</p>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
