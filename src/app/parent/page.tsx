"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { applyAgeChrome } from "@/components/AgeSkin";
import { AppShell } from "@/components/AppShell";
import { ParentLock } from "@/components/ParentLock";
import {
  addChild,
  buildDaySummary,
  childIsFilled,
  clearAllChats,
  listChats,
  listChildren,
  loadExtraTopic,
  loadMastery,
  loadPracticeSessions,
  loadSafetyRedirects,
  MAX_SAVED_CHATS,
  pickFocusSkills,
  setActiveChild,
  updateChild,
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
import type { AgeMode, ChildProfile, MasteryLevel, ParentProfile, SkillId, SubjectOffer } from "@/lib/types";
import { MAX_TEXTBOOK_PHOTOS } from "@/lib/types";
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
    sessions: loadPracticeSessions(),
    notes: p.oneLiner,
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
  const tr = useT();
  const lang = useLang();
  const [children, setChildren] = useState(() => listChildren());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pinSet, setPinSet] = useState(() => hasParentPin());
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [chatCount, setChatCount] = useState(0);
  const [mastery, setMastery] = useState(() => loadMastery());
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  function refreshChildren() {
    setChildren(listChildren());
  }

  function openChild(id: string) {
    setActiveChild(id);
    setSelectedId(id);
    const child = listChildren().find((c) => c.id === id);
    setEditing(!child || !childIsFilled(child));
    setSaved(false);
    setMastery(loadMastery());
    setChatCount(listChats().length);
    if (child) applyAgeChrome(child.ageMode === "teen" ? "teen" : "explorer", Boolean(child.teenDark));
  }

  function onAddChild() {
    const child = addChild({
      childNickname: "",
      age: "",
      oneLiner: "",
      textbookPhotos: [],
    });
    refreshChildren();
    openChild(child.id);
    setEditing(true);
  }

  function patchSelected(patch: Partial<ChildProfile>) {
    if (!selected) return;
    updateChild(selected.id, patch);
    refreshChildren();
    setSaved(false);
    if (patch.ageMode !== undefined || patch.teenDark !== undefined) {
      const next = { ...selected, ...patch };
      applyAgeChrome(next.ageMode === "teen" ? "teen" : "explorer", Boolean(next.teenDark));
    }
  }

  function updateField<K extends keyof ChildProfile>(key: K, value: ChildProfile[K]) {
    if (!selected) return;
    const next = { ...selected, [key]: value };
    if (key === "curriculum" || key === "gradeLabel") {
      const curriculum = (key === "curriculum" ? value : next.curriculum) as Curriculum;
      const gradeLabel = (key === "gradeLabel" ? value : next.gradeLabel) as string;
      const offered = subjectsForProgramme(curriculum, gradeLabel)
        .filter((s) => s.available)
        .map((s) => s.id);
      next.subjects = next.subjects.filter((s) => offered.includes(s));
      if (!next.subjects.length) next.subjects = ["math"];
    }
    updateChild(selected.id, next);
    refreshChildren();
    setSaved(false);
    if (key === "ageMode") {
      applyAgeChrome(value === "teen" ? "teen" : "explorer", false);
      if (value === "explorer") updateChild(selected.id, { teenDark: false });
    }
  }

  async function onPickPhotos(files: FileList | null) {
    if (!selected || !files?.length) return;
    const current = selected.textbookPhotos ?? [];
    const room = MAX_TEXTBOOK_PHOTOS - current.length;
    if (room <= 0) return;
    const picked = Array.from(files).slice(0, room);
    const urls: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      urls.push(await readFileAsDataUrl(file));
    }
    patchSelected({ textbookPhotos: [...current, ...urls].slice(0, MAX_TEXTBOOK_PHOTOS) });
  }

  const summary = selected ? daySummaryFor(selected, lang) : "";
  const subjectOffers = selected
    ? subjectsForProgramme(selected.curriculum, selected.gradeLabel)
    : [];
  const week = masteryBuckets(mastery);
  const photos = selected?.textbookPhotos ?? [];

  return (
    <AppShell backHref="/" world="parent" dense>
      <ParentLock>
        <div className="wx-enter space-y-5 pb-12">
          {!selectedId ? (
            <>
              <div>
                <h1 className="font-display text-2xl font-semibold text-[var(--world-ink)]">
                  {tr("parent.dashboardTitle")}
                </h1>
                <p className="mt-1 text-sm text-[var(--world-ink-soft)]">{tr("parent.dashboardIntro")}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => openChild(child.id)}
                    className="aspect-square rounded-2xl border border-stroke bg-[var(--world-surface)] p-3 text-start shadow-[var(--shadow-card)]"
                  >
                    <p className="font-display text-lg font-semibold text-[var(--world-ink)] line-clamp-1">
                      {child.childNickname || tr("parent.yourChild")}
                    </p>
                    <p className="mt-2 text-xs text-[var(--world-ink-soft)]">
                      {tr("parent.cardAge")}: {child.age || "—"}
                    </p>
                    <p className="text-xs text-[var(--world-ink-soft)]">
                      {tr("parent.cardClass")}:{" "}
                      {gradeName(child.gradeLabel, child.curriculum, lang)}
                    </p>
                    <p className="text-xs text-[var(--world-ink-soft)]">
                      {tr("parent.cardCurriculum")}: {curriculumLabel(asCurriculum(child.curriculum), lang)}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onAddChild}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stroke bg-[var(--world-bg)] p-3 text-[var(--world-ink-soft)]"
                  aria-label={tr("parent.addChild")}
                >
                  <span className="text-3xl font-light leading-none" aria-hidden>
                    +
                  </span>
                  <span className="text-sm font-bold">{tr("parent.addChild")}</span>
                </button>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-sm font-bold text-[var(--world-accent)]"
                  >
                    {tr("parent.backToDashboard")}
                  </button>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-[var(--world-ink)]">
                    {selected.childNickname || tr("parent.yourChild")}
                  </h1>
                </div>
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
                  <p className="mt-1 text-xs font-semibold text-[var(--world-ink-soft)]">
                    {tr("parent.summaryTitle")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--world-ink)]">{summary}</p>
                </div>
              </div>

              <div className="wx-surface space-y-4 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-[var(--world-ink)]">
                    {tr("parent.settingsTitle")}
                  </h2>
                  {childIsFilled(selected) && !editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-stroke px-3 py-1.5 text-sm font-bold text-[var(--world-ink)]"
                      aria-label={tr("parent.edit")}
                    >
                      <EditIcon />
                      {tr("parent.edit")}
                    </button>
                  ) : null}
                </div>

                {saved ? (
                  <p className="text-sm font-semibold text-brand">
                    {tr("parent.saved", {
                      grade: gradeName(selected.gradeLabel, selected.curriculum, lang),
                    })}
                  </p>
                ) : null}

                {!editing && childIsFilled(selected) ? (
                  <div className="space-y-2 text-sm text-[var(--world-ink)]">
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.nickname")}: </span>
                      {selected.childNickname}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.age")}: </span>
                      {selected.age}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.ageMode")}: </span>
                      {(selected.ageMode ?? "explorer") === "teen"
                        ? tr("parent.ageModeTeen")
                        : tr("parent.ageModeExplorer")}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.curriculum")}: </span>
                      {curriculumLabel(asCurriculum(selected.curriculum), lang)}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.grade")}: </span>
                      {gradeName(selected.gradeLabel, selected.curriculum, lang)}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.subjects")}: </span>
                      {selected.subjects.map((s) => tr(SUBJECT_LABEL[s])).join(", ")}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.unit")}: </span>
                      {photos.length
                        ? tr("parent.unitPhotoCount", { n: photos.length })
                        : tr("parent.unitNone")}
                    </p>
                  </div>
                ) : (
                  <>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-bold text-[var(--world-ink-soft)]">
                        {tr("parent.ageMode")}
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        {(["explorer", "teen"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => updateField("ageMode", mode as AgeMode)}
                            className={`wx-tap rounded-[var(--radius-m)] border px-3 py-2 text-sm font-bold ${
                              (selected.ageMode ?? "explorer") === mode
                                ? "border-[var(--world-accent)] bg-[var(--world-accent)] text-white"
                                : "border-stroke bg-[var(--world-bg)] text-[var(--world-ink)]"
                            }`}
                          >
                            {mode === "explorer" ? tr("parent.ageModeExplorer") : tr("parent.ageModeTeen")}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-ink-soft">{tr("parent.nickname")}</span>
                      <input
                        value={selected.childNickname}
                        onChange={(e) => updateField("childNickname", e.target.value)}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-ink-soft">{tr("parent.age")}</span>
                      <input
                        value={selected.age ?? ""}
                        inputMode="numeric"
                        onChange={(e) => updateField("age", e.target.value)}
                        placeholder={tr("parent.agePlaceholder")}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-ink-soft">{tr("parent.curriculum")}</span>
                      <select
                        name="curriculum"
                        value={asCurriculum(selected.curriculum)}
                        onChange={(e) => updateField("curriculum", e.target.value as Curriculum)}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      >
                        {CURRICULA.map((c) => (
                          <option key={c.id} value={c.id}>
                            {curriculumLabel(c.id, lang)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-ink-soft">{tr("parent.grade")}</span>
                      <select
                        name="grade"
                        value={selected.gradeLabel}
                        onChange={(e) => updateField("gradeLabel", e.target.value)}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g.id} value={g.label}>
                            {gradeNameWithAge(g.id, selected.curriculum, lang)}: {gradeBlurb(g.id, lang)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-bold text-ink-soft">{tr("parent.subjects")}</legend>
                      <p className="text-xs text-ink-soft">{tr("parent.subjectsHelp")}</p>
                      {subjectOffers.map((offer) =>
                        offer.available ? (
                          <label key={offer.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected.subjects.includes(offer.id as "math" | "science")}
                              onChange={(e) => {
                                const id = offer.id as "math" | "science";
                                const next = e.target.checked
                                  ? [...selected.subjects, id]
                                  : selected.subjects.filter((s) => s !== id);
                                updateField(
                                  "subjects",
                                  (next.length ? next : ["math"]) as ChildProfile["subjects"],
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

                    <div className="space-y-2">
                      <p className="text-sm font-bold text-ink-soft">{tr("parent.unit")}</p>
                      <p className="text-xs text-ink-soft">{tr("parent.unitHelp")}</p>
                      <p className="text-xs text-ink-soft">{tr("parent.unitWeekly")}</p>
                      {photos.length ? (
                        <ul className="grid grid-cols-3 gap-2">
                          {photos.map((src, i) => (
                            <li key={`${i}-${src.slice(0, 24)}`} className="relative aspect-square overflow-hidden rounded-xl border border-stroke">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" className="size-full object-cover" />
                              <button
                                type="button"
                                className="absolute end-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white"
                                onClick={() =>
                                  patchSelected({
                                    textbookPhotos: photos.filter((_, j) => j !== i),
                                  })
                                }
                                aria-label={tr("parent.unitRemove")}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void onPickPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {photos.length < MAX_TEXTBOOK_PHOTOS ? (
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                          >
                            {tr("parent.unitAdd")}
                          </button>
                        ) : null}
                        {photos.length ? (
                          <button
                            type="button"
                            onClick={() => {
                              patchSelected({ textbookPhotos: [] });
                              window.setTimeout(() => fileRef.current?.click(), 0);
                            }}
                            className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-ink-soft"
                          >
                            {tr("parent.unitChangeAll")}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-ink-soft">{tr("parent.teacher")}</span>
                      <p className="text-xs text-ink-soft">{tr("parent.teacherHelp")}</p>
                      <textarea
                        value={selected.oneLiner}
                        onChange={(e) => updateField("oneLiner", e.target.value)}
                        placeholder={tr("parent.teacherPlaceholder")}
                        rows={3}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl bg-bg-deep/50 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.calmMode}
                        onChange={(e) => updateField("calmMode", e.target.checked)}
                        className="size-4"
                      />
                      <span className="font-semibold text-ink">{tr("parent.calm")}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setSaved(true);
                        setEditing(false);
                        refreshChildren();
                      }}
                      className="rounded-full bg-brand px-5 py-2.5 font-bold text-white"
                    >
                      {tr("parent.save")}
                    </button>
                  </>
                )}
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
                    : tr(chatCount === 1 ? "parent.historyOne" : "parent.historyMany", {
                        n: chatCount,
                        max: MAX_SAVED_CHATS,
                      })}
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
            </>
          ) : null}

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

          <div className="wx-surface mb-2 grid gap-4 p-4 sm:grid-cols-[120px_1fr] sm:items-center">
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

          <footer className="border-t border-stroke pt-4 text-center">
            <Link href="/website" className="text-sm font-bold text-[var(--world-accent)] underline-offset-2 hover:underline">
              {tr("parent.website")}
            </Link>
          </footer>
        </div>
      </ParentLock>
    </AppShell>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
