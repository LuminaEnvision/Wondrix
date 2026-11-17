"use client";

import { usePathname } from "next/navigation";
import { useActionGate } from "@/components/ActionGate";
import { WxGlyph, type WxGlyphName } from "@/components/WxGlyph";
import { useT } from "@/lib/use-client-state";

const TABS: {
  href: string;
  key: "nav.school" | "nav.wonder" | "nav.me";
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
  const { requestNavigate } = useActionGate();

  return (
    <nav
      aria-label={tr("nav.label")}
      className="wx-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex items-stretch justify-around gap-1 px-2 pt-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  // Kids safety: every Parent tab press asks for the PIN again.
                  if (tab.href === "/parent") {
                    window.dispatchEvent(new Event("wondrix-relock-parent"));
                  }
                  requestNavigate(tab.href);
                }}
                className={`wx-nav-tab wx-tap flex w-full flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-center ${
                  active ? "wx-nav-tab-active" : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`inline-flex transition duration-200 ${
                    active ? "scale-110 drop-shadow-sm" : "opacity-80 scale-95"
                  }`}
                >
                  <WxGlyph name={tab.glyph} size={active ? 30 : 26} />
                </span>
                <span className="text-[11px] font-bold leading-tight sm:text-xs">{tr(tab.key)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
