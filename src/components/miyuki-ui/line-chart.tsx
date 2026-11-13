"use client";

import { scalePoint } from "d3-scale";
import { area, curveLinear, curveMonotoneX, line } from "d3-shape";
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
  ChartPlot,
  ChartTable,
  ChartTooltip,
  Crosshair,
  chartColors,
  closestIndex,
  formatCompact,
  formatNumber,
  GridLines,
  niceScale,
  RevealMask,
  summarize,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export interface LineChartProps extends Omit<ChartCardProps, "children"> {
  data: number[];
  labels: string[];
  curve?: "smooth" | "linear";
  baseline?: number | "auto";
  name?: string;
  color?: string;
  height?: number;
  format?: (value: number) => string;
  formatAxis?: (value: number) => string;
  titles?: string[];
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 8, right: 8, bottom: 24 };

export function LineChart({
  data,
  labels,
  curve = "smooth",
  baseline = 0,
  name,
  color = chartColors[0],
  height = 200,
  format = (v) => formatNumber(v),
  formatAxis = formatCompact,
  titles,
  xLabel,
  yLabel,
  summary,
  label,
  ...props
}: LineChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("line-reveal");
  const fillId = useChartId("line-fill");
  const seriesName = name ?? (typeof label === "string" ? label : "Value");

  const n = data.length;
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const high = Math.max(...data);
  const low = Math.min(...data);
  const floor = baseline === "auto" ? low - (high - low) * 0.15 : baseline;
  const { scale: y, ticks } = niceScale(high, [innerH, 0], { min: floor });
  const left = axisWidth(ticks, formatAxis) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scalePoint<string>()
    .domain(data.map((_, i) => String(i)))
    .range([0, innerW]);
  const xs = data.map((_, i) => x(String(i)) ?? 0);
  const points = data.map((v, i) => [xs[i], y(v)] as [number, number]);
  const shape = curve === "smooth" ? curveMonotoneX : curveLinear;
  const linePath = line().curve(shape)(points) ?? "";
  const areaPath = area().curve(shape).y0(innerH)(points) ?? "";

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (innerW > 0 ? closestIndex(xs, px - left) : null),
  });

  const revealKey = `${n}:${labels.join("|")}`;

  return (
    <ChartCard label={label} {...props}>
      <ChartPlot
        ref={plotRef}
        summary={withAxisTitles(summary ?? `${seriesName} by period. ${summarize(data, labels, format)}`, {
          xLabel,
          yLabel,
        })}
        height={height}
        {...bind}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask key={revealKey} id={revealId} width={innerW} height={innerH} play={inView} />
              <AreaGradient id={fillId} color={color} />
            </defs>
            <g transform={`translate(${left} ${MARGIN.top})`}>
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={formatAxis} label={yLabel} />
              <AxisBottom
                scale={x}
                y={innerH}
                width={innerW}
                overflow={[left, MARGIN.right]}
                format={(_, i) => labels[i]}
                emphasis={active ?? undefined}
                label={xLabel}
              />
              <g mask={`url(#${revealId})`}>
                <path d={areaPath} fill={`url(#${fillId})`} />
                <path
                  d={linePath}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ stroke: color }}
                />
              </g>
              {active != null && (
                <>
                  <Crosshair x={xs[active]} bottom={innerH} />
                  <ActiveDot cx={xs[active]} cy={points[active][1]} color={color} />
                </>
              )}
            </g>
          </svg>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + xs[active]}
            y={MARGIN.top + points[active][1]}
            title={titles?.[active] ?? labels[active]}
            items={[{ label: seriesName, value: format(data[active]), color }]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={seriesName}
        columns={["Period", seriesName]}
        rows={data.map((v, i) => [titles?.[i] ?? labels[i], format(v)])}
      />
    </ChartCard>
  );
}
