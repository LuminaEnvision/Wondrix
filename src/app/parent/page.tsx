"use client";

import Image from "next/image";
import { useState } from "react";
import { applyAgeChrome } from "@/components/AgeSkin";
import { AppShell } from "@/components/AppShell";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ParentLock } from "@/components/ParentLock";
import {
  buildDaySummary,
  loadExtraTopic,
  loadSafetyRedirects,
  clearAllChats,
  listChats,
  MAX_SAVED_CHATS,
  loadMastery,
  loadProfile,
  pickFocusSkills,
  saveProfile,
} from "@/lib/demo-store";
import { GRADE_OPTIONS } from "@/lib/grades";
import {
  clearParentPin,
  hasParentPin,
  lockParentSession,
  setParentPin,
} from "@/lib/parent-auth";
import {
  asCurriculum,
  CURRICULA,
  curriculumLabel,
  gradeBlurb,
  gradeName,
  gradeNameWithAge,
  subjectsForProgramme,
  type Curriculum,
} from "@/lib/curriculum";
import type { Lang, MessageKey } from "@/lib/i18n";
import { skillTitle } from "@/lib/skills";
import type { AgeMode, MasteryLevel, ParentProfile, SkillId, SubjectOffer } from "@/lib/types";
import { useHydrated, useLang, useT } from "@/lib/use-client-state";

const SUBJECT_LABEL: Record<SubjectOffer["id"], MessageKey> = {
  math: "subject.math",
  science: "subject.science",
  english: "subject.english",
  arabic: "subject.arabic",
  social: "subject.social",
};

function masteryBuckets(mastery: Partial<Record<SkillId, MasteryLevel>>) {
  const shaky: SkillId[] = [];
  const growing: SkillId[] = [];
  const secure: SkillId[] = [];
  for (const [id, level] of Object.entries(mastery) as [SkillId, MasteryLevel][]) {
    if (level === "shaky") shaky.push(id);
    else if (level === "growing") growing.push(id);
    else if (level === "secure") secure.push(id);
  }
  return { shaky, growing, secure };
}

function daySummaryFor(p: ParentProfile, lang: Lang): string {
  return buildDaySummary({
    lang,
    nickname: p.childNickname,
    gradeLabel: gradeName(p.gradeLabel, p.curriculum, lang),
    focus: pickFocusSkills(loadMastery(), p),
    calmMode: p.calmMode,
    extraTopic: loadExtraTopic(),
    safetyRedirects: loadSafetyRedirects(),
  });
}

/** Parent settings read localStorage, so the form only mounts after hydration. */
export default function ParentPage() {
  const hydrated = useHydrated();
  const tr = useT();
  if (!hydrated) {
    return (
      <AppShell backHref="/" world="parent" dense>
        <p className="text-ink-soft">{tr("common.loading")}</p>
      </AppShell>
    );
  }
  return <ParentHome />;
}

function ParentHome() {
  // Lazy initializers run once on the client: no setState-in-effect needed.
  const [profile, setProfile] = useState<ParentProfile>(() => loadProfile());
  const [saved, setSaved] = useState(false);
  const [pinSet, setPinSet] = useState(() => hasParentPin());
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [chatCount, setChatCount] = useState(() => listChats().length); // current language only
  const [mastery] = useState(() => loadMastery());
  const tr = useT();
  const lang = useLang();
  // Live preview: follows the form (grade, programme, calm mode) and the language.
  const summary = daySummaryFor(profile, lang);
  const subjectOffers = subjectsForProgramme(profile.curriculum, profile.gradeLabel);
  const week = masteryBuckets(mastery);

  function update<K extends keyof ParentProfile>(key: K, value: ParentProfile[K]) {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "curriculum" || key === "gradeLabel") {
        const curriculum = key === "curriculum" ? (value as Curriculum) : next.curriculum;
        const gradeLabel = key === "gradeLabel" ? (value as string) : next.gradeLabel;
        const offered = subjectsForProgramme(curriculum, gradeLabel)
          .filter((s) => s.available)
          .map((s) => s.id);
        next.subjects = next.subjects.filter((s) => offered.includes(s));
        if (!next.subjects.length) next.subjects = ["math"];
      }
      if (key === "ageMode" || key === "teenDark") {
        const mode = (key === "ageMode" ? value : next.ageMode) as AgeMode | undefined;
        const dark = key === "teenDark" ? Boolean(value) : Boolean(next.teenDark);
        applyAgeChrome(mode === "teen" ? "teen" : "explorer", dark);
      }
      return next;
    });
    setSaved(false);
  }

  function onSave() {
    saveProfile(profile);
    setSaved(true);
  }

  return (
    <AppShell backHref="/" world="parent" dense>
      <ParentLock>
        <div className="wx-enter space-y-5 pb-12">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--world-ink)]">{tr("parent.title")}</h1>
            <p className="mt-1 text-sm text-[var(--world-ink-soft)]">
              {tr("parent.intro", { name: profile.childNickname || tr("parent.yourChild") })}
            </p>
          </div>

          <div className="wx-surface-lift grid gap-4 p-4 sm:grid-cols-[120px_1fr] sm:items-center">
            <div className="relative mx-auto h-36 w-24">
              <Image
                src="/art/parent-phone.jpg"
                alt=""
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--world-accent)]">{tr("parent.summaryLead")}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--world-ink-soft)]">{tr("parent.summaryTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--world-ink)]">{summary}</p>
            </div>
          </div>

          <div className="wx-surface space-y-4 p-4">
            <LanguagePicker />

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-[var(--world-ink-soft)]">{tr("parent.ageMode")}</legend>
              <p className="text-xs text-[var(--world-ink-soft)]">{tr("parent.ageModeHelp")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["explorer", "teen"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      update("ageMode", mode);
                      if (mode === "explorer") update("teenDark", false);
                    }}
                    className={`wx-tap rounded-[var(--radius-m)] border px-3 py-2 text-sm font-bold ${
                      (profile.ageMode ?? "explorer") === mode
                        ? "border-[var(--world-accent)] bg-[var(--world-accent)] text-white"
                        : "border-stroke bg-[var(--world-bg)] text-[var(--world-ink)]"
                    }`}
                  >
                    {mode === "explorer" ? tr("parent.ageModeExplorer") : tr("parent.ageModeTeen")}
                  </button>
                ))}
              </div>
              {(profile.ageMode ?? "explorer") === "teen" ? (
                <label className="flex items-center gap-3 rounded-[var(--radius-m)] bg-[var(--world-bg)] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(profile.teenDark)}
                    onChange={(e) => update("teenDark", e.target.checked)}
                    className="size-4"
                  />
                  <span className="text-sm font-semibold">{tr("parent.teenDark")}</span>
                </label>
              ) : null}
            </fieldset>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">{tr("parent.nickname")}</span>
              <input
                value={profile.childNickname}
                onChange={(e) => update("childNickname", e.target.value)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">{tr("parent.curriculum")}</span>
              <select
                name="curriculum"
                value={asCurriculum(profile.curriculum)}
                onChange={(e) => update("curriculum", e.target.value as Curriculum)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              >
                {CURRICULA.map((c) => (
                  <option key={c.id} value={c.id}>
                    {curriculumLabel(c.id, lang)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                {tr("parent.curriculumHelp")}
              </p>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">{tr("parent.grade")}</span>
              <select
                name="grade"
                value={profile.gradeLabel}
                onChange={(e) => update("gradeLabel", e.target.value)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.id} value={g.label}>
                    {gradeNameWithAge(g.id, profile.curriculum, lang)}: {gradeBlurb(g.id, lang)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                {tr("parent.gradeHelp")}
              </p>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-ink-soft">{tr("parent.subjects")}</legend>
              <p className="text-xs text-ink-soft">{tr("parent.subjectsHelp")}</p>
              {subjectOffers.map((offer) =>
                offer.available ? (
                  <label key={offer.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={profile.subjects.includes(offer.id as "math" | "science")}
                      onChange={(e) => {
                        const id = offer.id as "math" | "science";
                        const next = e.target.checked
                          ? [...profile.subjects, id]
                          : profile.subjects.filter((s) => s !== id);
                        update(
                          "subjects",
                          (next.length ? next : ["math"]) as ParentProfile["subjects"],
                        );
                      }}
                      className="size-4"
                    />
                    {tr(SUBJECT_LABEL[offer.id])}
                  </label>
                ) : (
                  <p key={offer.id} className="flex items-center gap-3 text-sm text-ink-soft">
                    <span className="inline-block size-4 rounded border border-dashed border-stroke" aria-hidden />
                    <span>
                      {tr(SUBJECT_LABEL[offer.id])}
                      <span className="ms-2 text-xs font-semibold">({tr("parent.subjectComing")})</span>
                    </span>
                  </p>
                ),
              )}
            </fieldset>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">{tr("parent.unit")}</span>
              <p className="text-xs text-ink-soft">{tr("parent.unitHelp")}</p>
              <input
                value={profile.unitNote ?? ""}
                onChange={(e) => update("unitNote", e.target.value)}
                placeholder={tr("parent.unitPlaceholder")}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">{tr("parent.teacher")}</span>
              <p className="text-xs text-ink-soft">{tr("parent.teacherHelp")}</p>
              <textarea
                value={profile.oneLiner}
                onChange={(e) => update("oneLiner", e.target.value)}
                placeholder={tr("parent.teacherPlaceholder")}
                rows={3}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-bg-deep/50 px-4 py-3">
              <input
                type="checkbox"
                checked={profile.calmMode}
                onChange={(e) => update("calmMode", e.target.checked)}
                className="size-4"
              />
              <span className="font-semibold text-ink">{tr("parent.calm")}</span>
            </label>

            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-brand px-5 py-2.5 font-bold text-white"
            >
              {tr("parent.save")}
            </button>
            {saved ? (
              <p className="text-sm font-semibold text-brand">
                {tr("parent.saved", { grade: gradeName(profile.gradeLabel, profile.curriculum, lang) })}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-5">
            <p className="font-display text-lg font-semibold text-ink">{tr("parent.weekTitle")}</p>
            <p className="text-sm text-ink-soft">{tr("parent.weekIntro")}</p>
            {!week.shaky.length && !week.growing.length && !week.secure.length ? (
              <p className="text-sm text-ink-soft">{tr("parent.weekEmpty")}</p>
            ) : (
              <div className="space-y-3 text-sm">
                {week.shaky.length ? (
                  <div>
                    <p className="font-bold text-ink">{tr("parent.weekShaky")}</p>
                    <p className="mt-1 text-ink-soft">
                      {week.shaky.map((id) => skillTitle(id, lang)).join(lang === "ar" ? "، " : ", ")}
                    </p>
                  </div>
                ) : null}
                {week.growing.length ? (
                  <div>
                    <p className="font-bold text-ink">{tr("parent.weekGrowing")}</p>
                    <p className="mt-1 text-ink-soft">
                      {week.growing.map((id) => skillTitle(id, lang)).join(lang === "ar" ? "، " : ", ")}
                    </p>
                  </div>
                ) : null}
                {week.secure.length ? (
                  <div>
                    <p className="font-bold text-ink">{tr("parent.weekSecure")}</p>
                    <p className="mt-1 text-ink-soft">
                      {week.secure.map((id) => skillTitle(id, lang)).join(lang === "ar" ? "، " : ", ")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-5">
            <p className="font-display text-lg font-semibold text-ink">{tr("parent.historyTitle")}</p>
            <p className="text-sm text-ink-soft">
              {chatCount === 0
                ? tr("parent.historyNone")
                : tr(chatCount === 1 ? "parent.historyOne" : "parent.historyMany", { n: chatCount, max: MAX_SAVED_CHATS })}
            </p>
            {chatCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(tr("parent.historyConfirm"))) return;
                  clearAllChats();
                  setChatCount(0);
                }}
                className="rounded-full border border-stroke bg-card px-4 py-2 text-sm font-bold text-ink-soft"
              >
                {tr("parent.historyClear")}
              </button>
            ) : null}
          </div>

          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-5">
            <p className="font-display text-lg font-semibold text-ink">{tr("parent.pinTitle")}</p>
            {pinSet ? (
              <>
                <p className="text-sm text-ink-soft">{tr("parent.pinIsSet")}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearParentPin();
                    lockParentSession();
                    setPinSet(false);
                    setPinMsg(tr("parent.pinRemoved"));
                  }}
                  className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-ink-soft"
                >
                  {tr("parent.pinRemove")}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft">{tr("parent.pinOptional")}</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 tracking-[0.4em] outline-none"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!/^\d{4}$/.test(newPin)) {
                      setPinMsg(tr("parent.pinUse4"));
                      return;
                    }
                    setParentPin(newPin);
                    setPinSet(true);
                    setNewPin("");
                    setPinMsg(tr("parent.pinSaved"));
                  }}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                >
                  {tr("parent.pinSet")}
                </button>
              </>
            )}
            {pinMsg ? <p className="text-sm font-semibold text-brand">{pinMsg}</p> : null}
          </div>

          <div className="wx-surface mb-4 grid gap-4 p-4 sm:grid-cols-[120px_1fr] sm:items-center">
            <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-2xl">
              <Image
                src="/art/safety-trust.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-[var(--world-ink)]">{tr("parent.safetyTitle")}</p>
              <p className="mt-1 text-sm text-[var(--world-ink-soft)]">{tr("parent.safetyBody")}</p>
            </div>
          </div>
        </div>
      </ParentLock>
    </AppShell>
  );
}
