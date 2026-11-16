"use client";

import Image from "next/image";
import { useActionGate } from "@/components/ActionGate";
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
  const { requestNavigate } = useActionGate();
  const accent = `var(${accentVar})`;
  return (
    <button
      type="button"
      onClick={() => requestNavigate(href)}
      className={`wx-door wx-enter ${delayClass} group flex min-h-0 flex-col overflow-hidden border border-stroke bg-[var(--world-surface)] text-start text-[var(--world-ink)] transition active:scale-[0.99] ${
        explorer ? "rounded-[var(--radius-l)]" : "rounded-[var(--radius-m)]"
      }`}
    >
      <div
        className={`relative w-full shrink-0 overflow-hidden ${
          explorer ? "h-14 rounded-t-[var(--radius-l)]" : "h-11 rounded-t-[var(--radius-m)]"
        }`}
        style={{ background: accent }}
      >
        <Image
          src={art}
          alt=""
          fill
          className="object-cover opacity-90 transition duration-500 group-active:scale-105"
          sizes="(max-width: 640px) 50vw, 160px"
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
      <div className={`flex min-h-0 flex-1 flex-col ${explorer ? "gap-1 px-3 py-2.5" : "gap-0.5 px-2.5 py-2"}`}>
        <h2
          className={`font-display font-semibold leading-tight tracking-tight ${
            explorer ? "text-xl" : "text-base"
          }`}
          style={{ color: accent }}
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
          className={`mt-auto inline-flex w-fit items-center rounded-full font-bold text-white ${
            explorer ? "min-h-9 px-3 text-xs" : "min-h-8 px-2.5 text-[0.7rem]"
          }`}
          style={{ background: accent }}
        >
          {cta}
        </span>
      </div>
    </button>
  );
}

export default function HomePage() {
  const tr = useT();
  const hydrated = useHydrated();
  const mode = hydrated ? profileAgeMode(loadProfile()) : "explorer";
  const explorer = mode === "explorer";

  return (
    <AppShell world="home" layout="fill" dense={!explorer}>
      <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-[calc(var(--nav-h)+0.35rem)]">
        <div className={`wx-enter flex shrink-0 items-end gap-2 ${explorer ? "min-h-0" : ""}`}>
          <div className="wx-surface relative min-w-0 flex-1 px-3 py-2.5 sm:px-4">
            <p
              className={`font-display font-semibold leading-tight text-[var(--world-ink)] ${
                explorer ? "text-xl sm:text-2xl" : "text-lg"
              }`}
            >
              {explorer ? tr("home.askWhat") : tr("home.askWhatTeen")}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--world-accent)] sm:text-sm">
              {tr("home.tagline")}
            </p>
          </div>
          <div className={`wx-breathe relative shrink-0 ${explorer ? "h-16 w-14" : "h-12 w-11"}`}>
            <Image
              src="/art/mascot-hero.png"
              alt=""
              fill
              className="object-contain object-bottom"
              sizes={explorer ? "56px" : "44px"}
              priority
            />
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2">
          <DoorCard
            href="/school"
            title={tr("home.school")}
            blurb={tr("home.schoolBlurb")}
            cta={tr("home.openSchool")}
            art="/art/door-school.jpg"
            accentVar="--school"
            delayClass="wx-enter-delay-1"
            explorer={explorer}
          />
          <DoorCard
            href="/extra"
            title={tr("home.extra")}
            blurb={tr("home.extraBlurb")}
            cta={tr("home.openWonder")}
            art="/art/door-extra.jpg"
            accentVar="--extra"
            delayClass="wx-enter-delay-2"
            explorer={explorer}
          />
        </div>

        <div
          className={`wx-enter wx-enter-delay-3 relative min-h-0 flex-1 overflow-hidden ${
            explorer ? "-mx-4 sm:mx-0 sm:rounded-[var(--radius-l)]" : "rounded-[var(--radius-m)]"
          }`}
        >
          <Image
            src="/art/mascot-path-hero.jpg"
            alt={tr("home.heroAlt")}
            fill
            className="object-cover object-[center_35%]"
            sizes="(max-width: 640px) 100vw, 672px"
            priority
          />
        </div>
      </section>
    </AppShell>
  );
}
