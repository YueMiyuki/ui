"use client";

import { scaleSqrt } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import {
  ActiveDot,
  AxisBottom,
  AxisLeft,
  axisTitleRoom,
  axisWidth,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartMarker,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartMotion,
  crisp,
  formatCompact,
  formatNumber,
  GridLines,
  niceScale,
  staggerDelay,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export interface ScatterChartPoint {
  x: number;
  y: number;
  size?: number;
  label?: string;
}

export interface ScatterChartGroup {
  name: string;
  points: ScatterChartPoint[];
  color?: string;
}

export interface ScatterChartProps extends Omit<ChartCardProps, "children"> {
  groups: ScatterChartGroup[];
  xName?: string;
  yName?: string;
  sizeName?: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  formatSize?: (value: number) => string;
  formatXAxis?: (value: number) => string;
  formatYAxis?: (value: number) => string;
  height?: number;
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 10, right: 12, bottom: 24 };
const NAME_ROOM = 16;
const DOT = 4.5;

interface Placed {
  group: number;
  point: ScatterChartPoint;
  cx: number;
  cy: number;
  r: number;
}

function correlation(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export function ScatterChart({
  groups,
  xName = "x",
  yName = "y",
  sizeName = "Size",
  formatX = (v) => formatNumber(v),
  formatY = (v) => formatNumber(v),
  formatSize = (v) => formatNumber(v),
  formatXAxis = formatCompact,
  formatYAxis = formatCompact,
  height = 232,
  legend = true,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  ...props
}: ScatterChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();

  const colors = groups.map((g, i) => g.color ?? chartColor(i));
  const all = groups.flatMap((g) => g.points);
  const sized = all.some((p) => p.size != null);
  const room = axisTitleRoom({ xLabel, yLabel });
  const top = MARGIN.top + (room.left > 0 ? 0 : NAME_ROOM);
  const innerH = height - top - MARGIN.bottom - (room.bottom > 0 ? room.bottom : NAME_ROOM);
  const { scale: y, ticks: yTicks } = niceScale(Math.max(...all.map((p) => p.y)), [innerH, 0]);
  const left = axisWidth(yTicks, formatYAxis) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const { scale: x, ticks: xTicks } = niceScale(Math.max(...all.map((p) => p.x)), [0, innerW], { maxTicks: 6 });
  const sizes = all.map((p) => p.size ?? 0);
  const r = scaleSqrt()
    .domain([Math.min(...sizes), Math.max(...sizes)])
    .range([3.5, 13]);

  const placed: Placed[] = groups
    .flatMap((g, group) =>
      g.points.map((point) => ({ group, point, cx: x(point.x), cy: y(point.y), r: sized ? r(point.size ?? 0) : DOT })),
    )
    .sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  const drawOrder = placed.map((_, i) => i).sort((a, b) => placed[b].r - placed[a].r);

  const { active, bind } = useNearestIndex({
    count: placed.length,
    locate: (px, py) => {
      const lx = px - left;
      const ly = py - top;
      let best: number | null = null;
      let bestD = Infinity;
      placed.forEach((p, i) => {
        const d = Math.hypot(p.cx - lx, p.cy - ly) - p.r;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return bestD <= 20 ? best : null;
    },
  });

  const rho = correlation(
    all.map((p) => p.x),
    all.map((p) => p.y),
  );
  const strength = Math.abs(rho) > 0.7 ? "strong" : Math.abs(rho) > 0.4 ? "moderate" : "weak";
  const description = withAxisTitles(
    summary ??
      `${yName} against ${xName.toLowerCase()} for ${all.length} points in ${groups.length} groups: ` +
        groups.map((g) => `${g.name} ${g.points.length}`).join(", ") +
        `. A ${strength} ${rho >= 0 ? "positive" : "negative"} relationship.`,
    { xLabel, yLabel },
  );

  const current = active != null ? placed[active] : null;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ChartLegend
            items={groups.map((g, i) => ({ label: g.name, color: colors[i], value: formatNumber(g.points.length) }))}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <g transform={`translate(${left} ${top})`}>
              <GridLines scale={y} width={innerW} ticks={yTicks} />
              <AxisLeft scale={y} ticks={yTicks} format={formatYAxis} label={yLabel} />
              <AxisBottom
                scale={x}
                ticks={xTicks}
                y={innerH}
                width={innerW}
                overflow={[left, MARGIN.right]}
                format={(v) => formatXAxis(Number(v))}
                label={xLabel}
              />
              <g aria-hidden="true" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                {room.left === 0 && (
                  <text x={-left} y={-16}>
                    {yName}
                  </text>
                )}
                {room.bottom === 0 && (
                  <text x={innerW} y={innerH + 36} textAnchor="end">
                    {xName}
                  </text>
                )}
              </g>
              {current && (
                <g
                  aria-hidden="true"
                  className="stroke-foreground/25"
                  strokeDasharray="2 3"
                  shapeRendering="crispEdges"
                >
                  <line x1={crisp(current.cx)} x2={crisp(current.cx)} y1={current.cy + current.r + 2} y2={innerH} />
                  <line x1={0} x2={current.cx - current.r - 2} y1={crisp(current.cy)} y2={crisp(current.cy)} />
                </g>
              )}
              <g>
                {drawOrder.map((i) => {
                  const p = placed[i];
                  const color = colors[p.group];
                  return (
                    <motion.circle
                      key={i}
                      cx={p.cx}
                      cy={p.cy}
                      initial={reduce ? false : { r: 0 }}
                      animate={{ r: inView || reduce ? p.r : 0 }}
                      transition={
                        reduce ? { duration: 0 } : { ...chartMotion.fill, delay: staggerDelay(i, placed.length) }
                      }
                      strokeWidth={1.5}
                      className="transition-opacity duration-150 ease-settle"
                      opacity={active != null && active !== i ? 0.3 : 1}
                      style={{ fill: color, fillOpacity: sized ? 0.26 : 0.85, stroke: color }}
                    />
                  );
                })}
              </g>
              {current && (
                <ActiveDot
                  cx={current.cx}
                  cy={current.cy}
                  r={sized ? Math.max(3, current.r - 1) : 3.5}
                  color={colors[current.group]}
                />
              )}
            </g>
          </svg>
        )}
        {width > 0 && current && (
          <ChartTooltip
            x={left + current.cx}
            y={top + current.cy}
            offset={current.r + 10}
            title={
              <span className="flex items-center gap-1.5">
                <ChartMarker color={colors[current.group]} />
                {current.point.label ?? groups[current.group].name}
              </span>
            }
            items={[
              { label: xName, value: formatX(current.point.x) },
              { label: yName, value: formatY(current.point.y) },
              ...(current.point.size != null ? [{ label: sizeName, value: formatSize(current.point.size) }] : []),
            ]}
          >
            {current.point.label && <p className="mt-0.5 text-muted-foreground">{groups[current.group].name}</p>}
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : `${yName} against ${xName}`}
        columns={["Group", xName, yName, ...(sized ? [sizeName] : [])]}
        rows={placed.map((p) => [
          p.point.label ? `${p.point.label}, ${groups[p.group].name}` : groups[p.group].name,
          formatX(p.point.x),
          formatY(p.point.y),
          ...(sized ? [formatSize(p.point.size ?? 0)] : []),
        ])}
      />
    </ChartCard>
  );
}
