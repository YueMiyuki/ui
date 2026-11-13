"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { type ReactNode, useRef } from "react";
import {
  ActiveDot,
  AreaGradient,
  AxisBottom,
  AxisLeft,
  axisTitleRoom,
  axisWidth,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  Crosshair,
  chartColor,
  closestIndex,
  formatCompact,
  formatNumber,
  formatPercent,
  GridLines,
  niceScale,
  RevealMask,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export type AreaChartMode = "stacked" | "overlap" | "percent";

export interface AreaChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface AreaChartProps extends Omit<ChartCardProps, "children"> {
  series: AreaChartSeries[];
  labels: string[];
  mode?: AreaChartMode;
  height?: number;
  format?: (value: number) => string;
  titles?: string[];
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

interface Point {
  x: number;
  y0: number;
  y1: number;
}

const MARGIN = { top: 8, right: 8, bottom: 24 };

export function AreaChart({
  series,
  labels,
  mode = "stacked",
  height = 200,
  format = (v) => formatNumber(v),
  titles,
  legend = true,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  ...props
}: AreaChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("area-reveal");
  const gradientId = useChartId("area-fill");

  const n = labels.length;
  const colors = series.map((s, i) => s.color ?? chartColor(i));
  const totals = labels.map((_, j) => series.reduce((sum, s) => sum + (s.data[j] ?? 0), 0));
  const seriesTotals = series.map((s) => s.data.reduce((sum, v) => sum + v, 0));

  const bands = series.map((s, i) =>
    labels.map((_, j) => {
      const value = s.data[j] ?? 0;
      if (mode === "overlap") return [0, value] as const;
      const below = series.slice(0, i).reduce((sum, t) => sum + (t.data[j] ?? 0), 0);
      const k = mode === "percent" ? totals[j] || 1 : 1;
      return [below / k, (below + value) / k] as const;
    }),
  );
  const top = mode === "percent" ? 1 : Math.max(1, ...bands.flatMap((b) => b.map((p) => p[1])));

  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const nice = niceScale(top, [innerH, 0]);
  const y = mode === "percent" ? scaleLinear().domain([0, 1]).range([innerH, 0]) : nice.scale;
  const ticks = mode === "percent" ? [0, 0.25, 0.5, 0.75, 1] : nice.ticks;
  const tickFormat = mode === "percent" ? (v: number) => formatPercent(v, { digits: 0 }) : formatCompact;
  const left = axisWidth(ticks, tickFormat) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scalePoint<string>()
    .domain(labels.map((_, j) => String(j)))
    .range([0, innerW]);
  const xs = labels.map((_, j) => x(String(j)) ?? 0);

  const points: Point[][] = bands.map((band) => band.map(([lo, hi], j) => ({ x: xs[j], y0: y(lo), y1: y(hi) })));
  const areaPath = area<Point>()
    .x((p) => p.x)
    .y0((p) => p.y0)
    .y1((p) => p.y1)
    .curve(curveMonotoneX);
  const linePath = line<Point>()
    .x((p) => p.x)
    .y((p) => p.y1)
    .curve(curveMonotoneX);

  const order = series.map((_, i) => i);
  if (mode === "overlap") order.sort((a, b) => seriesTotals[b] - seriesTotals[a]);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (innerW > 0 ? closestIndex(xs, px - left) : null),
  });

  const name = typeof label === "string" ? label : "Values";
  const modeText =
    mode === "percent" ? "Share of the total" : mode === "stacked" ? "Stacked areas" : "Overlapping areas";
  const description = withAxisTitles(
    summary ??
      `${modeText} for ${series.map((s) => s.name).join(", ")} from ${labels[0]} to ${labels[n - 1]}. ` +
        series
          .map(
            (s, i) =>
              `${s.name} totals ${format(seriesTotals[i])}, highest in ${labels[s.data.indexOf(Math.max(...s.data))]}.`,
          )
          .join(" "),
    { xLabel, yLabel },
  );

  const tooltip = (() => {
    if (active == null) return null;
    const ys = points.map((p) => p[active].y1);
    const rows = (
      mode === "overlap"
        ? series.map((_, i) => i).sort((a, b) => series[b].data[active] - series[a].data[active])
        : series.map((_, i) => i).reverse()
    ).map((i) => ({
      label: series[i].name,
      value:
        mode === "percent"
          ? formatPercent((series[i].data[active] ?? 0) / (totals[active] || 1))
          : format(series[i].data[active] ?? 0),
      color: colors[i],
    }));
    return (
      <ChartTooltip
        x={left + xs[active]}
        y={MARGIN.top + Math.min(...ys)}
        title={titles?.[active] ?? labels[active]}
        items={rows}
      >
        {mode === "stacked" && (
          <div className="mt-1 flex justify-between gap-4 border-t border-border pt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium text-foreground tabular-nums">{format(totals[active])}</span>
          </div>
        )}
      </ChartTooltip>
    );
  })();

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ChartLegend
            items={series.map((s, i) => ({ label: s.name, color: colors[i], value: format(seriesTotals[i]) }))}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={innerH} play={inView} />
              {series.map((_, i) => (
                <AreaGradient key={i} id={`${gradientId}-${i}`} color={colors[i]} />
              ))}
            </defs>
            <g transform={`translate(${left} ${MARGIN.top})`}>
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={tickFormat} label={yLabel} />
              <AxisBottom
                scale={x}
                y={innerH}
                width={innerW}
                overflow={[left, MARGIN.right]}
                format={(_, j) => labels[j]}
                emphasis={active ?? undefined}
                label={xLabel}
              />
              <g mask={`url(#${revealId})`}>
                {order.map((i) => (
                  <path key={`a${i}`} d={areaPath(points[i]) ?? ""} fill={`url(#${gradientId}-${i})`} />
                ))}
                {order.map((i) =>
                  mode === "percent" && i === series.length - 1 ? null : (
                    <path
                      key={`l${i}`}
                      d={linePath(points[i]) ?? ""}
                      fill="none"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ stroke: colors[i] }}
                    />
                  ),
                )}
              </g>
              {active != null && (
                <>
                  <Crosshair x={xs[active]} bottom={innerH} />
                  {order.map((i) =>
                    mode === "percent" && i === series.length - 1 ? null : (
                      <ActiveDot key={i} cx={xs[active]} cy={points[i][active].y1} color={colors[i]} />
                    ),
                  )}
                </>
              )}
            </g>
          </svg>
        )}
        {width > 0 && tooltip}
      </ChartPlot>
      <ChartTable
        caption={name}
        columns={["Period", ...series.map((s) => s.name)]}
        rows={labels.map((l, j) => [titles?.[j] ?? l, ...series.map((s) => format(s.data[j] ?? 0))])}
      />
    </ChartCard>
  );
}
