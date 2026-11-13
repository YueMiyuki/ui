"use client";

import { scalePoint } from "d3-scale";
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
  chartColors,
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

export interface ComparisonAreaProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  current: number[];
  previous: number[];
  currentName?: string;
  previousName?: string;
  color?: string;
  format?: (value: number) => string;
  formatAxis?: (value: number) => string;
  height?: number;
  titles?: string[];
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 8, right: 8, bottom: 24 };
const PREVIOUS = "var(--muted-foreground)";

export function ComparisonArea({
  labels,
  current,
  previous,
  currentName = "This year",
  previousName = "Last year",
  color = chartColors[0],
  format = (v) => formatNumber(v),
  formatAxis = formatCompact,
  height = 200,
  titles,
  xLabel,
  yLabel,
  summary,
  action,
  label,
  ...props
}: ComparisonAreaProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("revenue-reveal");
  const fillId = useChartId("revenue-fill");

  const n = labels.length;
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const { scale: y, ticks } = niceScale(Math.max(...current, ...previous), [innerH, 0]);
  const left = axisWidth(ticks, formatAxis) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scalePoint<string>()
    .domain(labels.map((_, i) => String(i)))
    .range([0, innerW]);
  const xs = labels.map((_, i) => x(String(i)) ?? 0);
  const now = current.map((v, i) => [xs[i], y(v)] as [number, number]);
  const before = previous.map((v, i) => [xs[i], y(v)] as [number, number]);
  const curve = line().curve(curveMonotoneX);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (innerW > 0 ? closestIndex(xs, px - left) : null),
  });

  const sumNow = current.reduce((a, b) => a + b, 0);
  const sumBefore = previous.reduce((a, b) => a + b, 0);
  const description = withAxisTitles(
    summary ??
      `${currentName} against ${previousName.toLowerCase()}, ${labels[0]} to ${labels[n - 1]}. ` +
        `${currentName} totals ${format(sumNow)}, ${previousName.toLowerCase()} ${format(sumBefore)}. ` +
        `${currentName} is ahead in ${current.filter((v, i) => v > (previous[i] ?? 0)).length} of ${n} periods.`,
    { xLabel, yLabel },
  );

  return (
    <ChartCard
      label={label}
      {...props}
      action={
        action ?? (
          <ChartLegend
            className="gap-x-3"
            items={[
              { label: currentName, color },
              { label: previousName, color: PREVIOUS, marker: "dashed" },
            ]}
          />
        )
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={innerH} play={inView} />
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
                <path d={area().curve(curveMonotoneX).y0(innerH)(now) ?? ""} fill={`url(#${fillId})`} />
                <path
                  d={curve(before) ?? ""}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  opacity={0.7}
                  style={{ stroke: PREVIOUS }}
                />
                <path
                  d={curve(now) ?? ""}
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
                  <circle
                    cx={before[active][0]}
                    cy={before[active][1]}
                    r={3.5}
                    strokeWidth={1.5}
                    className="pointer-events-none fill-card"
                    style={{ stroke: PREVIOUS }}
                  />
                  <ActiveDot cx={now[active][0]} cy={now[active][1]} color={color} />
                </>
              )}
            </g>
          </svg>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + xs[active]}
            y={MARGIN.top + (now[active][1] + before[active][1]) / 2}
            title={titles?.[active] ?? labels[active]}
            items={[
              { label: currentName, value: format(current[active]), color },
              { label: previousName, value: format(previous[active]), color: PREVIOUS, marker: "dashed" },
            ]}
          >
            {previous[active] > 0 && (
              <p className="mt-1 border-t border-border pt-1 text-muted-foreground">
                <span
                  className={
                    current[active] >= previous[active]
                      ? "font-medium text-success-strong"
                      : "font-medium text-destructive-strong"
                  }
                >
                  {formatPercent(current[active] / previous[active] - 1, { signed: true })}
                </span>{" "}
                on {previousName.toLowerCase()}
              </p>
            )}
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : currentName}
        columns={["Period", currentName, previousName]}
        rows={labels.map((l, i) => [titles?.[i] ?? l, format(current[i]), format(previous[i])])}
      />
    </ChartCard>
  );
}
