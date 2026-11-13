"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type DangerLevel = 1 | 2 | 3 | 4 | 5;
export type Aspect = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type AvalancheProblemKind = "wind-slab" | "persistent-weak-layer" | "wet-snow" | "new-snow" | "gliding-snow";

export interface AvalancheProblem {
  kind: AvalancheProblemKind;
  title?: string;
  aspects: Aspect[];
  bands?: number[];
  elevation: string;
  time: string;
  hours?: [number, number];
  description: ReactNode;
}

export interface AvalancheForecaster {
  name: string;
  role?: string;
  avatar?: string;
  text: ReactNode;
}

export interface AvalancheBulletinData {
  region: string;
  areas?: string;
  issued: string;
  validUntil: string;
  level: DangerLevel;
  levels: DangerLevel[][];
  bands?: [string, string, string];
  headline: ReactNode;
  tendency?: ReactNode;
  problems: AvalancheProblem[];
  forecaster?: AvalancheForecaster;
}

export interface AvalancheBulletinProps extends Omit<ComponentProps<"article">, "children"> {
  bulletin: AvalancheBulletinData;
}

const ASPECTS: Aspect[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ASPECT_NAMES: Record<Aspect, string> = {
  N: "North",
  NE: "North-east",
  E: "East",
  SE: "South-east",
  S: "South",
  SW: "South-west",
  W: "West",
  NW: "North-west",
};
const LEVEL_NAMES = ["", "Low", "Moderate", "Considerable", "High", "Very high"];
const LEVEL_MEANING = [
  "",
  "Generally stable. Take care on isolated, extremely steep slopes.",
  "Mostly stable. Heightened care on the steep slopes named below.",
  "Unstable on many steep slopes. A single skier can release a slab.",
  "Unstable on most steep slopes. Natural avalanches are likely.",
  "Widespread instability. Large natural avalanches, even on gentle ground.",
];
const LEVEL_FILL = [
  "transparent",
  "var(--miyuki-avalanche-bulletin-l1)",
  "var(--miyuki-avalanche-bulletin-l2)",
  "color-mix(in oklab, var(--warning) 40%, var(--destructive))",
  "var(--destructive)",
  "color-mix(in oklab, var(--destructive) 62%, oklch(0.2 0.06 18))",
];
const LEVEL_TEXT = [
  "",
  "text-foreground",
  "text-foreground dark:text-background",
  "text-foreground dark:text-background",
  "text-destructive-foreground",
  "text-background dark:text-foreground",
];
const LEVEL_INK = [
  "",
  "fill-foreground",
  "fill-foreground dark:fill-background",
  "fill-foreground dark:fill-background",
  "fill-destructive-foreground",
  "fill-background dark:fill-foreground",
];
const PROBLEM_TITLES: Record<AvalancheProblemKind, string> = {
  "wind-slab": "Wind slab",
  "persistent-weak-layer": "Persistent weak layer",
  "wet-snow": "Wet snow",
  "new-snow": "New snow",
  "gliding-snow": "Gliding snow",
};
const DEFAULT_BANDS: [string, string, string] = ["Below the tree line", "Tree line", "Alpine"];
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const TAU = Math.PI * 2;
const r2 = (v: number) => Math.round(v * 100) / 100;

function pt(r: number, a: number) {
  return `${r2(r * Math.cos(a))} ${r2(r * Math.sin(a))}`;
}

function cellPath(r0: number, r1: number, aspect: number) {
  const a0 = -Math.PI / 2 + (aspect - 0.5) * (TAU / 8);
  const a1 = a0 + TAU / 8;
  if (r0 <= 0) return `M0 0L${pt(r1, a0)}A${r1} ${r1} 0 0 1 ${pt(r1, a1)}Z`;
  return `M${pt(r0, a0)}L${pt(r1, a0)}A${r1} ${r1} 0 0 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0} ${r0} 0 0 0 ${pt(r0, a0)}Z`;
}

const RINGS = [0, 0.36, 0.67, 1];

function describeAspects(list: Aspect[]) {
  const on = ASPECTS.map((a) => list.includes(a));
  const count = on.filter(Boolean).length;
  if (count === 0) return "";
  if (count === 8) return "All aspects";
  const start = on.findIndex((v, i) => v && !on[(i + 7) % 8]);
  const run: number[] = [];
  for (let k = 0; k < 8; k++) {
    const i = (start + k) % 8;
    if (!on[i]) break;
    run.push(i);
  }
  const name = (i: number, lower: boolean) =>
    lower ? ASPECT_NAMES[ASPECTS[i]].toLowerCase() : ASPECT_NAMES[ASPECTS[i]];
  if (run.length !== count) return list.map((a) => ASPECT_NAMES[a]).join(", ");
  if (count === 1) return name(run[0], false);
  if (count === 2) return `${name(run[0], false)} and ${name(run[1], true)}`;
  return `${name(run[0], false)} through ${name(run[Math.floor((count - 1) / 2)], true)} to ${name(run[count - 1], true)}`;
}

function levelAt(levels: DangerLevel[][], aspect: number, band: number): DangerLevel {
  return (levels[aspect]?.[band] ?? 1) as DangerLevel;
}

function Rose({ levels, bands, label }: { levels: DangerLevel[][]; bands: [string, string, string]; label: string }) {
  const [active, setActive] = useState<[number, number] | null>(null);
  const [focused, setFocused] = useState(false);
  const R = 84;
  const readout = active
    ? `${ASPECT_NAMES[ASPECTS[active[0]]]}, ${bands[active[1]].toLowerCase()}: ${LEVEL_NAMES[levelAt(levels, active[0], active[1])].toLowerCase()} (${levelAt(levels, active[0], active[1])})`
    : null;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const [a, b] = active ?? [0, 2];
    let next: [number, number] | null = null;
    if (e.key === "ArrowRight") next = [(a + 1) % 8, b];
    else if (e.key === "ArrowLeft") next = [(a + 7) % 8, b];
    else if (e.key === "ArrowUp") next = [a, Math.min(2, b + 1)];
    else if (e.key === "ArrowDown") next = [a, Math.max(0, b - 1)];
    else if (e.key === "Home") next = [0, b];
    else if (e.key === "End") next = [7, b];
    if (next) {
      e.preventDefault();
      setActive(next);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read each slope: left and right to turn, up and down to change height.`}
        onKeyDown={onKey}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) {
            setFocused(true);
            setActive((cur) => cur ?? [0, 2]);
          }
        }}
        onBlur={() => {
          setFocused(false);
          setActive(null);
        }}
        onPointerLeave={() => {
          if (!focused) setActive(null);
        }}
        className="relative rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <svg viewBox="-104 -104 208 208" className="block size-52 overflow-visible" aria-hidden="true">
          {ASPECTS.map((_, a) =>
            [0, 1, 2].map((b) => (
              <path
                key={`${a}-${b}`}
                d={cellPath(RINGS[b] * R, RINGS[b + 1] * R, a)}
                fill={LEVEL_FILL[levelAt(levels, a, b)]}
                stroke="var(--miyuki-avalanche-bulletin-gap, var(--background))"
                strokeWidth={2}
                strokeLinejoin="round"
                onPointerEnter={() => setActive([a, b])}
                onPointerDown={() => setActive([a, b])}
              />
            )),
          )}
          <g textAnchor="middle" className="pointer-events-none text-[10.5px] font-medium tabular-nums">
            {ASPECTS.map((_, a) =>
              [0, 1, 2].map((b) => {
                const ang = -Math.PI / 2 + a * (TAU / 8);
                const r = ((RINGS[b] + RINGS[b + 1]) / 2) * R + (b === 0 ? 3 : 0);
                const level = levelAt(levels, a, b);
                return (
                  <text
                    key={`${a}-${b}`}
                    x={r2(r * Math.cos(ang))}
                    y={r2(r * Math.sin(ang))}
                    dy="0.35em"
                    className={LEVEL_INK[level]}
                  >
                    {level}
                  </text>
                );
              }),
            )}
          </g>
          {active ? (
            <path
              d={cellPath(RINGS[active[1]] * R, RINGS[active[1] + 1] * R, active[0])}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={2}
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          ) : null}
          {ASPECTS.map((name, a) => {
            const ang = -Math.PI / 2 + a * (TAU / 8);
            const r = R + (name.length > 1 ? 14 : 11);
            return (
              <text
                key={name}
                x={r2(r * Math.cos(ang))}
                y={r2(r * Math.sin(ang))}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn("fill-muted-foreground text-[10.5px]", name === "N" && "fill-foreground font-semibold")}
              >
                {name}
              </text>
            );
          })}
        </svg>
      </div>
      <p aria-live="polite" className="min-h-5 text-center text-[13px] text-muted-foreground tabular-nums">
        {readout ?? "Point at a slope to read it."}
      </p>
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Aspect</th>
              {bands.map((b) => (
                <th key={b} scope="col">
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASPECTS.map((name, a) => (
              <tr key={name}>
                <th scope="row">{ASPECT_NAMES[name]}</th>
                {[0, 1, 2].map((b) => (
                  <td key={b}>
                    {levelAt(levels, a, b)} {LEVEL_NAMES[levelAt(levels, a, b)]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniRose({ aspects, bands, level }: { aspects: Aspect[]; bands: number[]; level: DangerLevel }) {
  const R = 22;
  return (
    <svg viewBox="-25 -25 50 50" className="size-12 shrink-0" aria-hidden="true">
      {ASPECTS.map((name, a) =>
        [0, 1, 2].map((b) => {
          const on = aspects.includes(name) && bands.includes(b);
          return (
            <path
              key={`${a}-${b}`}
              d={cellPath(RINGS[b] * R, RINGS[b + 1] * R, a)}
              fill={on ? LEVEL_FILL[level] : "var(--muted)"}
              stroke="var(--card)"
              strokeWidth={1.25}
              strokeLinejoin="round"
            />
          );
        }),
      )}
      <path d="M0 -24.5 L-2 -21.2 L2 -21.2Z" fill="var(--foreground)" />
    </svg>
  );
}

function DayBar({ hours }: { hours: [number, number] }) {
  const [from, to] = hours;
  return (
    <span aria-hidden="true" className="relative block h-12 w-12 shrink-0">
      <svg viewBox="-25 -25 50 50" className="size-12">
        <circle r={19} fill="none" stroke="var(--muted)" strokeWidth={4.5} />
        <circle r={21.25} fill="none" stroke="var(--border)" strokeWidth={0.75} />
        <circle
          r={19}
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity={0.62}
          strokeWidth={4.5}
          pathLength={24}
          strokeDasharray={`${to - from} 24`}
          strokeDashoffset={-from}
          transform="rotate(-90)"
        />
        {[0, 6, 12, 18].map((h) => (
          <line
            key={h}
            x1={0}
            x2={0}
            y1={-23.5}
            y2={-21.5}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            transform={`rotate(${h * 15})`}
          />
        ))}
        <text
          y={0.5}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground text-[8.5px] tabular-nums"
        >
          24h
        </text>
      </svg>
    </span>
  );
}

function ProblemGlyph({ kind }: { kind: AvalancheProblemKind }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden="true">
      <path d="M3 24 L25 24" {...common} strokeOpacity={0.35} />
      <path d="M4 24 L19 9 L25 9" {...common} strokeOpacity={0.55} />
      {kind === "wind-slab" ? (
        <>
          <path d="M9 19 L16 12 L20.5 12.8 L13.5 19.8Z" {...common} />
          <path d="M3 7.5 H10.5 a2 2 0 1 0 -2-2" {...common} />
          <path d="M3 11.5 H7.5" {...common} />
        </>
      ) : kind === "persistent-weak-layer" ? (
        <>
          <path d="M8 20 L19.5 8.5" {...common} />
          <path d="M11.5 20.5 L22 10" {...common} strokeDasharray="1.6 2.4" />
          <path d="M15 21 L24 12" {...common} />
        </>
      ) : kind === "wet-snow" ? (
        <>
          <path d="M8.5 3.5 C8.5 3.5 5 8 5 10.2 a3.5 3.5 0 0 0 7 0 C12 8 8.5 3.5 8.5 3.5Z" {...common} />
          <path d="M11 20.5 C13 19.5 15 20.5 17 19.2" {...common} />
        </>
      ) : kind === "new-snow" ? (
        <>
          <path d="M8 3.5 V12.5 M4.1 5.75 L11.9 10.25 M4.1 10.25 L11.9 5.75" {...common} />
          <path d="M10 21 C12.5 18.6 15.5 17.8 18.5 16.5" {...common} />
        </>
      ) : (
        <>
          <path d="M10.5 17.5 L13 15 L12 13.2 L14.8 10.6" {...common} />
          <path d="M15.5 20.5 L21.5 14.5" {...common} />
        </>
      )}
    </svg>
  );
}

function Scale({ level }: { level: DangerLevel }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="mt-6">
      <ol className="flex items-end gap-1.5" aria-label={`Danger scale, level ${level} of 5 marked`}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= level;
          const current = n === level;
          return (
            <li
              key={n}
              className="flex flex-1 flex-col items-stretch gap-1.5"
              aria-current={current ? "step" : undefined}
            >
              <span className="relative block overflow-clip rounded-[5px]" style={{ height: 10 + n * 7 }}>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[inherit] bg-muted ring-1 ring-border ring-inset"
                />
                {on ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 origin-bottom rounded-[inherit]"
                    style={{ background: LEVEL_FILL[n] }}
                    initial={reduced ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 500, damping: 30, delay: 0.15 + n * 0.05 }
                    }
                  />
                ) : null}
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[inherit] ring-2 ring-foreground ring-inset"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-center text-xs tabular-nums",
                  current ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="sr-only">Level </span>
                {n}
                <span className="sr-only"> {LEVEL_NAMES[n]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function AvalancheBulletin({ bulletin, className, style, ...props }: AvalancheBulletinProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const bands = bulletin.bands ?? DEFAULT_BANDS;
  const level = bulletin.level;
  const name = LEVEL_NAMES[level];

  return (
    <article
      {...props}
      aria-labelledby={`${id}-title`}
      className={cn(
        "@container w-full text-foreground",
        "[--miyuki-avalanche-bulletin-l1:color-mix(in_oklab,var(--warning)_28%,var(--card))] [--miyuki-avalanche-bulletin-l2:color-mix(in_oklab,var(--warning)_74%,var(--card))]",
        "dark:[--miyuki-avalanche-bulletin-l1:color-mix(in_oklab,var(--warning)_30%,oklch(0.25_0.025_70))] dark:[--miyuki-avalanche-bulletin-l2:color-mix(in_oklab,var(--warning)_80%,oklch(0.25_0.025_70))]",
        className,
      )}
      style={style}
    >
      <header className="flex flex-col gap-4 border-b border-border pb-5 @xl:flex-row @xl:items-end @xl:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">Avalanche bulletin</p>
          <h2 id={`${id}-title`} className="mt-1 font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
            {bulletin.region}
          </h2>
          {bulletin.areas ? <p className="mt-1 text-sm text-muted-foreground">{bulletin.areas}</p> : null}
        </div>
        <dl className="grid shrink-0 grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] @xl:text-right">
          <dt className="text-muted-foreground @xl:text-right">Issued</dt>
          <dd className="font-medium tabular-nums">{bulletin.issued}</dd>
          <dt className="text-muted-foreground @xl:text-right">Valid until</dt>
          <dd className="font-medium tabular-nums">{bulletin.validUntil}</dd>
        </dl>
      </header>

      <div className="grid gap-10 border-b border-border py-8 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:gap-12">
        <section aria-labelledby={`${id}-level`} className="min-w-0">
          <h3 id={`${id}-level`} className="text-[13px] text-muted-foreground">
            Danger level today
          </h3>
          <div className="mt-3 flex items-center gap-5">
            <motion.div
              className={cn(
                "grid size-24 shrink-0 place-items-center rounded-2xl shadow-sm ring-1 ring-foreground/10 @xl:size-28",
                LEVEL_TEXT[level],
              )}
              style={{ background: LEVEL_FILL[level] }}
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduced ? { duration: 0 } : SETTLE}
            >
              <span
                aria-hidden="true"
                className="font-display text-[4rem] leading-none font-semibold tracking-[-0.04em] tabular-nums @xl:text-[4.5rem]"
              >
                {level}
              </span>
            </motion.div>
            <div className="min-w-0">
              <p className="font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance @xl:text-[2.5rem]">
                <span className="sr-only">Level {level}, </span>
                {name}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">Level {level} of 5</p>
            </div>
          </div>
          <Scale level={level} />
          <p className="mt-6 max-w-[34rem] text-base/7 font-medium text-pretty">{bulletin.headline}</p>
          <p className="mt-2 max-w-[34rem] text-sm/6 text-pretty text-muted-foreground">{LEVEL_MEANING[level]}</p>
          {bulletin.tendency ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[13px]">
              {bulletin.tendency}
            </p>
          ) : null}
        </section>

        <section aria-labelledby={`${id}-rose`} className="flex flex-col items-center gap-4 @2xl:items-stretch">
          <h3 id={`${id}-rose`} className="self-start text-[13px] text-muted-foreground">
            Danger by slope and height
          </h3>
          <div className="flex flex-col items-center gap-5 @md:flex-row @md:items-start @2xl:flex-col @2xl:items-center">
            <Rose levels={bulletin.levels} bands={bands} label={`Danger by aspect and elevation, ${bulletin.region}`} />
            <ul className="flex flex-col gap-1.5 text-[13px] @md:pt-6 @2xl:pt-0">
              {[2, 1, 0].map((b) => (
                <li key={b} className="flex items-center gap-2.5">
                  <svg viewBox="-10 -10 20 20" className="size-4 shrink-0" aria-hidden="true">
                    {[0, 1, 2].map((k) => (
                      <circle
                        key={k}
                        r={RINGS[k + 1] * 9}
                        fill="none"
                        stroke={k === b ? "var(--foreground)" : "var(--border-strong)"}
                        strokeWidth={k === b ? 1.6 : 1}
                      />
                    ))}
                  </svg>
                  <span>
                    {bands[b]}
                    <span className="text-muted-foreground">
                      {" "}
                      · {b === 2 ? "outer ring" : b === 1 ? "middle ring" : "centre"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section aria-labelledby={`${id}-problems`} className="border-b border-border py-8">
        <h3 id={`${id}-problems`} className="text-base font-semibold tracking-[-0.01em]">
          Avalanche problems
        </h3>
        <ul className="mt-4 grid gap-4 @2xl:grid-cols-3">
          {bulletin.problems.map((problem, i) => (
            <motion.li
              key={`${problem.kind}-${i}`}
              className="flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { ...SETTLE, delay: 0.25 + i * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                  <ProblemGlyph kind={problem.kind} />
                </span>
                <h4 className="text-[15px] leading-tight font-semibold tracking-[-0.01em]">
                  {problem.title ?? PROBLEM_TITLES[problem.kind]}
                </h4>
              </div>
              <dl className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <MiniRose aspects={problem.aspects} bands={problem.bands ?? [0, 1, 2]} level={level} />
                  <div className="min-w-0 text-[13px] leading-5">
                    <dt className="text-muted-foreground">Where</dt>
                    <dd className="font-medium text-pretty">
                      {describeAspects(problem.aspects)}
                      <span className="block font-normal text-foreground/80">{problem.elevation}</span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DayBar hours={problem.hours ?? [0, 24]} />
                  <div className="min-w-0 text-[13px] leading-5">
                    <dt className="text-muted-foreground">When</dt>
                    <dd className="font-medium text-pretty">{problem.time}</dd>
                  </div>
                </div>
              </dl>
              <p className="mt-4 border-t border-border pt-4 text-sm/6 text-pretty text-muted-foreground">
                {problem.description}
              </p>
            </motion.li>
          ))}
        </ul>
      </section>

      {bulletin.forecaster ? (
        <section
          aria-labelledby={`${id}-note`}
          className="grid gap-4 pt-8 @2xl:grid-cols-[12rem_minmax(0,1fr)] @2xl:gap-12"
        >
          <div className="flex items-center gap-3 @2xl:flex-col @2xl:items-start">
            <h3 id={`${id}-note`} className="sr-only">
              From the forecaster
            </h3>
            {bulletin.forecaster.avatar ? (
              <img
                src={bulletin.forecaster.avatar}
                alt=""
                className="size-10 shrink-0 rounded-full bg-muted object-cover ring-1 ring-foreground/10"
              />
            ) : null}
            <div className="text-[13px] leading-5">
              <p className="font-medium">{bulletin.forecaster.name}</p>
              {bulletin.forecaster.role ? <p className="text-muted-foreground">{bulletin.forecaster.role}</p> : null}
            </div>
          </div>
          <div className="max-w-[38rem] text-[15px]/7 text-pretty text-foreground/90 [&_p+p]:mt-3">
            {bulletin.forecaster.text}
          </div>
        </section>
      ) : null}
    </article>
  );
}
