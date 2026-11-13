"use client";

import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import {
  AxisBottom,
  AxisTitle,
  axisTitleRoom,
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartMotion,
  formatNumber,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface RidgePlotSeries {
  label: string;
  values: number[];
  title?: string;
}

export interface RidgePlotProps extends Omit<ChartCardProps, "children"> {
  series: RidgePlotSeries[];
  overlap?: number;
  normalize?: boolean;
  domain?: [number, number];
  bandwidth?: number;
  rowHeight?: number;
  color?: string;
  unit?: string;
  countName?: string;
  format?: (value: number) => string;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

interface Stats {
  n: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
}

const SAMPLES = 140;
const LIFT = 7;
const AXIS = 26;
const LABEL_GAP = 12;
const RIGHT = 6;
const HEADROOM = 4 + LIFT;
const LABEL_SIZE = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}

function describe(values: readonly number[]): Stats {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
  };
}

function silverman(values: readonly number[], stats: Stats): number {
  const n = values.length;
  if (n < 2) return 1;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  const spread = Math.min(sd, (stats.q3 - stats.q1) / 1.34) || sd || 1;
  return 0.9 * spread * n ** -0.2;
}

function density(values: readonly number[], xs: readonly number[], bw: number, floor: number | null): number[] {
  const k = 1 / (bw * Math.sqrt(2 * Math.PI));
  return xs.map((x) => {
    let sum = 0;
    for (const v of values) {
      const u = (x - v) / bw;
      sum += Math.exp(-0.5 * u * u);
      if (floor != null) {
        const r = (x - (2 * floor - v)) / bw;
        sum += Math.exp(-0.5 * r * r);
      }
    }
    return sum * k;
  });
}

function sampleAt(xs: readonly number[], ys: readonly number[], x: number): number {
  if (xs.length === 0) return 0;
  if (x <= xs[0]) return ys[0];
  const last = xs.length - 1;
  if (x >= xs[last]) return ys[last];
  const step = (xs[last] - xs[0]) / last;
  const i = Math.min(last - 1, Math.floor((x - xs[0]) / step));
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + (ys[i + 1] - ys[i]) * t;
}

export function RidgePlot({
  series,
  overlap = 0.5,
  normalize = false,
  domain,
  bandwidth,
  rowHeight = 34,
  color = "var(--chart-1)",
  unit = "",
  countName = "Values",
  format,
  xLabel,
  yLabel,
  summary,
  label,
  ...props
}: RidgePlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const id = useChartId("ridge");
  const fmt = format ?? ((v: number) => `${formatNumber(v)}${unit ? ` ${unit}` : ""}`);

  const model = useMemo(() => {
    const stats = series.map((s) => describe(s.values));
    const all = series.flatMap((s) => s.values).filter(Number.isFinite);
    const bounded = all.length > 0 && all.every((v) => v >= 0);
    const raw = series.map((s, i) => bandwidth ?? silverman(s.values, stats[i]));
    const spread = raw.reduce((m, w) => Math.max(m, w), 0);
    const lo = domain?.[0] ?? (bounded ? 0 : Math.min(...all) - 2 * spread);
    const hi = domain?.[1] ?? Math.max(lo + 1, Math.max(...all) + spread * 0.5);
    const x = scaleLinear().domain([lo, hi]);
    if (!domain) x.nice(6);
    const [d0, d1] = x.domain();
    const widths = raw.map((w) => (bandwidth != null ? w : Math.max(w, (d1 - d0) / 48)));
    const xs = Array.from({ length: SAMPLES }, (_, j) => d0 + ((d1 - d0) * j) / (SAMPLES - 1));
    const floor = bounded && d0 === 0 ? 0 : null;
    const curves = series.map((s, i) => {
      const values = s.values.filter(Number.isFinite);
      if (values.length === 0) return xs.map(() => 0);
      const d = density(values, xs, widths[i], floor);
      return normalize ? d.map((v) => v / values.length) : d;
    });
    const peak = curves.reduce((m, c) => Math.max(m, ...c), 0) || 1;
    return { stats, xs, curves, peak, domain: [d0, d1] as [number, number] };
  }, [series, domain, bandwidth, normalize]);

  const n = series.length;
  const room = axisTitleRoom({ xLabel, yLabel });
  const labelW = series.reduce((w, s) => Math.max(w, textWidth(s.label, LABEL_SIZE)), 0) + LABEL_GAP + room.left;
  const innerW = Math.max(0, width - labelW - RIGHT);
  const rise = rowHeight * (1 + 2.5 * clamp(overlap, 0, 1));
  const top = rise - rowHeight + HEADROOM;
  const baselines = series.map((_, i) => top + (i + 1) * rowHeight);
  const floorY = top + n * rowHeight;
  const height = floorY + AXIS + room.bottom;
  const x = scaleLinear().domain(model.domain).range([0, innerW]);
  const ticks = x.ticks(innerW < 300 ? 4 : 6);
  const xsPx = model.xs.map((v) => x(v));
  const ysPx = model.curves.map((c, i) => c.map((d) => baselines[i] - (d / model.peak) * rise));

  const ridgeArea = (i: number) =>
    area<number>()
      .x((_, j) => xsPx[j])
      .y0(baselines[i])
      .y1((y) => y)
      .curve(curveMonotoneX)(ysPx[i]) ?? "";
  const ridgeLine = (i: number) =>
    line<number>()
      .x((_, j) => xsPx[j])
      .y((y) => y)
      .curve(curveMonotoneX)(ysPx[i]) ?? "";

  const depth = (i: number) => (n > 1 ? (n - 1 - i) / (n - 1) : 0);
  const strength = (i: number) => 0.9 - 0.56 * depth(i);
  const mix = (amount: number) =>
    `color-mix(in oklab, ${color} ${Math.round(clamp(amount, 0, 1) * 100)}%, var(--card))`;
  const crest = (i: number) => mix(strength(i));
  const mist = (i: number) => mix(strength(i) * 0.22);
  const edge = (i: number) => mix(strength(i) + 0.14);

  const curveAt = (i: number, px: number) => sampleAt(xsPx, ysPx[i], px);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: 0,
    locate: (px, py) => {
      if (innerW <= 0 || n === 0) return null;
      const lx = px - labelW;
      if (lx >= -2 && lx <= innerW + 2) {
        for (let i = n - 1; i >= 0; i--) {
          if (py <= baselines[i] + 2 && py >= curveAt(i, clamp(lx, 0, innerW)) - 3) return i;
        }
      }
      const row = Math.round((py - top) / rowHeight - 0.5);
      return clamp(row, 0, n - 1);
    },
  });

  const name = typeof label === "string" ? label : "Distributions";
  const titleOf = (i: number) => series[i].title ?? series[i].label;
  const description = withAxisTitles(
    (() => {
      if (summary) return summary;
      if (n === 0) return "No data.";
      const { stats } = model;
      let hiMed = 0;
      let loMed = 0;
      let wide = 0;
      stats.forEach((s, i) => {
        if (s.median > stats[hiMed].median) hiMed = i;
        if (s.median < stats[loMed].median) loMed = i;
        if (s.max - s.min > stats[wide].max - stats[wide].min) wide = i;
      });
      return (
        `${name}: ${n} distributions, ${titleOf(0)} to ${titleOf(n - 1)}. ` +
        `Medians run from ${fmt(stats[loMed].median)} in ${titleOf(loMed)} to ${fmt(stats[hiMed].median)} in ${titleOf(hiMed)}. ` +
        `The widest range is ${titleOf(wide)}, from ${fmt(stats[wide].min)} to ${fmt(stats[wide].max)}.`
      );
    })(),
    { xLabel, yLabel },
  );

  const renderRidge = (i: number) => (
    <>
      <path d={ridgeArea(i)} fill={`url(#${id}-fill-${i})`} />
      <path
        d={ridgeLine(i)}
        fill="none"
        strokeWidth={3.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: "var(--card)" }}
      />
      <path
        d={ridgeLine(i)}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: edge(i) }}
      />
    </>
  );

  const current = active != null ? model.stats[active] : null;
  const medianTop = active != null && current ? curveAt(active, x(current.median)) : 0;

  return (
    <ChartCard label={label} {...props}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              {series.map((_, i) => (
                <linearGradient key={i} id={`${id}-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: crest(i) }} />
                  <stop offset="0.6" style={{ stopColor: `color-mix(in oklab, ${crest(i)} 55%, ${mist(i)})` }} />
                  <stop offset="1" style={{ stopColor: mist(i) }} />
                </linearGradient>
              ))}
              {active != null && current && (
                <clipPath id={`${id}-middle`}>
                  <rect x={x(current.q1)} y={0} width={Math.max(0, x(current.q3) - x(current.q1))} height={height} />
                </clipPath>
              )}
            </defs>
            <g aria-hidden="true" style={{ fontSize: LABEL_SIZE }} textAnchor="end">
              {series.map((s, i) => (
                <text
                  key={i}
                  x={labelW - LABEL_GAP}
                  y={baselines[i] - 5}
                  className={cn(
                    "transition-[fill,opacity] duration-200 ease-settle",
                    active === i ? "fill-foreground font-medium" : "fill-muted-foreground",
                    active != null && active !== i && "opacity-60",
                  )}
                >
                  {s.label}
                </text>
              ))}
            </g>
            <AxisTitle side="left" x={0} y={top} length={floorY - top}>
              {yLabel}
            </AxisTitle>
            <g transform={`translate(${labelW} 0)`}>
              <AxisBottom
                scale={x}
                ticks={ticks}
                y={floorY}
                width={innerW}
                overflow={[labelW, RIGHT]}
                format={(v, k) =>
                  k === ticks.length - 1 && unit ? `${formatNumber(Number(v))} ${unit}` : formatNumber(Number(v))
                }
                label={xLabel}
              />
              {series.map((_, i) => (
                <motion.g
                  key={i}
                  aria-hidden="true"
                  initial={reduce ? false : { scaleY: 0, opacity: 0 }}
                  animate={inView || reduce ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { ...chartMotion.reveal, duration: 1.1, delay: i * 0.08 }}
                  style={{ originX: 0, originY: `${baselines[i]}px`, transformBox: "view-box" }}
                >
                  {renderRidge(i)}
                </motion.g>
              ))}
              <rect
                aria-hidden="true"
                x={-2}
                y={0}
                width={innerW + 4}
                height={floorY + 1}
                className="pointer-events-none fill-card transition-opacity duration-200 ease-settle motion-reduce:transition-none"
                opacity={active != null ? 0.62 : 0}
              />
              {active != null && current && (
                <g aria-hidden="true" className="pointer-events-none">
                  <g className="stroke-foreground/70" strokeWidth={1.5} strokeLinecap="round">
                    <line
                      x1={x(current.min)}
                      x2={x(current.max)}
                      y1={baselines[active] - 1.5}
                      y2={baselines[active] - 1.5}
                    />
                    <line
                      x1={x(current.min)}
                      x2={x(current.min)}
                      y1={baselines[active] - 4.5}
                      y2={baselines[active] + 1.5}
                    />
                    <line
                      x1={x(current.max)}
                      x2={x(current.max)}
                      y1={baselines[active] - 4.5}
                      y2={baselines[active] + 1.5}
                    />
                  </g>
                  <motion.g
                    key={active}
                    initial={reduce ? { y: -LIFT, opacity: 0 } : { y: 0 }}
                    animate={{ y: -LIFT, opacity: 1 }}
                    transition={reduce ? { duration: 0.12 } : chartMotion.settle}
                  >
                    {renderRidge(active)}
                    <path
                      d={ridgeArea(active)}
                      clipPath={`url(#${id}-middle)`}
                      style={{ fill: color, fillOpacity: 0.22 }}
                    />
                    <line
                      x1={x(current.median)}
                      x2={x(current.median)}
                      y1={baselines[active]}
                      y2={medianTop + 1}
                      strokeWidth={1.5}
                      className="stroke-foreground"
                    />
                    <circle
                      cx={x(current.median)}
                      cy={medianTop}
                      r={3.5}
                      strokeWidth={2}
                      className="fill-foreground stroke-card"
                    />
                  </motion.g>
                </g>
              )}
            </g>
          </svg>
        )}
        {width > 0 && active != null && current && (
          <ChartTooltip
            x={labelW + x(current.median)}
            y={medianTop - LIFT}
            offset={14}
            placement="top"
            title={`${titleOf(active)}, ${formatNumber(current.n)} ${countName.toLowerCase()}`}
            items={[
              { label: "Median", value: fmt(current.median) },
              { label: "Middle half", value: `${formatNumber(current.q1)}–${fmt(current.q3)}` },
              { label: "Range", value: `${formatNumber(current.min)}–${fmt(current.max)}` },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={name}
        columns={["", countName, "Median", "Lower quartile", "Upper quartile", "Lowest", "Highest"]}
        rows={series.map((_, i) => {
          const s = model.stats[i];
          return [titleOf(i), formatNumber(s.n), fmt(s.median), fmt(s.q1), fmt(s.q3), fmt(s.min), fmt(s.max)];
        })}
      />
    </ChartCard>
  );
}
