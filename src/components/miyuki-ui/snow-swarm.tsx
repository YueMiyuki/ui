"use client";

import { scaleLinear } from "d3-scale";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AxisBottom,
  axisTitleRoom,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartMarker,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  formatNumber,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SnowSwarmPoint {
  value: number;
  group: string;
  label: string;
}

export interface SnowSwarmGroup {
  name: string;
  color?: string;
}

export interface SnowSwarmProps extends Omit<ChartCardProps, "children"> {
  points: SnowSwarmPoint[];
  groups?: (string | SnowSwarmGroup)[];
  split?: boolean;
  domain?: [number, number];
  ticks?: number[];
  format?: (value: number) => string;
  formatTick?: (value: number) => string;
  valueName?: string;
  groupName?: string;
  height?: number;
  legend?: boolean;
  xLabel?: ReactNode;
  summary?: string;
}

type Frame = { xs: Float64Array; ys: Float64Array; alpha: Float64Array };

interface Placed {
  index: number;
  x: number;
  y: number;
}

const AXIS = 24;
const TOP = 4;
const LANE_GAP = 10;
const LANE_LABEL = 16;
const SEP = 0.9;
const FALL_SPEED = 230;
const DRIFT = 0.46;
const PAD = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function pile(xs: readonly number[], r: number): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i);
  const d = 2 * r + SEP;
  const heights: number[] = new Array(xs.length).fill(0);
  const placed: { x: number; h: number }[] = [];
  for (const { x, i } of order) {
    const near = placed.filter((p) => Math.abs(p.x - x) < d);
    const options = [r];
    for (const p of near) {
      const s = Math.sqrt(d * d - (p.x - x) ** 2);
      options.push(p.h + s);
      if (p.h - s >= r) options.push(p.h - s);
    }
    options.sort((a, b) => a - b);
    let h = options[options.length - 1];
    for (const o of options) {
      if (near.every((p) => (p.x - x) ** 2 + (p.h - o) ** 2 >= d * d - 1e-6)) {
        h = o;
        break;
      }
    }
    heights[i] = h;
    placed.push({ x, h });
  }
  return heights;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function SnowSwarm({
  points,
  groups,
  split = false,
  domain,
  ticks,
  format = (v) => formatNumber(v),
  formatTick,
  valueName = "Value",
  groupName = "Group",
  height = 240,
  legend = true,
  xLabel,
  summary,
  footer,
  label,
  ...props
}: SnowSwarmProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef, { threshold: 0.5 });
  const reduce = useReducedMotion() ?? false;
  const id = useChartId("swarm");

  const lanesDef = useMemo(() => {
    const listed = (groups ?? []).map((g) => (typeof g === "string" ? { name: g } : g));
    const names = new Set(listed.map((g) => g.name));
    for (const p of points)
      if (!names.has(p.group)) {
        names.add(p.group);
        listed.push({ name: p.group });
      }
    return listed.map((g, i) => ({ name: g.name, color: g.color ?? chartColor(i) }));
  }, [groups, points]);
  const groupIndex = useMemo(() => new Map(lanesDef.map((g, i) => [g.name, i])), [lanesDef]);

  const innerW = Math.max(0, width);
  const plotH = height - AXIS - TOP - axisTitleRoom({ xLabel }).bottom;
  const values = points.map((p) => p.value);
  const lo = domain?.[0] ?? Math.min(...values);
  const hi = domain?.[1] ?? Math.max(...values);
  const fixed = domain != null;
  const x = useMemo(() => {
    const scale = scaleLinear()
      .domain([lo, hi > lo ? hi : lo + 1])
      .range([PAD, Math.max(PAD + 1, innerW - PAD)]);
    return fixed ? scale : scale.nice();
  }, [lo, hi, fixed, innerW]);

  const layout = useMemo(() => {
    if (innerW <= 0 || points.length === 0) return null;
    const xs = points.map((p) => x(p.value));
    const g = lanesDef.length;
    const byLane = lanesDef.map((_, k) =>
      points.map((p, i) => (groupIndex.get(p.group) === k ? i : -1)).filter((i) => i >= 0),
    );
    const room = plotH - g * LANE_LABEL - (g - 1) * LANE_GAP;
    let r = clamp(innerW / 84, 3, 6);
    let together: number[] = [];
    let apart: number[] = [];
    let needs: number[] = [];
    for (; r > 1.6; r -= 0.25) {
      together = pile(xs, r);
      apart = new Array(points.length).fill(0);
      byLane.forEach((members) => {
        const hs = pile(
          members.map((i) => xs[i]),
          r,
        );
        members.forEach((i, k) => (apart[i] = hs[k]));
      });
      needs = byLane.map((members) => members.reduce((m, i) => Math.max(m, apart[i] + r), r * 2) + 2);
      const tallTogether = Math.max(...together) + r;
      if (tallTogether <= plotH - LANE_LABEL && needs.reduce((a, b) => a + b, 0) <= room) break;
    }
    const spare = Math.max(0, room - needs.reduce((a, b) => a + b, 0)) / Math.max(1, g);
    const laneHs = needs.map((h) => h + spare);
    const laneBase = (k: number) =>
      TOP + laneHs.slice(0, k + 1).reduce((a, b) => a + b, 0) + (k + 1) * LANE_LABEL + k * LANE_GAP;
    const groupAt = points.map((p) => groupIndex.get(p.group) ?? 0);
    const placeTogether: Placed[] = points.map((_, i) => ({ index: i, x: xs[i], y: TOP + plotH - together[i] }));
    const placeApart: Placed[] = points.map((_, i) => ({ index: i, x: xs[i], y: laneBase(groupAt[i]) - apart[i] }));
    const laneLabels = lanesDef.map((lane, k) => {
      const w = textWidth(lane.name, 12) + 12 + textWidth(String(byLane[k].length), 12);
      const peak = (from: number, to: number) =>
        byLane[k].reduce((m, i) => (xs[i] + r > from && xs[i] - r < to ? Math.max(m, apart[i] + r) : m), 0);
      const leftRoom = peak(0, w + 4);
      const rightRoom = peak(innerW - w - 4, innerW);
      return {
        side: leftRoom <= rightRoom ? ("left" as const) : ("right" as const),
        base: laneBase(k),
        top: laneBase(k) - laneHs[k] - LANE_LABEL,
      };
    });
    return { r, placeTogether, placeApart, laneBase, laneLabels, groupAt, heights: { together, apart } };
  }, [x, points, lanesDef, groupIndex, plotH, innerW]);

  const targets = layout ? (split ? layout.placeApart : layout.placeTogether) : null;

  const [frame, setFrame] = useState<Frame | null>(null);
  const motionRef = useRef<{ raf: number; shown: Frame | null; goal: Float64Array | null; width: number }>({
    raf: 0,
    shown: null,
    goal: null,
    width: 0,
  });

  useEffect(() => {
    const m = motionRef.current;
    return () => {
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      m.goal = null;
      m.shown = null;
    };
  }, []);

  useEffect(() => {
    if (!targets || !layout || (!inView && !reduce)) return;
    const m = motionRef.current;
    const n = targets.length;
    const goal = new Float64Array(n * 2);
    targets.forEach((t, i) => {
      goal[i * 2] = t.x;
      goal[i * 2 + 1] = t.y;
    });
    if (m.goal && m.goal.length === goal.length && m.goal.every((v, k) => Math.abs(v - goal[k]) < 0.25)) return;
    const prev = m.shown;
    const resized = m.goal != null && m.width !== innerW;
    m.goal = goal;
    m.width = innerW;
    cancelAnimationFrame(m.raf);

    const toX = Float64Array.from(targets.map((t) => t.x));
    const toY = Float64Array.from(targets.map((t) => t.y));
    const show = (next: Frame) => {
      m.shown = next;
      setFrame(next);
    };
    if (reduce || resized || (prev && prev.xs.length !== n)) {
      show({ xs: toX, ys: toY, alpha: new Float64Array(n).fill(1) });
      return;
    }

    const falling = !prev;
    const rng = createRng(`snow-swarm-${n}`);
    let plan: { start: number; dur: number; fromX: number; fromY: number; sway: number; freq: number; phase: number }[];
    if (!prev) {
      const height = split ? layout.heights.apart : layout.heights.together;
      const key = height.map((h) => h + rng.range(0, layout.r * 0.6));
      const rank = targets.map((_, i) => i).sort((a, b) => key[a] - key[b]);
      const order = new Array<number>(n);
      rank.forEach((i, k) => (order[i] = k));
      plan = targets.map((t, i) => {
        const fromY = TOP - layout.r - rng.range(0, 28);
        const speed = FALL_SPEED * rng.range(0.82, 1.18);
        return {
          start: (order[i] / Math.max(1, n - 1)) * 1.15 + rng.range(0, 0.18),
          dur: (t.y - fromY) / speed,
          fromX: t.x,
          fromY,
          sway: rng.range(5, 12) * (rng() < 0.5 ? -1 : 1),
          freq: rng.range(0.55, 0.95),
          phase: rng.range(0, Math.PI * 2),
        };
      });
    } else {
      plan = targets.map((t, i) => ({
        start: (t.x / Math.max(1, innerW)) * 0.12,
        dur: DRIFT,
        fromX: prev.xs[i],
        fromY: prev.ys[i],
        sway: 0,
        freq: 0,
        phase: 0,
      }));
    }

    let begin = -1;
    const tick = (now: number) => {
      if (begin < 0) begin = now;
      const t = Math.max(0, (now - begin) / 1000);
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      const alpha = new Float64Array(n);
      let done = true;
      for (let i = 0; i < n; i++) {
        const p = plan[i];
        const u = clamp((t - p.start) / p.dur, 0, 1);
        if (u < 1) done = false;
        if (falling) {
          const fade = (1 - u) ** 1.5;
          xs[i] = toX[i] + p.sway * Math.sin(p.phase + 2 * Math.PI * p.freq * Math.max(0, t - p.start)) * fade;
          ys[i] = p.fromY + (toY[i] - p.fromY) * (1 - (1 - u) ** 1.3);
          alpha[i] = t < p.start ? 0 : clamp((t - p.start) / 0.25, 0, 1);
        } else {
          const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
          const lift =
            Math.min(10, Math.abs(toX[i] - p.fromX) * 0.08 + Math.abs(toY[i] - p.fromY) * 0.12) * Math.sin(Math.PI * u);
          xs[i] = p.fromX + (toX[i] - p.fromX) * e;
          ys[i] = p.fromY + (toY[i] - p.fromY) * e - lift;
          alpha[i] = Math.max(prev?.alpha[i] ?? 1, u);
        }
      }
      show({ xs, ys, alpha });
      m.raf = done ? 0 : requestAnimationFrame(tick);
    };
    m.raf = requestAnimationFrame(tick);
  }, [targets, layout, inView, reduce, split, innerW]);

  const order = useMemo(
    () => points.map((_, i) => i).sort((a, b) => points[a].value - points[b].value || a - b),
    [points],
  );
  const { active, bind } = useNearestIndex({
    count: points.length,
    focusIndex: 0,
    locate: (px, py) => {
      if (!frame) return null;
      let best: number | null = null;
      let bestD = Infinity;
      order.forEach((i, k) => {
        const d = Math.hypot(frame.xs[i] - px, frame.ys[i] - py);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      return bestD <= Math.max(10, (layout?.r ?? 4) * 2.5) ? best : null;
    },
  });
  const current = active != null ? order[active] : null;

  const tickValues = ticks ?? x.ticks(innerW < 360 ? 4 : 6);
  const fmtTick = formatTick ?? format;
  const name = typeof label === "string" ? label : valueName;
  const counts = lanesDef.map((g) => points.filter((p) => p.group === g.name).length);
  const medians = lanesDef.map((g) => median(points.filter((p) => p.group === g.name).map((p) => p.value)));
  const description = withAxisTitles(
    summary ??
      (points.length
        ? `${points.length} points in ${lanesDef.length} groups, from ${format(Math.min(...values))} to ${format(Math.max(...values))}. ` +
          lanesDef.map((g, k) => `${g.name}: ${counts[k]}, median ${format(medians[k])}`).join("; ") +
          "."
        : "No data."),
    { xLabel },
  );

  const r = layout?.r ?? 4;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] leading-5">
            <span className="text-muted-foreground">Median</span>
            <ChartLegend
              className="contents"
              items={lanesDef.map((g, k) => ({ label: g.name, color: g.color, value: format(medians[k]) }))}
            />
          </div>
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && layout && (
          <svg width={width} height={height} className="block overflow-visible">
            <AxisBottom
              scale={x}
              ticks={tickValues}
              y={TOP + plotH}
              width={innerW}
              overflow={[0, 0]}
              format={(v) => fmtTick(Number(v))}
              label={xLabel}
            />
            <g aria-hidden="true" style={{ fontSize: 12 }}>
              {lanesDef.map((g, k) => {
                const l = layout.laneLabels[k];
                const base = split ? l.base : TOP + plotH;
                return (
                  <g
                    key={g.name}
                    className="transition-transform duration-500 ease-settle motion-reduce:transition-none"
                    style={{ transform: `translateY(${Math.round(base)}px)` }}
                  >
                    <line x1={0} x2={innerW} y1={0.5} y2={0.5} className="stroke-border-strong" />
                    <text
                      x={l.side === "left" ? 0 : innerW}
                      y={l.top - l.base + 11}
                      textAnchor={l.side === "left" ? "start" : "end"}
                      className={cn(
                        "fill-muted-foreground transition-opacity duration-300 ease-settle",
                        split ? "opacity-100 delay-150" : "opacity-0",
                      )}
                    >
                      <tspan className="fill-foreground font-medium">{g.name}</tspan>
                      <tspan dx={6} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {counts[k]}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </g>
            <defs>
              <clipPath id={`${id}-sky`}>
                <rect x={-12} y={TOP - 2} width={innerW + 24} height={plotH + 12} />
              </clipPath>
            </defs>
            {frame && (
              <g clipPath={`url(#${id}-sky)`}>
                {points.map((_, i) => {
                  const color = lanesDef[layout.groupAt[i]]?.color ?? chartColor(0);
                  const dim = current != null && current !== i;
                  return (
                    <circle
                      key={i}
                      cx={frame.xs[i]}
                      cy={frame.ys[i]}
                      r={r}
                      strokeWidth={1}
                      className="stroke-card transition-[opacity] duration-150 ease-settle"
                      opacity={frame.alpha[i] * (dim ? 0.35 : 1)}
                      style={{ fill: color }}
                    />
                  );
                })}
                {current != null && (
                  <g aria-hidden="true" className="pointer-events-none">
                    <circle
                      cx={frame.xs[current]}
                      cy={frame.ys[current]}
                      r={r + 3.5}
                      strokeWidth={2}
                      fill="none"
                      className="stroke-foreground"
                    />
                  </g>
                )}
              </g>
            )}
          </svg>
        )}
        {width > 0 && frame && current != null && (
          <ChartTooltip
            x={frame.xs[current]}
            y={frame.ys[current]}
            offset={r + 10}
            placement="top"
            title={
              <span className="flex items-center gap-1.5 text-foreground">
                <ChartMarker color={lanesDef[layout?.groupAt[current] ?? 0]?.color ?? chartColor(0)} />
                <span className="font-medium">{points[current].label}</span>
              </span>
            }
            items={[
              { label: valueName, value: format(points[current].value) },
              { label: groupName, value: points[current].group },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={name}
        columns={["", groupName, valueName]}
        rows={order.map((i) => [points[i].label, points[i].group, format(points[i].value)])}
      />
    </ChartCard>
  );
}
