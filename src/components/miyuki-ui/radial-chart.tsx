"use client";

import { scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartMarker,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartColors,
  chartMotion,
  formatCompact,
  formatNumber,
  formatPercent,
  staggerDelay,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export type RadialChartVariant = "rings" | "gauge" | "stacked";

export interface RadialChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface RadialChartProps extends Omit<ChartCardProps, "children"> {
  data: RadialChartDatum[];
  variant?: RadialChartVariant;
  max?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
  name?: string;
  format?: (value: number) => string;
  formatScale?: (value: number) => string;
  size?: number;
  thickness?: number;
  legend?: boolean;
  summary?: string;
}

const TAU = Math.PI * 2;
const SWEEP: Record<RadialChartVariant, number> = { rings: 0.75, gauge: 0.75, stacked: 0.5 };
const BASE: Record<RadialChartVariant, number> = { rings: 0, gauge: -0.375, stacked: -0.25 };
const SIZE: Record<RadialChartVariant, number> = { rings: 236, gauge: 224, stacked: 304 };
const THICKNESS: Record<RadialChartVariant, number> = { rings: 14, gauge: 18, stacked: 18 };
const RING_GAP = 6;
const SEGMENT_GAP = 4;

interface Arc {
  r: number;
  start: number;
  length: number;
}

function point(cx: number, cy: number, r: number, turn: number): [number, number] {
  return [cx + r * Math.sin(turn * TAU), cy - r * Math.cos(turn * TAU)];
}

function lay(visuals: number[], thickness: number, gap: number, circumference: number) {
  const arcs: { start: number; length: number }[] = [];
  let end = 0;
  for (const visual of visuals) {
    arcs.push({
      start: (end + thickness / 2) / circumference,
      length: Math.max(0, visual - thickness) / circumference,
    });
    end += visual + gap;
  }
  return { arcs, end };
}

function turnAt(cx: number, cy: number, x: number, y: number): number {
  const a = Math.atan2(x - cx, cy - y) / TAU;
  return a < 0 ? a + 1 : a;
}

function ArcFill({
  cx,
  cy,
  r,
  thickness,
  start,
  length,
  color,
  play,
  delay,
}: {
  cx: number;
  cy: number;
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
      cx={cx}
      cy={cy}
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

function Track({
  cx,
  cy,
  r,
  thickness,
  start,
  length,
  color,
}: Arc & { cx: number; cy: number; thickness: number; color: string }) {
  if (length <= 0) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      strokeWidth={thickness}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={`${length} 1`}
      strokeDashoffset={-start}
      className="[--miyuki-radial-chart-mix:20%] dark:[--miyuki-radial-chart-mix:16%]"
      style={{ stroke: `color-mix(in oklab, ${color} var(--miyuki-radial-chart-mix), var(--muted))` }}
    />
  );
}

export function RadialChart({
  data,
  variant = "stacked",
  max,
  centerValue,
  centerLabel,
  name = "Value",
  format = (v) => formatNumber(v),
  formatScale = formatCompact,
  size = SIZE[variant],
  thickness = THICKNESS[variant],
  legend = variant === "stacked",
  summary,
  footer,
  label,
  ...props
}: RadialChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);

  const items = variant === "gauge" ? data.slice(0, 1) : data;
  const n = items.length;
  const colors = items.map((d, i) => d.color ?? (variant === "gauge" ? chartColors[0] : chartColor(i)));
  const total = items.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const largest = Math.max(0, ...items.map((d) => d.value));
  const top =
    max ??
    (variant === "stacked"
      ? total
      : variant === "gauge"
        ? 100
        : scaleLinear()
            .domain([0, largest || 1])
            .nice(4)
            .domain()[1]);
  const sweep = SWEEP[variant];
  const base = BASE[variant];
  const T = thickness;

  const room = width > 0 ? Math.max(0, width / 2 - 2) : size / 2;
  const outer = Math.max(T * 2, Math.min(size / 2, room));
  const r0 = outer - T / 2;
  const circumference = TAU * r0;
  const cx = width / 2;
  const pad = T / 2 > 8 ? 2 : 6;

  let height: number;
  let cy: number;
  let arcs: Arc[];
  let tracks: Arc[];
  if (variant === "rings") {
    cy = outer + pad;
    height = outer * 2 + pad * 2;
    const radii = items.map((_, i) => r0 - i * (T + RING_GAP));
    arcs = items.map((d, i) => ({
      r: radii[i],
      start: 0,
      length: sweep * Math.min(1, Math.max(0, d.value / (top || 1))),
    }));
    tracks = radii.map((r) => ({ r, start: 0, length: sweep }));
  } else if (variant === "gauge") {
    cy = outer + pad;
    height = cy + r0 * Math.SQRT1_2 + T / 2 + 24;
    arcs = [{ r: r0, start: 0, length: sweep * Math.min(1, Math.max(0, (items[0]?.value ?? 0) / (top || 1))) }];
    tracks = [{ r: r0, start: 0, length: sweep }];
  } else {
    cy = outer + pad;
    height = cy + 4;
    const span = sweep * circumference;
    const usable = Math.max(0, span - (n - 1) * SEGMENT_GAP);
    const scale = top > 0 ? usable / Math.max(top, total) : 0;
    const laid = lay(
      items.map((d) => Math.max(0, d.value) * scale),
      T,
      SEGMENT_GAP,
      circumference,
    );
    arcs = laid.arcs.map((a) => ({ r: r0, ...a }));
    const rest = span - laid.end;
    const cursor = laid.end;
    tracks = rest > T ? [{ r: r0, start: (cursor + T / 2) / circumference, length: (rest - T) / circumference }] : [];
  }

  const ends = arcs.map((a) => point(cx, cy, a.r, base + a.start + a.length));

  const { active, setActive, bind } = useNearestIndex({
    count: n,
    locate: (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      if (variant === "rings") {
        let best: number | null = null;
        let bestD = T / 2 + RING_GAP;
        arcs.forEach((a, i) => {
          const delta = Math.abs(d - a.r);
          if (delta <= bestD) {
            bestD = delta;
            best = i;
          }
        });
        return best;
      }
      if (Math.abs(d - r0) > T / 2 + 14) return null;
      const rel = (turnAt(cx, cy, px, py) - base + 1) % 1;
      if (rel > sweep + 0.04 && rel < 0.96) return null;
      if (variant === "gauge") return 0;
      const at = Math.min(Math.max(rel, 0), sweep) * circumference;
      let best: number | null = null;
      let bestD = Infinity;
      arcs.forEach((a, i) => {
        const s = a.start * circumference - T / 2;
        const e = (a.start + a.length) * circumference + T / 2;
        const delta = at < s ? s - at : at > e ? at - e : 0;
        if (delta < bestD) {
          bestD = delta;
          best = i;
        }
      });
      return best;
    },
  });

  const share = (v: number) => (total > 0 ? v / total : 0);
  const description =
    summary ??
    (variant === "gauge"
      ? `${items[0]?.name ?? "Value"} ${format(items[0]?.value ?? 0)} of ${format(top)}, ${formatPercent((items[0]?.value ?? 0) / (top || 1), { digits: 0 })}.`
      : `${variant === "stacked" ? "Half gauge" : "Concentric rings"} of ${n} values totalling ${format(total)}: ` +
        items.map((d) => `${d.name} ${format(d.value)} (${formatPercent(share(d.value), { digits: 0 })})`).join(", ") +
        ".");

  const current = active != null ? items[active] : null;
  const fits = Math.max(2, Math.floor((width || 400) / 72));
  const perRow = n <= fits ? n : Math.min(fits, Math.ceil(n / Math.ceil(n / fits)));
  const labelSize = 12;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ul className="flex flex-wrap justify-center gap-y-3 text-center">
            {items.map((d, i) => (
              <li
                key={i}
                onPointerEnter={(event) => event.pointerType !== "touch" && setActive(i)}
                onPointerLeave={(event) => event.pointerType !== "touch" && setActive(null)}
                className={cn(
                  "min-w-0 px-1 transition-opacity duration-200 ease-settle",
                  active != null && active !== i && "opacity-60",
                )}
                style={{ width: `${100 / perRow}%` }}
              >
                <span className="flex items-center justify-center gap-1.5 text-xs leading-4 text-muted-foreground">
                  <ChartMarker color={colors[i]} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="mt-1 block text-[13px] leading-5 font-medium text-foreground tabular-nums">
                  {format(d.value)}
                </span>
              </li>
            ))}
          </ul>
        ) : undefined)
      }
    >
      <div ref={plotRef} className="min-w-0">
        <ChartPlot summary={description} height={height} {...bind}>
          {width > 0 && (
            <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
              <g transform={`rotate(${base * 360 - 90} ${cx} ${cy})`}>
                {tracks.map((t, i) => (
                  <Track
                    key={i}
                    cx={cx}
                    cy={cy}
                    thickness={T}
                    {...t}
                    color={
                      variant === "rings" ? colors[i] : variant === "gauge" ? colors[0] : "var(--muted-foreground)"
                    }
                  />
                ))}
                {arcs.map((a, i) => (
                  <g
                    key={i}
                    className={cn(
                      "transition-opacity duration-200 ease-settle",
                      active != null && active !== i && (variant === "gauge" ? "" : "opacity-30"),
                    )}
                  >
                    <ArcFill
                      cx={cx}
                      cy={cy}
                      r={a.r}
                      thickness={T}
                      start={a.start}
                      length={a.length}
                      color={colors[i]}
                      play={inView}
                      delay={variant === "stacked" ? staggerDelay(i, n) * 2.5 : staggerDelay(i, n) * 2}
                    />
                  </g>
                ))}
              </g>
              {variant === "rings" && (
                <g style={{ fontSize: labelSize, fontVariantNumeric: "tabular-nums" }} textAnchor="end">
                  {items.map((d, i) => (
                    <text
                      key={i}
                      x={cx - T / 2 - 8}
                      y={cy - arcs[i].r}
                      dy="0.34em"
                      className={cn(
                        "transition-opacity duration-200 ease-settle",
                        active != null && active !== i && "opacity-50",
                      )}
                    >
                      <tspan className="fill-muted-foreground">{d.name}</tspan>
                      <tspan dx={5} className="fill-foreground font-medium">
                        {format(d.value)}
                      </tspan>
                    </text>
                  ))}
                </g>
              )}
              {variant === "gauge" && (
                <g strokeLinecap="round">
                  {Array.from({ length: 21 }, (_, i) => {
                    const major = i % 5 === 0;
                    const inner = r0 - T / 2 - 7;
                    const [x1, y1] = point(cx, cy, inner, base + (i / 20) * sweep);
                    const [x2, y2] = point(cx, cy, inner - (major ? 7 : 4), base + (i / 20) * sweep);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        strokeWidth={major ? 1.5 : 1}
                        className={major ? "stroke-muted-foreground/50" : "stroke-border-strong"}
                      />
                    );
                  })}
                </g>
              )}
              {variant === "gauge" && (
                <g
                  className="fill-muted-foreground"
                  style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                  textAnchor="middle"
                >
                  {[0, top].map((v, i) => {
                    const [x, y] = point(cx, cy, r0, base + i * sweep);
                    return (
                      <text key={i} x={x} y={y + T / 2 + 16}>
                        {formatScale(v)}
                      </text>
                    );
                  })}
                </g>
              )}
              {variant !== "stacked" && active != null && (
                <circle
                  cx={ends[active][0]}
                  cy={ends[active][1]}
                  r={T / 2 - 4}
                  className="pointer-events-none"
                  strokeWidth={2}
                  style={{ fill: "none", stroke: "var(--background)" }}
                />
              )}
            </svg>
          )}
          {width > 0 && variant === "stacked" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 flex flex-col items-center text-center"
              style={{ bottom: height - cy + 4 }}
            >
              <motion.div
                key={active ?? "total"}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={chartMotion.settle}
                className="flex flex-col items-center"
              >
                <span className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground tabular-nums">
                  {current && <span className="size-2 rounded-full" style={{ background: colors[active ?? 0] }} />}
                  {current ? (
                    <>
                      {current.name}
                      <span className="font-medium text-foreground">
                        {formatPercent(share(current.value), { digits: 0 })}
                      </span>
                    </>
                  ) : (
                    (centerLabel ?? "Total")
                  )}
                </span>
                <span className="mt-2.5 font-display text-4xl leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                  {current ? format(current.value) : (centerValue ?? format(total))}
                </span>
              </motion.div>
            </div>
          )}
          {width > 0 && variant === "gauge" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 flex -translate-y-1/2 flex-col items-center text-center"
              style={{ top: cy + 6 }}
            >
              <span className="font-display text-[44px] leading-none font-semibold tracking-[-0.025em] text-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                {centerValue ?? formatPercent((items[0]?.value ?? 0) / (top || 1), { digits: 0 })}
              </span>
              {(centerLabel != null || current) && (
                <span className="mt-2.5 text-[13px] leading-5 text-muted-foreground tabular-nums">
                  {current ? (
                    <>
                      <span className="font-medium text-foreground">{format(current.value)}</span> of {format(top)}
                    </>
                  ) : (
                    centerLabel
                  )}
                </span>
              )}
            </div>
          )}
          {width > 0 && variant === "rings" && current && active != null && (
            <ChartTooltip
              x={ends[active][0]}
              y={ends[active][1]}
              offset={T / 2 + 8}
              title={current.name}
              items={[
                { label: name, value: format(current.value), color: colors[active] },
                { label: "Share of total", value: formatPercent(share(current.value), { digits: 0 }) },
              ]}
            />
          )}
        </ChartPlot>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : "Radial chart"}
        columns={["Name", "Value", variant === "gauge" ? "Share of target" : "Share of total"]}
        rows={items.map((d) => [
          d.name,
          format(d.value),
          formatPercent(variant === "gauge" ? d.value / (top || 1) : share(d.value), { digits: 0 }),
        ])}
      />
    </ChartCard>
  );
}
