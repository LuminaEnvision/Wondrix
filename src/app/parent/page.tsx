"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ParentLock } from "@/components/ParentLock";
import {
  buildDaySummary,
  DEFAULT_PROFILE,
  loadExtraTopic,
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
import type { ParentProfile } from "@/lib/types";

export default function ParentPage() {
  const [profile, setProfile] = useState<ParentProfile>(DEFAULT_PROFILE);
  const [summary, setSummary] = useState("");
  const [saved, setSaved] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  function refreshSummary(p: ParentProfile) {
    const focus = pickFocusSkills(loadMastery(), p);
    setSummary(
      buildDaySummary({
        nickname: p.childNickname,
        gradeLabel: p.gradeLabel,
        focus,
        calmMode: p.calmMode,
        extraTopic: loadExtraTopic(),
      }),
    );
  }

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setPinSet(hasParentPin());
    refreshSummary(p);
  }, []);

  function update<K extends keyof ParentProfile>(key: K, value: ParentProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function onSave() {
    saveProfile(profile);
    refreshSummary(profile);
    setSaved(true);
  }

  return (
    <AppShell backHref="/">
      <ParentLock>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand">Parent</p>
            <h1 className="font-display mt-1 text-3xl font-semibold">Home controls</h1>
            <p className="mt-2 text-ink-soft">
              Grade changes what School practices. Save so {profile.childNickname || "your child"}{" "}
              sees the update.
            </p>
          </div>

          <div className="space-y-4 rounded-3xl border border-stroke bg-card p-5">
            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">Child nickname</span>
              <input
                value={profile.childNickname}
                onChange={(e) => update("childNickname", e.target.value)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">Grade / year</span>
              <select
                value={profile.gradeLabel}
                onChange={(e) => update("gradeLabel", e.target.value)}
                className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.id} value={g.label}>
                    {g.label}: {g.blurb}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                Changing grade updates School focus skills after you Save.
              </p>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-ink-soft">Subjects</legend>
              {(["math", "science"] as const).map((subject) => (
                <label key={subject} className="flex items-center gap-3 capitalize">
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
                  {subject}
                </label>
              ))}
            </fieldset>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-ink-soft">
                Teacher recommendations
              </span>
              <p className="text-xs text-ink-soft">
                Fill each time you receive recommendations from teachers.
              </p>
              <textarea
                value={profile.oneLiner}
                onChange={(e) => update("oneLiner", e.target.value)}
                placeholder="e.g. Practice fractions this week / Measuring length is shaky"
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
              <span className="font-semibold text-ink">
                Calm mode (one focus skill, gentler sessions)
              </span>
            </label>

            <button
              type="button"
              onClick={onSave}
              className="rounded-full bg-brand px-5 py-2.5 font-bold text-white"
            >
              Save
            </button>
            {saved ? (
              <p className="text-sm font-semibold text-brand">
                Saved. Open School to see new focus skills for {profile.gradeLabel}.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-3xl border border-stroke bg-card p-5">
            <p className="font-display text-lg font-semibold text-ink">Parent password</p>
            {pinSet ? (
              <>
                <p className="text-sm text-ink-soft">A password is set on this device.</p>
                <button
                  type="button"
                  onClick={() => {
                    clearParentPin();
                    lockParentSession();
                    setPinSet(false);
                    setPinMsg("Password removed. Anyone can open Parent until you set a new one.");
                  }}
                  className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-ink-soft"
                >
                  Remove password
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  Optional. Set a 4-digit password if you skipped setup earlier.
                </p>
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
                      setPinMsg("Use 4 digits.");
                      return;
                    }
                    setParentPin(newPin);
                    setPinSet(true);
                    setNewPin("");
                    setPinMsg("Password saved.");
                  }}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                >
                  Set password
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
                Today&apos;s phone summary (preview)
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
              <p className="font-display text-lg font-semibold text-ink">Safety & visibility</p>
              <p className="mt-1 text-sm text-ink-soft">
                Daily summary keeps Extra chat educational. Parents can pause topics and use calm
                mode after a hard school day.
              </p>
            </div>
          </div>
        </div>
      </ParentLock>
    </AppShell>
  );
}
