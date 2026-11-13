"use client";

import { scaleBand } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import {
  AxisBottom,
  AxisLeft,
  axisTitleRoom,
  axisWidth,
  barPath,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartMotion,
  closestIndex,
  crisp,
  formatCompact,
  formatNumber,
  GridLines,
  niceScale,
  staggerDelay,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export interface ChannelBarsSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChannelBarsProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  series: ChannelBarsSeries[];
  goal?: number;
  goalLabel?: string;
  bestLabel?: string | null;
  format?: (value: number) => string;
  formatAxis?: (value: number) => string;
  height?: number;
  titles?: string[];
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 4, bottom: 24 };
const GAP = 2;
const GOAL = "var(--foreground)";

export function ChannelBars({
  labels,
  series,
  goal,
  goalLabel = "Goal",
  bestLabel = "Best day",
  format = (v) => formatNumber(v),
  formatAxis = formatCompact,
  height = 208,
  titles,
  legend = true,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  ...props
}: ChannelBarsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const clipId = useChartId("orders-clip");
  const [labelIn, setLabelIn] = useState(false);

  const n = labels.length;
  const colors = series.map((s, i) => s.color ?? chartColor(i));
  const totals = labels.map((_, j) => series.reduce((sum, s) => sum + (s.data[j] ?? 0), 0));
  const best = totals.indexOf(Math.max(...totals));
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const { scale: y, ticks } = niceScale(Math.max(...totals, goal ?? 0) * (bestLabel ? 1.14 : 1), [innerH, 0]);
  const goalText = goal != null ? `${goalLabel} ${format(goal)}` : "";
  const left = axisWidth(ticks, formatAxis) + 10 + room.left;
  const right = goal != null ? textWidth(goalText) + 10 : 4;
  const innerW = Math.max(0, width - left - right);
  const x = scaleBand<string>()
    .domain(labels.map((_, i) => String(i)))
    .range([0, innerW])
    .paddingInner(0.4)
    .paddingOuter(0.16);
  const bar = Math.min(x.bandwidth(), 36);
  const centers = labels.map((_, i) => (x(String(i)) ?? 0) + x.bandwidth() / 2);

  const columns = labels.map((_, j) => {
    let base = 0;
    const visible = series.map((s) => (s.data[j] ?? 0) > 0);
    const lastVisible = visible.lastIndexOf(true);
    return series.map((s, i) => {
      const h = innerH - y(s.data[j] ?? 0);
      const from = base;
      base += h;
      const gap = i > 0 && from > 0 ? GAP : 0;
      return { from: from + gap, h: Math.max(0, h - gap), top: i === lastVisible };
    });
  });

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: best,
    locate: (px) => (innerW > 0 ? closestIndex(centers, px - left) : null),
  });

  const seriesTotals = series.map((s) => s.data.reduce((a, b) => a + b, 0));
  const description = withAxisTitles(
    summary ??
      `${series.map((s) => s.name).join(" and ")} stacked, ${labels[0]} to ${labels[n - 1]}. ` +
        `Highest ${format(totals[best])} on ${labels[best]}, lowest ${format(Math.min(...totals))} on ${labels[totals.indexOf(Math.min(...totals))]}.` +
        (goal != null ? ` ${totals.filter((t) => t >= goal).length} of ${n} reach the goal of ${format(goal)}.` : ""),
    { xLabel, yLabel },
  );

  const bestTop = MARGIN.top + y(totals[best] ?? 0);

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ChartLegend
            items={[
              ...series.map((s, i) => ({
                label: s.name,
                color: colors[i],
                value: format(seriesTotals[i]),
                marker: "square" as const,
              })),
              ...(goal != null ? [{ label: goalLabel, color: GOAL, marker: "dashed" as const }] : []),
            ]}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <g transform={`translate(${left} ${MARGIN.top})`}>
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={formatAxis} label={yLabel} />
              <AxisBottom
                scale={x}
                y={innerH}
                width={innerW}
                overflow={[left, right]}
                format={(_, i) => labels[i]}
                emphasis={active ?? undefined}
                label={xLabel}
              />
              <g transform={`translate(0 ${innerH}) scale(1 -1)`}>
                <clipPath id={clipId}>
                  {centers.map((c, j) => (
                    <motion.rect
                      key={j}
                      x={c - bar / 2 - 1}
                      y={-1}
                      width={bar + 2}
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: inView || reduce ? innerH + 2 : 0 }}
                      transition={
                        reduce ? { duration: 0 } : { ...chartMotion.reveal, duration: 0.7, delay: staggerDelay(j, n) }
                      }
                    />
                  ))}
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                  {columns.map((segments, j) => (
                    <g
                      key={j}
                      className="transition-opacity duration-150 ease-settle"
                      opacity={active != null && active !== j ? 0.4 : 1}
                    >
                      {segments.map((seg, i) => (
                        <path
                          key={i}
                          d={barPath(centers[j] - bar / 2, seg.from, bar, seg.h, 0, seg.top ? 6 : 0)}
                          style={{ fill: colors[i] }}
                        />
                      ))}
                    </g>
                  ))}
                </g>
              </g>
              {goal != null && (
                <g aria-hidden="true">
                  <line
                    x1={0}
                    x2={innerW}
                    y1={crisp(y(goal))}
                    y2={crisp(y(goal))}
                    strokeWidth={1.25}
                    strokeDasharray="5 4"
                    opacity={0.55}
                    style={{ stroke: GOAL }}
                  />
                  <text
                    x={innerW + 10}
                    y={y(goal)}
                    dy="0.34em"
                    className="fill-foreground font-medium"
                    style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                  >
                    {goalText}
                  </text>
                </g>
              )}
            </g>
          </svg>
        )}
        {width > 0 && bestLabel && n > 0 && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 rounded-full bg-primary px-1.5 text-[11px] leading-[18px] font-medium whitespace-nowrap text-primary-foreground shadow-xs"
            style={{ x: "-50%", y: "-100%", left: left + centers[best], top: bestTop - 6 }}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: (inView || reduce) && active == null ? 1 : 0, scale: inView || reduce ? 1 : 0.9 }}
            transition={
              reduce
                ? { duration: 0.12 }
                : active != null
                  ? { duration: 0.12 }
                  : { ...chartMotion.settle, delay: labelIn ? 0 : 0.75 }
            }
            onAnimationComplete={(definition) => {
              if ((definition as { opacity?: unknown }).opacity === 1) setLabelIn(true);
            }}
          >
            {bestLabel}
          </motion.span>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + centers[active]}
            y={MARGIN.top + y(totals[active])}
            offset={bar / 2 + 8}
            title={titles?.[active] ?? labels[active]}
            items={series
              .map((s, i) => ({
                label: s.name,
                value: format(s.data[active] ?? 0),
                color: colors[i],
                marker: "square" as const,
              }))
              .reverse()}
          >
            <div className="mt-1 flex justify-between gap-4 border-t border-border pt-1">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground tabular-nums">{format(totals[active])}</span>
            </div>
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Orders"}
        columns={["Period", ...series.map((s) => s.name), "Total"]}
        rows={labels.map((l, j) => [titles?.[j] ?? l, ...series.map((s) => format(s.data[j] ?? 0)), format(totals[j])])}
      />
    </ChartCard>
  );
}
