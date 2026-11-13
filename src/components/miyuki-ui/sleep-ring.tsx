"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartMarker,
  ChartPlot,
  ChartTable,
  chartColor,
  chartMotion,
  formatPercent,
  staggerDelay,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface SleepStage {
  name: string;
  minutes: number;
  color?: string;
}

export interface SleepRingProps extends Omit<ChartCardProps, "children"> {
  score: number;
  stages: SleepStage[];
  rating?: string;
  formatDuration?: (minutes: number) => string;
  size?: number;
  thickness?: number;
  summary?: string;
}

const GAP = 4;

function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${m} m` : `${m} m`;
}

function lay(visuals: number[], thickness: number, circumference: number) {
  const arcs: { start: number; length: number }[] = [];
  let end = 0;
  for (const visual of visuals) {
    arcs.push({
      start: (end + thickness / 2) / circumference,
      length: Math.max(0, visual - thickness) / circumference,
    });
    end += visual + GAP;
  }
  return { arcs, end };
}

function ratingFor(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

function Segment({
  c,
  r,
  thickness,
  start,
  length,
  color,
  play,
  delay,
}: {
  c: number;
  r: number;
  thickness: number;
  start: number;
  length: number;
  color: string;
  play: boolean;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const on = play || !!reduce;
  return (
    <motion.circle
      cx={c}
      cy={c}
      r={r}
      fill="none"
      strokeWidth={thickness}
      strokeLinecap="round"
      initial={reduce ? false : { pathLength: 0, pathOffset: start, opacity: 0 }}
      animate={{ pathLength: on ? length : 0, pathOffset: start, opacity: on && length > 0.0005 ? 1 : 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              pathLength: { ...chartMotion.fill, delay },
              pathOffset: chartMotion.fill,
              opacity: { duration: 0.12, delay },
            }
      }
      style={{ stroke: color }}
    />
  );
}

export function SleepRing({
  score,
  stages,
  rating,
  formatDuration = duration,
  size = 188,
  thickness = 12,
  summary,
  label,
  ...props
}: SleepRingProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();

  const n = stages.length;
  const colors = stages.map((s, i) => s.color ?? chartColor(i));
  const total = stages.reduce((sum, s) => sum + Math.max(0, s.minutes), 0);
  const shares = stages.map((s) => (total > 0 ? Math.max(0, s.minutes) / total : 0));
  const clamped = Math.max(0, Math.min(100, score));
  const word = rating ?? ratingFor(clamped);

  const diameter = Math.min(size, width > 0 ? width : size);
  const c = diameter / 2;
  const r = c - thickness / 2;
  const circumference = 2 * Math.PI * r;
  const span = (clamped / 100) * circumference;
  const usable = Math.max(0, span - n * GAP);
  const { arcs, end } = lay(
    shares.map((share) => share * usable),
    thickness,
    circumference,
  );
  const rest = circumference - end;
  const track =
    rest > thickness
      ? { start: (end + thickness / 2) / circumference, length: (rest - thickness) / circumference }
      : null;

  const { active, setActive, bind } = useNearestIndex({
    count: n,
    locate: (px, py) => {
      const d = Math.hypot(px - c, py - c);
      if (Math.abs(d - r) > thickness / 2 + 10) return null;
      let turn = Math.atan2(px - c, c - py) / (2 * Math.PI);
      if (turn < 0) turn += 1;
      const at = turn * circumference;
      let best: number | null = null;
      let bestD = thickness;
      arcs.forEach((a, i) => {
        const s = a.start * circumference - thickness / 2;
        const e = (a.start + a.length) * circumference + thickness / 2;
        const delta = at < s ? s - at : at > e ? at - e : 0;
        if (delta < bestD) {
          bestD = delta;
          best = i;
        }
      });
      return best;
    },
  });

  const description =
    summary ??
    `Sleep score ${clamped} out of 100, ${word.toLowerCase()}. ` +
      stages
        .map((s, i) => `${s.name} ${formatDuration(s.minutes)}, ${formatPercent(shares[i], { digits: 0 })}`)
        .join("; ") +
      ".";

  return (
    <ChartCard label={label} {...props}>
      <div ref={plotRef} className="min-w-0">
        <ChartPlot
          summary={description}
          height={diameter}
          className="mx-auto rounded-full"
          style={{ width: diameter }}
          {...bind}
        >
          {width > 0 && (
            <svg width={diameter} height={diameter} aria-hidden="true" className="block">
              <g transform={`rotate(-90 ${c} ${c})`}>
                {track && (
                  <circle
                    cx={c}
                    cy={c}
                    r={r}
                    fill="none"
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${track.length} 1`}
                    strokeDashoffset={-track.start}
                    className="stroke-muted"
                  />
                )}
                {arcs.map((a, i) => (
                  <g
                    key={stages[i].name}
                    className={cn(
                      "transition-opacity duration-200 ease-settle",
                      active != null && active !== i && "opacity-30",
                    )}
                  >
                    <Segment
                      c={c}
                      r={r}
                      thickness={thickness}
                      start={a.start}
                      length={a.length}
                      color={colors[i]}
                      play={inView}
                      delay={staggerDelay(i, n) * 4}
                    />
                  </g>
                ))}
              </g>
            </svg>
          )}
          {width > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-[13px] leading-4 font-medium text-muted-foreground">{word}</span>
              <motion.span
                key={clamped}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={chartMotion.settle}
                className="mt-3 font-display text-[60px] leading-none font-semibold tracking-[-0.04em] text-foreground tabular-nums [text-box:trim-both_cap_alphabetic]"
              >
                {clamped}
              </motion.span>
              <span className="h-7" />
            </div>
          )}
        </ChartPlot>
      </div>
      <ul className="mt-6 grid gap-1">
        {stages.map((s, i) => (
          <li
            key={s.name}
            onPointerEnter={(event) => event.pointerType !== "touch" && setActive(i)}
            onPointerLeave={(event) => event.pointerType !== "touch" && setActive(null)}
            className={cn(
              "grid grid-cols-[4.75rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-md px-2 py-1.5 text-[13px] leading-5 transition-colors duration-150 ease-settle",
              "-mx-2",
              active === i && "bg-accent",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <ChartMarker color={colors[i]} />
              <span className={cn("truncate", active === i && "text-foreground")}>{s.name}</span>
            </span>
            <span className="relative h-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: colors[i] }}
                initial={reduce ? false : { x: "-100%" }}
                animate={{ x: inView || reduce ? `${(shares[i] - 1) * 100}%` : "-100%" }}
                transition={reduce ? { duration: 0 } : { ...chartMotion.fill, delay: 0.1 + staggerDelay(i, n) * 2 }}
              />
            </span>
            <span className="text-right font-medium text-foreground tabular-nums">{formatDuration(s.minutes)}</span>
          </li>
        ))}
      </ul>
      <ChartTable
        caption={typeof label === "string" ? label : "Sleep stages"}
        columns={["Stage", "Time", "Share of night"]}
        rows={stages.map((s, i) => [s.name, formatDuration(s.minutes), formatPercent(shares[i], { digits: 0 })])}
      />
    </ChartCard>
  );
}
