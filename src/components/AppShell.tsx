"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { LanguageIcon } from "@/components/LanguageIcon";
import type { WorldId } from "@/lib/types";
import { useT } from "@/lib/use-client-state";

function worldFromPath(pathname: string | null): WorldId {
  if (!pathname) return "home";
  if (pathname.startsWith("/school")) return "school";
  if (pathname.startsWith("/extra")) return "wonder";
  if (pathname.startsWith("/parent")) return "parent";
  return "home";
}

export function AppShell({
  children,
  backHref,
  world,
  hideNav = false,
  hideHeader = false,
  layout = "page",
  dense = false,
}: {
  children: React.ReactNode;
  backHref?: string;
  /** Override auto world from the path. */
  world?: WorldId;
  hideNav?: boolean;
  /** Hide the default brand/back header (page supplies its own). */
  hideHeader?: boolean;
  /**
   * page: main scrolls (default).
   * fill: main is a flex column with no page scroll; children own the scroll.
   */
  layout?: "page" | "fill";
  /** Tighter header (Teen / Parent). */
  dense?: boolean;
}) {
  const tr = useT();
  const pathname = usePathname();
  const worldId = world ?? worldFromPath(pathname);
  const showBrandHome = !backHref && worldId === "home";
  const fill = layout === "fill";

  return (
    <div className="wx-shell" data-world={worldId}>
      <div className="wx-device wx-enter">
        <div
          className={`wx-shell-inner relative flex min-h-0 flex-1 flex-col overflow-hidden ${
            hideHeader ? "px-0 pt-0" : "px-4 pt-4"
          }`}
        >
          {hideHeader ? (
            <div className="pointer-events-auto absolute end-3 top-3 z-30">
              <LanguageIcon />
            </div>
          ) : null}
          {hideHeader ? null : (
            <header
              className={`mb-4 flex shrink-0 items-center gap-3 ${dense ? "min-h-11" : "min-h-14"}`}
            >
              {backHref ? (
                <Link
                  href={backHref}
                  aria-label={tr("common.back")}
                  className="wx-tap inline-flex items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] text-[var(--world-ink)] shadow-[var(--shadow-card)]"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="rtl:-scale-x-100">
                    <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <Link href="/" className="flex min-w-0 items-center gap-2">
                  <Image
                    src="/art/mascot-icon.jpg"
                    alt=""
                    width={dense ? 32 : 40}
                    height={dense ? 32 : 40}
                    className="rounded-full shadow-[var(--shadow-card)]"
                  />
                  {showBrandHome ? (
                    <span className="font-display truncate text-2xl font-semibold tracking-tight text-[var(--world-accent)]">
                      Wondrix
                    </span>
                  ) : (
                    <span className="font-display truncate text-xl font-semibold tracking-tight text-[var(--world-ink)]">
                      Wondrix
                    </span>
                  )}
                </Link>
              )}
              <div className="ms-auto flex items-center gap-2">
                <LanguageIcon />
              </div>
            </header>
          )}
          <main
            className={`flex min-h-0 flex-1 flex-col ${
              fill
                ? "overflow-hidden"
                : `overflow-x-hidden overflow-y-auto ${hideNav ? "pb-8" : "wx-bottom-pad"}`
            }`}
          >
            {children}
          </main>
        </div>
        {hideNav ? null : <BottomNav />}
      </div>
    </div>
  );
}
