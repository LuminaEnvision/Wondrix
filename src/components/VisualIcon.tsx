/**
 * Hand-drawn picture icons for Extra diagrams (one per ICON_NAMES entry).
 * Flat, friendly shapes in the Wondrix palette, each with a small idle motion
 * (the sun's rays turn, steam rises, rain falls...) so the idea is visible
 * without reading. Motion stops under prefers-reduced-motion (globals.css).
 */
import type { IconName } from "@/lib/visual";

const C = {
  sun: "#F5B83D",
  sunDeep: "#E8962B",
  water: "#4BA3E3",
  waterDeep: "#2F7FC0",
  cloud: "#E9EEF3",
  cloudLine: "#B9C4CF",
  green: "#4CAF7A",
  greenDeep: "#2F8A5B",
  brown: "#A0703C",
  fire: "#F06A3B",
  red: "#E0525B",
  gray: "#8A96A3",
  dark: "#3A4750",
  white: "#FFFFFF",
  pink: "#F29BB8",
  purple: "#8C7AE6",
};

type Motion = "spin" | "rise" | "fall" | "drift" | "flicker" | "sway" | "beat" | "twinkle" | "float" | "pulse" | "bob";

const ICONS: Record<IconName, { motion: Motion; art: React.ReactNode }> = {
  sun: {
    motion: "spin",
    art: (
      <>
        <g className="wx-ico-part" stroke={C.sunDeep} strokeWidth="3" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="24" y1="4" x2="24" y2="10" transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
        <circle cx="24" cy="24" r="10" fill={C.sun} />
        <circle cx="20.5" cy="22.5" r="1.3" fill={C.dark} />
        <circle cx="27.5" cy="22.5" r="1.3" fill={C.dark} />
        <path d="M20.5 27 q3.5 3 7 0" stroke={C.dark} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  moon: {
    motion: "float",
    art: <path d="M30 6 a18 18 0 1 0 12 30 a14 14 0 1 1 -12 -30 z" fill="#F3E3A8" stroke="#D9C27A" strokeWidth="1.5" />,
  },
  star: {
    motion: "twinkle",
    art: (
      <path
        d="M24 5 l5.5 11.5 12.5 1.6 -9.2 8.7 2.4 12.4 -11.2 -6.1 -11.2 6.1 2.4 -12.4 -9.2 -8.7 12.5 -1.6 z"
        fill={C.sun}
        stroke={C.sunDeep}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  earth: {
    motion: "float",
    art: (
      <>
        <circle cx="24" cy="24" r="18" fill={C.water} />
        <path d="M12 16 q6 -4 10 1 q-2 5 3 7 q-3 6 -9 4 q-1 -6 -6 -7 z" fill={C.green} />
        <path d="M28 10 q7 2 9 9 q-5 0 -6 4 q-4 -3 -3 -7 z M28 32 q5 -2 8 2 q-3 4 -8 4 z" fill={C.green} />
      </>
    ),
  },
  planet: {
    motion: "float",
    art: (
      <>
        <circle cx="24" cy="24" r="12" fill="#E8A86B" />
        <ellipse cx="24" cy="24" rx="21" ry="6" fill="none" stroke={C.sunDeep} strokeWidth="3" transform="rotate(-18 24 24)" />
        <path d="M14 21 q10 -3 20 0" stroke="#C98A4E" strokeWidth="2" fill="none" />
      </>
    ),
  },
  rocket: {
    motion: "rise",
    art: (
      <>
        <path d="M24 4 q9 8 8 24 h-16 q-1 -16 8 -24 z" fill={C.white} stroke={C.gray} strokeWidth="1.5" />
        <circle cx="24" cy="17" r="3.5" fill={C.water} />
        <path d="M16 22 l-5 9 h5 z M32 22 l5 9 h-5 z" fill={C.red} />
        <path className="wx-ico-part wx-flicker" d="M19 29 q5 14 10 0 z" fill={C.fire} />
      </>
    ),
  },
  cloud: {
    motion: "drift",
    art: (
      <path
        d="M14 36 a8 8 0 0 1 0 -16 a10 10 0 0 1 19 -3 a8 8 0 0 1 3 19 z"
        fill={C.cloud}
        stroke={C.cloudLine}
        strokeWidth="1.5"
      />
    ),
  },
  rain: {
    motion: "bob",
    art: (
      <>
        <path d="M14 26 a7 7 0 0 1 0 -14 a9 9 0 0 1 17 -2 a7 7 0 0 1 3 16 z" fill={C.cloudLine} />
        <g className="wx-ico-part wx-fall" fill={C.water}>
          <path d="M15 31 q-2 4 0 5 q2 -1 0 -5 z" />
          <path d="M24 33 q-2 4 0 5 q2 -1 0 -5 z" />
          <path d="M33 31 q-2 4 0 5 q2 -1 0 -5 z" />
          <path d="M19.5 39 q-2 4 0 5 q2 -1 0 -5 z" />
          <path d="M28.5 39 q-2 4 0 5 q2 -1 0 -5 z" />
        </g>
      </>
    ),
  },
  drop: {
    motion: "bob",
    art: (
      <>
        <path d="M24 5 q13 16 13 25 a13 13 0 0 1 -26 0 q0 -9 13 -25 z" fill={C.water} />
        <path d="M17 30 q0 5 5 7" stroke={C.white} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
      </>
    ),
  },
  steam: {
    motion: "bob",
    art: (
      <>
        <path d="M6 40 q6 -3 12 0 t12 0 t12 0 v4 h-36 z" fill={C.water} />
        <g className="wx-ico-part wx-rise" stroke={C.water} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85">
          <path d="M14 34 q-4 -5 0 -10 q4 -5 0 -10" />
          <path d="M24 34 q-4 -5 0 -10 q4 -5 0 -10" />
          <path d="M34 34 q-4 -5 0 -10 q4 -5 0 -10" />
        </g>
        <g className="wx-ico-part wx-rise" fill={C.water}>
          <path d="M24 3 l3 5 -3 -1 -3 1 z" />
        </g>
      </>
    ),
  },
  ice: {
    motion: "twinkle",
    art: (
      <>
        <rect x="9" y="11" width="30" height="28" rx="6" fill="#CFEAFB" stroke={C.water} strokeWidth="2" />
        <path d="M14 18 l6 0 M14 23 l3 0" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  wind: {
    motion: "drift",
    art: (
      <g stroke={C.cloudLine} strokeWidth="3.5" fill="none" strokeLinecap="round">
        <path d="M5 18 h24 a5 5 0 1 0 -5 -5" />
        <path d="M5 26 h32 a5 5 0 1 1 -5 5" />
        <path d="M9 34 h14" />
      </g>
    ),
  },
  fire: {
    motion: "flicker",
    art: (
      <>
        <path d="M24 4 q12 12 10 24 a10 10 0 0 1 -20 0 q-1 -7 5 -12 q0 6 4 7 q-4 -10 1 -19 z" fill={C.fire} />
        <path d="M24 24 q6 5 4 11 a4.5 4.5 0 0 1 -9 0 q0 -5 5 -11 z" fill={C.sun} />
        <path d="M12 42 h24" stroke={C.brown} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  thermometer: {
    motion: "pulse",
    art: (
      <>
        <rect x="19" y="4" width="10" height="30" rx="5" fill={C.white} stroke={C.gray} strokeWidth="2" />
        <circle cx="24" cy="36" r="8" fill={C.red} />
        <rect className="wx-ico-part wx-pulse" x="22" y="14" width="4" height="20" rx="2" fill={C.red} />
      </>
    ),
  },
  lightning: {
    motion: "flicker",
    art: <path d="M27 3 l-15 24 h10 l-4 18 l17 -26 h-10 z" fill={C.sun} stroke={C.sunDeep} strokeWidth="1.5" strokeLinejoin="round" />,
  },
  plant: {
    motion: "sway",
    art: (
      <>
        <path d="M12 36 h24 l-3 9 h-18 z" fill={C.brown} />
        <path d="M24 36 v-18" stroke={C.greenDeep} strokeWidth="2.5" />
        <path d="M24 24 q-12 -1 -13 -11 q11 0 13 11 z" fill={C.green} />
        <path d="M24 19 q11 -1 12 -12 q-11 0 -12 12 z" fill={C.green} />
      </>
    ),
  },
  seed: {
    motion: "bob",
    art: (
      <>
        <path d="M4 34 q20 -5 40 0 v10 h-40 z" fill={C.brown} />
        <ellipse cx="24" cy="30" rx="6" ry="4.5" fill="#C9965A" stroke="#8A5E2E" strokeWidth="1.2" />
        <path className="wx-ico-part wx-sway" d="M24 26 q-1 -8 -7 -10 q6 -1 7 6 q2 -7 8 -7 q-6 2 -8 11" fill={C.green} />
      </>
    ),
  },
  leaf: {
    motion: "sway",
    art: (
      <>
        <path d="M8 40 q0 -30 32 -32 q2 32 -32 32 z" fill={C.green} />
        <path d="M8 40 q14 -14 26 -26" stroke={C.greenDeep} strokeWidth="2" fill="none" />
      </>
    ),
  },
  flower: {
    motion: "sway",
    art: (
      <>
        <path d="M24 28 v18" stroke={C.greenDeep} strokeWidth="2.5" />
        <path d="M24 40 q-8 -1 -9 -7 q7 0 9 7 z" fill={C.green} />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="24" cy="10" rx="5" ry="7" fill={C.pink} transform={`rotate(${a} 24 18)`} />
        ))}
        <circle cx="24" cy="18" r="4.5" fill={C.sun} />
      </>
    ),
  },
  root: {
    motion: "bob",
    art: (
      <>
        <rect x="2" y="16" width="44" height="30" rx="3" fill="#C9965A" opacity="0.55" />
        <path d="M24 4 v12" stroke={C.greenDeep} strokeWidth="3" />
        <path d="M20 6 q-6 -2 -8 2 q5 2 8 -2 M28 6 q6 -2 8 2 q-5 2 -8 -2" fill={C.green} />
        <g stroke="#8A5E2E" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M24 16 v20" />
          <path d="M24 22 q-6 4 -10 12" />
          <path d="M24 22 q6 4 10 12" />
          <path d="M24 30 q-4 4 -5 10 M24 30 q4 4 5 10" />
        </g>
        <g className="wx-ico-part wx-rise" fill={C.water}>
          <circle cx="15" cy="40" r="1.8" />
          <circle cx="33" cy="40" r="1.8" />
        </g>
      </>
    ),
  },
  tree: {
    motion: "sway",
    art: (
      <>
        <rect x="21" y="28" width="6" height="16" rx="2" fill={C.brown} />
        <circle cx="24" cy="18" r="13" fill={C.green} />
        <circle cx="16" cy="24" r="7" fill={C.greenDeep} opacity="0.5" />
      </>
    ),
  },
  apple: {
    motion: "bob",
    art: (
      <>
        <path d="M24 14 q-10 -6 -16 4 q-4 12 6 22 q5 5 10 1 q5 4 10 -1 q10 -10 6 -22 q-6 -10 -16 -4 z" fill={C.red} />
        <path d="M24 14 q0 -6 3 -9" stroke={C.brown} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M26 9 q6 -5 10 -1 q-5 4 -10 1 z" fill={C.green} />
      </>
    ),
  },
  fish: {
    motion: "drift",
    art: (
      <>
        <path d="M6 24 q12 -14 26 0 q-14 14 -26 0 z" fill="#F29B4B" />
        <path d="M31 24 l11 -8 v16 z" fill="#E8822B" />
        <circle cx="13" cy="22" r="2" fill={C.dark} />
      </>
    ),
  },
  bird: {
    motion: "float",
    art: (
      <>
        <ellipse cx="22" cy="27" rx="13" ry="10" fill={C.water} />
        <circle cx="32" cy="18" r="7" fill={C.water} />
        <path d="M38 17 l6 2 -6 2 z" fill={C.sun} />
        <circle cx="33" cy="16.5" r="1.4" fill={C.dark} />
        <path className="wx-ico-part wx-flap" d="M16 24 q-6 -12 6 -10 q2 6 -6 10 z" fill={C.waterDeep} />
      </>
    ),
  },
  animal: {
    motion: "bob",
    art: (
      <>
        <path d="M12 12 l4 9 M36 12 l-4 9" stroke="#C9965A" strokeWidth="6" strokeLinecap="round" />
        <circle cx="24" cy="27" r="14" fill="#E0B07A" />
        <circle cx="19" cy="25" r="1.8" fill={C.dark} />
        <circle cx="29" cy="25" r="1.8" fill={C.dark} />
        <path d="M22 30 h4 l-2 2 z" fill={C.dark} />
        <path d="M24 32 q-3 3 -6 1 M24 32 q3 3 6 1" stroke={C.dark} strokeWidth="1.2" fill="none" />
      </>
    ),
  },
  bug: {
    motion: "bob",
    art: (
      <>
        <g stroke={C.dark} strokeWidth="2" strokeLinecap="round">
          <path d="M14 22 l-6 -3 M14 30 l-7 0 M15 37 l-6 4 M34 22 l6 -3 M34 30 l7 0 M33 37 l6 4 M21 10 l-3 -5 M27 10 l3 -5" />
        </g>
        <circle cx="24" cy="14" r="6" fill={C.dark} />
        <ellipse cx="24" cy="30" rx="11" ry="13" fill={C.red} />
        <path d="M24 17 v26" stroke={C.dark} strokeWidth="1.5" />
        <circle cx="19" cy="27" r="2.5" fill={C.dark} />
        <circle cx="29" cy="33" r="2.5" fill={C.dark} />
      </>
    ),
  },
  person: {
    motion: "bob",
    art: (
      <>
        <circle cx="24" cy="12" r="7" fill="#E7B48A" />
        <path d="M12 44 q0 -18 12 -18 q12 0 12 18 z" fill={C.purple} />
        <path d="M21 13 q3 2 6 0" stroke={C.dark} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  heart: {
    motion: "beat",
    art: <path d="M24 42 q-18 -12 -18 -24 a9 9 0 0 1 18 -4 a9 9 0 0 1 18 4 q0 12 -18 24 z" fill={C.red} />,
  },
  bone: {
    motion: "bob",
    art: (
      <path
        d="M12 9 a5 5 0 0 1 6 6 l15 15 a5 5 0 1 1 1 7 a5 5 0 1 1 -7 1 l-15 -15 a5 5 0 1 1 -1 -7 a5 5 0 0 1 1 -7 z"
        fill="#F5EFE2"
        stroke={C.gray}
        strokeWidth="1.5"
      />
    ),
  },
  eye: {
    motion: "pulse",
    art: (
      <>
        <path d="M4 24 q20 -20 40 0 q-20 20 -40 0 z" fill={C.white} stroke={C.dark} strokeWidth="2" />
        <circle cx="24" cy="24" r="7" fill="#6B4A2E" />
        <circle className="wx-ico-part wx-pulse" cx="24" cy="24" r="3" fill={C.dark} />
        <circle cx="26" cy="21.5" r="1.5" fill={C.white} />
      </>
    ),
  },
  ear: {
    motion: "pulse",
    art: (
      <>
        <path d="M30 40 q-6 4 -10 -2 q-8 -6 -8 -18 a12 12 0 0 1 24 0 q0 8 -6 12 q-3 2 -2 6" fill="#E7B48A" stroke="#C48A5E" strokeWidth="1.5" />
        <path d="M18 20 a6 6 0 0 1 12 0 q0 4 -4 5" stroke="#C48A5E" strokeWidth="2" fill="none" />
        <g className="wx-ico-part wx-pulse" stroke={C.water} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M40 16 q3 4 0 8 M44 12 q5 8 0 16" />
        </g>
      </>
    ),
  },
  food: {
    motion: "bob",
    art: (
      <>
        <path d="M5 24 h38 a19 17 0 0 1 -38 0 z" fill={C.water} />
        <circle cx="17" cy="21" r="5" fill={C.red} />
        <circle cx="27" cy="20" r="5.5" fill={C.green} />
        <circle cx="34" cy="22" r="4" fill={C.sun} />
        <g className="wx-ico-part wx-rise" stroke={C.cloudLine} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M20 12 q-2 -3 0 -6 M28 12 q-2 -3 0 -6" />
        </g>
      </>
    ),
  },
  magnet: {
    motion: "pulse",
    art: (
      <>
        <path d="M10 8 h10 v16 a4 4 0 0 0 8 0 v-16 h10 v16 a14 14 0 0 1 -28 0 z" fill={C.red} />
        <rect x="10" y="8" width="10" height="6" fill={C.gray} />
        <rect x="28" y="8" width="10" height="6" fill={C.gray} />
        <g className="wx-ico-part wx-pulse" stroke={C.sun} strokeWidth="2" strokeLinecap="round">
          <path d="M12 4 l-2 -3 M24 4 v-3 M36 4 l2 -3" />
        </g>
      </>
    ),
  },
  bulb: {
    motion: "pulse",
    art: (
      <>
        <circle className="wx-ico-part wx-glow" cx="24" cy="19" r="16" fill={C.sun} opacity="0.25" />
        <path d="M24 5 a13 13 0 0 1 7 24 v5 h-14 v-5 a13 13 0 0 1 7 -24 z" fill={C.sun} />
        <rect x="17" y="35" width="14" height="7" rx="2" fill={C.gray} />
        <path d="M21 26 l3 -6 3 6" stroke={C.sunDeep} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  battery: {
    motion: "pulse",
    art: (
      <>
        <rect x="6" y="14" width="34" height="20" rx="4" fill={C.white} stroke={C.dark} strokeWidth="2" />
        <rect x="40" y="20" width="4" height="8" rx="1" fill={C.dark} />
        <rect className="wx-ico-part wx-pulse" x="9" y="17" width="22" height="14" rx="2" fill={C.green} />
        <path d="M22 18 l-5 7 h5 l-2 6 6 -8 h-5 z" fill={C.sun} />
      </>
    ),
  },
  gear: {
    motion: "spin",
    art: (
      <g className="wx-ico-part">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="21" y="3" width="6" height="9" rx="1.5" fill={C.gray} transform={`rotate(${a} 24 24)`} />
        ))}
        <circle cx="24" cy="24" r="14" fill={C.gray} />
        <circle cx="24" cy="24" r="5.5" fill={C.white} />
      </g>
    ),
  },
  robot: {
    motion: "bob",
    art: (
      <>
        <path d="M24 4 v6" stroke={C.dark} strokeWidth="2" />
        <circle className="wx-ico-part wx-pulse" cx="24" cy="4" r="2.5" fill={C.red} />
        <rect x="10" y="10" width="28" height="22" rx="6" fill="#5FB3A8" />
        <circle cx="18" cy="21" r="4" fill={C.white} />
        <circle cx="30" cy="21" r="4" fill={C.white} />
        <circle cx="18" cy="21" r="1.8" fill={C.dark} />
        <circle cx="30" cy="21" r="1.8" fill={C.dark} />
        <rect x="16" y="34" width="16" height="10" rx="3" fill="#3E8C82" />
      </>
    ),
  },
  atom: {
    motion: "spin",
    art: (
      <>
        <g className="wx-ico-part" fill="none" stroke={C.purple} strokeWidth="2">
          <ellipse cx="24" cy="24" rx="20" ry="8" />
          <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)" />
        </g>
        <circle cx="24" cy="24" r="4.5" fill={C.red} />
      </>
    ),
  },
  cell: {
    motion: "pulse",
    art: (
      <>
        <path d="M24 5 q16 2 18 18 q0 16 -18 20 q-18 -2 -19 -19 q2 -17 19 -19 z" fill="#BFE6C9" stroke={C.green} strokeWidth="2" />
        <circle className="wx-ico-part wx-pulse" cx="22" cy="22" r="7" fill={C.purple} opacity="0.85" />
        <circle cx="33" cy="31" r="2.5" fill={C.greenDeep} />
        <circle cx="14" cy="32" r="2" fill={C.greenDeep} />
      </>
    ),
  },
  rock: {
    motion: "bob",
    art: (
      <>
        <path d="M6 40 l5 -16 l10 -9 l12 3 l9 12 l-2 10 z" fill={C.gray} />
        <path d="M21 15 l2 10 l-12 -1 M23 25 l10 3 l9 2" stroke="#6E7A86" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
  mountain: {
    motion: "bob",
    art: (
      <>
        <path d="M2 42 l16 -28 l8 12 l6 -8 l14 24 z" fill="#8DA0AE" />
        <path d="M18 14 l-5 9 l3 -1 l2 2 l2 -2 l3 1 z" fill={C.white} />
      </>
    ),
  },
  ocean: {
    motion: "drift",
    art: (
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <path d="M3 18 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={C.water} />
        <path d="M3 28 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={C.waterDeep} />
        <path d="M3 38 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={C.water} />
      </g>
    ),
  },
  ruler: {
    motion: "bob",
    art: (
      <>
        <rect x="3" y="16" width="42" height="16" rx="3" fill={C.sun} stroke={C.sunDeep} strokeWidth="1.5" />
        <g stroke={C.dark} strokeWidth="1.5">
          {[8, 13, 18, 23, 28, 33, 38].map((x, i) => (
            <line key={x} x1={x} y1="16" x2={x} y2={i % 2 ? 21 : 25} />
          ))}
        </g>
      </>
    ),
  },
  clock: {
    motion: "bob",
    art: (
      <>
        <circle cx="24" cy="24" r="19" fill={C.white} stroke={C.dark} strokeWidth="2.5" />
        <path d="M24 24 v-10" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" />
        <path className="wx-ico-part wx-spin" d="M24 24 l9 5" stroke={C.red} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2" fill={C.dark} />
      </>
    ),
  },
  balance: {
    motion: "sway",
    art: (
      <>
        <path d="M24 8 v32 M14 42 h20" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" />
        <g className="wx-ico-part wx-sway">
          <path d="M8 14 h32" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M3 26 a6 4 0 0 0 12 0 z M33 26 a6 4 0 0 0 12 0 z" fill={C.sun} />
          <path d="M9 14 l-6 12 M9 14 l6 12 M39 14 l-6 12 M39 14 l6 12" stroke={C.gray} strokeWidth="1.2" />
        </g>
      </>
    ),
  },
  wheel: {
    motion: "spin",
    art: (
      <g className="wx-ico-part">
        <circle cx="24" cy="24" r="19" fill={C.dark} />
        <circle cx="24" cy="24" r="12" fill={C.gray} />
        <g stroke={C.white} strokeWidth="2">
          <path d="M24 12 v24 M12 24 h24 M15.5 15.5 l17 17 M32.5 15.5 l-17 17" />
        </g>
        <circle cx="24" cy="24" r="3" fill={C.white} />
      </g>
    ),
  },
};

/**
 * One picture icon. `active` makes it move (idle motion, or "now speaking"
 * highlight); otherwise it is still, so a diagram is calm until shown.
 */
export function VisualIcon({ name, size = 56, active = true }: { name: IconName; size?: number; active?: boolean }) {
  const icon = ICONS[name];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className={`wx-ico wx-${icon.motion} ${active ? "wx-ico-on" : ""}`}
      data-icon={name}
    >
      {icon.art}
    </svg>
  );
}
