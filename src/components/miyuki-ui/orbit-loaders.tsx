"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useId } from "react";
import { cn } from "@/lib/utils";

export interface OrbitLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

const RAD = Math.PI / 180;
const n = (v: number) => Number(v.toFixed(3));
const at = (r: number, deg: number) => `${n(r * Math.cos(deg * RAD))} ${n(r * Math.sin(deg * RAD))}`;
const arc = (r: number, from: number, span: number) =>
  `M${at(r, from)}A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${at(r, from + span)}`;

const RING_R = 9;
const RING_SPAN = 272;
const RING_BEAD = 2;
const RING_ARC = n((RING_SPAN / 360) * 2 * Math.PI * RING_R);
const RING_TRAVEL = n(((RING_SPAN - RING_BEAD) / 360) * 2 * Math.PI * RING_R);

const SWELL_LOW = n(0.7 / 1.9);

const CHASE_R = 7.5;
const CHASE_TAIL = 110;
const CHASE_HEAD = 16;

const CHASE_MASK = (() => {
  const steps = 20;
  let shapes = "";
  for (const head of [-90, 90]) {
    const outer: string[] = [];
    const inner: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const deg = head - CHASE_TAIL * u;
      const half = 1.25 * (1 - u) ** 0.8;
      const p = (r: number) => `${n(12 + r * Math.cos(deg * RAD))} ${n(12 + r * Math.sin(deg * RAD))}`;
      outer.push(p(CHASE_R + half));
      inner.push(p(CHASE_R - half));
    }
    shapes += `<path d='M${outer.join("L")}L${inner.reverse().join("L")}Z'/>`;
    shapes += `<circle cx='${n(12 + CHASE_R * Math.cos(head * RAD))}' cy='${n(12 + CHASE_R * Math.sin(head * RAD))}' r='1.9'/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${shapes}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") center / 100% 100% no-repeat`;
})();

const CHASE_FILL = (() => {
  const fade = CHASE_TAIL - CHASE_HEAD;
  const head = CHASE_TAIL + CHASE_HEAD;
  return `repeating-conic-gradient(from -${CHASE_TAIL}deg, transparent 0deg, ${n(fade * 0.5 ** (1 / 1.4))}deg, currentColor ${fade}deg ${head}deg, transparent ${head}deg 180deg)`;
})();

const keyframes = `
@keyframes miyuki-orbit-loaders-turn { to { transform: rotate(360deg); } }
@keyframes miyuki-orbit-loaders-unturn { to { transform: rotate(-360deg); } }
@keyframes miyuki-orbit-loaders-near { 0%, 49.9% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes miyuki-orbit-loaders-far { 0%, 49.9% { opacity: 0; } 50%, 100% { opacity: 1; } }
@keyframes miyuki-orbit-loaders-chase { 0% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } 100% { transform: rotate(360deg); } }
@keyframes miyuki-orbit-loaders-stride { to { transform: rotate(1080deg); } }
@keyframes miyuki-orbit-loaders-draw {
  0% { stroke-dashoffset: ${RING_TRAVEL}px; animation-timing-function: cubic-bezier(0.3, 0.2, 0.25, 1); }
  50% { stroke-dashoffset: 0px; animation-timing-function: cubic-bezier(0.55, 0, 0.7, 0.8); }
  100% { stroke-dashoffset: -${RING_TRAVEL}px; }
}
@keyframes miyuki-orbit-loaders-swell {
  0% { transform: scale(${SWELL_LOW}); opacity: 0.25; animation-timing-function: cubic-bezier(0.45, 0.05, 0.25, 1); }
  12.5% { transform: scale(1); opacity: 1; animation-timing-function: linear; }
  100% { transform: scale(${SWELL_LOW}); opacity: 0.25; }
}
.miyuki-orbit-loaders-comet { background: ${CHASE_FILL}; -webkit-mask: ${CHASE_MASK}; mask: ${CHASE_MASK}; }
@keyframes miyuki-orbit-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Frame({
  size = 24,
  label = "Loading",
  className,
  style,
  children,
  ...props
}: OrbitLoaderProps & { children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-orbit-loaders-breathe_1.8s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <style href="miyuki-orbit-loaders" precedence="miyuki">
        {keyframes}
      </style>
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-full overflow-visible"
    >
      <g transform="translate(12 12)">{children}</g>
    </svg>
  );
}

const pivot = "origin-[0_0] [transform-box:view-box]";
const held = "motion-reduce:[transform:rotate(var(--miyuki-orbit-loaders-still))]";

const vars = (still: number, extra?: Record<string, string>) =>
  ({ "--miyuki-orbit-loaders-still": `${still}deg`, ...extra }) as CSSProperties;

function Lap({
  rx,
  ry,
  tilt,
  period,
  delay,
  still,
  children,
}: {
  rx: number;
  ry: number;
  tilt: number;
  period: number;
  delay: number;
  still: number;
  children: ReactNode;
}) {
  const k = ry / rx;
  const timing = { "--miyuki-orbit-loaders-lap": `${period}s` };
  return (
    <g transform={`rotate(${tilt}) scale(1 ${n(k)})`}>
      <g
        className={cn(
          pivot,
          held,
          "motion-safe:animate-[miyuki-orbit-loaders-turn_var(--miyuki-orbit-loaders-lap)_linear_infinite]",
        )}
        style={{ ...vars(still, timing), animationDelay: `${delay}s` }}
      >
        <g transform={`translate(${rx} 0)`}>
          <g
            className={cn(
              pivot,
              held,
              "motion-safe:animate-[miyuki-orbit-loaders-unturn_var(--miyuki-orbit-loaders-lap)_linear_infinite]",
            )}
            style={{ ...vars(-still, timing), animationDelay: `${delay}s` }}
          >
            <g transform={`scale(1 ${n(1 / k)})`}>{children}</g>
          </g>
        </g>
      </g>
    </g>
  );
}

const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, "");

const PLANET = { rx: 9.5, ry: 3.4, tilt: -20, period: 2.4, delay: -0.2, still: 125 };
const GAP = 1;

export function PlanetLoader(props: OrbitLoaderProps) {
  const id = useSvgId();
  return (
    <Frame {...props}>
      <Glyph>
        <defs>
          <mask id={`${id}-planet`} maskUnits="userSpaceOnUse" x={-12} y={-12} width={24} height={24}>
            <rect x={-12} y={-12} width={24} height={24} fill="#fff" />
            <Lap {...PLANET}>
              <circle
                r={1.4 + GAP}
                fill="#000"
                className="motion-safe:animate-[miyuki-orbit-loaders-near_2.4s_linear_infinite] motion-reduce:opacity-100"
                style={{ animationDelay: `${PLANET.delay}s` }}
              />
            </Lap>
          </mask>
          <mask id={`${id}-moon`} maskUnits="userSpaceOnUse" x={-12} y={-12} width={24} height={24}>
            <rect x={-12} y={-12} width={24} height={24} fill="#fff" />
            <circle
              r={3.2 + GAP}
              fill="#000"
              className="motion-safe:animate-[miyuki-orbit-loaders-far_2.4s_linear_infinite] motion-reduce:opacity-0"
              style={{ animationDelay: `${PLANET.delay}s` }}
            />
          </mask>
        </defs>
        <ellipse
          rx={PLANET.rx}
          ry={PLANET.ry}
          transform={`rotate(${PLANET.tilt})`}
          stroke="currentColor"
          strokeWidth={1.25}
          strokeOpacity={0.45}
        />
        <circle r={3.2} fill="currentColor" mask={`url(#${id}-planet)`} />
        <g mask={`url(#${id}-moon)`}>
          <Lap {...PLANET}>
            <circle r={1.4} fill="currentColor" />
          </Lap>
        </g>
      </Glyph>
    </Frame>
  );
}

export function ChaseLoader(props: OrbitLoaderProps) {
  return (
    <Frame {...props}>
      <span
        aria-hidden="true"
        className="miyuki-orbit-loaders-comet absolute inset-0 motion-safe:animate-[miyuki-orbit-loaders-chase_1.1s_cubic-bezier(0.38,0.26,0.62,0.74)_infinite] motion-reduce:[transform:rotate(var(--miyuki-orbit-loaders-still))]"
        style={{ ...vars(60), animationDelay: "-0.4s" }}
      />
    </Frame>
  );
}

const ARCS = [
  { r: 10, span: 240, opacity: 1, spin: "turn", period: "2.4s", delay: -0.5, still: -40 },
  { r: 6.8, span: 200, opacity: 0.7, spin: "unturn", period: "1.8s", delay: -1.1, still: 150 },
  { r: 3.6, span: 160, opacity: 0.45, spin: "turn", period: "1.2s", delay: -0.2, still: 20 },
] as const;

export function ArcsLoader(props: OrbitLoaderProps) {
  return (
    <Frame {...props}>
      <Glyph>
        {ARCS.map((a) => (
          <g
            key={a.r}
            className={cn(
              pivot,
              held,
              a.spin === "turn"
                ? "motion-safe:animate-[miyuki-orbit-loaders-turn_var(--miyuki-orbit-loaders-lap)_linear_infinite]"
                : "motion-safe:animate-[miyuki-orbit-loaders-unturn_var(--miyuki-orbit-loaders-lap)_linear_infinite]",
            )}
            style={{ ...vars(a.still, { "--miyuki-orbit-loaders-lap": a.period }), animationDelay: `${a.delay}s` }}
          >
            <path d={arc(a.r, -a.span / 2, a.span)} stroke="currentColor" strokeWidth={2} strokeOpacity={a.opacity} />
          </g>
        ))}
      </Glyph>
    </Frame>
  );
}

const ATOM = { rx: 10, ry: 3.8, period: 1.8 };

export function AtomLoader(props: OrbitLoaderProps) {
  return (
    <Frame {...props}>
      <Glyph>
        {[0, 60, 120].map((tilt) => (
          <ellipse
            key={tilt}
            rx={ATOM.rx}
            ry={ATOM.ry}
            transform={`rotate(${tilt})`}
            stroke="currentColor"
            strokeWidth={1}
            strokeOpacity={0.35}
          />
        ))}
        <circle r={1.8} fill="currentColor" />
        {[0, 1, 2].map((i) => (
          <Lap key={i} {...ATOM} tilt={i * 60} delay={-0.3 - i * (ATOM.period / 3)} still={60 + i * 120}>
            <circle r={1.3} fill="currentColor" />
          </Lap>
        ))}
      </Glyph>
    </Frame>
  );
}

export function RingLoader(props: OrbitLoaderProps) {
  return (
    <Frame {...props}>
      <Glyph>
        <circle r={RING_R} stroke="currentColor" strokeWidth={2} strokeOpacity={0.2} />
        <g
          className={cn(pivot, held, "motion-safe:animate-[miyuki-orbit-loaders-turn_2s_linear_infinite]")}
          style={{ ...vars(0), animationDelay: "-0.3s" }}
        >
          <g
            className={cn(pivot, "motion-safe:animate-[miyuki-orbit-loaders-stride_6s_steps(4)_infinite]")}
            style={{ animationDelay: "-0.8s" }}
          >
            <path
              d={arc(RING_R, -90, RING_SPAN)}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray={`${RING_ARC} ${RING_ARC}`}
              className="motion-safe:animate-[miyuki-orbit-loaders-draw_1.5s_linear_infinite] motion-reduce:[stroke-dashoffset:var(--miyuki-orbit-loaders-cut)]"
              style={
                {
                  "--miyuki-orbit-loaders-cut": `${n(RING_ARC * 0.28)}px`,
                  animationDelay: "-0.8s",
                } as CSSProperties
              }
            />
          </g>
        </g>
      </Glyph>
    </Frame>
  );
}

const BEADS = [0, 1, 2, 3, 4, 5, 6, 7];
const LEAD = 1;

const swell = (p: number) => {
  const q = ((p % 1) + 1) % 1;
  if (q <= 0.125) return SWELL_LOW + (1 - SWELL_LOW) * (q / 0.125);
  return 1 - (1 - SWELL_LOW) * ((q - 0.125) / 0.875);
};

export function BeadsLoader(props: OrbitLoaderProps) {
  return (
    <Frame {...props}>
      <Glyph>
        {BEADS.map((i) => {
          const level = swell(0.125 + (LEAD - i) / 8);
          const fade = 0.25 + ((level - SWELL_LOW) / (1 - SWELL_LOW)) * 0.75;
          return (
            <circle
              key={i}
              cx={n(8.5 * Math.cos((i * 45 - 90) * RAD))}
              cy={n(8.5 * Math.sin((i * 45 - 90) * RAD))}
              r={1.9}
              fill="currentColor"
              className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-orbit-loaders-swell_1.2s_linear_infinite] motion-reduce:[scale:var(--miyuki-orbit-loaders-size)] motion-reduce:opacity-(--miyuki-orbit-loaders-fade)"
              style={
                {
                  "--miyuki-orbit-loaders-size": n(level),
                  "--miyuki-orbit-loaders-fade": n(fade),
                  animationDelay: `${n(-1.25 + i * 0.15)}s`,
                } as CSSProperties
              }
            />
          );
        })}
      </Glyph>
    </Frame>
  );
}
