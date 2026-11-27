"use client";

import { usePathname } from "next/navigation";
import { useActionGate } from "@/components/ActionGate";
import { WxGlyph, type WxGlyphName } from "@/components/WxGlyph";
import { isLittle, littleTapFeedback } from "@/lib/age-mode";
import { useAgeMode } from "@/lib/use-age-mode";
import { useT } from "@/lib/use-client-state";

const CHILD_TABS: {
  href: string;
  key: "nav.school" | "nav.wonder";
  glyph: WxGlyphName;
  match: (p: string) => boolean;
}[] = [
  {
    href: "/school",
    key: "nav.school",
    glyph: "school",
    match: (p) => p.startsWith("/school"),
  },
  {
    href: "/extra",
    key: "nav.wonder",
    glyph: "wonder",
    match: (p) => p.startsWith("/extra"),
  },
];

const ALL_TABS: {
  href: string;
  key: "nav.school" | "nav.wonder" | "nav.me";
  glyph: WxGlyphName;
  match: (p: string) => boolean;
}[] = [
  ...CHILD_TABS,
  {
    href: "/parent",
    key: "nav.me",
    glyph: "parent",
    match: (p) => p.startsWith("/parent"),
  },
];

export function BottomNav() {
  const pathname = usePathname() || "/";
  const tr = useT();
  const ageMode = useAgeMode();
  const little = isLittle(ageMode);
  const { requestNavigate } = useActionGate();
  const tabs = little ? CHILD_TABS : ALL_TABS;

  return (
    <nav
      aria-label={tr("nav.label")}
      className="wx-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className={`flex items-stretch justify-around gap-1 px-2 pt-1 ${little ? "gap-4 px-4" : ""}`}>
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (little) littleTapFeedback();
                  if (tab.href === "/parent") {
                    window.dispatchEvent(new Event("wondrix-relock-parent"));
                  }
                  requestNavigate(tab.href);
                }}
                className={`wx-nav-tab wx-tap flex w-full flex-col items-center justify-center gap-0.5 text-center ${
                  little ? "min-h-16 px-3 py-2" : "px-2 py-1.5"
                } ${active ? "wx-nav-tab-active" : ""}`}
                aria-current={active ? "page" : undefined}
                aria-label={tr(tab.key)}
              >
                <span
                  className={`inline-flex transition duration-200 ${
                    active ? "scale-110 drop-shadow-sm" : "opacity-80 scale-95"
                  }`}
                >
                  <WxGlyph name={tab.glyph} size={little ? (active ? 40 : 36) : active ? 30 : 26} />
                </span>
                {little ? null : (
                  <span className="text-[11px] font-bold leading-tight sm:text-xs">{tr(tab.key)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
