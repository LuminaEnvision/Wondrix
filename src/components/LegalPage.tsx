"use client";

import Image from "next/image";
import Link from "next/link";
import { HeaderTools } from "@/components/HeaderTools";
import type { LegalDoc } from "@/lib/legal-copy";
import { useT } from "@/lib/use-client-state";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const tr = useT();

  return (
    <div className="min-h-dvh bg-[#f7f3ea] text-[#1d2a28]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/website" className="flex min-w-0 items-center gap-2">
          <Image
            src="/art/mascot-icon.jpg"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-display truncate text-xl font-semibold tracking-tight">
            {tr("website.title")}
          </span>
        </Link>
        <HeaderTools />
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-2">
        <p className="mb-4 text-sm">
          <Link
            href="/parent"
            className="font-bold text-[#276856] underline-offset-2 hover:underline"
          >
            {tr("legal.backParent")}
          </Link>
          <span className="mx-2 text-[#4a5c57]" aria-hidden>
            ·
          </span>
          <Link
            href="/website"
            className="font-bold text-[#276856] underline-offset-2 hover:underline"
          >
            {tr("parent.website")}
          </Link>
        </p>

        <article className="space-y-8 rounded-3xl border border-[#d9e0d8] bg-white/80 p-5 sm:p-8">
          <header className="space-y-2 border-b border-[#d9e0d8] pb-5">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {doc.title}
            </h1>
            <p className="text-sm font-semibold text-[#4a5c57]">{doc.updated}</p>
            <p className="text-base leading-relaxed text-[#4a5c57]">{doc.intro}</p>
          </header>

          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-[#1d2a28]">
                {section.heading}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-base leading-relaxed text-[#4a5c57]">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>

        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
          aria-label={tr("legal.nav")}
        >
          <Link href="/terms" className="font-bold text-[#276856] underline-offset-2 hover:underline">
            {tr("parent.terms")}
          </Link>
          <span className="text-[#4a5c57]" aria-hidden>
            ·
          </span>
          <Link
            href="/privacy"
            className="font-bold text-[#276856] underline-offset-2 hover:underline"
          >
            {tr("parent.privacy")}
          </Link>
          <span className="text-[#4a5c57]" aria-hidden>
            ·
          </span>
          <Link href="/" className="font-bold text-[#276856] underline-offset-2 hover:underline">
            {tr("website.backApp")}
          </Link>
        </nav>
      </main>
    </div>
  );
}
