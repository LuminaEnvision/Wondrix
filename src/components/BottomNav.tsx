"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/use-client-state";

const TABS = [
  { href: "/school", key: "nav.school" as const, icon: SchoolIcon, match: (p: string) => p.startsWith("/school") },
  { href: "/extra", key: "nav.wonder" as const, icon: WonderIcon, match: (p: string) => p.startsWith("/extra") },
  { href: "/parent", key: "nav.me" as const, icon: MeIcon, match: (p: string) => p.startsWith("/parent") },
];

export function BottomNav() {
  const pathname = usePathname() || "/";
  const tr = useT();

  return (
    <nav
      aria-label={tr("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stroke bg-world-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 pt-1 sm:max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`wx-tap flex w-full flex-col items-center justify-center gap-0.5 rounded-[var(--radius-m)] px-2 py-1.5 text-center transition-colors ${
                  active ? "text-[var(--world-accent)]" : "text-ink-soft"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span className="text-[11px] font-bold leading-tight sm:text-xs">{tr(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SchoolIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden className={active ? "opacity-100" : "opacity-80"}>
      <rect x="4" y="7" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12h12M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WonderIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden className={active ? "opacity-100" : "opacity-80"}>
      <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M14 8v3M14 17v3M8 14h3M17 14h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden className={active ? "opacity-100" : "opacity-80"}>
      <rect x="7" y="11" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 11V9a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
