"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useActionGate } from "@/components/ActionGate";
import { AgePickModal } from "@/components/AgePickModal";
import { AppShell } from "@/components/AppShell";
import { hasAgePicked, resolveAgeMode } from "@/lib/age-preference";
import type { AgeMode } from "@/lib/types";
import { useHydrated, useT } from "@/lib/use-client-state";

function DoorCard({
  href,
  title,
  blurb,
  cta,
  art,
  tone,
  delayClass,
  explorer,
}: {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  art: string;
  tone: "school" | "wonder";
  delayClass: string;
  explorer: boolean;
}) {
  const { requestNavigate } = useActionGate();
  return (
    <button
      type="button"
      onClick={() => requestNavigate(href)}
      className={`wx-play-card wx-enter ${delayClass} group flex min-h-0 flex-col overflow-hidden text-start text-[var(--world-ink)] ${
        explorer ? "wx-play-card-explorer" : "wx-play-card-teen"
      } wx-play-card-${tone}`}
    >
      <div className={`relative w-full shrink-0 overflow-hidden ${explorer ? "h-16" : "h-12"}`}>
        <Image
          src={art}
          alt=""
          fill
          className="object-cover transition duration-500 group-active:scale-105"
          sizes="(max-width: 640px) 50vw, 160px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" aria-hidden />
      </div>
      <div className={`flex min-h-0 flex-1 flex-col ${explorer ? "gap-1 px-3 py-2.5" : "gap-0.5 px-2.5 py-2"}`}>
        <h2
          className={`font-display font-semibold leading-tight tracking-tight ${
            explorer ? "text-xl" : "text-base"
          }`}
        >
          {title}
        </h2>
        <p
          className={`line-clamp-2 leading-snug text-[var(--world-ink-soft)] ${
            explorer ? "text-xs" : "text-[0.7rem]"
          }`}
        >
          {blurb}
        </p>
        <span
          className={`wx-play-cta mt-auto inline-flex w-fit items-center font-bold text-white ${
            explorer ? "min-h-9 rounded-2xl px-3 text-xs" : "min-h-8 rounded-full px-2.5 text-[0.7rem]"
          }`}
        >
          {cta}
        </span>
      </div>
    </button>
  );
}

function HomeContent({ mode }: { mode: AgeMode }) {
  const tr = useT();
  const explorer = mode === "explorer";

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-[calc(var(--nav-h)+0.35rem)]">
      <div className="wx-enter flex shrink-0 items-end gap-3">
        <div
          className={`wx-hero-chip relative min-w-0 flex-1 ${
            explorer ? "rounded-[1.85rem] px-4 py-4 sm:px-5 sm:py-5" : "rounded-2xl px-3.5 py-3"
          }`}
        >
          <p
            className={`font-display font-semibold leading-tight text-[var(--world-ink)] ${
              explorer ? "text-2xl sm:text-3xl" : "text-xl"
            }`}
          >
            {explorer ? tr("home.askWhat") : tr("home.askWhatTeen")}
          </p>
          <p
            className={`mt-1.5 font-semibold text-[var(--world-accent)] ${
              explorer ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          >
            {tr("home.tagline")}
          </p>
        </div>
        <div className={`wx-breathe relative shrink-0 ${explorer ? "h-36 w-28" : "h-20 w-[4.25rem]"}`}>
          <Image
            src="/art/mascot-hero.png"
            alt=""
            fill
            className="object-contain object-bottom drop-shadow-md"
            sizes={explorer ? "112px" : "68px"}
            priority
          />
        </div>
      </div>

      <div className={`grid shrink-0 grid-cols-2 ${explorer ? "gap-3" : "gap-2"}`}>
        <DoorCard
          href="/school"
          title={tr("home.school")}
          blurb={tr("home.schoolBlurb")}
          cta={tr("home.openSchool")}
          art="/art/door-school.jpg"
          tone="school"
          delayClass="wx-enter-delay-1"
          explorer={explorer}
        />
        <DoorCard
          href="/extra"
          title={tr("home.extra")}
          blurb={tr("home.extraBlurb")}
          cta={tr("home.openWonder")}
          art="/art/door-extra.jpg"
          tone="wonder"
          delayClass="wx-enter-delay-2"
          explorer={explorer}
        />
      </div>

      <div
        className={`wx-enter wx-enter-delay-3 relative mt-2 min-h-0 flex-1 overflow-hidden ${
          explorer
            ? "-mx-4 sm:mx-0 sm:rounded-[var(--radius-l)]"
            : "rounded-[var(--radius-m)]"
        }`}
      >
        <Image
          src="/art/mascot-path-hero.jpg"
          alt={tr("home.heroAlt")}
          fill
          className="object-cover object-[center_40%]"
          sizes="(max-width: 640px) 100vw, 672px"
          priority
        />
      </div>
    </section>
  );
}

export default function HomePage() {
  const tr = useT();
  const hydrated = useHydrated();
  const [picked, setPicked] = useState(false);
  const [mode, setMode] = useState<AgeMode>("explorer");
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    setPicked(hasAgePicked());
    setMode(resolveAgeMode());
    setBootstrapped(true);
  }, []);

  const ready = hydrated && bootstrapped;
  const displayMode = picked ? mode : "explorer";

  return (
    <AppShell world="home" layout="fill" dense={ready && picked && displayMode === "teen"}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!ready ? (
          <p className="p-4 text-ink-soft">{tr("common.loading")}</p>
        ) : !picked ? (
          <>
            <div className="absolute inset-0 -mx-4 scale-110 sm:mx-0" aria-hidden>
              <Image
                src="/art/mascot-path-hero.jpg"
                alt=""
                fill
                className="object-cover object-[center_30%] blur-2xl"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--world-bg)_45%,transparent)]" />
            </div>
            <AgePickModal
              onPicked={(next) => {
                setMode(next);
                setPicked(true);
              }}
            />
          </>
        ) : (
          <HomeContent mode={displayMode} />
        )}
      </div>
    </AppShell>
  );
}
