"use client";

import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { profileAgeMode, loadProfile } from "@/lib/demo-store";
import { useHydrated, useT } from "@/lib/use-client-state";

function DoorCard({
  href,
  title,
  blurb,
  cta,
  art,
  accentVar,
  delayClass,
  explorer,
}: {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  art: string;
  accentVar: "--school" | "--extra";
  delayClass: string;
  explorer: boolean;
}) {
  const accent = `var(${accentVar})`;
  return (
    <Link
      href={href}
      className={`wx-door wx-enter ${delayClass} group flex flex-col border border-stroke bg-[var(--world-surface)] text-[var(--world-ink)] transition active:scale-[0.99] ${
        explorer ? "rounded-[var(--radius-l)]" : "rounded-[var(--radius-m)]"
      }`}
    >
      <div
        className={`relative w-full overflow-hidden ${
          explorer ? "h-24 rounded-t-[var(--radius-l)] sm:h-28" : "h-16 rounded-t-[var(--radius-m)]"
        }`}
        style={{ background: accent }}
      >
        <Image
          src={art}
          alt=""
          fill
          className="object-cover opacity-90 transition duration-500 group-active:scale-105"
          sizes="(max-width: 640px) 100vw, 320px"
          priority
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(160deg, ${accent} 0%, transparent 60%)`,
          }}
          aria-hidden
        />
      </div>
      <div className={`flex flex-col ${explorer ? "gap-2 px-4 py-4" : "gap-1.5 px-3 py-3"}`}>
        <h2
          className={`font-display font-semibold leading-normal tracking-tight ${
            explorer ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
          style={{ color: accent }}
        >
          {title}
        </h2>
        <p
          className={`leading-snug text-[var(--world-ink-soft)] ${
            explorer ? "text-sm sm:text-base" : "text-xs"
          }`}
        >
          {blurb}
        </p>
        <span
          className="mt-1 inline-flex min-h-11 w-fit items-center rounded-full px-4 text-sm font-bold text-white"
          style={{ background: accent }}
        >
          {cta}
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const tr = useT();
  const hydrated = useHydrated();
  const mode = hydrated ? profileAgeMode(loadProfile()) : "explorer";
  const explorer = mode === "explorer";

  return (
    <AppShell world="home">
      <section className="flex flex-1 flex-col gap-3">
        <div
          className={`wx-enter flex items-end gap-3 ${explorer ? "min-h-[6.5rem]" : "min-h-[4.5rem]"}`}
        >
          <div className="wx-surface relative min-w-0 flex-1 px-4 py-3 sm:px-5">
            <span
              className="absolute -end-1.5 bottom-8 hidden size-3 rotate-45 border-e border-t border-stroke bg-[var(--world-surface)] rtl:rotate-[225deg] sm:block"
              aria-hidden
            />
            <p className="font-display text-2xl font-semibold leading-normal text-[var(--world-ink)] sm:text-3xl">
              {explorer ? tr("home.askWhat") : tr("home.askWhatTeen")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--world-accent)] sm:text-base">
              {tr("home.tagline")}
            </p>
          </div>
          <div
            className={`wx-breathe relative shrink-0 ${explorer ? "h-28 w-24" : "h-16 w-14"}`}
          >
            <Image
              src="/art/mascot-hero.png"
              alt=""
              fill
              className="object-contain object-bottom"
              sizes={explorer ? "96px" : "56px"}
              priority
            />
          </div>
        </div>

        {/* Path scene: full-bleed inside the device — Wondrix walking toward School / Curiosity */}
        {explorer ? (
          <div className="wx-enter wx-enter-delay-1 relative -mx-4 min-h-[28dvh] flex-1 overflow-hidden sm:mx-0 sm:rounded-[var(--radius-l)]">
            <Image
              src="/art/mascot-path-hero.jpg"
              alt={tr("home.heroAlt")}
              fill
              className="object-cover object-[center_40%]"
              sizes="(max-width: 640px) 100vw, 672px"
              priority
            />
          </div>
        ) : null}

        <div
          className={
            explorer
              ? "mt-0 flex shrink-0 flex-col gap-3"
              : "mt-2 grid grid-cols-2 gap-3"
          }
        >
          <DoorCard
            href="/school"
            title={tr("home.school")}
            blurb={tr("home.schoolBlurb")}
            cta={tr("home.openSchool")}
            art="/art/door-school.jpg"
            accentVar="--school"
            delayClass="wx-enter-delay-2"
            explorer={explorer}
          />
          <DoorCard
            href="/extra"
            title={tr("home.extra")}
            blurb={tr("home.extraBlurb")}
            cta={tr("home.openWonder")}
            art="/art/door-extra.jpg"
            accentVar="--extra"
            delayClass="wx-enter-delay-3"
            explorer={explorer}
          />
        </div>
      </section>
    </AppShell>
  );
}
