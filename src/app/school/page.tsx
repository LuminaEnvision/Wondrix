"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { SpeakButton } from "@/components/SpeakButton";
import { WxGlyph, type WxGlyphName } from "@/components/WxGlyph";
import { isExplorer, isLittle, isTeen, littleTapFeedback } from "@/lib/age-mode";
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
import { canSpeak, isAudioUnlocked, speak, stopSpeaking, unlockAudio, warmUpVoice } from "@/lib/voice";

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

type PathStop = {
  id: string;
  href: string;
  titleKey: "school.stopTreasure" | "school.stopReading" | "school.stopPractice";
  art: string;
  done: boolean;
};

function LittleSchoolPath({
  focus,
  nickname,
}: {
  focus: SkillId[];
  nickname: string;
}) {
  const tr = useT();
  const lang = useLang();
  const [radarDone, setRadarDone] = useState(false);
  useEffect(() => {
    setRadarDone(Boolean(sessionStorage.getItem(`wondrix-radar-day:${todayKey()}`)));
  }, []);

  const stops: PathStop[] = useMemo(() => {
    const practiceStops: PathStop[] = focus.slice(0, 2).map((id, i) => ({
      id: `practice-${id}`,
      href: `/school/practice?skill=${id}`,
      titleKey: "school.stopPractice",
      art: i === 0 ? "/art/door-school.jpg" : "/art/state-growth.jpg",
      done: false,
    }));
    const base: PathStop[] = [
      {
        id: "treasure",
        href: "/school/radar",
        titleKey: "school.stopTreasure",
        art: "/art/radar-lighthouse.jpg",
        done: radarDone,
      },
      {
        id: "reading",
        href: "/school/reading",
        titleKey: "school.stopReading",
        art: "/art/bg-field-journal.jpg",
        done: false,
      },
    ];
    return [...base, ...practiceStops].slice(0, 5);
  }, [focus, radarDone]);

  const nextIndex = stops.findIndex((s) => !s.done);
  const active = nextIndex < 0 ? stops.length - 1 : nextIndex;
  const line = tr("home.askWhatLittle", { name: nickname });

  useEffect(() => {
    warmUpVoice();
    if (!canSpeak() || !isAudioUnlocked()) return;
    const t = window.setTimeout(() => speak(line, { id: "school-path", lang }), 400);
    return () => {
      window.clearTimeout(t);
      stopSpeaking();
    };
  }, [line, lang]);

  return (
    <div className="wx-enter flex flex-col gap-4 pb-6">
      <button
        type="button"
        className="mx-auto"
        aria-label={line}
        onClick={() => {
          littleTapFeedback();
          void unlockAudio().then(() => speak(line, { id: "school-path", lang }));
        }}
      >
        <Mascot size="lg" busy={false} listening={false} happy speechId="school-path" />
      </button>
      <p className="sr-only">{tr("school.pathTitle")}</p>
      <ol className="relative mx-auto flex w-full max-w-sm flex-col gap-5">
        <span
          className="pointer-events-none absolute start-1/2 top-4 bottom-4 w-1 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--school)_35%,transparent)] rtl:translate-x-1/2"
          aria-hidden
        />
        {stops.map((stop, i) => {
          const isNext = i === active;
          const word =
            stop.titleKey === "school.stopPractice" && focus[i - 2]
              ? skillTitle(focus[i - 2]!, lang).split(/\s+/)[0]
              : tr(stop.titleKey);
          return (
            <li key={stop.id} className="relative z-10 flex justify-center">
              <Link
                href={stop.href}
                onClick={() => littleTapFeedback()}
                className={`wx-tap flex w-full max-w-[16rem] flex-col items-center gap-2 rounded-[1.75rem] border-2 p-3 text-center transition ${
                  isNext
                    ? "border-[var(--school)] bg-[var(--world-surface)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--school)_22%,transparent)]"
                    : stop.done
                      ? "border-stroke/60 bg-[var(--world-surface)] opacity-70"
                      : "border-stroke bg-[var(--world-surface)]"
                }`}
                aria-label={tr(stop.titleKey)}
                aria-current={isNext ? "step" : undefined}
              >
                <span className="relative h-28 w-full overflow-hidden rounded-[1.25rem]">
                  <Image src={stop.art} alt="" fill className="object-cover" sizes="256px" />
                  {isNext ? (
                    <span className="absolute inset-x-0 bottom-0 flex justify-center pb-1">
                      <span className="relative h-14 w-12">
                        <Image
                          src="/art/owl/happy.webp"
                          alt=""
                          fill
                          className="object-contain drop-shadow-md"
                          sizes="48px"
                        />
                      </span>
                    </span>
                  ) : null}
                </span>
                <span className="font-display text-lg font-semibold text-[var(--world-ink)]">
                  {word}
                </span>
                {isNext ? (
                  <span className="text-xs font-bold text-[var(--school)]">{tr("school.pathNext")}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
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
  const showDailyRadar =
    hydrated &&
    !radarDismissed &&
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
  const ageMode = local?.ageMode ?? "explorer";
  const teen = isTeen(ageMode);
  const explorer = isExplorer(ageMode);
  const little = isLittle(ageMode);
  const focusLine = (coachNote.trim() || (calm ? tr("school.softDay") : "")).replace(
    /\s*[—–]\s*/g,
    ": ",
  );
  const speakFocusLine =
    lang === "ar" && focusLine && !/[\u0600-\u06FF]/.test(focusLine)
      ? focus.map((id) => skillTitle(id, "ar")).filter(Boolean).join("، ") ||
        tr("school.softDay")
      : focusLine;

  useEffect(() => {
    if (little) return;
    if (!speakFocusLine || !canSpeak() || !isAudioUnlocked()) return;
    warmUpVoice();
    const timer = window.setTimeout(() => {
      speak(speakFocusLine, { id: "school-focus", lang });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      stopSpeaking();
    };
  }, [speakFocusLine, profileKey, lang, little]);

  function dismissDailyRadar() {
    sessionStorage.setItem(`wondrix-radar-day:${todayKey()}`, "1");
    setRadarDismissed(true);
  }

  if (little) {
    return (
      <AppShell backHref="/" world="school">
        <LittleSchoolPath focus={focus} nickname={nickname} />
      </AppShell>
    );
  }

  const primaryHref =
    showDailyRadar
      ? "/school/radar"
      : focus[0]
        ? `/school/practice?skill=${focus[0]}`
        : "/school/reading";
  const primaryLabel = showDailyRadar
    ? tr("school.dailyRadarGo")
    : tr("school.startNext");

  return (
    <AppShell backHref="/" world="school" dense={teen}>
      <div className="wx-enter space-y-4 pb-4">
        {/* Explorer: Up next first with one primary button */}
        {explorer ? (
          <section className="wx-week-card relative overflow-hidden p-4 sm:p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--school)]">
              {tr("school.upNext")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[var(--world-ink)] sm:text-3xl">
              {tr("school.weekFor", { name: nickname })}
            </h1>
            {speakFocusLine ? (
              <p className="mt-2 text-base font-semibold leading-snug text-[var(--world-ink)]">
                {speakFocusLine}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                onClick={showDailyRadar ? dismissDailyRadar : undefined}
                className="wx-tap inline-flex min-h-14 items-center justify-center rounded-[1.25rem] bg-[var(--school)] px-6 text-base font-bold text-white"
              >
                {primaryLabel}
              </Link>
              <Mascot size="md" busy={false} listening={false} happy speechId="school-focus" />
            </div>
            {speakFocusLine ? (
              <div className="mt-2">
                <SpeakButton id="school-focus" text={speakFocusLine} quiet />
              </div>
            ) : null}
          </section>
        ) : (
          <section className="wx-week-card relative overflow-hidden">
            <div
              className="pointer-events-none absolute -end-6 -top-8 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--school)_18%,transparent)] blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--school)]">
                  {tr("school.kicker")}
                </p>
                <h1 className="mt-1 font-display text-xl font-semibold text-[var(--world-ink)] sm:text-2xl">
                  {tr("school.weekFor", { name: nickname })}
                </h1>
                <p className="mt-1 text-sm font-semibold text-[var(--world-accent)]">
                  {gradeLabel}
                  {blurb ? ` · ${blurb}` : ""}
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-sm leading-relaxed text-[var(--world-ink)]">
                    {speakFocusLine || focusLine || tr("school.pickSkill")}
                  </p>
                  {speakFocusLine ? <SpeakButton id="school-focus" text={speakFocusLine} /> : null}
                  {focus.map((id) => (
                    <p key={id} className="text-sm text-[var(--world-ink-soft)]">
                      <span className="font-bold text-[var(--world-ink)]">{skillTitle(id, lang)}</span>
                      {whyById[id] ? `: ${whyById[id]}` : ""}
                      {" · "}
                      {tr(getSkill(id).subject === "math" ? "subject.math" : "subject.science")}
                    </p>
                  ))}
                </div>
                {lang === "ar" ? (
                  <p className="mt-2 text-xs font-semibold text-ink-soft">{tr("school.englishNote")}</p>
                ) : null}
              </div>
              <div className="shrink-0 self-end">
                <Mascot size="md" busy={false} listening={false} happy speechId="school-focus" />
              </div>
            </div>
          </section>
        )}

        {showDailyRadar && teen ? (
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

        {/* Adult doors stay for Explorer/Teen — Parent also reaches them via deep links */}
        {!explorer ? (
          <div className="grid grid-cols-2 gap-3">
            {DOORS.map((door, i) => (
              <Link
                key={door.href}
                href={door.href}
                className={`wx-school-door wx-school-door-${door.tone} wx-enter group flex flex-col overflow-hidden ${
                  i === 0
                    ? ""
                    : i === 1
                      ? "wx-enter-delay-1"
                      : i === 2
                        ? "wx-enter-delay-2"
                        : "wx-enter-delay-3"
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
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {DOORS.filter((d) => d.href !== "/school/radar" || !showDailyRadar).map((door) => (
              <Link
                key={door.href}
                href={door.href}
                className={`wx-school-door wx-school-door-${door.tone} group flex flex-col overflow-hidden`}
              >
                <div className="relative h-20 w-full shrink-0 overflow-hidden sm:h-24">
                  <Image src={door.art} alt="" fill className="object-cover" sizes="50vw" />
                  <WxGlyph
                    name={door.glyph}
                    size={36}
                    className="pointer-events-none absolute bottom-2 start-2 drop-shadow-md"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h2 className="font-display text-base font-semibold text-[var(--world-ink)]">
                    {tr(door.titleKey)}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
