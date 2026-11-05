/**
 * Ready-made animated scenes (see src/lib/scenes.ts and docs/SCENES.md).
 *
 * Each scene is one inline SVG cartoon split into parts (<g> groups).
 * While Wondrix narrates, the part being said is bright and moving and the
 * others fade back; when nothing is playing, the whole scene moves gently.
 * A numbered badge marks each part so it matches the numbered labels below.
 * Motion is CSS (globals.css, "wxs-" classes) and stops for reduced motion.
 */
import type { SceneId } from "@/lib/scenes";

type PartState = "idle" | "active" | "dim";

function partClass(s: PartState) {
  return `wxs-part ${s === "active" ? "wxs-on" : s === "dim" ? "wxs-dim" : ""}`;
}

/** Numbered marker for part n (1-based), matching the label chips. */
function Num({ n, x, y }: { n: number; x: number; y: number }) {
  return (
    <g className="wxs-num">
      <circle cx={x} cy={y} r="9" fill="var(--extra)" stroke="#fff" strokeWidth="2" />
      <text x={x} y={y + 3.8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
        {n}
      </text>
    </g>
  );
}

const SKY = "#DDF0FA";
const SEA = "#4BA3E3";
const SEA_DEEP = "#2F7FC0";
const SUN = "#F5B83D";
const SUN_DEEP = "#E8962B";
const GREEN = "#4CAF7A";
const GREEN_DEEP = "#2F8A5B";
const SOIL = "#B98552";
const SOIL_DEEP = "#8A5E2E";
const SPACE = "#1E2A44";
const CLOUD = "#F4F7FA";
const CLOUD_LINE = "#B9C4CF";

function Sun({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <g className="wxs-spin" style={{ transformOrigin: `${x}px ${y}px` }} stroke={SUN_DEEP} strokeWidth="3" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1={x} y1={y - r - 4} x2={x} y2={y - r - 11} transform={`rotate(${a} ${x} ${y})`} />
        ))}
      </g>
      <circle cx={x} cy={y} r={r} fill={SUN} />
    </g>
  );
}

function Cloud({ x, y, s = 1, fill = CLOUD }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-30 12 a12 12 0 0 1 2 -24 a17 17 0 0 1 32 -6 a14 14 0 0 1 26 14 a10 10 0 0 1 -2 16 z"
      fill={fill}
      stroke={CLOUD_LINE}
      strokeWidth="1.5"
    />
  );
}

const Drop = ({ x, y, d = 0 }: { x: number; y: number; d?: number }) => (
  <path className="wxs-fall" style={{ animationDelay: `${d}s` }} d={`M${x} ${y} q-3 6 0 8 q3 -2 0 -8 z`} fill={SEA} />
);

/* ---------------- 1. Water cycle ---------------- */

function WaterCycle({ st }: { st: (i: number) => PartState }) {
  return (
    <>
      <rect width="320" height="200" fill={SKY} />
      {/* land + mountain (left), sea (right) */}
      <path d="M0 200 V128 L46 70 L84 112 L112 92 L150 150 L176 200 z" fill="#9DB7A2" />
      <path d="M46 70 l-11 14 h8 l3 -4 l4 4 h7 z" fill="#fff" />
      <path d="M150 150 Q175 165 176 200 H320 V150 z" fill={SEA} />
      <path className="wxs-drift" d="M168 160 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" fill="none" />

      <g className={partClass(st(0))}>
        <Sun x={262} y={36} r={18} />
        <g className="wxs-pulse" stroke={SUN} strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round">
          <line x1="250" y1="60" x2="232" y2="145" />
          <line x1="268" y1="62" x2="270" y2="145" />
        </g>
        <Num n={1} x={290} y={18} />
      </g>

      <g className={partClass(st(1))}>
        <g stroke="#7CC3EE" strokeWidth="3" fill="none" strokeLinecap="round">
          {[200, 222, 244].map((x, i) => (
            <path key={x} className="wxs-rise" style={{ animationDelay: `${i * 0.5}s` }} d={`M${x} 146 q-6 -8 0 -16 q6 -8 0 -16`} />
          ))}
        </g>
        <Num n={2} x={222} y={160} />
      </g>

      <g className={partClass(st(2))}>
        <g className="wxs-drift-slow">
          <Cloud x={150} y={44} s={1.15} />
          <Cloud x={208} y={60} s={0.75} />
        </g>
        <Num n={3} x={188} y={28} />
      </g>

      <g className={partClass(st(3))}>
        {[128, 142, 156, 170, 135, 163].map((x, i) => (
          <Drop key={i} x={x} y={i > 3 ? 74 : 64} d={i * 0.18} />
        ))}
        {/* river carries rain back to the sea */}
        <path className="wxs-flow" d="M112 104 Q118 128 136 140 T170 172" stroke={SEA} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="8 6" />
        <Num n={4} x={104} y={88} />
      </g>
    </>
  );
}

/* ---------------- 2. Day and night ---------------- */

function DayNight({ st }: { st: (i: number) => PartState }) {
  const cx = 214;
  const cy = 100;
  const r = 62;
  const land = (dx: number) => (
    <g transform={`translate(${dx} 0)`} fill={GREEN}>
      <path d="M150 70 q18 -12 30 2 q-6 14 6 22 q-10 16 -26 8 q-4 -18 -10 -32 z" />
      <path d="M200 56 q22 -4 34 14 q-12 4 -10 16 q-14 -6 -24 -30 z" />
      <path d="M196 120 q16 -6 26 6 q-6 14 -22 12 z" />
      <path d="M246 100 q14 -2 20 12 q-10 10 -20 2 z" />
    </g>
  );
  return (
    <>
      <rect width="320" height="200" fill={SPACE} />
      {[
        [20, 20], [300, 24], [290, 180], [130, 182], [110, 18], [60, 175],
      ].map(([x, y], i) => (
        <circle key={i} className="wxs-twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r="1.6" fill="#fff" />
      ))}

      <g className={partClass(st(0))}>
        <Sun x={44} y={100} r={28} />
        <g className="wxs-pulse" stroke={SUN} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" opacity="0.8">
          <line x1="84" y1="78" x2="150" y2="70" />
          <line x1="86" y1="100" x2="150" y2="100" />
          <line x1="84" y1="122" x2="150" y2="130" />
        </g>
        <Num n={1} x={44} y={58} />
      </g>

      {/* Earth: the continents scroll inside the circle, so it looks like it spins */}
      <defs>
        <clipPath id="wxs-earth">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={SEA} />
      <g clipPath="url(#wxs-earth)">
        <g className="wxs-scroll">
          {land(-124)}
          {land(0)}
          {land(124)}
        </g>
      </g>

      <g className={partClass(st(1))}>
        <path d={`M${cx} ${cy - r} a${r} ${r} 0 0 0 0 ${2 * r} z`} fill={SUN} opacity="0.25" />
        <g transform={`translate(${cx - 38} ${cy - 6})`}>
          <rect x="-8" y="-2" width="16" height="12" fill="#fff" />
          <path d="M-11 -2 l11 -9 l11 9 z" fill="#E0525B" />
        </g>
        <Num n={2} x={cx - 48} y={cy - 46} />
      </g>

      <g className={partClass(st(2))}>
        <path d={`M${cx} ${cy - r} a${r} ${r} 0 0 1 0 ${2 * r} z`} fill="#0B1530" opacity="0.62" />
        <circle className="wxs-twinkle" cx={cx + 30} cy={cy - 22} r="2" fill="#fff" />
        <circle className="wxs-twinkle" style={{ animationDelay: "0.5s" }} cx={cx + 44} cy={cy + 12} r="1.6" fill="#fff" />
        <path d={`M${cx + 26} ${cy + 30} a9 9 0 1 0 8 -12 a7 7 0 1 1 -8 12 z`} fill="#F3E3A8" />
        <Num n={3} x={cx + 50} y={cy - 46} />
      </g>

      <g className={partClass(st(3))}>
        <defs>
          <marker id="wxs-spin-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill={SUN} />
          </marker>
        </defs>
        <path d={`M${cx - 52} ${cy + 52} A74 74 0 0 0 ${cx + 52} ${cy + 52}`} stroke={SUN} strokeWidth="3" fill="none" markerEnd="url(#wxs-spin-arrow)" className="wxs-flow" strokeDasharray="7 5" />
        <text x={cx} y={cy + r + 26} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" direction="ltr">
          24h
        </text>
        <Num n={4} x={cx - 62} y={cy + 66} />
      </g>
    </>
  );
}

/* ---------------- 3. Moon phases ---------------- */

/** A moon lit from the left (where the Sun is), drawn at x,y. */
function OrbitMoon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill="#55607A" />
      <path d={`M${x} ${y - 11} a11 11 0 0 0 0 22 z`} fill="#F3E3A8" />
    </g>
  );
}

/** How the Moon looks from Earth for each phase (lit part in cream). */
function SeenMoon({ phase, x, y }: { phase: number; x: number; y: number }) {
  const r = 17;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#3A4560" stroke="#8A96A3" strokeWidth="1" />
      {phase === 1 ? <path d={`M${x} ${y - r} a${r} ${r} 0 0 1 0 ${2 * r} z`} fill="#F3E3A8" /> : null}
      {phase === 2 ? <circle cx={x} cy={y} r={r} fill="#F3E3A8" /> : null}
      {phase === 3 ? <path d={`M${x} ${y - r} a${r} ${r} 0 0 0 0 ${2 * r} z`} fill="#F3E3A8" /> : null}
    </g>
  );
}

function MoonPhases({ st }: { st: (i: number) => PartState }) {
  const ex = 128;
  const ey = 100;
  const R = 58;
  // Sun on the left: new moon between Sun and Earth, then counter-clockwise as seen from the north.
  const at = [
    { x: ex - R, y: ey },
    { x: ex, y: ey + R },
    { x: ex + R, y: ey },
    { x: ex, y: ey - R },
  ];
  const seen = [30, 77, 124, 171];
  return (
    <>
      <rect width="320" height="200" fill={SPACE} />
      <g className="wxs-pulse" stroke={SUN} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" opacity="0.7">
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="4" y1={y} x2="40" y2={y} />
        ))}
      </g>
      <text x="8" y="16" fontSize="16" aria-hidden>
        ☀
      </text>
      <circle cx={ex} cy={ey} r={R} fill="none" stroke="#8A96A3" strokeWidth="1.2" strokeDasharray="3 4" />
      {/* Earth */}
      <circle cx={ex} cy={ey} r="18" fill={SEA} />
      <path d={`M${ex - 8} ${ey - 10} q8 -2 10 6 q-6 4 -2 10 q-8 0 -8 -16 z`} fill={GREEN} />
      {/* a small moon keeps travelling round the orbit */}
      <g className="wxs-orbit" style={{ transformOrigin: `${ex}px ${ey}px` }}>
        <circle cx={ex - R} cy={ey} r="4" fill="#F3E3A8" opacity="0.8" />
      </g>

      <line x1="238" y1="12" x2="238" y2="190" stroke="#55607A" strokeWidth="1" strokeDasharray="2 4" />
      {at.map((p, i) => (
        <g key={i} className={partClass(st(i))}>
          <OrbitMoon x={p.x} y={p.y} />
          <SeenMoon phase={i} x={276} y={seen[i]} />
          <line x1={p.x + 12} y1={p.y} x2="256" y2={seen[i]} stroke="#F3E3A8" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 3" />
          <Num n={i + 1} x={300} y={seen[i] - 12} />
        </g>
      ))}
    </>
  );
}

/* ---------------- 4. How a plant makes food ---------------- */

function PlantFood({ st }: { st: (i: number) => PartState }) {
  return (
    <>
      <rect width="320" height="200" fill={SKY} />
      <rect y="132" width="320" height="68" fill={SOIL} />
      {[[30, 150], [80, 180], [250, 160], [290, 186], [210, 190], [40, 190]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={SOIL_DEEP} />
      ))}
      {/* stem + leaves (base drawing) */}
      <path d="M160 134 V56" stroke={GREEN_DEEP} strokeWidth="6" strokeLinecap="round" />

      <g className={partClass(st(0))}>
        <g stroke="#6E4A24" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M160 134 v30" />
          <path d="M160 144 q-18 8 -30 26" />
          <path d="M160 144 q18 8 30 26" />
          <path d="M160 158 q-10 8 -14 24 M160 158 q10 8 14 24" />
        </g>
        {[[118, 182], [204, 184], [140, 192], [182, 194]].map(([x, y], i) => (
          <circle key={i} className="wxs-toward" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="3.5" fill={SEA} />
        ))}
        <Num n={1} x={110} y={156} />
      </g>

      <g className={partClass(st(1))}>
        <path d="M160 134 V56" stroke="#7CC3EE" strokeWidth="2" strokeDasharray="2 10" className="wxs-climb" />
        <Num n={2} x={178} y={118} />
      </g>

      <g className={partClass(st(2))}>
        <Sun x={276} y={34} r={17} />
        <g className="wxs-pulse" stroke={SUN} strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round">
          <line x1="258" y1="44" x2="204" y2="70" />
          <line x1="262" y1="54" x2="208" y2="94" />
        </g>
        <Num n={3} x={300} y={14} />
      </g>

      {/* leaves sit above the sunlight lines */}
      <g className="wxs-sway" style={{ transformOrigin: "160px 134px" }}>
        <path d="M160 96 q-46 -4 -54 -36 q40 -2 54 36 z" fill={GREEN} />
        <path d="M160 76 q44 -2 52 -32 q-40 0 -52 32 z" fill={GREEN} />
        <path d="M160 60 q-6 -20 0 -30 q8 12 0 30 z" fill={GREEN} />
      </g>

      <g className={partClass(st(3))}>
        {[[124, 66], [192, 52], [140, 78]].map(([x, y], i) => (
          <path key={i} className="wxs-twinkle" style={{ animationDelay: `${i * 0.35}s` }} d={`M${x} ${y - 6} l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z`} fill="#FFF3B0" stroke={SUN_DEEP} strokeWidth="0.8" />
        ))}
        {[[96, 50], [222, 36], [108, 32]].map(([x, y], i) => (
          <g key={i} className="wxs-bubble" style={{ animationDelay: `${i * 0.6}s` }}>
            <circle cx={x} cy={y} r="9" fill="#fff" fillOpacity="0.85" stroke="#7CC3EE" />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="8" fontWeight="800" fill={SEA_DEEP} direction="ltr">
              O₂
            </text>
          </g>
        ))}
        <Num n={4} x={86} y={84} />
      </g>
    </>
  );
}

/* ---------------- 5. Solid, liquid, gas ---------------- */

/** Particle box: packed (solid), loose (liquid) or spread out (gas). */
function Particles({ x, kind }: { x: number; kind: 0 | 1 | 2 }) {
  const dots: [number, number][] =
    kind === 0
      ? [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => [x - 18 + c * 12, 148 + r * 11] as [number, number]))
      : kind === 1
        ? [[-18, 176], [-6, 178], [6, 175], [18, 178], [-12, 165], [0, 166], [12, 164], [-18, 154], [4, 155], [16, 152]].map(([dx, y]) => [x + dx, y] as [number, number])
        : [[-20, 146], [10, 150], [-4, 164], [20, 172], [-16, 182], [6, 186]].map(([dx, y]) => [x + dx, y] as [number, number]);
  const cls = kind === 0 ? "wxs-jiggle" : kind === 1 ? "wxs-wobble" : "wxs-zoom";
  return (
    <g>
      <rect x={x - 30} y={138} width="60" height="56" rx="8" fill="#fff" fillOpacity="0.7" stroke={CLOUD_LINE} />
      {dots.map(([dx, dy], i) => (
        <circle key={i} className={cls} style={{ animationDelay: `${(i % 5) * 0.15}s` }} cx={dx} cy={dy} r="4.5" fill={SEA} />
      ))}
    </g>
  );
}

function Flame({ x, y }: { x: number; y: number }) {
  return (
    <g className="wxs-flicker" style={{ transformOrigin: `${x}px ${y + 10}px` }}>
      <path d={`M${x} ${y - 12} q10 10 8 18 a8 8 0 0 1 -16 0 q-1 -6 4 -10 q0 4 3 5 q-3 -6 1 -13 z`} fill="#F06A3B" />
      <path d={`M${x} ${y - 1} q5 4 3 8 a3.5 3.5 0 0 1 -7 0 q0 -4 4 -8 z`} fill={SUN} />
    </g>
  );
}

function StatesOfMatter({ st }: { st: (i: number) => PartState }) {
  return (
    <>
      <rect width="320" height="200" fill="#EEF6F2" />

      <g className={partClass(st(0))}>
        <rect x="32" y="62" width="46" height="46" rx="8" fill="#CFEAFB" stroke={SEA} strokeWidth="2.5" />
        <path d="M40 72 h12 M40 80 h6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <path className="wxs-twinkle" d="M86 60 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" fill="#fff" stroke={SEA} strokeWidth="0.8" />
        <Particles x={55} kind={0} />
        <Num n={1} x={28} y={54} />
      </g>

      <g className={partClass(st(1))}>
        <path d="M84 116 H126" stroke={SUN_DEEP} strokeWidth="3" strokeLinecap="round" markerEnd="url(#wxs-heat)" />
        <Flame x={104} y={98} />
        <path d="M138 66 h44 l-5 46 h-34 z" fill="#fff" fillOpacity="0.6" stroke={CLOUD_LINE} strokeWidth="2" />
        <path className="wxs-wave" d="M140 84 q5 -3 10 0 t10 0 t10 0 t10 0 v26 h-30 z" fill={SEA} />
        <Particles x={160} kind={1} />
        <Num n={2} x={134} y={54} />
      </g>

      <g className={partClass(st(2))}>
        <path d="M190 116 H232" stroke={SUN_DEEP} strokeWidth="3" strokeLinecap="round" markerEnd="url(#wxs-heat)" />
        <path d="M242 82 h48 v24 a6 6 0 0 1 -6 6 h-36 a6 6 0 0 1 -6 -6 z" fill="#8A96A3" />
        <rect x="236" y="78" width="60" height="6" rx="3" fill="#6E7A86" />
        <Flame x={266} y={126} />
        <g stroke="#9CCFF0" strokeWidth="3" fill="none" strokeLinecap="round">
          {[252, 266, 280].map((x, i) => (
            <path key={x} className="wxs-rise" style={{ animationDelay: `${i * 0.4}s` }} d={`M${x} 74 q-5 -7 0 -14 q5 -7 0 -14`} />
          ))}
        </g>
        <Particles x={265} kind={2} />
        <Num n={3} x={300} y={54} />
      </g>

      <g className={partClass(st(3))}>
        <defs>
          <marker id="wxs-cool" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill={SEA_DEEP} />
          </marker>
        </defs>
        <path d="M262 30 Q160 -6 58 40" stroke={SEA_DEEP} strokeWidth="3" fill="none" strokeDasharray="7 5" className="wxs-flow-back" markerEnd="url(#wxs-cool)" />
        <g transform="translate(160 14)" stroke={SEA_DEEP} strokeWidth="2" strokeLinecap="round" className="wxs-spin" style={{ transformOrigin: "160px 14px" }}>
          <path d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4" />
        </g>
        <Num n={4} x={184} y={22} />
      </g>

      <defs>
        <marker id="wxs-heat" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={SUN_DEEP} />
        </marker>
      </defs>
    </>
  );
}

const SCENE_ART: Record<SceneId, (p: { st: (i: number) => PartState }) => React.ReactNode> = {
  "water-cycle": WaterCycle,
  "day-night": DayNight,
  "moon-phases": MoonPhases,
  "plant-food": PlantFood,
  "states-of-matter": StatesOfMatter,
};

export function ExtraScene({ scene, stateOf }: { scene: SceneId; stateOf: (i: number) => PartState }) {
  const Art = SCENE_ART[scene];
  return (
    <svg viewBox="0 0 320 200" className="block h-auto w-full overflow-hidden rounded-xl" data-scene={scene} aria-hidden direction="ltr">
      <Art st={stateOf} />
    </svg>
  );
}
