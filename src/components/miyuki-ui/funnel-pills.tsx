"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartMotion,
  formatNumber,
  formatPercent,
  staggerDelay,
  textWidth,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface FunnelPillsStage {
  name: string;
  value: number;
  icon?: ReactNode;
  color?: string;
}

export interface FunnelPillsProps extends Omit<ChartCardProps, "children"> {
  stages: FunnelPillsStage[];
  format?: (value: number) => string;
  formatShare?: (share: number) => string;
  summary?: string;
}

const BAR = 28;
const GAP = 12;
const GUTTER = 12;
const TILE = 20;
const LINE = 20;
const STACK_BELOW = 340;

export function FunnelPills({
  stages,
  format = (v) => formatNumber(v),
  formatShare = (v) => formatPercent(v, { digits: 0 }),
  summary,
  label,
  ...props
}: FunnelPillsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();

  const n = stages.length;
  const first = stages[0]?.value ?? 0;
  const colors = stages.map((s, i) => s.color ?? chartColor(i));
  const shares = stages.map((s) => (first > 0 ? s.value / first : 0));
  const counts = stages.map((s) => format(s.value));
  const shareText = shares.map((s) => formatShare(s));

  const countW = Math.max(0, ...counts.map((c) => textWidth(c, 13))) + 4;
  const shareW = Math.max(28, ...shareText.map((s) => textWidth(s, 13))) + 2;
  const numbersW = countW + 8 + shareW;
  const stacked = width > 0 && width < STACK_BELOW;
  const nameW = stacked
    ? 0
    : Math.min(Math.max(0, ...stages.map((s) => textWidth(s.name, 13))) + 2, Math.round(width * 0.32));
  const trackX = stacked ? 0 : nameW + GUTTER;
  const trackW = Math.max(0, stacked ? width : width - nameW - numbersW - GUTTER * 2);
  const lengths = shares.map((s) => Math.max(BAR, Math.min(1, s) * trackW));
  const barTop = stacked ? LINE + 6 : 0;
  const rowH = barTop + BAR;
  const pitch = rowH + (stacked ? GAP + 4 : GAP);
  const height = Math.max(rowH, n * pitch - (pitch - rowH));

  const { active, bind } = useNearestIndex({
    count: n,
    locate: (_, py) => Math.max(0, Math.min(n - 1, Math.floor((py + (pitch - rowH) / 2) / pitch))),
  });

  const drops = stages.slice(1).map((s, i) => (stages[i].value > 0 ? 1 - s.value / stages[i].value : 0));
  const steepest = drops.length > 0 ? drops.indexOf(Math.max(...drops)) : -1;
  const name = typeof label === "string" ? label : "Stages";
  const description =
    summary ??
    (n === 0
      ? "No data."
      : `${name} in ${n} stages, from ${counts[0]} at ${stages[0].name} to ${counts[n - 1]} at ${stages[n - 1].name}, ` +
        `${shareText[n - 1]} of the first stage.` +
        (steepest >= 0
          ? ` The largest drop is from ${stages[steepest].name} to ${stages[steepest + 1].name}, losing ${formatPercent(drops[steepest], { digits: 0 })}.`
          : ""));

  return (
    <ChartCard label={label} {...props}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 &&
          stages.map((stage, i) => {
            const fade = cn(
              "transition-opacity duration-150 ease-settle",
              active != null && active !== i && "opacity-40",
            );
            const numbers = (
              <div className="flex shrink-0 items-baseline justify-end gap-2 text-[13px] leading-5 tabular-nums">
                <span className="font-medium text-foreground">{counts[i]}</span>
                <span className="text-right text-muted-foreground" style={{ width: shareW }}>
                  {shareText[i]}
                </span>
              </div>
            );
            const nameText = (
              <span className="min-w-0 truncate text-[13px] leading-5 text-foreground">{stage.name}</span>
            );
            return (
              <div
                key={`${stage.name}-${i}`}
                aria-hidden="true"
                className={cn("absolute inset-x-0", fade)}
                style={{ top: i * pitch, height: rowH }}
              >
                {stacked ? (
                  <div className="flex items-center justify-between gap-3" style={{ height: LINE }}>
                    {nameText}
                    {numbers}
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-y-0 left-0 flex items-center" style={{ width: nameW }}>
                      {nameText}
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center" style={{ width: numbersW }}>
                      <div className="w-full">{numbers}</div>
                    </div>
                  </>
                )}
                <div className="absolute" style={{ left: trackX, top: barTop, width: trackW, height: BAR }}>
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full bg-muted transition-[background-color] duration-150 ease-settle",
                      active === i && "bg-accent",
                    )}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: lengths[i], background: colors[i] }}
                    initial={reduce ? false : { clipPath: `inset(0 100% 0 0 round ${BAR / 2}px)` }}
                    animate={{
                      clipPath:
                        inView || reduce
                          ? `inset(0 0% 0 0 round ${BAR / 2}px)`
                          : `inset(0 100% 0 0 round ${BAR / 2}px)`,
                    }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { ...chartMotion.reveal, duration: 0.8, delay: staggerDelay(i, n) * 1.5 }
                    }
                  >
                    {stage.icon != null && (
                      <span
                        className="absolute top-1 left-1 grid place-items-center rounded-full bg-card shadow-xs [&_svg]:size-3 [&_svg]:stroke-[2.25]"
                        style={{
                          width: TILE,
                          height: TILE,
                          color: `color-mix(in oklab, ${colors[i]} 78%, var(--foreground))`,
                        }}
                      >
                        {stage.icon}
                      </span>
                    )}
                  </motion.div>
                </div>
              </div>
            );
          })}
        {width > 0 && active != null && (
          <ChartTooltip
            x={trackX + lengths[active]}
            y={active * pitch + barTop + BAR / 2}
            placement="top"
            offset={BAR / 2 + 6}
            title={stages[active].name}
            items={[
              { label: "Count", value: counts[active], color: colors[active] },
              ...(active > 0
                ? [
                    { label: `Of ${stages[0].name.toLowerCase()}`, value: shareText[active] },
                    {
                      label: `From ${stages[active - 1].name.toLowerCase()}`,
                      value: formatShare(
                        stages[active - 1].value > 0 ? stages[active].value / stages[active - 1].value : 0,
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={name}
        columns={["Stage", "Count", `Share of ${stages[0]?.name.toLowerCase() ?? "first"}`, "From previous stage"]}
        rows={stages.map((s, i) => [
          s.name,
          counts[i],
          shareText[i],
          i === 0 ? "" : formatShare(stages[i - 1].value > 0 ? s.value / stages[i - 1].value : 0),
        ])}
      />
    </ChartCard>
  );
}
