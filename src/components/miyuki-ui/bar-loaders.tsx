"use client";

import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export interface BarLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

const BREATHE = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";
const POP = "cubic-bezier(0.3, 1.45, 0.6, 1)";

const num = (v: number) => `${Math.round(v * 1000) / 1000 || 0}`;
const pct = (v: number) => `${num(v * 100)}%`;

type Stop = [at: number | number[], body: string];

const keyframes = (name: string, stops: Stop[]) =>
  `@keyframes miyuki-bar-loaders-${name} { ${stops
    .map(([at, body]) => `${[at].flat().map(pct).join(", ")} { ${body} }`)
    .join(" ")} }`;

const vars = (entries: Record<string, string | number>) =>
  Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [`--miyuki-bar-loaders-${key}`, value]),
  ) as CSSProperties;

const CORE =
  "[transform-box:fill-box] motion-safe:[animation:var(--miyuki-bar-loaders-core)] motion-reduce:[transform:var(--miyuki-bar-loaders-core-still)] motion-reduce:opacity-(--miyuki-bar-loaders-core-fade)";
const CAP =
  "motion-safe:[animation:var(--miyuki-bar-loaders-cap)] motion-reduce:[transform:var(--miyuki-bar-loaders-cap-still)]";
const GROUP =
  "motion-safe:[animation:var(--miyuki-bar-loaders-group)] motion-reduce:[transform:var(--miyuki-bar-loaders-group-still)] motion-reduce:opacity-(--miyuki-bar-loaders-group-fade)";

const EQ_CORE = 15.5;
const eqScale = (level: number) => (level * 18 - 2.5) / EQ_CORE;
const eqLift = (level: number) => `translateY(${num((-eqScale(level) * EQ_CORE) / 2)}px)`;

const EQUALIZER = [
  { low: 0.3, high: 0.74, period: 1.17, delay: -0.19, still: 0.45 },
  { low: 0.36, high: 0.94, period: 0.93, delay: -0.69, still: 0.8 },
  { low: 0.46, high: 1, period: 1.41, delay: -0.71, still: 1 },
  { low: 0.32, high: 0.86, period: 1.06, delay: -0.85, still: 0.6 },
  { low: 0.3, high: 0.9, period: 1.29, delay: -0.44, still: 0.85 },
].map((bar, i) => ({ ...bar, x: 12 + (i - 2) * 4.25 }));

const SWEEP_PASS = 1.6;
const SWEEP_STEPS = 11;
const SWEEP_STEP = SWEEP_PASS / SWEEP_STEPS;

const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2;
};

const SLIDE = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  const head = 3 + 20 * ease(t / 0.72);
  const tail = 1 + 20 * ease((t - 0.2) / 0.68);
  return { t, tail, run: head - tail - 2, fade: ease(t / 0.07) * (1 - ease((t - 0.84) / 0.13)) };
});

const STACK_CORE = 15.5;
const STACK = [
  { scale: 1, fade: 1 },
  { scale: (0.7 * 18 - 2.5) / STACK_CORE, fade: 0.75 },
  { scale: (0.45 * 18 - 2.5) / STACK_CORE, fade: 0.55 },
];
const STACK_STEP = 0.6;

const CHARGE_CYCLE = 2.3;
const CHARGE_GAP = 0.35;
const CHARGE_FILL = 0.3;
const CHARGE_DRAIN = [3 * CHARGE_GAP + CHARGE_FILL + 0.4, 3 * CHARGE_GAP + CHARGE_FILL + 0.75].map(
  (s) => s / CHARGE_CYCLE,
);
const CHARGE = [0, 1, 2, 3].map((k) => ({
  x: 4.125 + k * 3.75,
  start: (k * CHARGE_GAP) / CHARGE_CYCLE,
  end: (k * CHARGE_GAP + CHARGE_FILL) / CHARGE_CYCLE,
}));

const STYLE = [
  "@keyframes miyuki-bar-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }",
  ...EQUALIZER.flatMap((bar, i) => [
    keyframes(`eq-${i}`, [
      [[0, 1], `transform: scaleY(${num(eqScale(bar.low))})`],
      [0.5, `transform: scaleY(${num(eqScale(bar.high))})`],
    ]),
    keyframes(`eq-cap-${i}`, [
      [[0, 1], `transform: ${eqLift(bar.low)}`],
      [0.5, `transform: ${eqLift(bar.high)}`],
    ]),
  ]),
  keyframes("sweep", [
    [[0, 4 / SWEEP_STEPS, 1], "transform: scaleY(1); opacity: 0.35"],
    [2 / SWEEP_STEPS, "transform: scaleY(3); opacity: 1"],
  ]),
  keyframes(
    "slide",
    SLIDE.map(({ t, tail, fade }) => [t, `transform: translateX(${num(tail + 1)}px); opacity: ${num(fade)}`]),
  ),
  keyframes(
    "slide-core",
    SLIDE.map(({ t, run }) => [t, `transform: scaleX(${num(run)})`]),
  ),
  keyframes(
    "slide-head",
    SLIDE.map(({ t, run }) => [t, `transform: translateX(${num(run)}px)`]),
  ),
  ...(
    [
      ["stack", (s: (typeof STACK)[number]) => `opacity: ${s.fade}`],
      ["stack-core", (s: (typeof STACK)[number]) => `transform: scaleX(${num(s.scale)})`],
      ["stack-cap", (s: (typeof STACK)[number]) => `transform: translateX(${num((s.scale - 1) * STACK_CORE)}px)`],
    ] as const
  ).map(([name, body]) =>
    keyframes(name, [
      [[0, 0.9, 1], body(STACK[0])],
      [[0.7 / 3, 1 / 3], body(STACK[2])],
      [[1.7 / 3, 2 / 3], body(STACK[1])],
    ]),
  ),
  keyframes("cross", [
    [0, "transform: rotate(0deg)"],
    [[0.32 / 1.5, 0.5], "transform: rotate(45deg)"],
    [[0.5 + 0.32 / 1.5, 1], "transform: rotate(90deg)"],
  ]),
  ...CHARGE.map((cell, k) =>
    keyframes(`charge-${k}`, [
      [0, `transform: scaleX(0); opacity: 1; animation-timing-function: ${k ? "linear" : POP}`],
      ...(k ? ([[cell.start, `transform: scaleX(0); animation-timing-function: ${POP}`]] as Stop[]) : []),
      [cell.end, "transform: scaleX(1); animation-timing-function: linear"],
      [CHARGE_DRAIN[0], `transform: scaleX(1); opacity: 1; animation-timing-function: ${BREATHE}`],
      [[CHARGE_DRAIN[1], 1], "transform: scaleX(1); opacity: 0"],
    ]),
  ),
].join("\n");

function Frame({
  size = 24,
  label = "Loading",
  className,
  style,
  children,
  ...props
}: BarLoaderProps & { children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-bar-loaders-breathe_1.8s_ease-in-out_infinite]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <style href="miyuki-bar-loaders" precedence="miyuki">
        {STYLE}
      </style>
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Drawing({
  children,
  ...props
}: {
  children: ReactNode;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-full overflow-visible"
      {...props}
    >
      {children}
    </svg>
  );
}

export function EqualizerLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="currentColor">
        {EQUALIZER.map((bar, i) => {
          const timing = `${bar.period}s ${BREATHE} ${bar.delay}s infinite`;
          return (
            <g
              key={bar.x}
              style={vars({
                core: `miyuki-bar-loaders-eq-${i} ${timing}`,
                cap: `miyuki-bar-loaders-eq-cap-${i} ${timing}`,
                "core-still": `scaleY(${num(eqScale(bar.still))})`,
                "cap-still": eqLift(bar.still),
              })}
            >
              <rect
                x={bar.x - 1.25}
                y={12 - EQ_CORE / 2}
                width={2.5}
                height={EQ_CORE}
                className={cn(CORE, "origin-center")}
              />
              <circle cx={bar.x} cy={12} r={1.25} className={CAP} />
              <g transform="matrix(1 0 0 -1 0 24)">
                <circle cx={bar.x} cy={12} r={1.25} className={CAP} />
              </g>
            </g>
          );
        })}
      </Drawing>
    </Frame>
  );
}

export function SweepLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="currentColor">
        {Array.from({ length: 9 }, (_, i) => {
          const away = Math.abs(i - 4);
          return (
            <rect
              key={i}
              x={1.25 + i * 2.5}
              y={9}
              width={1.5}
              height={6}
              rx={0.75}
              className={cn(CORE, "origin-center")}
              style={vars({
                core: `miyuki-bar-loaders-sweep ${SWEEP_PASS}s ${BREATHE} ${num((i - 6) * SWEEP_STEP - SWEEP_PASS)}s infinite`,
                "core-still": `scaleY(${away === 0 ? 3 : away === 1 ? 2 : 1})`,
                "core-fade": away === 0 ? 1 : away === 1 ? 0.675 : 0.35,
              })}
            />
          );
        })}
      </Drawing>
    </Frame>
  );
}

export function SlideLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="currentColor">
        <rect x={1} y={11} width={22} height={2} rx={1} opacity={0.25} />
        <g
          className={GROUP}
          style={vars({
            group: "miyuki-bar-loaders-slide 1.4s linear -0.56s infinite",
            core: "miyuki-bar-loaders-slide-core 1.4s linear -0.56s infinite",
            cap: "miyuki-bar-loaders-slide-head 1.4s linear -0.56s infinite",
            "group-still": "translateX(8px)",
            "core-still": "scaleX(8)",
            "cap-still": "translateX(8px)",
          })}
        >
          <circle cx={0} cy={12} r={1} />
          <rect x={0} y={11} width={1} height={2} className={cn(CORE, "origin-left")} />
          <circle cx={0} cy={12} r={1} className={CAP} />
        </g>
      </Drawing>
    </Frame>
  );
}

export function StackLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="currentColor">
        {STACK.map((line, j) => {
          const timing = `${3 * STACK_STEP}s ${SETTLE} ${num(j * STACK_STEP - 3 * STACK_STEP - 1.7)}s infinite`;
          const y = 6.5 + j * 5.5;
          return (
            <g
              key={y}
              className={GROUP}
              style={vars({
                group: `miyuki-bar-loaders-stack ${timing}`,
                core: `miyuki-bar-loaders-stack-core ${timing}`,
                cap: `miyuki-bar-loaders-stack-cap ${timing}`,
                "group-fade": line.fade,
                "core-still": `scaleX(${num(line.scale)})`,
                "cap-still": `translateX(${num((line.scale - 1) * STACK_CORE)}px)`,
              })}
            >
              <circle cx={4.25} cy={y} r={1.25} />
              <rect x={4.25} y={y - 1.25} width={STACK_CORE} height={2.5} className={cn(CORE, "origin-left")} />
              <circle cx={4.25 + STACK_CORE} cy={y} r={1.25} className={CAP} />
            </g>
          );
        })}
      </Drawing>
    </Frame>
  );
}

export function CrossLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          d="M12 4.25V19.75M4.25 12H19.75"
          className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-bar-loaders-cross_1.5s_cubic-bezier(0.34,1.56,0.64,1)_-1.2s_infinite]"
        />
      </Drawing>
    </Frame>
  );
}

export function ChargeLoader(props: BarLoaderProps) {
  return (
    <Frame {...props}>
      <Drawing fill="currentColor">
        <rect x={2} y={7} width={18} height={10} rx={2.75} fill="none" stroke="currentColor" strokeWidth={1.75} />
        <path d="M20.5 10H21.875A1 1 0 0 1 22.875 11V13A1 1 0 0 1 21.875 14H20.5Z" />
        {CHARGE.map((cell, k) => (
          <g key={cell.x}>
            <rect x={cell.x} y={9.125} width={2.5} height={5.75} rx={1} opacity={0.15} />
            <rect
              x={cell.x}
              y={9.125}
              width={2.5}
              height={5.75}
              rx={1}
              className={cn(CORE, "origin-left")}
              style={vars({
                core: `miyuki-bar-loaders-charge-${k} ${CHARGE_CYCLE}s linear -0.8s infinite`,
                "core-still": k < 3 ? "scaleX(1)" : "scaleX(0)",
              })}
            />
          </g>
        ))}
      </Drawing>
    </Frame>
  );
}
