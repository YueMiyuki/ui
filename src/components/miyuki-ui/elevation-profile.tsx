"use client";

import { scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import {
  ActiveDot,
  AxisLeft,
  AxisTitle,
  axisTitleRoom,
  axisWidth,
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  Crosshair,
  formatNumber,
  GridLines,
  RevealMask,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface ElevationPoint {
  km: number;
  m: number;
}

export interface ElevationWaypoint {
  km: number;
  name: string;
}

export interface ElevationScrub {
  km: number;
  m: number;
  gradient: number;
}

export interface ElevationProfileProps extends Omit<ChartCardProps, "children"> {
  points: ElevationPoint[];
  waypoints?: ElevationWaypoint[];
  onScrub?: (state: ElevationScrub | null) => void;
  steep?: number;
  height?: number;
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { right: 6, bottom: 24 };
const POLE = 14;
const ROW = 15;
const WINDOW = 0.25;

const metres = (m: number) => `${formatNumber(Math.round(m))} m`;
const percent = (g: number) => `${g > 0.0005 ? "+" : g < -0.0005 ? "−" : ""}${formatNumber(Math.abs(g * 100))}%`;

function profile(points: ElevationPoint[]) {
  const ks = points.map((p) => p.km);
  const ms = points.map((p) => p.m);
  const at = (km: number) => {
    if (ks.length === 0) return 0;
    if (km <= ks[0]) return ms[0];
    if (km >= ks[ks.length - 1]) return ms[ms.length - 1];
    let lo = 0;
    let hi = ks.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ks[mid] <= km) lo = mid;
      else hi = mid;
    }
    const u = (km - ks[lo]) / (ks[hi] - ks[lo] || 1);
    return ms[lo] + (ms[hi] - ms[lo]) * u;
  };
  const start = ks[0] ?? 0;
  const end = ks[ks.length - 1] ?? 0;
  const gradient = (km: number) => {
    const a = Math.max(start, km - WINDOW);
    const b = Math.min(end, km + WINDOW);
    return b > a ? (at(b) - at(a)) / ((b - a) * 1000) : 0;
  };
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < ms.length; i++) {
    const d = ms[i] - ms[i - 1];
    if (d > 0) ascent += d;
    else descent -= d;
  }
  return { at, gradient, start, end, ascent, descent };
}

function Rise({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
      <path
        d={down ? "M1.5 3.5l3.5 3.5 2-2 3.5 3.5M10.5 5.5v3h-3" : "M1.5 8.5L5 5l2 2 3.5-3.5M10.5 6.5v-3h-3"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ElevationProfile({
  points,
  waypoints = [],
  onScrub,
  steep = 0.3,
  height = 220,
  legend = true,
  xLabel,
  yLabel,
  summary,
  label,
  value,
  caption,
  footer,
  className,
  ...props
}: ElevationProfileProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const revealId = useChartId("elevation-reveal");
  const tintId = useChartId("elevation-tint");
  const fadeId = useChartId("elevation-fade");
  const [scrub, setScrubState] = useState<number | null>(null);

  const sorted = [...points].sort((a, b) => a.km - b.km);
  const route = profile(sorted);
  const marks = [...waypoints].filter((w) => w.km >= route.start && w.km <= route.end).sort((a, b) => a.km - b.km);
  const heights = sorted.map((p) => p.m);
  const minM = Math.min(...heights);
  const maxM = Math.max(...heights);
  const total = route.end - route.start;

  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.bottom - room.bottom;
  const nice = scaleLinear().domain([minM, maxM]).nice(4);
  const [d0, d1] = nice.domain();
  const ticks = nice.ticks(4);
  const yFormat = (v: number) => (v === ticks[ticks.length - 1] ? `${formatNumber(v)} m` : formatNumber(v));
  const left = axisWidth(ticks, yFormat) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scaleLinear().domain([route.start, route.end]).range([0, innerW]);

  const place = (top: number) => {
    const y = scaleLinear()
      .domain([d0, Math.max(d1, maxM)])
      .range([innerH, top]);
    const samples = Array.from({ length: Math.max(2, Math.ceil(innerW / 2)) + 1 }, (_, i) => {
      const px = (i / Math.max(2, Math.ceil(innerW / 2))) * innerW;
      return { px, py: y(route.at(x.invert(px))) };
    });
    const ridge = (a: number, b: number) =>
      samples.reduce((lo, s) => (s.px >= a - 2 && s.px <= b + 2 ? Math.min(lo, s.py) : lo), Infinity);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const order = marks.map((_, i) => i).sort((a, b) => route.at(marks[b].km) - route.at(marks[a].km));
    const placed = order.map((i) => {
      const w = marks[i];
      const px = x(w.km);
      const py = y(route.at(w.km));
      const tw = textWidth(w.name, 11) + 11;
      const sides = px + tw > innerW + MARGIN.right ? [true] : px - tw < -8 ? [false] : [false, true];
      let flip = sides[0];
      let ly = py - POLE;
      let hidden = true;
      search: for (let level = 0; level < (innerW < 420 ? 2 : 5); level++) {
        for (const side of sides) {
          const x0 = side ? px - tw : px;
          const x1 = side ? px : px + tw;
          const y0 = Math.min(py - POLE, ridge(x0, x1) - 8) - level * ROW;
          const box = { x0: x0 - 3, x1: x1 + 3, y0: y0 - 10, y1: y0 + 3 };
          const pole = { x0: px - 1.5, x1: px + 1.5, y0: y0 - 10, y1: py };
          const clear = (a: typeof box) => boxes.every((b) => b.x1 < a.x0 || b.x0 > a.x1 || b.y1 < a.y0 || b.y0 > a.y1);
          if (clear(box) && clear(pole)) {
            boxes.push(box, pole);
            flip = side;
            ly = y0;
            hidden = false;
            break search;
          }
        }
      }
      return { ...w, px, py, ly: hidden ? py - POLE : ly, flip, tw, hidden, i };
    });
    const flags = placed.sort((a, b) => a.i - b.i);
    const highest = flags.reduce((lo, f) => Math.min(lo, f.ly - 10), Infinity);
    return { y, flags, highest };
  };
  let top = 26;
  let layout = place(top);
  for (let k = 0; k < 3 && layout.highest < 2; k++) {
    top += 2 - layout.highest;
    layout = place(top);
  }
  const { y, flags } = layout;

  const area = (() => {
    if (sorted.length === 0 || innerW <= 0) return { line: "", fill: "" };
    const line = sorted.map((p, i) => `${i ? "L" : "M"}${x(p.km).toFixed(2)},${y(p.m).toFixed(2)}`).join("");
    return {
      line,
      fill: `${line}L${x(route.end).toFixed(2)},${innerH}L${x(route.start).toFixed(2)},${innerH}Z`,
    };
  })();

  const stops = (() => {
    const n = Math.max(2, Math.min(240, Math.ceil(innerW / 3)));
    return Array.from({ length: n + 1 }, (_, i) => {
      const km = route.start + (total * i) / n;
      const t = Math.min(1, Math.abs(route.gradient(km)) / steep);
      return { offset: i / n, p: Math.round(t * 100) };
    });
  })();
  const tint = (p: number) =>
    `color-mix(in oklab, var(--miyuki-elevation-profile-deep) ${p}%, var(--miyuki-elevation-profile-pale))`;

  const setScrub = (km: number | null) => {
    const next = km == null ? null : Math.round(Math.max(route.start, Math.min(route.end, km)) * 100) / 100;
    setScrubState(next);
    onScrub?.(next == null ? null : { km: next, m: route.at(next), gradient: route.gradient(next) });
  };
  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    if (innerW > 0) setScrub(x.invert((event.clientX - rect.left) * sx - left));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const base = scrub ?? route.start;
    const step = event.shiftKey ? 1 : 0.1;
    let next: number | null = base;
    switch (event.key) {
      case "ArrowRight":
        next = base + step;
        break;
      case "ArrowLeft":
        next = base - step;
        break;
      case "ArrowUp":
        next = marks.find((w) => w.km > base + 1e-6)?.km ?? base;
        break;
      case "ArrowDown":
        next = [...marks].reverse().find((w) => w.km < base - 1e-6)?.km ?? base;
        break;
      case "Home":
        next = route.start;
        break;
      case "End":
        next = route.end;
        break;
      case "Escape":
        if (scrub == null) return;
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    setScrub(next);
  };
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.matches(":focus-visible") && scrub == null) setScrub(route.start);
  };

  let peak = 0;
  let low = 0;
  sorted.forEach((p, i) => {
    if (p.m > sorted[peak].m) peak = i;
    if (p.m < sorted[low].m) low = i;
  });
  let steepest = route.start;
  for (let km = route.start; km <= route.end; km += Math.max(0.05, total / 400)) {
    if (Math.abs(route.gradient(km)) > Math.abs(route.gradient(steepest))) steepest = km;
  }
  const kmText = (km: number) => `${formatNumber(km, 1)} km`;
  const description = withAxisTitles(
    summary ??
      (sorted.length < 2
        ? "No route data."
        : `Elevation profile over ${kmText(total)}, from ${metres(sorted[0].m)} to ${metres(sorted[sorted.length - 1].m)}. ` +
          `Highest ${metres(sorted[peak].m)} at ${kmText(sorted[peak].km)}, lowest ${metres(sorted[low].m)} at ${kmText(sorted[low].km)}. ` +
          `Total ascent ${metres(route.ascent)}, descent ${metres(route.descent)}. ` +
          `Steepest ${percent(route.gradient(steepest))} near ${kmText(steepest)}.` +
          (marks.length ? ` Waypoints: ${marks.map((w) => `${w.name} at ${kmText(w.km)}`).join(", ")}.` : "")),
    { xLabel, yLabel },
  );

  const xTicks = x.ticks(Math.max(2, Math.floor(innerW / 64)));
  const sm = scrub != null ? route.at(scrub) : 0;
  const near = scrub != null ? marks.find((w) => Math.abs(x(w.km) - x(scrub)) < 4) : undefined;

  const rows: ReactNode[][] = [];
  const kms = new Set<number>();
  for (let km = Math.ceil(route.start); km <= Math.floor(route.end); km++) kms.add(km);
  marks.forEach((w) => kms.add(w.km));
  kms.add(route.end);
  [...kms]
    .sort((a, b) => a - b)
    .forEach((km) => {
      const names = marks.filter((w) => w.km === km).map((w) => w.name);
      rows.push([kmText(km), metres(route.at(km)), percent(route.gradient(km)), names.join(", ")]);
    });

  return (
    <ChartCard
      label={label}
      value={value ?? (sorted.length > 1 ? kmText(total) : undefined)}
      caption={
        caption ??
        (sorted.length > 1 ? (
          <span className="inline-flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Rise />
              <span className="sr-only">Ascent </span>
              <span className="font-medium text-foreground">{metres(route.ascent)}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Rise down />
              <span className="sr-only">Descent </span>
              <span className="font-medium text-foreground">{metres(route.descent)}</span>
            </span>
          </span>
        ) : undefined)
      }
      footer={
        footer ??
        (legend ? (
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="text-[13px] leading-5 text-muted-foreground">Steepness, up or down</p>
            <div aria-hidden="true" className="flex w-44 flex-col gap-1">
              <span
                className="h-2 rounded-full ring-1 ring-foreground/5 ring-inset"
                style={{
                  background: `linear-gradient(to right, ${tint(0)}, ${tint(50)}, ${tint(100)})`,
                }}
              />
              <span className="flex justify-between text-[11px] leading-none text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>{formatNumber((steep * 100) / 2)}%</span>
                <span>{formatNumber(steep * 100)}%+</span>
              </span>
            </div>
          </div>
        ) : undefined)
      }
      {...props}
      className={cn(
        "[--miyuki-elevation-profile-pale:color-mix(in_oklab,var(--brand)_16%,var(--card))] [--miyuki-elevation-profile-deep:var(--brand-strong)]",
        "dark:[--miyuki-elevation-profile-pale:color-mix(in_oklab,var(--brand)_22%,var(--card))]",
        className,
      )}
    >
      <ChartPlot
        ref={plotRef}
        summary={description}
        height={height}
        onPointerMove={fromPointer}
        onPointerDown={fromPointer}
        onPointerLeave={(event) => event.pointerType !== "touch" && setScrub(null)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={() => setScrub(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={innerH} play={inView} pad={60} />
              <linearGradient id={tintId} gradientUnits="userSpaceOnUse" x1={0} x2={innerW} y1={0} y2={0}>
                {stops.map((s, i) => (
                  <stop key={i} offset={s.offset} style={{ stopColor: tint(s.p) }} />
                ))}
              </linearGradient>
              <linearGradient id={`${fadeId}-g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0.95" />
                <stop offset="0.6" stopColor="white" stopOpacity="0.5" />
                <stop offset="1" stopColor="white" stopOpacity="0.14" />
              </linearGradient>
              <mask id={fadeId} maskUnits="userSpaceOnUse" x={-2} y={0} width={innerW + 4} height={innerH}>
                <rect x={-2} y={y(maxM)} width={innerW + 4} height={innerH - y(maxM)} fill={`url(#${fadeId}-g)`} />
              </mask>
            </defs>
            <g transform={`translate(${left} 0)`}>
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={yFormat} label={yLabel} />
              <g
                className="fill-muted-foreground"
                style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                textAnchor="middle"
              >
                {xTicks.map((t, i) => {
                  const text =
                    i === xTicks.length - 1 && Math.abs(x(t) - innerW) < 24 ? `${formatNumber(t)} km` : formatNumber(t);
                  const half = textWidth(text) / 2;
                  return (
                    <text
                      key={t}
                      x={Math.max(-left + half, Math.min(innerW + MARGIN.right - half, x(t)))}
                      y={innerH + 17}
                    >
                      {text}
                    </text>
                  );
                })}
                {Math.abs(x(xTicks[xTicks.length - 1] ?? 0) - innerW) >= 24 && (
                  <text x={innerW + MARGIN.right} y={innerH + 17} textAnchor="end">
                    km
                  </text>
                )}
              </g>
              <AxisTitle side="bottom" x={0} y={innerH} length={innerW}>
                {xLabel}
              </AxisTitle>
              <g mask={`url(#${revealId})`}>
                <path d={area.fill} fill={`url(#${tintId})`} mask={`url(#${fadeId})`} />
                <path
                  d={area.line}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="stroke-brand-strong"
                />
              </g>
              {flags.map((f, i) => {
                const frac = innerW > 0 ? f.px / innerW : 0;
                const dir = f.flip ? -1 : 1;
                return (
                  <motion.g
                    key={`${f.name}-${f.km}`}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{
                      opacity: inView || reduce ? 1 : 0,
                      y: inView || reduce ? 0 : 6,
                    }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 420,
                            damping: 30,
                            delay: 0.12 + frac * 0.6 + i * 0.01,
                          }
                    }
                    className={cn(
                      "transition-opacity duration-150",
                      near && near !== marks[i] && scrub != null && "opacity-60",
                    )}
                  >
                    {!f.hidden && (
                      <>
                        <line
                          x1={f.px}
                          x2={f.px}
                          y1={f.py - 2}
                          y2={f.ly - 9}
                          strokeWidth={1}
                          className="stroke-foreground/45"
                        />
                        <path
                          d={`M${f.px},${f.ly - 9.5}L${f.px + dir * 7.5},${f.ly - 6.5}L${f.px},${f.ly - 3.5}Z`}
                          className="fill-foreground"
                        />
                      </>
                    )}
                    <circle cx={f.px} cy={f.py} r={2.5} strokeWidth={1.5} className="fill-card stroke-foreground/70" />
                    {!f.hidden && (
                      <text
                        x={f.px + dir * 10}
                        y={f.ly - 6.5}
                        dy="0.35em"
                        textAnchor={f.flip ? "end" : "start"}
                        strokeWidth={3}
                        strokeLinejoin="round"
                        className="fill-foreground"
                        style={{
                          fontSize: 11,
                          paintOrder: "stroke",
                          stroke: "var(--card)",
                        }}
                      >
                        {f.name}
                      </text>
                    )}
                  </motion.g>
                );
              })}
              {scrub != null && (
                <>
                  <Crosshair x={x(scrub)} top={0} bottom={innerH} />
                  <ActiveDot cx={x(scrub)} cy={y(sm)} color="var(--brand-strong)" />
                </>
              )}
            </g>
          </svg>
        )}
        {width > 0 && scrub != null && (
          <ChartTooltip
            x={left + x(scrub)}
            y={y(sm)}
            title={near ? `${kmText(scrub)}, ${near.name}` : kmText(scrub)}
            items={[
              { label: "Altitude", value: metres(sm) },
              {
                label: "Gradient",
                value: percent(route.gradient(scrub)),
                color: tint(Math.round(Math.min(1, Math.abs(route.gradient(scrub)) / steep) * 100)),
                marker: "square",
              },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Elevation profile"}
        columns={["Distance", "Altitude", "Gradient", "Waypoint"]}
        rows={rows}
      />
    </ChartCard>
  );
}
