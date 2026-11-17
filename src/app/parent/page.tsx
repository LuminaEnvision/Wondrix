"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { applyAgeChrome } from "@/components/AgeSkin";
import { AppShell } from "@/components/AppShell";
import { ParentLock } from "@/components/ParentLock";
import {
  addChild,
  buildDayPreview,
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
import { GRADE_OPTIONS, defaultAgeMode, gradeFromAge, suggestedAgeFromGrade } from "@/lib/grades";
import { pickDeviceLook } from "@/lib/age-preference";
import { hasParentPin, setParentPin } from "@/lib/parent-auth";
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

const AVATAR_PRESETS = [
  { src: "/art/avatars/explorer.webp", label: "parent.avatarExplorer" as const },
  { src: "/art/avatars/artist.webp", label: "parent.avatarArtist" as const },
  { src: "/art/avatars/scientist.webp", label: "parent.avatarScientist" as const },
  { src: "/art/avatars/athlete.webp", label: "parent.avatarAthlete" as const },
  { src: "/art/avatars/chef.webp", label: "parent.avatarChef" as const },
  { src: "/art/avatars/musician.webp", label: "parent.avatarMusician" as const },
] as const;

function ChildAvatar({
  src,
  name,
  size = 56,
  className = "",
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display font-semibold text-[var(--world-accent)] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "color-mix(in srgb, var(--world-accent) 18%, var(--world-surface))",
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

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

function dayPreviewFor(p: ParentProfile, lang: Lang) {
  return buildDayPreview({
    lang,
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
  const [changingPin, setChangingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [showLatestSummary, setShowLatestSummary] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [mastery, setMastery] = useState(() => loadMastery());
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  function refreshChildren() {
    setChildren(listChildren());
  }

  function openChild(id: string) {
    setActiveChild(id);
    setSelectedId(id);
    const child = listChildren().find((c) => c.id === id);
    setEditing(!child || !childIsFilled(child));
    setAvatarPickerOpen(false);
    setSaved(false);
    setMastery(loadMastery());
    setChatCount(listChats().length);
    if (child) {
      applyAgeChrome(
        child.ageMode === "teen" ? "teen" : "explorer",
        Boolean(child.darkMode ?? child.teenDark),
      );
    }
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
    if (patch.ageMode !== undefined || patch.darkMode !== undefined || patch.teenDark !== undefined) {
      const next = { ...selected, ...patch };
      applyAgeChrome(
        next.ageMode === "teen" ? "teen" : "explorer",
        Boolean(next.darkMode ?? next.teenDark),
      );
    }
  }

  function finishEditing() {
    setSaved(true);
    setEditing(false);
    setAvatarPickerOpen(false);
    refreshChildren();
  }

  function updateField<K extends keyof ChildProfile>(key: K, value: ChildProfile[K]) {
    if (!selected) return;
    const next = { ...selected, [key]: value };

    // Age ↔ year stay linked as suggestions; parent can still override either field after.
    if (key === "age") {
      const ageStr = String(value ?? "").trim();
      if (/^\d{1,2}$/.test(ageStr)) {
        const g = gradeFromAge(ageStr);
        next.gradeLabel = g.label;
        next.ageBand = g.ageBand;
        next.ageMode = defaultAgeMode(g.label);
      }
    }
    if (key === "gradeLabel") {
      const gradeLabel = String(value);
      next.age = suggestedAgeFromGrade(gradeLabel);
      next.ageBand = gradeFromAge(next.age).ageBand;
      next.ageMode = defaultAgeMode(gradeLabel);
    }

    if (key === "curriculum" || key === "gradeLabel" || key === "age") {
      const curriculum = (key === "curriculum" ? value : next.curriculum) as Curriculum;
      const gradeLabel = next.gradeLabel;
      const offered = subjectsForProgramme(curriculum, gradeLabel)
        .filter((s) => s.available)
        .map((s) => s.id);
      next.subjects = next.subjects.filter((s) => offered.includes(s));
      if (!next.subjects.length) next.subjects = ["math"];
    }
    updateChild(selected.id, next);
    refreshChildren();
    setSaved(false);
    if (key === "ageMode" || key === "age" || key === "gradeLabel") {
      const mode = next.ageMode === "teen" ? "teen" : "explorer";
      const dark = Boolean(next.darkMode ?? next.teenDark);
      if (key === "ageMode" || key === "age" || key === "gradeLabel") {
        pickDeviceLook(mode, dark);
        applyAgeChrome(mode, dark);
      }
    }
    if (key === "darkMode") {
      const mode = next.ageMode === "teen" ? "teen" : "explorer";
      const dark = Boolean(value);
      pickDeviceLook(mode, dark);
      applyAgeChrome(mode, dark);
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

  async function onPickAvatar(files: FileList | null) {
    if (!selected || !files?.[0]) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    const url = await readFileAsDataUrl(file);
    patchSelected({ avatarUrl: url });
  }

  function savePin(asUpdate: boolean) {
    if (!/^\d{4}$/.test(newPin)) {
      setPinMsg(tr("parent.pinUse4"));
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg(tr("parent.pinMismatch"));
      return;
    }
    setParentPin(newPin);
    setPinSet(true);
    setChangingPin(false);
    setNewPin("");
    setConfirmPin("");
    setPinMsg(asUpdate ? tr("parent.pinUpdated") : tr("parent.pinSaved"));
  }

  const summary = selected ? daySummaryFor(selected, lang) : "";
  const preview = selected ? dayPreviewFor(selected, lang) : null;
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

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {children.map((child, index) => {
                  const name = child.childNickname || tr("parent.yourChild");
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => openChild(child.id)}
                      className={`wx-child-card wx-enter flex flex-col items-center gap-1.5 rounded-[1.35rem] border border-stroke/80 px-2.5 pb-3 pt-3.5 text-center ${
                        index === 0 ? "" : index === 1 ? "wx-enter-delay-1" : "wx-enter-delay-2"
                      }`}
                    >
                      <span className="wx-child-avatar-ring inline-flex rounded-full p-0.5">
                        <ChildAvatar src={child.avatarUrl} name={name} size={52} />
                      </span>
                      <p className="font-display text-[0.95rem] font-semibold leading-tight text-[var(--world-ink)] line-clamp-1">
                        {name}
                      </p>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--world-accent)]">
                        {tr("parent.cardAge")} {child.age || "·"}
                      </p>
                      <p className="text-[0.7rem] leading-snug text-[var(--world-ink-soft)] line-clamp-1">
                        {gradeName(child.gradeLabel, child.curriculum, lang)}
                      </p>
                      <p className="text-[0.65rem] leading-snug text-[var(--world-ink-soft)]/80 line-clamp-1">
                        {curriculumLabel(asCurriculum(child.curriculum), lang)}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={onAddChild}
                  className="wx-child-card wx-child-card-add flex min-h-[9.5rem] flex-col items-center justify-center gap-1.5 rounded-[1.35rem] border border-dashed border-stroke/90 px-2.5 py-3 text-[var(--world-ink-soft)]"
                  aria-label={tr("parent.addChild")}
                >
                  <span
                    className="flex size-11 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] text-2xl font-light leading-none text-[var(--world-accent)]"
                    aria-hidden
                  >
                    +
                  </span>
                  <span className="text-sm font-bold">{tr("parent.addChild")}</span>
                </button>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="flex items-start gap-3">
                <span className="wx-child-avatar-ring mt-1 shrink-0 rounded-full p-0.5">
                  <ChildAvatar
                    src={selected.avatarUrl}
                    name={selected.childNickname || tr("parent.yourChild")}
                    size={48}
                  />
                </span>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-sm font-bold text-[var(--world-accent)]"
                  >
                    {tr("parent.backToDashboard")}
                  </button>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-[var(--world-ink)] line-clamp-1">
                    {selected.childNickname || tr("parent.yourChild")}
                  </h1>
                </div>
              </div>

              <div className="wx-preview space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-10 shrink-0">
                    <Image
                      src="/art/parent-phone.jpg"
                      alt=""
                      fill
                      className="object-contain"
                      sizes="40px"
                    />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-[var(--world-ink)]">
                    {tr("parent.summaryLead")}
                  </h2>
                </div>

                {preview ? (
                  <div className="grid gap-2.5">
                    <div className="wx-preview-tile wx-preview-school">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--school)]">
                        {tr("parent.previewSchool")}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--world-ink-soft)]">
                        {tr("parent.previewFocus")}
                      </p>
                      {preview.focusTitles.length ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {preview.focusTitles.map((title) => (
                            <li key={title} className="wx-preview-chip wx-preview-chip-school">
                              {title}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-[var(--world-ink)]">
                        {preview.sessionsDone === 0
                          ? tr("parent.previewNoPractice")
                          : preview.sessionsDone === 1
                            ? tr("parent.previewPracticeOne", {
                                questions: preview.questionsAnswered,
                              })
                            : tr("parent.previewPractice", {
                                sessions: preview.sessionsDone,
                                questions: preview.questionsAnswered,
                              })}
                      </p>
                    </div>

                    <div className="wx-preview-tile wx-preview-wonder">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--extra)]">
                        {tr("parent.previewWonder")}
                      </p>
                      {preview.wonderTopic ? (
                        <>
                          <p className="mt-1 text-xs font-semibold text-[var(--world-ink-soft)]">
                            {tr("parent.previewExplored")}
                          </p>
                          <p className="mt-1 font-display text-base font-semibold leading-snug text-[var(--world-ink)]">
                            {preview.wonderTopic}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1.5 text-sm font-semibold text-[var(--world-ink)]">
                          {tr("parent.previewNoWonder")}
                        </p>
                      )}
                    </div>

                    <div className="wx-preview-tile">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--world-accent)]">
                        {tr("parent.previewNotes")}
                      </p>
                      <p className="mt-1.5 text-sm leading-snug text-[var(--world-ink)]">
                        {preview.notes || tr("parent.previewNoNotes")}
                      </p>
                    </div>

                    {(preview.calmMode || preview.safetyRedirects > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {preview.calmMode ? (
                          <span className="rounded-full border border-stroke bg-[var(--world-surface)] px-3 py-1 text-xs font-bold text-[var(--world-ink-soft)]">
                            {tr("parent.previewCalm")}
                          </span>
                        ) : null}
                        {preview.safetyRedirects > 0 ? (
                          <span className="rounded-full border border-stroke bg-[var(--world-surface)] px-3 py-1 text-xs font-bold text-[var(--world-ink-soft)]">
                            {preview.safetyRedirects === 1
                              ? tr("parent.previewSafetyOne")
                              : tr("parent.previewSafety", { n: preview.safetyRedirects })}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="wx-surface space-y-4 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-[var(--world-ink)]">
                    {!editing && childIsFilled(selected)
                      ? tr("parent.profileTitle")
                      : tr("parent.settingsTitle")}
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
                    <div className="mb-3 flex items-center gap-3">
                      <span className="wx-child-avatar-ring rounded-full p-0.5">
                        <ChildAvatar
                          src={selected.avatarUrl}
                          name={selected.childNickname || tr("parent.yourChild")}
                          size={56}
                        />
                      </span>
                      <p className="font-display text-base font-semibold">
                        {selected.childNickname}
                      </p>
                    </div>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.glanceName")}: </span>
                      {selected.childNickname}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.age")}: </span>
                      {selected.age}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.glanceLevel")}: </span>
                      {(selected.ageMode ?? "explorer") === "teen"
                        ? tr("parent.ageModeTeen")
                        : tr("parent.ageModeExplorer")}
                    </p>
                    <p>
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.theme")}: </span>
                      {selected.darkMode || selected.teenDark
                        ? tr("parent.themeDark")
                        : tr("parent.themeLight")}
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
                      <span className="font-bold text-[var(--world-ink-soft)]">{tr("parent.glanceUnit")}: </span>
                      {photos.length
                        ? tr("parent.unitPhotoCount", { n: photos.length })
                        : tr("parent.unitNone")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-ink-soft">{tr("parent.avatar")}</p>
                      <p className="text-xs text-ink-soft">{tr("parent.avatarHelp")}</p>
                      <div className="flex items-center gap-3">
                        <span className="wx-child-avatar-ring rounded-full p-0.5">
                          <ChildAvatar
                            src={selected.avatarUrl}
                            name={selected.childNickname || tr("parent.yourChild")}
                            size={64}
                          />
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={avatarRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            onChange={(e) => {
                              void onPickAvatar(e.target.files);
                              e.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => avatarRef.current?.click()}
                            className="rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-white"
                          >
                            {tr("parent.avatarUpload")}
                          </button>
                          {selected.avatarUrl ? (
                            <button
                              type="button"
                              onClick={() => patchSelected({ avatarUrl: undefined })}
                              className="rounded-full border border-stroke px-3 py-1.5 text-sm font-bold text-ink-soft"
                            >
                              {tr("parent.avatarRemove")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAvatarPickerOpen((o) => !o)}
                          className="flex min-w-0 flex-1 items-center justify-between rounded-[var(--radius-m)] border border-stroke bg-[var(--world-surface)] px-3 py-2 text-start text-sm font-bold text-[var(--world-ink)]"
                          aria-expanded={avatarPickerOpen}
                        >
                          <span>{tr("parent.avatarPick")}</span>
                          <span className="text-xs font-semibold text-ink-soft" aria-hidden>
                            {avatarPickerOpen ? "−" : "+"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={finishEditing}
                          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
                        >
                          {tr("parent.save")}
                        </button>
                      </div>
                      {avatarPickerOpen ? (
                        <div
                          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          role="list"
                          aria-label={tr("parent.avatarPick")}
                        >
                          {AVATAR_PRESETS.map((item) => (
                            <button
                              key={item.src}
                              type="button"
                              role="listitem"
                              onClick={() => patchSelected({ avatarUrl: item.src })}
                              className={`shrink-0 snap-start rounded-full p-0.5 ring-2 transition ${
                                selected.avatarUrl === item.src
                                  ? "ring-[var(--world-accent)]"
                                  : "ring-transparent hover:ring-stroke"
                              }`}
                              aria-label={tr(item.label)}
                              aria-pressed={selected.avatarUrl === item.src}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.src}
                                alt=""
                                className="size-14 rounded-full object-cover bg-[var(--world-bg)]"
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

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

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-bold text-[var(--world-ink-soft)]">
                        {tr("parent.theme")}
                      </legend>
                      <p className="text-xs text-ink-soft">{tr("parent.themeHelp")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([false, true] as const).map((dark) => (
                          <button
                            key={dark ? "dark" : "light"}
                            type="button"
                            onClick={() => updateField("darkMode", dark)}
                            className={`wx-tap rounded-[var(--radius-m)] border px-3 py-2 text-sm font-bold ${
                              Boolean(selected.darkMode ?? selected.teenDark) === dark
                                ? "border-[var(--world-accent)] bg-[var(--world-accent)] text-white"
                                : "border-stroke bg-[var(--world-bg)] text-[var(--world-ink)]"
                            }`}
                          >
                            {dark ? tr("parent.themeDark") : tr("parent.themeLight")}
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
                        onChange={(e) => updateField("age", e.target.value.replace(/\D/g, "").slice(0, 2))}
                        placeholder={tr("parent.agePlaceholder")}
                        className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                      />
                      <p className="text-xs text-ink-soft">{tr("parent.ageYearHint")}</p>
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
                      <p className="text-xs text-ink-soft">{tr("parent.gradeAgeHint")}</p>
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
                      onClick={finishEditing}
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
            {pinSet && !changingPin ? (
              <>
                <p className="text-sm text-ink-soft">{tr("parent.pinIsSet")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPin(true);
                    setNewPin("");
                    setConfirmPin("");
                    setPinMsg("");
                  }}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                >
                  {tr("parent.pinChange")}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  {pinSet ? tr("parent.pinChangeIntro") : tr("parent.pinOptional")}
                </p>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-ink-soft">
                    {pinSet ? tr("parent.pinNew") : tr("parent.pinTitle")}
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 tracking-[0.4em] outline-none"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-ink-soft">{tr("parent.pinConfirm")}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 tracking-[0.4em] outline-none"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => savePin(pinSet)}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                  >
                    {pinSet ? tr("parent.pinChange") : tr("parent.pinSet")}
                  </button>
                  {pinSet ? (
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPin(false);
                        setNewPin("");
                        setConfirmPin("");
                        setPinMsg("");
                      }}
                      className="rounded-full border border-stroke px-4 py-2 text-sm font-bold text-ink-soft"
                    >
                      {tr("parent.pinCancelChange")}
                    </button>
                  ) : null}
                </div>
              </>
            )}
            {pinMsg ? <p className="text-sm font-semibold text-brand">{pinMsg}</p> : null}
          </div>

          <div className="wx-surface mb-2 space-y-3 p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 marker:content-none [&::-webkit-details-marker]:hidden">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <Image
                    src="/art/safety-trust.jpg"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold text-[var(--world-ink)]">
                    {tr("parent.safetyTitle")}
                  </p>
                </div>
                <span
                  className="text-xl text-[var(--world-ink-soft)] transition group-open:rotate-180"
                  aria-hidden
                >
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--world-ink-soft)]">
                {tr("parent.safetyBody")}
              </p>
            </details>
            <button
              type="button"
              onClick={() => setShowLatestSummary((v) => !v)}
              className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
            >
              {tr("parent.safetyLatest")}
            </button>
            {showLatestSummary ? (
              <div className="rounded-2xl border border-stroke bg-[var(--world-bg)]/60 p-3 text-sm leading-relaxed text-[var(--world-ink)]">
                {selected ? (
                  summary.trim() ? summary : tr("parent.safetyLatestEmpty")
                ) : (
                  tr("parent.safetyLatestEmpty")
                )}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-stroke pt-4">
            <nav
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
              aria-label={tr("legal.nav")}
            >
              <Link
                href="/website"
                className="font-bold text-[var(--world-accent)] underline-offset-2 hover:underline"
              >
                {tr("parent.website")}
              </Link>
              <span className="text-[var(--world-ink-soft)]" aria-hidden>
                ·
              </span>
              <Link
                href="/terms"
                className="font-bold text-[var(--world-accent)] underline-offset-2 hover:underline"
              >
                {tr("parent.terms")}
              </Link>
              <span className="text-[var(--world-ink-soft)]" aria-hidden>
                ·
              </span>
              <Link
                href="/privacy"
                className="font-bold text-[var(--world-accent)] underline-offset-2 hover:underline"
              >
                {tr("parent.privacy")}
              </Link>
            </nav>
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
