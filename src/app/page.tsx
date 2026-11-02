"use client";

import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useT } from "@/lib/use-client-state";

export default function HomePage() {
  const tr = useT();
  return (
    <AppShell>
      <section className="flex flex-1 flex-col justify-center gap-6 py-4">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Wondrix
          </h1>
          <p className="text-base font-semibold text-brand sm:text-lg">
            {tr("home.tagline")}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-stroke bg-card/40">
          <div className="relative aspect-[16/10] w-full">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/school"
            className="group relative min-h-[200px] overflow-hidden rounded-3xl text-white transition hover:-translate-y-0.5"
          >
            <Image
              src="/art/door-school.jpg"
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-school/95 via-school/55 to-school/20" />
            <div className="relative flex h-full flex-col justify-end px-6 py-7">
              <p className="text-sm font-bold uppercase tracking-wide opacity-80">{tr("home.door1")}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">{tr("home.school")}</h2>
              <p className="mt-3 text-base text-white/90">
                {tr("home.schoolBlurb")}
              </p>
            </div>
          </Link>

          <Link
            href="/extra"
            className="group relative min-h-[200px] overflow-hidden rounded-3xl text-white transition hover:-translate-y-0.5"
          >
            <Image
              src="/art/door-extra.jpg"
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-extra/95 via-extra/55 to-extra/15" />
            <div className="relative flex h-full flex-col justify-end px-6 py-7">
              <p className="text-sm font-bold uppercase tracking-wide opacity-80">{tr("home.door2")}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">{tr("home.extra")}</h2>
              <p className="mt-3 text-base text-white/90">
                {tr("home.extraBlurb")}
              </p>
            </div>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
