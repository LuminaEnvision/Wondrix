"use client";

import Image from "next/image";
import { useState } from "react";
import { applyAgeChrome } from "@/components/AgeSkin";
import { pickDeviceLook } from "@/lib/age-preference";
import type { AgeMode } from "@/lib/types";
import { useT } from "@/lib/use-client-state";

const AGE_CARDS: {
  mode: AgeMode;
  art: string;
  titleKey: "parent.ageModeLittle" | "parent.ageModeExplorer" | "parent.ageModeTeen";
  blurbKey: "agePick.littleBlurb" | "agePick.explorerBlurb" | "agePick.teenBlurb";
  cardClass: string;
}[] = [
  {
    mode: "little",
    art: "/art/bg-little.jpg",
    titleKey: "parent.ageModeLittle",
    blurbKey: "agePick.littleBlurb",
    cardClass: "wx-age-pick-little",
  },
  {
    mode: "explorer",
    art: "/art/bg-meadow.jpg",
    titleKey: "parent.ageModeExplorer",
    blurbKey: "agePick.explorerBlurb",
    cardClass: "wx-age-pick-explorer",
  },
  {
    mode: "teen",
    art: "/art/bg-studio.jpg",
    titleKey: "parent.ageModeTeen",
    blurbKey: "agePick.teenBlurb",
    cardClass: "wx-age-pick-teen",
  },
];

export function AgePickModal({
  onPicked,
}: {
  onPicked: (mode: AgeMode, darkMode: boolean) => void;
}) {
  const tr = useT();
  const [step, setStep] = useState<"age" | "theme">("age");
  const [pendingMode, setPendingMode] = useState<AgeMode>("explorer");

  function chooseAge(mode: AgeMode) {
    setPendingMode(mode);
    setStep("theme");
  }

  function chooseTheme(darkMode: boolean) {
    pickDeviceLook(pendingMode, darkMode);
    applyAgeChrome(pendingMode, darkMode);
    onPicked(pendingMode, darkMode);
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center p-4 pb-[calc(var(--nav-h)+0.75rem)] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-pick-title"
    >
      <div className="wx-age-pick-panel wx-enter w-full max-w-md rounded-[2rem] border border-white/50 p-5 shadow-[var(--shadow-stage)] backdrop-blur-md">
        <div className="relative mx-auto mb-3 h-16 w-16">
          <Image
            src="/art/mascot-icon.jpg"
            alt=""
            fill
            className="rounded-full object-cover"
            sizes="64px"
            priority
          />
        </div>

        {step === "age" ? (
          <>
            <h2
              id="age-pick-title"
              className="text-center font-display text-2xl font-semibold text-[var(--world-ink)]"
            >
              {tr("agePick.title")}
            </h2>
            <p className="mt-1 text-center text-sm text-[var(--world-ink-soft)]">{tr("agePick.body")}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {AGE_CARDS.map((card) => (
                <button
                  key={card.mode}
                  type="button"
                  onClick={() => chooseAge(card.mode)}
                  className={`wx-age-pick-card ${card.cardClass} group flex flex-col items-center gap-2 rounded-[1.75rem] border border-stroke/60 p-4 text-center transition active:scale-[0.97]`}
                >
                  <span className="relative h-20 w-20 overflow-hidden rounded-[1.25rem]">
                    <Image
                      src={card.art}
                      alt=""
                      fill
                      className={`object-cover transition duration-500 group-active:scale-105 ${
                        card.mode === "little" ? "object-[70%_45%]" : ""
                      }`}
                      sizes="80px"
                    />
                  </span>
                  <span className="font-display text-lg font-semibold text-[var(--world-ink)]">
                    {tr(card.titleKey)}
                  </span>
                  <span className="text-xs leading-snug text-[var(--world-ink-soft)]">
                    {tr(card.blurbKey)}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2
              id="age-pick-title"
              className="text-center font-display text-2xl font-semibold text-[var(--world-ink)]"
            >
              {tr("agePick.themeTitle")}
            </h2>
            <p className="mt-1 text-center text-sm text-[var(--world-ink-soft)]">
              {tr("agePick.themeBody")}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseTheme(false)}
                className="wx-age-pick-card wx-age-pick-light group flex flex-col items-center gap-2 rounded-[1.75rem] border border-stroke/60 p-4 text-center transition active:scale-[0.97]"
              >
                <span
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[1.25rem] bg-gradient-to-br from-[#e8f4f2] to-[#fffaf4] ring-1 ring-[rgba(20,53,58,0.12)]"
                  aria-hidden
                >
                  <span className="size-8 rounded-full bg-[#f0c36a] shadow-[0_0_0_4px_rgba(240,195,106,0.25)]" />
                  <span className="h-2 w-10 rounded-full bg-[#0f6b63]/35" />
                </span>
                <span className="font-display text-lg font-semibold text-[var(--world-ink)]">
                  {tr("parent.themeLight")}
                </span>
                <span className="text-xs leading-snug text-[var(--world-ink-soft)]">
                  {tr("agePick.lightBlurb")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseTheme(true)}
                className="wx-age-pick-card wx-age-pick-dark group flex flex-col items-center gap-2 rounded-[1.75rem] border border-stroke/60 p-4 text-center transition active:scale-[0.97]"
              >
                <span
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[1.25rem] bg-gradient-to-br from-[#0c1218] to-[#1a2430] ring-1 ring-white/10"
                  aria-hidden
                >
                  <span className="size-7 rounded-full bg-[#d7e4ea] shadow-[0_0_12px_rgba(61,184,168,0.45)]" />
                  <span className="h-2 w-10 rounded-full bg-[#3db8a8]/55" />
                </span>
                <span className="font-display text-lg font-semibold text-[var(--world-ink)]">
                  {tr("parent.themeDark")}
                </span>
                <span className="text-xs leading-snug text-[var(--world-ink-soft)]">
                  {tr("agePick.darkBlurb")}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep("age")}
              className="mt-4 w-full text-sm font-bold text-[var(--world-accent)]"
            >
              {tr("agePick.backAge")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
