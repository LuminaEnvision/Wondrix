"use client";

import Image from "next/image";
import { useState } from "react";
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
import { asCurriculum, CURRICULA, gradeName, gradeNameWithAge, type Curriculum } from "@/lib/curriculum";
import type { ParentProfile } from "@/lib/types";
import { useHydrated, useT } from "@/lib/use-client-state";

function daySummaryFor(p: ParentProfile): string {
  return buildDaySummary({
    nickname: p.childNickname,
    gradeLabel: gradeName(p.gradeLabel, p.curriculum),
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
      <AppShell backHref="/">
        <p className="text-ink-soft">{tr("common.loading")}</p>
      </AppShell>
    );
  }
  return <ParentHome />;
}

function ParentHome() {
  // Lazy initializers run once on the client: no setState-in-effect needed.
  const [profile, setProfile] = useState<ParentProfile>(() => loadProfile());
  const [summary, setSummary] = useState(() => daySummaryFor(loadProfile()));
  const [saved, setSaved] = useState(false);
  const [pinSet, setPinSet] = useState(() => hasParentPin());
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [chatCount, setChatCount] = useState(() => listChats().length);
  const tr = useT();

  function update<K extends keyof ParentProfile>(key: K, value: ParentProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function onSave() {
    saveProfile(profile);
    setSummary(daySummaryFor(profile));
    setSaved(true);
  }

  return (
    <AppShell backHref="/">
      <ParentLock>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand">{tr("parent.kicker")}</p>
            <h1 className="font-display mt-1 text-3xl font-semibold">{tr("parent.title")}</h1>
            <p className="mt-2 text-ink-soft">
              {tr("parent.intro", { name: profile.childNickname || tr("parent.yourChild") })}
            </p>
          </div>

          <div className="space-y-4 rounded-3xl border border-stroke bg-card p-5">
            <LanguagePicker />

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
                dir="ltr"
                value={asCurriculum(profile.curriculum)}
                onChange={(e) => update("curriculum", e.target.value as Curriculum)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              >
                {CURRICULA.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
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
                dir="ltr"
                value={profile.gradeLabel}
                onChange={(e) => update("gradeLabel", e.target.value)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.id} value={g.label}>
                    {gradeNameWithAge(g.id, profile.curriculum)}: {g.blurb}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                {tr("parent.gradeHelp")}
              </p>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-ink-soft">{tr("parent.subjects")}</legend>
              {(["math", "science"] as const).map((subject) => (
                <label key={subject} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.subjects.includes(subject)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...profile.subjects, subject]
                        : profile.subjects.filter((s) => s !== subject);
                      update(
                        "subjects",
                        (next.length ? next : ["math"]) as ParentProfile["subjects"],
                      );
                    }}
                    className="size-4"
                  />
                  {tr(subject === "math" ? "subject.math" : "subject.science")}
                </label>
              ))}
            </fieldset>

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
                {tr("parent.saved", { grade: gradeName(profile.gradeLabel, profile.curriculum) })}
              </p>
            ) : null}
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

          <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center rounded-3xl border border-stroke bg-card p-5">
            <div className="relative mx-auto h-44 w-28">
              <Image
                src="/art/parent-phone.jpg"
                alt=""
                fill
                className="object-contain"
                sizes="112px"
              />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                {tr("parent.summaryTitle")}
              </p>
              <p className="mt-3 leading-relaxed text-ink">{summary}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center rounded-3xl border border-stroke bg-card p-5">
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
              <p className="font-display text-lg font-semibold text-ink">{tr("parent.safetyTitle")}</p>
              <p className="mt-1 text-sm text-ink-soft">{tr("parent.safetyBody")}</p>
            </div>
          </div>
        </div>
      </ParentLock>
    </AppShell>
  );
}
