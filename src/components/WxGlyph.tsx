"use client";

import { useSyncExternalStore } from "react";

function subscribeAge(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-age"] });
  return () => obs.disconnect();
}

function ageMode(): "little" | "explorer" | "teen" {
  if (typeof document === "undefined") return "explorer";
  const raw = document.documentElement.dataset.age;
  if (raw === "little" || raw === "teen" || raw === "explorer") return raw;
  return "explorer";
}

export type WxGlyphName =
  | "school"
  | "wonder"
  | "parent"
  | "skills"
  | "program"
  | "reading"
  | "radar"
  | "math"
  | "science"
  | "sun"
  | "moon"
  | "mic"
  | "send"
  | "voiceOn"
  | "voiceOff";

/**
 * Brand glyphs — filled, colorful plates (not Lucide outlines).
 * Matches Wonder topic art: soft corners, teal / coral / school blue.
 */
const GLYPHS: Record<WxGlyphName, React.ReactNode> = {
  school: (
    <>
      <circle cx="16" cy="16" r="16" fill="#1A6B8A" />
      <path
        d="M6.5 14.5 16 9l9.5 5.5v2.2L16 12.2 6.5 16.7v-2.2Z"
        fill="#F4E6C8"
      />
      <path d="M8.2 16.2v6.2c2.4 1.6 5 2.4 7.8 2.4s5.4-.8 7.8-2.4v-6.2L16 20.2 8.2 16.2Z" fill="#FFF8EE" />
      <rect x="15.1" y="20.5" width="1.8" height="5.2" rx="0.6" fill="#E8913A" />
      <circle cx="24.2" cy="12.2" r="1.6" fill="#E8913A" />
    </>
  ),
  wonder: (
    <>
      <circle cx="16" cy="16" r="16" fill="#B85C38" />
      <ellipse cx="16" cy="17.5" rx="8.2" ry="7.4" fill="#5FCFB0" />
      <ellipse cx="16" cy="16.2" rx="6.4" ry="5.6" fill="#D7F0E8" />
      <circle cx="13.2" cy="15.6" r="1.7" fill="#14353A" />
      <circle cx="18.8" cy="15.6" r="1.7" fill="#14353A" />
      <circle cx="13.7" cy="15.2" r="0.55" fill="#fff" />
      <circle cx="19.3" cy="15.2" r="0.55" fill="#fff" />
      <path d="M15.2 18.4h1.6l-.4 1.4h-.8l-.4-1.4Z" fill="#0F6B63" />
      <path d="M11.5 9.2 13 12.4l-2.8-.4 2.2-2.8Z" fill="#E8913A" />
      <path d="M20.5 9.2 19 12.4l2.8-.4-2.3-2.8Z" fill="#E8913A" />
      <path d="M16 7.2 16.7 9.6 15.3 9.6 16 7.2Z" fill="#F4E6C8" />
    </>
  ),
  parent: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0F6B63" />
      <path
        d="M16 7.5c-4.2 0-7.6 3.2-7.6 7.6 0 5.4 6.2 9.6 7.6 10.4 1.4-.8 7.6-5 7.6-10.4 0-4.4-3.4-7.6-7.6-7.6Z"
        fill="#FFF8EE"
      />
      <rect x="13.2" y="14.2" width="5.6" height="6.2" rx="1.4" fill="#0F6B63" />
      <path
        d="M14.2 14.2v-1.4a1.8 1.8 0 0 1 3.6 0v1.4"
        stroke="#0F6B63"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="17.4" r="1" fill="#E8913A" />
    </>
  ),
  skills: (
    <>
      <circle cx="16" cy="16" r="16" fill="#E8913A" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#FFF8EE" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="5.2" fill="none" stroke="#FFF8EE" strokeWidth="1.6" opacity="0.75" />
      <circle cx="16" cy="16" r="2" fill="#14353A" />
      <path d="M16 7.2v3.2M16 21.6v3.2M7.2 16h3.2M21.6 16h3.2" stroke="#FFF8EE" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  program: (
    <>
      <circle cx="16" cy="16" r="16" fill="#1A6B8A" />
      <rect x="8" y="8" width="16" height="18" rx="2.5" fill="#FFF8EE" />
      <path d="M11 12.5h10M11 16h10M11 19.5h7" stroke="#1A6B8A" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4.2" fill="#E8913A" />
      <path d="M20.4 22h3.2M22 20.4v3.2" stroke="#FFF8EE" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  reading: (
    <>
      <circle cx="16" cy="16" r="16" fill="#6B4C9A" />
      <path d="M7.5 10.5c3.2-1.2 5.8-.4 8.5 1.6v12c-2.8-1.8-5.4-2.5-8.5-1.4v-12.2Z" fill="#F4E6C8" />
      <path d="M24.5 10.5c-3.2-1.2-5.8-.4-8.5 1.6v12c2.8-1.8 5.4-2.5 8.5-1.4v-12.2Z" fill="#FFF8EE" />
      <path d="M16 12.2v12" stroke="#6B4C9A" strokeWidth="1.4" opacity="0.35" />
      <circle cx="23.5" cy="9.2" r="2.2" fill="#E8913A" />
    </>
  ),
  radar: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0A4F4A" />
      <circle cx="16" cy="17" r="9" fill="none" stroke="#5FCFB0" strokeWidth="1.4" opacity="0.45" />
      <circle cx="16" cy="17" r="6" fill="none" stroke="#5FCFB0" strokeWidth="1.5" opacity="0.7" />
      <circle cx="16" cy="17" r="3" fill="none" stroke="#D7F0E8" strokeWidth="1.6" />
      <path d="M16 17 24.5 9.8" stroke="#E8913A" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="17" r="1.6" fill="#FFF8EE" />
      <circle cx="22.8" cy="11.2" r="1.8" fill="#E8913A" />
    </>
  ),
  math: (
    <>
      <circle cx="16" cy="16" r="16" fill="#1A6B8A" />
      <path d="M10 12h12M10 20h12M14 8v16M18 8v16" stroke="#FFF8EE" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3.5" fill="#E8913A" />
      <path d="M22.6 24h2.8M24 22.6v2.8" stroke="#FFF8EE" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  science: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0F6B63" />
      <ellipse cx="16" cy="16" rx="9" ry="3.6" stroke="#D7F0E8" strokeWidth="1.6" fill="none" transform="rotate(-18 16 16)" />
      <ellipse cx="16" cy="16" rx="9" ry="3.6" stroke="#5FCFB0" strokeWidth="1.6" fill="none" transform="rotate(42 16 16)" />
      <ellipse cx="16" cy="16" rx="9" ry="3.6" stroke="#FFF8EE" strokeWidth="1.4" fill="none" transform="rotate(102 16 16)" />
      <circle cx="16" cy="16" r="2.4" fill="#E8913A" />
    </>
  ),
  sun: (
    <>
      <circle cx="16" cy="16" r="16" fill="#E8913A" />
      <circle cx="16" cy="16" r="5.2" fill="#FFF8EE" />
      <g stroke="#FFF8EE" strokeWidth="2" strokeLinecap="round">
        <path d="M16 6.5v2.2M16 23.3v2.2M6.5 16h2.2M23.3 16h2.2M9.2 9.2l1.5 1.5M21.3 21.3l1.5 1.5M21.3 9.2l-1.5 1.5M9.2 21.3l-1.5 1.5" />
      </g>
    </>
  ),
  moon: (
    <>
      <circle cx="16" cy="16" r="16" fill="#2A3F6B" />
      <path
        d="M18.5 8.2A8.2 8.2 0 1 0 23.8 18 6.4 6.4 0 0 1 18.5 8.2Z"
        fill="#F4E6C8"
      />
      <circle cx="11.5" cy="12.5" r="1.1" fill="#E8913A" opacity="0.85" />
      <circle cx="9.2" cy="18.5" r="0.8" fill="#E8913A" opacity="0.7" />
    </>
  ),
  mic: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0F6B63" />
      <rect x="13" y="7.5" width="6" height="11" rx="3" fill="#FFF8EE" />
      <path
        d="M10 16.5a6 6 0 0 0 12 0"
        stroke="#FFF8EE"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M16 22.5v2.2" stroke="#E8913A" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13.2 24.7h5.6" stroke="#E8913A" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  send: (
    <>
      <circle cx="16" cy="16" r="16" fill="#B85C38" />
      <path d="M8.5 16h11.5" stroke="#FFF8EE" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M15.5 10.5 22.5 16l-7 5.5"
        stroke="#FFF8EE"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="8.5" cy="16" r="1.6" fill="#E8913A" />
    </>
  ),
  voiceOn: (
    <>
      <circle cx="16" cy="16" r="16" fill="#0F6B63" />
      <path d="M8 12.5v7h3.5L16 23.5v-15L11.5 12.5H8Z" fill="#FFF8EE" />
      <path d="M19 13a3.2 3.2 0 0 1 0 6" stroke="#5FCFB0" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M21.5 10.5a6 6 0 0 1 0 11" stroke="#E8913A" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  voiceOff: (
    <>
      <circle cx="16" cy="16" r="16" fill="#5A6B6E" />
      <path d="M8 12.5v7h3.5L16 23.5v-15L11.5 12.5H8Z" fill="#E8EEED" />
      <path d="M18.5 13.5 24 19M24 13.5l-5.5 5.5" stroke="#E8913A" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
};

export function WxGlyph({
  name,
  size,
  className = "",
  title,
}: {
  name: WxGlyphName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const age = useSyncExternalStore(subscribeAge, ageMode, () => "explorer");
  const px = size ?? (age === "little" ? 32 : age === "explorer" ? 28 : 24);

  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      className={`wx-glyph shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[name]}
    </svg>
  );
}
