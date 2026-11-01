"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadExtraTopic, loadMastery, loadProfile, pickFocusSkills } from "@/lib/demo-store";
import { gradeFromLabel } from "@/lib/grades";
import type { SchoolPlan } from "@/lib/school-agent";
import { getSkill } from "@/lib/skills";
import type { SkillId } from "@/lib/types";
import { useProfileKey } from "@/lib/use-client-state";

type PlanView = {
  /** Profile snapshot this plan belongs to (stale plans are ignored). */
  key: string;
  focus: SkillId[];
  why: Partial<Record<SkillId, string>>;
  coachNote: string;
};

export default function SchoolHomePage() {
  // Changes when the parent saves the profile (this tab or another tab).
  const profileKey = useProfileKey();

  // Local state of the child, derived during render (no setState in an effect).
  const local = useMemo(() => {
    if (!profileKey) return null;
    const profile = loadProfile();
    const mastery = loadMastery();
    return {
      profile,
      mastery,
      grade: gradeFromLabel(profile.gradeLabel),
      focusIds: pickFocusSkills(mastery, profile),
    };
  }, [profileKey]);

  // The agent's plan arrives async; setState only happens in the fetch callbacks.
  const [plan, setPlan] = useState<PlanView | null>(null);

  useEffect(() => {
    if (!local) return;
    const controller = new AbortController();
    const fallbackNote = `Today: ${local.focusIds.map((id) => getSkill(id).title).join(" · ") || "practice"}.`;

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
          // Only show reasons the live agent wrote (local "why" is generic).
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
  }, [local, profileKey]);

  const active = plan?.key === profileKey ? plan : null;
  const focus = active?.focus ?? local?.focusIds ?? [];
  const whyById = active?.why ?? {};
  const coachNote = active?.coachNote ?? "";
  const calm = local?.profile.calmMode ?? false;
  const nickname = local?.profile.childNickname ?? "friend";
  const gradeLabel = local?.grade.label ?? "Year 3";
  const gradeBlurb = local?.grade.blurb ?? "";

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
                    {whyById[id] ? (
                      <p className="mt-1 text-xs text-ink-soft">{whyById[id]}</p>
                    ) : null}
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
