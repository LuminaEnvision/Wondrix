"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { WxGlyph, type WxGlyphName } from "@/components/WxGlyph";
import {
  loadExtraTopic,
  loadMastery,
  loadProfile,
  pickFocusSkills,
  profileAgeMode,
} from "@/lib/demo-store";
import { gradeBlurb, gradeName } from "@/lib/curriculum";
import { gradeFromLabel } from "@/lib/grades";
import type { SchoolPlan } from "@/lib/school-agent";
import { getSkill, skillTitle } from "@/lib/skills";
import type { SkillId } from "@/lib/types";
import { useHydrated, useLang, useProfileKey, useT } from "@/lib/use-client-state";
import { SpeakButton } from "@/components/SpeakButton";
import { canSpeak, isAudioUnlocked, speak, stopSpeaking, warmUpVoice } from "@/lib/voice";

type PlanView = {
  key: string;
  focus: SkillId[];
  why: Partial<Record<SkillId, string>>;
  coachNote: string;
};

const DOORS: {
  href: string;
  titleKey: "school.doorSkills" | "school.doorProgram" | "school.doorReading" | "school.doorRadar";
  blurbKey:
    | "school.doorSkillsBlurb"
    | "school.doorProgramBlurb"
    | "school.doorReadingBlurb"
    | "school.doorRadarBlurb";
  art: string;
  tone: "skills" | "program" | "reading" | "radar";
  glyph: WxGlyphName;
}[] = [
  {
    href: "/school/skills",
    titleKey: "school.doorSkills",
    blurbKey: "school.doorSkillsBlurb",
    art: "/art/door-school.jpg",
    tone: "skills",
    glyph: "skills",
  },
  {
    href: "/school/program",
    titleKey: "school.doorProgram",
    blurbKey: "school.doorProgramBlurb",
    art: "/art/state-growth.jpg",
    tone: "program",
    glyph: "program",
  },
  {
    href: "/school/reading",
    titleKey: "school.doorReading",
    blurbKey: "school.doorReadingBlurb",
    art: "/art/bg-field-journal.jpg",
    tone: "reading",
    glyph: "reading",
  },
  {
    href: "/school/radar",
    titleKey: "school.doorRadar",
    blurbKey: "school.doorRadarBlurb",
    art: "/art/radar-lighthouse.jpg",
    tone: "radar",
    glyph: "radar",
  },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function SchoolHomePage() {
  const profileKey = useProfileKey();
  const tr = useT();
  const lang = useLang();

  const local = useMemo(() => {
    if (!profileKey) return null;
    const profile = loadProfile();
    const mastery = loadMastery();
    const focusIds = pickFocusSkills(mastery, profile);
    return {
      profile,
      mastery,
      grade: gradeFromLabel(profile.gradeLabel),
      focusIds,
      ageMode: profileAgeMode(profile),
    };
  }, [profileKey]);

  const [plan, setPlan] = useState<PlanView | null>(null);
  const hydrated = useHydrated();
  const [radarDismissed, setRadarDismissed] = useState(false);
  const showDailyRadar = hydrated && !radarDismissed &&
    !sessionStorage.getItem(`wondrix-radar-day:${todayKey()}`);

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
  const gradeLabel = local ? gradeName(local.grade.label, local.profile.curriculum, lang) : "";
  const blurb = local ? gradeBlurb(local.grade.id, lang) : "";
  const teen = local?.ageMode === "teen";
  const explorer = !teen;
  const focusLine = (coachNote.trim() || (calm ? tr("school.softDay") : "")).replace(
    /\s*[—–]\s*/g,
    ": ",
  );

  // Only auto-speak when audio was unlocked by a prior tap — otherwise the owl
  // "talks" with no sound (iOS / blocked autoplay). Tap Listen to unlock + play.
  useEffect(() => {
    if (!focusLine || !canSpeak() || !isAudioUnlocked()) return;
    warmUpVoice();
    const timer = window.setTimeout(() => {
      speak(focusLine, { id: "school-focus" });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      stopSpeaking();
    };
  }, [focusLine, profileKey]);

  function dismissDailyRadar() {
    sessionStorage.setItem(`wondrix-radar-day:${todayKey()}`, "1");
    setRadarDismissed(true);
  }

  return (
    <AppShell backHref="/" world="school" dense={teen}>
      <div className="wx-enter space-y-4 pb-4">
        {/* This week — designed focus card */}
        <section className="wx-week-card relative overflow-hidden">
          <div className="pointer-events-none absolute -end-6 -top-8 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--school)_18%,transparent)] blur-2xl" aria-hidden />
          <div className="relative flex items-start gap-3 p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--school)]">
                {tr("school.kicker")}
              </p>
              <h1
                className={`mt-1 font-display font-semibold text-[var(--world-ink)] ${
                  explorer ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                }`}
              >
                {tr("school.weekFor", { name: nickname })}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--world-accent)]">
                {gradeLabel}
                {blurb && teen ? ` · ${blurb}` : ""}
              </p>

              {explorer ? (
                <div className="mt-3">
                  <p className="text-xs font-bold text-[var(--world-ink-soft)]">{tr("school.focusTopics")}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {focus.length ? (
                      focus.map((id) => (
                        <li key={id} className="wx-week-chip">
                          <span className="wx-week-chip-dot" aria-hidden />
                          {skillTitle(id, lang)}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-[var(--world-ink-soft)]">{tr("common.loading")}</li>
                    )}
                  </ul>
                  {focusLine ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-base font-semibold leading-snug text-[var(--world-ink)]">
                        {focusLine}
                      </p>
                      <SpeakButton id="school-focus" text={focusLine} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm leading-relaxed text-[var(--world-ink)]">
                    {focusLine || tr("school.pickSkill")}
                  </p>
                  {focusLine ? <SpeakButton id="school-focus" text={focusLine} /> : null}
                  {focus.map((id) => (
                    <p key={id} className="text-sm text-[var(--world-ink-soft)]">
                      <span className="font-bold text-[var(--world-ink)]">{skillTitle(id, lang)}</span>
                      {whyById[id] ? `: ${whyById[id]}` : ""}
                      {" · "}
                      {tr(getSkill(id).subject === "math" ? "subject.math" : "subject.science")}
                    </p>
                  ))}
                </div>
              )}

              {lang === "ar" ? (
                <p className="mt-2 text-xs font-semibold text-ink-soft">{tr("school.englishNote")}</p>
              ) : null}
            </div>
            <div className="shrink-0 self-end">
              <Mascot
                size={explorer ? "lg" : "md"}
                busy={false}
                listening={false}
                happy
                speechId="school-focus"
              />
            </div>
          </div>
        </section>

        {showDailyRadar ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--school)]/30 bg-[color-mix(in_srgb,var(--school)_10%,var(--world-surface))] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--world-ink)]">{tr("school.dailyRadar")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissDailyRadar}
                className="rounded-full border border-stroke px-3 py-1.5 text-xs font-bold text-[var(--world-ink-soft)]"
              >
                {tr("school.dailyRadarLater")}
              </button>
              <Link
                href="/school/radar"
                onClick={dismissDailyRadar}
                className="rounded-full bg-[var(--school)] px-3 py-1.5 text-xs font-bold text-white"
              >
                {tr("school.dailyRadarGo")}
              </Link>
            </div>
          </div>
        ) : null}

        {/* Four activity doors */}
        <div className="grid grid-cols-2 gap-3">
          {DOORS.map((door, i) => (
            <Link
              key={door.href}
              href={door.href}
              className={`wx-school-door wx-school-door-${door.tone} wx-enter group flex flex-col overflow-hidden ${
                i === 0 ? "" : i === 1 ? "wx-enter-delay-1" : i === 2 ? "wx-enter-delay-2" : "wx-enter-delay-3"
              }`}
            >
              <div className="relative h-20 w-full shrink-0 overflow-hidden sm:h-24">
                <Image
                  src={door.art}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-active:scale-105"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden />
                <WxGlyph
                  name={door.glyph}
                  size={36}
                  className="pointer-events-none absolute bottom-2 start-2 drop-shadow-[0_2px_8px_rgba(20,53,58,0.45)]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h2 className="font-display text-base font-semibold leading-tight text-[var(--world-ink)] sm:text-lg">
                  {tr(door.titleKey)}
                </h2>
                <p className="text-[0.7rem] leading-snug text-[var(--world-ink-soft)] sm:text-xs">
                  {tr(door.blurbKey)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
