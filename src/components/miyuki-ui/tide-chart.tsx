"use client";

import { scaleLinear } from "d3-scale";
import { animate, useReducedMotion } from "motion/react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ActiveDot,
  AreaGradient,
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
  chartMotion,
  crisp,
  formatNumber,
  GridLines,
  RevealMask,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  withAxisTitles,
  yTicks,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface TidePoint {
  time: number;
  height: number;
  turn?: "high" | "low";
}

export interface TideChartProps extends Omit<ChartCardProps, "children"> {
  points: TidePoint[];
  now?: number;
  phase?: number;
  sunrise?: number;
  sunset?: number;
  format?: (height: number) => string;
  formatAxis?: (height: number) => string;
  height?: number;
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

interface Extreme {
  time: number;
  height: number;
  high: boolean;
}

const MARGIN = { top: 4, right: 4, bottom: 26 };
const ROOM_TOP = 40;
const ROOM_BOTTOM = 38;

const pad2 = (n: number) => String(n).padStart(2, "0");

function clockTime(hours: number): string {
  const minutes = Math.round(hours * 60);
  const day = ((minutes % 1440) + 1440) % 1440;
  const h = minutes === 1440 ? 24 : Math.floor(day / 60);
  return `${pad2(h)}:${pad2(minutes === 1440 ? 0 : day % 60)}`;
}

function steffen(xs: number[], ys: number[]) {
  const n = xs.length;
  const m = new Array<number>(n).fill(0);
  if (n < 2) return m;
  const h = xs.slice(1).map((x, i) => x - xs[i]);
  const s = h.map((dx, i) => (dx ? (ys[i + 1] - ys[i]) / dx : 0));
  for (let i = 1; i < n - 1; i++) {
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i] || 1);
    const sign = (v: number) => (v < 0 ? -1 : 1);
    m[i] = (sign(s[i - 1]) + sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0;
  }
  m[0] = h[0] ? (3 * s[0] - m[1]) / 2 : 0;
  m[n - 1] = h[n - 2] ? (3 * s[n - 2] - m[n - 2]) / 2 : 0;
  if (n === 2) m[0] = m[1] = s[0];
  return m;
}

function makeCurve(points: TidePoint[]) {
  const xs = points.map((p) => p.time);
  const ys = points.map((p) => p.height);
  const ms = steffen(xs, ys);
  const segment = (t: number) => {
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= t) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const at = (t: number) => {
    if (xs.length === 0) return 0;
    if (xs.length === 1) return ys[0];
    const i = segment(Math.max(xs[0], Math.min(xs[xs.length - 1], t)));
    const dx = xs[i + 1] - xs[i] || 1;
    const u = Math.max(0, Math.min(1, (t - xs[i]) / dx));
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * dx * ms[i] +
      (3 * u2 - 2 * u3) * ys[i + 1] +
      (u3 - u2) * dx * ms[i + 1]
    );
  };
  const slope = (t: number) => {
    if (xs.length < 2) return 0;
    const i = segment(Math.max(xs[0], Math.min(xs[xs.length - 1], t)));
    const dx = xs[i + 1] - xs[i] || 1;
    const u = Math.max(0, Math.min(1, (t - xs[i]) / dx));
    return (
      ((6 * u * u - 6 * u) / dx) * ys[i] +
      (3 * u * u - 4 * u + 1) * ms[i] +
      ((6 * u - 6 * u * u) / dx) * ys[i + 1] +
      (3 * u * u - 2 * u) * ms[i + 1]
    );
  };
  const path = (sx: (t: number) => number, sy: (h: number) => number) => {
    if (xs.length === 0) return "";
    let d = `M${sx(xs[0]).toFixed(2)},${sy(ys[0]).toFixed(2)}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const dx = xs[i + 1] - xs[i];
      d +=
        `C${sx(xs[i] + dx / 3).toFixed(2)},${sy(ys[i] + (ms[i] * dx) / 3).toFixed(2)} ` +
        `${sx(xs[i + 1] - dx / 3).toFixed(2)},${sy(ys[i + 1] - (ms[i + 1] * dx) / 3).toFixed(2)} ` +
        `${sx(xs[i + 1]).toFixed(2)},${sy(ys[i + 1]).toFixed(2)}`;
    }
    return d;
  };
  const extremes: Extreme[] = points
    .filter((p) => p.turn != null)
    .map((p) => ({ time: p.time, height: p.height, high: p.turn === "high" }));
  for (let i = 1; i < xs.length - 1 && extremes.length === 0; i++) {
    let j = i;
    while (j < xs.length - 2 && ys[j + 1] === ys[i]) j++;
    if (ys[i] > ys[i - 1] && ys[i] > ys[j + 1])
      extremes.push({ time: xs[Math.floor((i + j) / 2)], height: ys[i], high: true });
    else if (ys[i] < ys[i - 1] && ys[i] < ys[j + 1])
      extremes.push({ time: xs[Math.floor((i + j) / 2)], height: ys[i], high: false });
  }
  if (extremes.length > 0 && points.some((p) => p.turn != null)) extremes.sort((a, b) => a.time - b.time);
  return { at, slope, path, extremes };
}

function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return "New moon";
  if (p < 0.22) return "Waxing crescent";
  if (p < 0.28) return "First quarter";
  if (p < 0.47) return "Waxing gibbous";
  if (p < 0.53) return "Full moon";
  if (p < 0.72) return "Waning gibbous";
  if (p < 0.78) return "Last quarter";
  return "Waning crescent";
}

function Moon({ phase, size = 30 }: { phase: number; size?: number }) {
  const p = ((phase % 1) + 1) % 1;
  const r = size / 2 - 1;
  const c = size / 2;
  const a = 2 * Math.PI * p;
  const rx = Math.abs(Math.cos(a)) * r;
  const waxing = p < 0.5;
  const crescent = p < 0.25 || p > 0.75;
  const lit = (1 - Math.cos(a)) / 2;
  const d = waxing
    ? `M${c},${c - r}A${r},${r} 0 0 1 ${c},${c + r}A${rx.toFixed(3)},${r} 0 0 ${crescent ? 0 : 1} ${c},${c - r}Z`
    : `M${c},${c - r}A${r},${r} 0 0 0 ${c},${c + r}A${rx.toFixed(3)},${r} 0 0 ${crescent ? 1 : 0} ${c},${c - r}Z`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Moon: ${moonPhaseName(p).toLowerCase()}, ${Math.round(lit * 100)}% lit`}
      className="shrink-0"
    >
      <circle cx={c} cy={c} r={r} style={{ fill: "var(--miyuki-tide-chart-dark)" }} />
      {lit > 0.004 && (
        <path
          d={lit > 0.996 ? `M${c},${c - r}A${r},${r} 0 1 1 ${c},${c + r}A${r},${r} 0 1 1 ${c},${c - r}Z` : d}
          style={{ fill: "var(--miyuki-tide-chart-lit)" }}
        />
      )}
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={1} className="stroke-border-strong" />
    </svg>
  );
}

export function TideChart({
  points,
  now,
  phase,
  sunrise,
  sunset,
  format = (v) => `${formatNumber(v, 2)} m`,
  formatAxis,
  height = 220,
  legend = true,
  xLabel,
  yLabel,
  summary,
  label,
  value,
  caption,
  action,
  footer,
  className,
  ...props
}: TideChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const pillRef = useRef<SVGGElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const revealId = useChartId("tide-reveal");
  const fillId = useChartId("tide-fill");
  const nightId = useChartId("tide-night");
  const clipId = useChartId("tide-clip");

  const sorted = [...points].sort((a, b) => a.time - b.time);
  const curve = makeCurve(sorted);
  const first = sorted[0]?.time ?? 0;
  const last = sorted[sorted.length - 1]?.time ?? 24;
  const t0 = first <= 0 && last >= 24 ? 0 : first;
  const t1 = first <= 0 && last >= 24 ? 24 : last;
  const extremes = curve.extremes.filter((e) => e.time >= t0 && e.time <= t1);

  const visible = sorted.filter((p) => p.time >= t0 && p.time <= t1).map((p) => p.height);
  visible.push(curve.at(t0), curve.at(t1));
  const minH = Math.min(...visible);
  const maxH = Math.max(...visible);
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const k = (maxH - minH || 1) / Math.max(20, innerH - ROOM_TOP - ROOM_BOTTOM);
  const y = scaleLinear()
    .domain([minH - ROOM_BOTTOM * k, maxH + ROOM_TOP * k])
    .range([innerH, 0]);
  const ticks = yTicks(y, 4);
  const axisFormat = formatAxis ?? ((v: number) => format(v));
  const left = axisWidth(ticks, axisFormat) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scaleLinear().domain([t0, t1]).range([0, innerW]);
  const line = curve.path(x, y);
  const area = line ? `${line}L${x(last).toFixed(2)},${innerH}L${x(first).toFixed(2)},${innerH}Z` : "";

  const [scrub, setScrub] = useState<number | null>(null);
  const clampT = (t: number) => Math.max(t0, Math.min(t1, Math.round(t * 60) / 60));

  const nowT = now != null ? Math.max(t0, Math.min(t1, now)) : null;
  const shown = useRef({ t: Number.NaN, cx: 0, h: 0 });
  const placeNow = (t: number) => {
    const s = shown.current;
    s.t = t;
    const px = x(t);
    const py = y(curve.at(t));
    lineRef.current?.setAttribute("transform", `translate(${crisp(px)} 0)`);
    dotRef.current?.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
    pillRef.current?.setAttribute("transform", `translate(${px.toFixed(2)} ${innerH})`);
  };
  const placeRef = useRef(placeNow);
  useLayoutEffect(() => {
    placeRef.current = placeNow;
    if (!Number.isNaN(shown.current.t)) placeNow(shown.current.t);
  });
  useEffect(() => {
    if (nowT == null) return;
    const s = shown.current;
    if (reduce) {
      placeRef.current(nowT);
      return;
    }
    if (Number.isNaN(s.t)) placeRef.current(t0);
    if (!inView) return;
    const fresh = Math.abs(s.t - t0) < 1e-6;
    const controls = animate(s.t, nowT, {
      ...(fresh ? chartMotion.reveal : chartMotion.settle),
      onUpdate: (t) => placeRef.current(t),
    });
    return () => controls.stop();
  }, [nowT, inView, reduce, t0]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    const px = (event.clientX - rect.left) * sx - left;
    if (innerW > 0) setScrub(clampT(x.invert(px)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const base = scrub ?? nowT ?? (t0 + t1) / 2;
    let next: number | null = base;
    const step = event.shiftKey ? 1 : 0.25;
    switch (event.key) {
      case "ArrowRight":
        next = base + step;
        break;
      case "ArrowLeft":
        next = base - step;
        break;
      case "ArrowUp": {
        const e = extremes.find((ex) => ex.time > base + 1e-6);
        next = e ? e.time : base;
        break;
      }
      case "ArrowDown": {
        const e = [...extremes].reverse().find((ex) => ex.time < base - 1e-6);
        next = e ? e.time : base;
        break;
      }
      case "Home":
        next = t0;
        break;
      case "End":
        next = t1;
        break;
      case "Escape":
        if (scrub == null) return;
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    setScrub(next == null ? null : clampT(next));
  };
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.matches(":focus-visible")) setScrub((s) => s ?? clampT(nowT ?? (t0 + t1) / 2));
  };

  const trendAt = (t: number) => {
    const s = curve.slope(t);
    const range = maxH - minH || 1;
    return Math.abs(s) < range * 0.015 ? "Turning" : s > 0 ? "Rising" : "Falling";
  };
  const nextExtreme =
    nowT != null ? (extremes.find((e) => e.time > nowT) ?? curve.extremes.find((e) => e.time > nowT)) : undefined;
  const highs = extremes.filter((e) => e.high);
  const lows = extremes.filter((e) => !e.high);
  const description = withAxisTitles(
    summary ??
      `Tide over ${t1 - t0 === 24 ? "the day" : `${clockTime(t0)} to ${clockTime(t1)}`}. ` +
        (highs.length
          ? `High water at ${highs.map((e) => `${clockTime(e.time)}, ${format(e.height)}`).join(" and ")}. `
          : "") +
        (lows.length
          ? `Low water at ${lows.map((e) => `${clockTime(e.time)}, ${format(e.height)}`).join(" and ")}. `
          : "") +
        (nowT != null ? `Now ${clockTime(nowT)}, ${format(curve.at(nowT))} and ${trendAt(nowT).toLowerCase()}. ` : "") +
        (sunrise != null && sunset != null ? `Night before ${clockTime(sunrise)} and after ${clockTime(sunset)}.` : ""),
    { xLabel, yLabel },
  );

  const hourStep = innerW / ((t1 - t0) / 3) < 46 ? 6 : 3;
  const hourTicks: number[] = [];
  for (let t = Math.ceil(t0 / hourStep) * hourStep; t <= t1 + 1e-9; t += hourStep) hourTicks.push(t);
  const nowLabel = nowT != null ? `Now ${clockTime(nowT)}` : "";
  const pillW = textWidth(nowLabel, 11) + 14;
  const nowX = nowT != null ? x(nowT) : -999;

  const night = (() => {
    const stops: { at: number; o: number }[] = [];
    const frac = (t: number) => Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
    if (sunrise != null) {
      stops.push({ at: 0, o: 1 }, { at: frac(sunrise - 0.5), o: 1 }, { at: frac(sunrise), o: 0 });
    } else stops.push({ at: 0, o: 0 });
    if (sunset != null) stops.push({ at: frac(sunset), o: 0 }, { at: frac(sunset + 0.5), o: 1 }, { at: 1, o: 1 });
    else stops.push({ at: 1, o: 0 });
    return stops;
  })();

  const scrubH = scrub != null ? curve.at(scrub) : 0;
  const lit = phase != null ? (1 - Math.cos(2 * Math.PI * (((phase % 1) + 1) % 1))) / 2 : 0;

  const rows: { t: number; kind: string }[] = [];
  for (let t = Math.ceil(t0); t <= Math.floor(t1); t++) rows.push({ t, kind: "" });
  extremes.forEach((e) => rows.push({ t: e.time, kind: e.high ? "High water" : "Low water" }));
  rows.sort((a, b) => a.t - b.t);

  return (
    <ChartCard
      label={label}
      value={value ?? (nowT != null ? format(curve.at(nowT)) : undefined)}
      caption={
        caption ??
        (nowT != null
          ? `${trendAt(nowT).toLowerCase()}${nextExtreme ? `, ${nextExtreme.high ? "high" : "low"} at ${clockTime(nextExtreme.time)}` : ""}`
          : undefined)
      }
      action={
        action ??
        (phase != null ? (
          <div className="flex items-center gap-2.5">
            <Moon phase={phase} />
            <div>
              <p className="text-[13px] leading-5 text-foreground">{moonPhaseName(phase)}</p>
              <p className="text-xs leading-4 text-muted-foreground tabular-nums">{Math.round(lit * 100)}% lit</p>
            </div>
          </div>
        ) : undefined)
      }
      footer={
        footer ??
        (legend && (sunrise != null || nowT != null) ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] leading-5">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-[2px] bg-brand/40" />
              <span className="text-muted-foreground">Water height</span>
            </li>
            {sunrise != null && sunset != null && (
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-3 rounded-[2px] border border-border-strong"
                  style={{ background: "var(--miyuki-tide-chart-night)" }}
                />
                <span className="text-muted-foreground">Night</span>
                <span className="font-medium text-foreground tabular-nums">
                  {clockTime(sunset)}–{clockTime(sunrise)}
                </span>
              </li>
            )}
          </ul>
        ) : undefined)
      }
      {...props}
      className={cn(
        "[--miyuki-tide-chart-night:color-mix(in_oklab,var(--foreground)_6%,transparent)] dark:[--miyuki-tide-chart-night:color-mix(in_oklab,black_30%,transparent)]",
        "[--miyuki-tide-chart-dark:color-mix(in_oklab,var(--foreground)_38%,var(--card))] dark:[--miyuki-tide-chart-dark:color-mix(in_oklab,var(--foreground)_10%,var(--card))]",
        "[--miyuki-tide-chart-lit:color-mix(in_oklab,var(--chart-4)_10%,var(--card))] dark:[--miyuki-tide-chart-lit:color-mix(in_oklab,var(--chart-4)_14%,var(--foreground))]",
        className,
      )}
    >
      <ChartPlot
        ref={plotRef}
        summary={description}
        height={height}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={(event) => event.pointerType !== "touch" && setScrub(null)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={() => setScrub(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={innerH} play={inView} pad={40} />
              <AreaGradient id={fillId} color="var(--brand)" from={0.3} to={0.02} />
              <linearGradient id={nightId} gradientUnits="userSpaceOnUse" x1={0} x2={innerW} y1={0} y2={0}>
                {night.map((s, i) => (
                  <stop
                    key={i}
                    offset={s.at}
                    style={{ stopColor: "var(--miyuki-tide-chart-night)", stopOpacity: s.o }}
                  />
                ))}
              </linearGradient>
              <clipPath id={clipId}>
                <rect x={0} y={-ROOM_TOP} width={innerW} height={innerH + ROOM_TOP} />
              </clipPath>
            </defs>
            <g transform={`translate(${left} ${MARGIN.top})`}>
              {(sunrise != null || sunset != null) && (
                <rect x={0} y={0} width={innerW} height={innerH} fill={`url(#${nightId})`} />
              )}
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={axisFormat} label={yLabel} />
              <g
                className="fill-muted-foreground"
                style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                textAnchor="middle"
              >
                {hourTicks.map((t) => {
                  const tx = x(t);
                  const half = textWidth(clockTime(t)) / 2;
                  if (nowT != null && Math.abs(tx - nowX) < pillW / 2 + half + 4) return null;
                  const cxl = Math.max(-left + half, Math.min(innerW + MARGIN.right - half, tx));
                  return (
                    <text key={t} x={cxl} y={innerH + 17}>
                      {clockTime(t)}
                    </text>
                  );
                })}
              </g>
              <AxisTitle side="bottom" x={0} y={innerH} length={innerW}>
                {xLabel}
              </AxisTitle>
              <g mask={`url(#${revealId})`}>
                <g clipPath={`url(#${clipId})`}>
                  <path d={area} fill={`url(#${fillId})`} />
                  <path
                    d={line}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-brand"
                  />
                </g>
                {extremes.map((e, i) => {
                  const ex = x(e.time);
                  const ey = y(e.height);
                  const head = `${e.high ? "High" : "Low"} ${clockTime(e.time)}`;
                  const w = Math.max(textWidth(head, 12), textWidth(format(e.height), 11));
                  const lx = Math.max(w / 2, Math.min(innerW - w / 2, ex));
                  const c1 = e.high ? ey - 26 : ey + 15;
                  return (
                    <g key={i} textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <circle cx={ex} cy={ey} r={3} strokeWidth={1.5} className="fill-card stroke-brand" />
                      <text x={lx} y={c1} dy="0.35em" style={{ fontSize: 12 }}>
                        <tspan className="fill-muted-foreground">{e.high ? "High" : "Low"} </tspan>
                        <tspan className="fill-foreground font-medium">{clockTime(e.time)}</tspan>
                      </text>
                      <text x={lx} y={c1 + 14} dy="0.35em" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                        {format(e.height)}
                      </text>
                    </g>
                  );
                })}
              </g>
              {nowT != null && (
                <>
                  <line
                    ref={lineRef}
                    x1={0}
                    x2={0}
                    y1={0}
                    y2={innerH}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    className="pointer-events-none stroke-brand/70"
                    transform={`translate(${crisp(x(t0))} 0)`}
                  />
                  <g ref={dotRef} className="pointer-events-none" transform={`translate(${x(t0)} ${y(curve.at(t0))})`}>
                    <circle r={9} className="fill-brand/15" />
                    <circle r={4.5} strokeWidth={2.5} className="fill-brand stroke-card" />
                  </g>
                  <g ref={pillRef} className="pointer-events-none" transform={`translate(${x(t0)} ${innerH})`}>
                    <rect x={-pillW / 2} y={6} width={pillW} height={17} rx={8.5} className="fill-brand" />
                    <text
                      y={14.5}
                      dy="0.35em"
                      textAnchor="middle"
                      className="fill-brand-foreground font-medium"
                      style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                    >
                      {nowLabel}
                    </text>
                  </g>
                </>
              )}
              {scrub != null && (
                <>
                  <Crosshair x={x(scrub)} bottom={innerH} />
                  <ActiveDot cx={x(scrub)} cy={y(scrubH)} color="var(--brand)" />
                </>
              )}
            </g>
          </svg>
        )}
        {width > 0 && scrub != null && (
          <ChartTooltip
            x={left + x(scrub)}
            y={MARGIN.top + y(scrubH)}
            title={clockTime(scrub)}
            items={[
              { label: "Height", value: format(scrubH), color: "var(--brand)" },
              { label: "Tide", value: trendAt(scrub) },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Tide"}
        columns={["Time", "Height", "Tide"]}
        rows={rows.map((r) => [clockTime(r.t), format(curve.at(r.t)), r.kind || trendAt(r.t)])}
      />
    </ChartCard>
  );
}
