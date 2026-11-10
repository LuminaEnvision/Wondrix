"use client";

import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { profileAgeMode, loadProfile } from "@/lib/demo-store";
import { useHydrated, useT } from "@/lib/use-client-state";

export default function HomePage() {
  const tr = useT();
  const hydrated = useHydrated();
  const mode = hydrated ? profileAgeMode(loadProfile()) : "explorer";
  const explorer = mode === "explorer";

  return (
    <AppShell world="home">
      <section className="flex flex-1 flex-col gap-3">
        <div className={`flex items-end gap-3 ${explorer ? "min-h-[7.5rem]" : "min-h-[4.5rem]"}`}>
          <div className="wx-surface relative min-w-0 flex-1 px-4 py-3 sm:px-5">
            <span
              className="absolute -end-1.5 bottom-8 hidden size-3 rotate-45 border-e border-t border-stroke bg-[var(--world-surface)] rtl:rotate-[225deg] sm:block"
              aria-hidden
            />
            <p className="font-display text-2xl font-semibold leading-snug text-[var(--world-ink)] sm:text-3xl">
              {explorer ? tr("home.askWhat") : tr("home.askWhatTeen")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--world-accent)] sm:text-base">
              {tr("home.tagline")}
            </p>
          </div>
          <div className={`relative shrink-0 ${explorer ? "h-28 w-24" : "h-16 w-14"}`}>
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

        {explorer ? (
          <div className="relative mx-auto w-full max-h-[22dvh] max-w-xl overflow-hidden rounded-[var(--radius-l)] border border-stroke">
            <div className="relative aspect-[16/9] max-h-[22dvh] w-full">
              <Image
                src="/art/mascot-path-hero.jpg"
                alt={tr("home.heroAlt")}
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, 576px"
                priority
              />
            </div>
          </div>
        ) : null}

        <div className={explorer ? "mt-1 flex flex-1 flex-col gap-3" : "mt-2 grid grid-cols-2 gap-3"}>
          <Link
            href="/school"
            className={`group relative overflow-hidden text-white transition active:scale-[0.99] ${
              explorer ? "min-h-[var(--tap-min)] flex-1 rounded-[var(--radius-l)]" : "min-h-28 rounded-[var(--radius-m)]"
            }`}
          >
            <Image
              src="/art/door-school.jpg"
              alt=""
              fill
              className="object-cover transition duration-500 group-active:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-school/95 via-school/55 to-school/15" />
            <div className={`relative flex h-full flex-col justify-end ${explorer ? "px-5 py-5" : "px-3 py-3"}`}>
              <h2 className={`font-display font-semibold ${explorer ? "text-3xl" : "text-xl"}`}>
                {tr("home.school")}
              </h2>
              <p className={`mt-1 text-white/90 ${explorer ? "text-base" : "text-xs"}`}>
                {tr("home.schoolBlurb")}
              </p>
              <span className="mt-3 inline-flex min-h-11 w-fit items-center rounded-full bg-white/95 px-4 text-sm font-bold text-school">
                {tr("home.openSchool")}
              </span>
            </div>
          </Link>

          <Link
            href="/extra"
            className={`group relative overflow-hidden text-white transition active:scale-[0.99] ${
              explorer ? "min-h-[var(--tap-min)] flex-1 rounded-[var(--radius-l)]" : "min-h-28 rounded-[var(--radius-m)]"
            }`}
          >
            <Image
              src="/art/door-extra.jpg"
              alt=""
              fill
              className="object-cover transition duration-500 group-active:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-extra/95 via-extra/55 to-extra/15" />
            <div className={`relative flex h-full flex-col justify-end ${explorer ? "px-5 py-5" : "px-3 py-3"}`}>
              <h2 className={`font-display font-semibold ${explorer ? "text-3xl" : "text-xl"}`}>
                {tr("home.extra")}
              </h2>
              <p className={`mt-1 text-white/90 ${explorer ? "text-base" : "text-xs"}`}>
                {tr("home.extraBlurb")}
              </p>
              <span className="mt-3 inline-flex min-h-11 w-fit items-center rounded-full bg-white/95 px-4 text-sm font-bold text-extra">
                {tr("home.openWonder")}
              </span>
            </div>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
