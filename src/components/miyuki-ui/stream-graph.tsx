"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { type KeyboardEvent, type ReactNode, useMemo, useRef } from "react";
import {
  AxisBottom,
  axisTitleRoom,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  Crosshair,
  chartColor,
  closestIndex,
  formatNumber,
  formatPercent,
  RevealMask,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface StreamGraphSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface StreamGraphProps extends Omit<ChartCardProps, "children"> {
  series: StreamGraphSeries[];
  labels: string[];
  titles?: string[];
  height?: number;
  format?: (value: number) => string;
  totalName?: string;
  unitName?: string;
  legend?: boolean;
  xLabel?: ReactNode;
  summary?: string;
}

interface Layer {
  series: number;
  top: number[];
  bottom: number[];
}

const MARGIN = { top: 6, bottom: 26 };
const LABEL_SIZE = 12;
const SOFT = 1.8;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
}

function insideOut(series: readonly number[][]): number[] {
  const sums = series.map((d) => d.reduce((s, v) => s + v, 0));
  const peaks = series.map((d) => d.reduce((best, v, j) => (v > d[best] ? j : best), 0));
  const byPeak = series.map((_, i) => i).sort((a, b) => peaks[a] - peaks[b] || sums[b] - sums[a]);
  let top = 0;
  let bottom = 0;
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (const i of byPeak) {
    if (top < bottom) {
      top += sums[i];
      tops.push(i);
    } else {
      bottom += sums[i];
      bottoms.push(i);
    }
  }
  return bottoms.reverse().concat(tops);
}

function polygon(xs: readonly number[], top: readonly number[], bottom: readonly number[]): string {
  if (xs.length === 0) return "";
  let d = `M${xs[0]},${top[0]}`;
  for (let s = 1; s < xs.length; s++) d += `L${xs[s]},${top[s]}`;
  for (let s = xs.length - 1; s >= 0; s--) d += `L${xs[s]},${bottom[s]}`;
  return `${d}Z`;
}

function niceUnit(perPixel: number, min: number, max: number): number {
  const target = perPixel * ((min + max) / 2);
  const exp = 10 ** Math.floor(Math.log10(Math.max(target, 1e-9)));
  let best = exp;
  for (const m of [1, 2, 2.5, 5, 10]) {
    const px = (m * exp) / perPixel;
    if (px >= min && px <= max) return m * exp;
    if (Math.abs(px - (min + max) / 2) < Math.abs(best / perPixel - (min + max) / 2)) best = m * exp;
  }
  return best;
}

export function StreamGraph({
  series,
  labels,
  titles,
  height = 220,
  format = (v) => formatNumber(v),
  totalName = "All",
  unitName,
  legend = true,
  xLabel,
  summary,
  footer,
  label,
  ...props
}: StreamGraphProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("stream-reveal");
  const clipId = useChartId("stream-bank");
  const softId = useChartId("stream-soft");

  const n = labels.length;
  const count = series.length;
  const colors = series.map((s, i) => s.color ?? chartColor(i));
  const values = useMemo(() => series.map((s) => labels.map((_, j) => Math.max(0, s.data[j] ?? 0))), [series, labels]);
  const order = useMemo(() => insideOut(values), [values]);
  const totals = labels.map((_, j) => values.reduce((sum, d) => sum + d[j], 0));
  const seriesTotals = values.map((d) => d.reduce((sum, v) => sum + v, 0));
  const visual = order.slice().reverse();

  const innerH = height - MARGIN.top - MARGIN.bottom - axisTitleRoom({ xLabel }).bottom;
  const innerW = Math.max(0, width);
  const x = scalePoint<string>()
    .domain(labels.map((_, j) => String(j)))
    .range([0, innerW]);
  const xs = labels.map((_, j) => x(String(j)) ?? 0);
  const peak = Math.max(1, ...totals);
  const y = scaleLinear()
    .domain([-peak / 2, peak / 2])
    .range([MARGIN.top + innerH, MARGIN.top])
    .nice();
  const perPixel = (y.domain()[1] - y.domain()[0]) / innerH;

  const geometry = useMemo(() => {
    if (innerW <= 0 || n === 0 || count === 0) return null;
    const xs = labels.map((_, j) => (n > 1 ? (innerW * j) / (n - 1) : innerW / 2));
    const y = scaleLinear()
      .domain([-peak / 2, peak / 2])
      .range([MARGIN.top + innerH, MARGIN.top])
      .nice();
    const steps = n > 1 ? Math.max(4, Math.ceil(innerW / (n - 1) / 4)) : 1;
    const px: number[] = [];
    const thick: number[][] = values.map(() => []);
    const at = (d: number[], j: number) => d[Math.max(0, Math.min(n - 1, j))];
    for (let j = 0; j < Math.max(1, n - 1); j++) {
      const last = j === n - 2 || n === 1;
      for (let s = 0; s < (last ? steps + 1 : steps); s++) {
        const t = n > 1 ? s / steps : 0;
        px.push(n > 1 ? xs[j] + (xs[j + 1] - xs[j]) * t : innerW / 2);
        values.forEach((d, i) => {
          const v = n > 1 ? catmull(at(d, j - 1), d[j], d[j + 1], at(d, j + 2), t) : d[0];
          thick[i].push(Math.max(0, v));
        });
      }
    }
    const samples = px.length;
    const layers: Layer[] = series.map((_, i) => ({ series: i, top: [], bottom: [] }));
    for (let s = 0; s < samples; s++) {
      const total = thick.reduce((sum, t) => sum + t[s], 0);
      let base = -total / 2;
      for (const i of order) {
        const next = base + thick[i][s];
        layers[i].bottom.push(y(base));
        layers[i].top.push(y(next));
        base = next;
      }
    }
    const bankTop = order.length ? layers[order[order.length - 1]].top : [];
    const bankBottom = order.length ? layers[order[0]].bottom : [];
    const dataIndex = labels.map((_, j) => (n > 1 ? Math.min(samples - 1, j * steps) : 0));
    return { px, layers, bank: polygon(px, bankTop, bankBottom), dataIndex };
  }, [innerW, innerH, peak, n, count, values, order, series, labels]);

  const placements = useMemo(() => {
    if (!geometry) return [];
    const { px, layers } = geometry;
    return series.map((s, i) => {
      const w = textWidth(s.name, LABEL_SIZE) + 10;
      const { top, bottom } = layers[i];
      let best: { x: number; y: number; room: number } | null = null;
      let lo = 0;
      for (let c = 0; c < px.length; c++) {
        if (px[c] - w / 2 < 4 || px[c] + w / 2 > innerW - 4) continue;
        while (px[lo] < px[c] - w / 2) lo++;
        const mid = (top[c] + bottom[c]) / 2;
        let room = Infinity;
        for (let k = lo; k < px.length && px[k] <= px[c] + w / 2; k++) {
          room = Math.min(room, mid - top[k], bottom[k] - mid);
        }
        if (!best || room > best.room) best = { x: px[c], y: mid, room };
      }
      return best && best.room >= 8.5 ? best : null;
    });
  }, [geometry, series, innerW]);

  const { active, setActive, bind } = useNearestIndex({
    count: count * n,
    columns: n,
    focusIndex: 0,
    locate: (pxp, pyp) => {
      if (!geometry || innerW <= 0) return null;
      const j = closestIndex(xs, pxp);
      const { px, layers } = geometry;
      const s = Math.max(0, Math.min(px.length - 1, closestIndex(px, pxp)));
      let row: number | null = null;
      let nearest = Infinity;
      visual.forEach((i, r) => {
        const { top, bottom } = layers[i];
        if (pyp >= top[s] && pyp <= bottom[s]) {
          row = r;
          nearest = 0;
        } else if (nearest > 0) {
          const d = Math.min(Math.abs(pyp - top[s]), Math.abs(pyp - bottom[s]));
          if (d < nearest) {
            nearest = d;
            row = r;
          }
        }
      });
      if (row == null || nearest > 28) return null;
      return row * n + j;
    },
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (active != null && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const row = Math.floor(active / n);
      const j = active % n;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? n - 1
            : Math.max(0, Math.min(n - 1, j + (event.key === "ArrowRight" ? 1 : -1)));
      setActive(row * n + next);
      return;
    }
    bind.onKeyDown(event);
  };

  const activeSeries = active != null ? visual[Math.floor(active / n)] : null;
  const activeJ = active != null ? active % n : null;
  const name = typeof label === "string" ? label : "Series";
  const describeSeries = (i: number) => {
    const d = values[i];
    const top = d.reduce((best, v, j) => (v > d[best] ? j : best), 0);
    return `${series[i].name} ${format(seriesTotals[i])}, widest in ${titles?.[top] ?? labels[top]}`;
  };
  const busiest = totals.reduce((best, v, j) => (v > totals[best] ? j : best), 0);
  const description = withAxisTitles(
    summary ??
      (n > 0 && count > 0
        ? `Stream of ${count} series from ${titles?.[0] ?? labels[0]} to ${titles?.[n - 1] ?? labels[n - 1]}, centred on one baseline. ` +
          `The stream is widest in ${titles?.[busiest] ?? labels[busiest]} at ${format(totals[busiest])}. ` +
          `${order
            .slice()
            .sort((a, b) => seriesTotals[b] - seriesTotals[a])
            .map(describeSeries)
            .join("; ")}.`
        : "No data."),
    { xLabel },
  );

  const unit = innerH > 0 ? niceUnit(perPixel, 22, 44) : 0;
  const unitPx = unit / perPixel;

  const scaleKey =
    unit > 0 && width > 0 ? (
      <div className="flex items-center gap-2 text-[13px] leading-5 text-muted-foreground" aria-hidden="true">
        <svg width="8" height={Math.round(unitPx)} className="shrink-0 overflow-visible">
          <rect x={2} y={0} width={4} height={Math.round(unitPx)} rx={2} className="fill-foreground/25" />
        </svg>
        <span className="tabular-nums">
          {format(unit)}
          {unitName ? ` ${unitName}` : ""}
        </span>
      </div>
    ) : null;

  const tooltip = (() => {
    if (!geometry || activeSeries == null || activeJ == null) return null;
    const layer = geometry.layers[activeSeries];
    const s = geometry.dataIndex[activeJ];
    const v = values[activeSeries][activeJ];
    return (
      <ChartTooltip
        x={xs[activeJ]}
        y={(layer.top[s] + layer.bottom[s]) / 2}
        offset={14}
        title={titles?.[activeJ] ?? labels[activeJ]}
        items={[
          { label: series[activeSeries].name, value: format(v), color: colors[activeSeries] },
          { label: "Share", value: formatPercent(totals[activeJ] > 0 ? v / totals[activeJ] : 0, { digits: 0 }) },
          { label: totalName, value: format(totals[activeJ]) },
        ]}
      />
    );
  })();

  const fillOf = (i: number) => `color-mix(in oklab, ${colors[i]} var(--miyuki-stream-graph-mix), var(--card))`;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <ChartLegend
              className="min-w-0 flex-1 basis-60"
              items={series.map((s, i) => ({ label: s.name, color: colors[i], value: format(seriesTotals[i]) }))}
            />
            {scaleKey}
          </div>
        ) : undefined)
      }
    >
      <ChartPlot
        ref={plotRef}
        summary={description}
        height={height}
        {...bind}
        onKeyDown={onKeyDown}
        className="[--miyuki-stream-graph-mix:76%] dark:[--miyuki-stream-graph-mix:86%]"
      >
        {width > 0 && geometry && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={height} play={inView} />
              <clipPath id={clipId}>
                <path d={geometry.bank} />
              </clipPath>
              <filter id={softId} x="-5%" y="-10%" width="110%" height="120%">
                <feGaussianBlur stdDeviation={SOFT} />
              </filter>
            </defs>
            <AxisBottom
              scale={x}
              y={MARGIN.top + innerH}
              width={innerW}
              overflow={[18, 18]}
              format={(_, j) => labels[j]}
              emphasis={activeJ ?? undefined}
              label={xLabel}
            />
            <g mask={`url(#${revealId})`}>
              <g clipPath={`url(#${clipId})`}>
                <g filter={`url(#${softId})`}>
                  {order.map((i) => (
                    <path
                      key={i}
                      d={polygon(geometry.px, geometry.layers[i].top, geometry.layers[i].bottom)}
                      strokeWidth={SOFT}
                      className="transition-opacity duration-200 ease-settle"
                      opacity={activeSeries == null || activeSeries === i ? 1 : 0.32}
                      style={{ fill: fillOf(i), stroke: fillOf(i) }}
                    />
                  ))}
                </g>
                {activeSeries != null && (
                  <path
                    d={polygon(geometry.px, geometry.layers[activeSeries].top, geometry.layers[activeSeries].bottom)}
                    className="pointer-events-none"
                    style={{ fill: fillOf(activeSeries) }}
                  />
                )}
              </g>
              <g aria-hidden="true" textAnchor="middle" style={{ fontSize: LABEL_SIZE }}>
                {placements.map((p, i) =>
                  p ? (
                    <text
                      key={i}
                      x={p.x}
                      y={p.y}
                      dy="0.35em"
                      className={cn(
                        "font-medium transition-opacity duration-200 ease-settle fill-foreground dark:fill-background",
                        activeSeries != null && activeSeries !== i && "opacity-35",
                      )}
                    >
                      {series[i].name}
                    </text>
                  ) : null,
                )}
              </g>
            </g>
            {activeSeries != null && activeJ != null && (
              <g aria-hidden="true" className="pointer-events-none">
                <Crosshair x={xs[activeJ]} top={MARGIN.top} bottom={MARGIN.top + innerH} />
                {(() => {
                  const layer = geometry.layers[activeSeries];
                  const s = geometry.dataIndex[activeJ];
                  const cx = xs[activeJ];
                  const t = layer.top[s];
                  const b = layer.bottom[s];
                  return (
                    <g
                      className="transition-transform duration-200 ease-settle motion-reduce:transition-none"
                      style={{ transform: `translateX(${cx}px)` }}
                    >
                      <line
                        x1={0}
                        x2={0}
                        y1={t + 1}
                        y2={b - 1}
                        strokeWidth={4.5}
                        strokeLinecap="round"
                        className="stroke-card"
                      />
                      <line
                        x1={0}
                        x2={0}
                        y1={t + 1}
                        y2={b - 1}
                        strokeWidth={2}
                        strokeLinecap="round"
                        className="stroke-foreground"
                      />
                      <line
                        x1={-4}
                        x2={4}
                        y1={t + 1}
                        y2={t + 1}
                        strokeWidth={2}
                        strokeLinecap="round"
                        className="stroke-foreground"
                      />
                      <line
                        x1={-4}
                        x2={4}
                        y1={b - 1}
                        y2={b - 1}
                        strokeWidth={2}
                        strokeLinecap="round"
                        className="stroke-foreground"
                      />
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        )}
        {width > 0 && tooltip}
      </ChartPlot>
      <ChartTable
        caption={name}
        columns={["Period", ...series.map((s) => s.name), totalName]}
        rows={labels.map((l, j) => [titles?.[j] ?? l, ...values.map((d) => format(d[j])), format(totals[j])])}
      />
    </ChartCard>
  );
}
