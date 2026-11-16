"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageIcon } from "@/components/LanguageIcon";
import { useT } from "@/lib/use-client-state";

/** Public marketing landing — not the in-app child hero. */
export default function WebsitePage() {
  const tr = useT();

  return (
    <div className="min-h-dvh bg-[#f7f3ea] text-[#1d2a28]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Image
            src="/art/mascot-icon.jpg"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-display text-xl font-semibold tracking-tight">{tr("website.title")}</span>
        </div>
        <LanguageIcon />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pb-16 pt-6">
        <section className="space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {tr("website.tagline")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[#4a5c57] sm:text-lg">
            {tr("website.body")}
          </p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#276856] px-6 text-base font-bold text-white"
          >
            {tr("website.tryNow")}
          </Link>
        </section>

        <section className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-[#d9e0d8]">
          <Image
            src="/art/mascot-path-hero.jpg"
            alt=""
            fill
            className="object-cover object-[center_35%]"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </section>

        <section className="space-y-4 rounded-3xl border border-[#d9e0d8] bg-white/70 p-5">
          <p className="text-sm font-bold text-[#276856]">{tr("website.powered")}</p>
          <p className="text-sm text-[#4a5c57]">{tr("website.organizer")}</p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Image
              src="/partners/dubai-create.svg"
              alt={tr("website.powered")}
              width={160}
              height={48}
            />
            <Image
              src="/partners/dubai-chamber.svg"
              alt={tr("website.organizer")}
              width={160}
              height={48}
            />
          </div>
        </section>

        <p className="text-center text-sm">
          <Link href="/" className="font-bold text-[#276856] underline-offset-2 hover:underline">
            {tr("website.backApp")}
          </Link>
        </p>
      </main>
    </div>
  );
}
