"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartMarker,
  ChartPlot,
  ChartTable,
  chartColor,
  chartMotion,
  formatNumber,
  formatPercent,
  staggerDelay,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface GoalRing {
  name: string;
  value: number;
  goal: number;
  color?: string;
  format?: (value: number) => string;
}

export interface GoalRingsProps extends Omit<ChartCardProps, "children"> {
  rings: GoalRing[];
  size?: number;
  thickness?: number;
  gap?: number;
  tiles?: boolean;
  summary?: string;
}

function useSweep(target: number, play: boolean, delay: number) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  useEffect(() => {
    if (reduce) {
      progress.jump(target);
      return;
    }
    if (!play) return;
    const controls = animate(progress, target, { ...chartMotion.fill, delay });
    return () => controls.stop();
  }, [progress, target, play, reduce, delay]);
  return progress;
}

function Measure({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\d[\d,.]*)/)
        .filter(Boolean)
        .map((part, i) =>
          /^\d/.test(part) ? (
            <span key={i}>{part}</span>
          ) : (
            <span key={i} className="text-xs font-normal whitespace-pre text-muted-foreground">
              {part}
            </span>
          ),
        )}
    </>
  );
}

interface RingProps {
  c: number;
  r: number;
  thickness: number;
  share: number;
  color: string;
  play: boolean;
  delay: number;
  dim: boolean;
}

function Ring({ c, r, thickness, share, color, play, delay, dim }: RingProps) {
  const progress = useSweep(share, play, delay);
  const first = useTransform(progress, (v) => Math.min(Math.max(v, 0), 1));
  const second = useTransform(progress, (v) => Math.min(Math.max(v - 1, 0), 1));
  const firstOpacity = useTransform(progress, (v) => (v > 0.002 ? 1 : 0));
  const secondOpacity = useTransform(progress, (v) => (v > 1.002 ? 1 : 0));
  return (
    <g
      transform={`rotate(-90 ${c} ${c})`}
      fill="none"
      strokeWidth={thickness}
      className={cn("transition-opacity duration-200 ease-settle", dim && "opacity-30")}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        className="[--miyuki-goal-rings-mix:20%] dark:[--miyuki-goal-rings-mix:18%]"
        style={{ stroke: `color-mix(in oklab, ${color} var(--miyuki-goal-rings-mix), var(--muted))` }}
      />
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        strokeLinecap="round"
        style={{ stroke: color, pathLength: first, opacity: firstOpacity }}
      />
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        strokeLinecap="round"
        style={{
          stroke: `color-mix(in oklab, ${color} 80%, var(--foreground))`,
          pathLength: second,
          opacity: secondOpacity,
        }}
      />
    </g>
  );
}

export function GoalRings({
  rings,
  size = 196,
  thickness = 16,
  gap = 4,
  tiles = true,
  summary,
  label,
  ...props
}: GoalRingsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);

  const n = rings.length;
  const colors = rings.map((ring, i) => ring.color ?? chartColor(i));
  const formats = rings.map((ring) => ring.format ?? ((v: number) => formatNumber(v)));
  const shares = rings.map((ring) => (ring.goal > 0 ? Math.max(0, ring.value / ring.goal) : 0));
  const diameter = Math.min(size, width > 0 ? width : size);
  const c = diameter / 2;
  const radii = rings.map((_, i) => c - thickness / 2 - i * (thickness + gap));

  const { active, setActive, bind } = useNearestIndex({
    count: n,
    locate: (px, py) => {
      const d = Math.hypot(px - c, py - c);
      let best: number | null = null;
      let bestD = thickness / 2 + gap;
      radii.forEach((r, i) => {
        const delta = Math.abs(d - r);
        if (delta <= bestD) {
          bestD = delta;
          best = i;
        }
      });
      return best;
    },
  });

  const description =
    summary ??
    `${rings
      .map(
        (ring, i) =>
          `${ring.name} ${formats[i](ring.value)}, ${formatPercent(shares[i], { digits: 0 })} of the ${formats[i](ring.goal)} goal`,
      )
      .join(". ")}.`;

  return (
    <ChartCard label={label} {...props}>
      {tiles && (
        <div className="mb-5 @container">
          <div
            className="grid gap-2 @max-[22rem]:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {rings.map((ring, i) => (
              <div
                key={ring.name}
                onPointerEnter={(event) => event.pointerType !== "touch" && setActive(i)}
                onPointerLeave={(event) => event.pointerType !== "touch" && setActive(null)}
                className={cn(
                  "min-w-0 rounded-lg bg-muted px-3 py-2.5 transition-[background-color,box-shadow] duration-150 ease-settle @max-[22rem]:px-2.5",
                  active === i && "bg-accent ring-1 ring-border-strong ring-inset",
                )}
              >
                <p className="flex items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                  <ChartMarker color={colors[i]} />
                  <span className="truncate">{ring.name}</span>
                </p>
                <p className="mt-1.5 truncate text-base leading-6 font-semibold text-foreground tabular-nums @max-[22rem]:text-sm">
                  <Measure text={formats[i](ring.value)} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
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
              {rings.map((ring, i) => (
                <Ring
                  key={ring.name}
                  c={c}
                  r={radii[i]}
                  thickness={thickness}
                  share={shares[i]}
                  color={colors[i]}
                  play={inView}
                  delay={staggerDelay(i, n) * 2}
                  dim={active != null && active !== i}
                />
              ))}
            </svg>
          )}
          {width > 0 && active != null && (
            <motion.div
              key={active}
              aria-hidden="true"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={chartMotion.settle}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <span className="text-xs leading-4 text-muted-foreground">{rings[active].name}</span>
              <span className="mt-1 text-xl leading-none font-semibold tracking-[-0.01em] text-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                {formatPercent(shares[active], { digits: 0 })}
              </span>
            </motion.div>
          )}
        </ChartPlot>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : "Activity"}
        columns={["Ring", "Value", "Goal", "Share of goal"]}
        rows={rings.map((ring, i) => [
          ring.name,
          formats[i](ring.value),
          formats[i](ring.goal),
          formatPercent(shares[i], { digits: 0 }),
        ])}
      />
    </ChartCard>
  );
}
