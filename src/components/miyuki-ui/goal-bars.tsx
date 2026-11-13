"use client";

import { scaleBand } from "d3-scale";
import { type ReactNode, useRef } from "react";
import {
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
  chartColors,
  closestIndex,
  crisp,
  formatCompact,
  formatNumber,
  GridLines,
  niceScale,
  staggerDelay,
  Tube,
  TubeFill,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export interface GoalBarsProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  data: number[];
  goal: number;
  name?: string;
  color?: string;
  format?: (value: number) => string;
  formatAxis?: (value: number) => string;
  height?: number;
  titles?: string[];
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 6, right: 4, bottom: 24 };
const GOAL = "var(--foreground)";

export function GoalBars({
  labels,
  data,
  goal,
  name = "Steps",
  color = chartColors[0],
  format = (v) => formatNumber(v),
  formatAxis = formatCompact,
  height = 200,
  titles,
  legend = true,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  ...props
}: GoalBarsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const pale = `color-mix(in oklab, ${color} 36%, transparent)`;

  const n = labels.length;
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const { scale: y, ticks } = niceScale(Math.max(...data, goal) * 1.12, [innerH, 0]);
  const left = axisWidth(ticks, formatAxis) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scaleBand<string>()
    .domain(labels.map((_, i) => String(i)))
    .range([0, innerW])
    .paddingInner(0.36)
    .paddingOuter(0.14);
  const tube = Math.min(x.bandwidth(), 40);
  const centers = labels.map((_, i) => (x(String(i)) ?? 0) + x.bandwidth() / 2);
  const goalY = crisp(y(goal));
  const reached = data.map((v) => v >= goal);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (innerW > 0 ? closestIndex(centers, px - left) : null),
  });

  const description = withAxisTitles(
    summary ??
      `${name} per day, ${labels[0]} to ${labels[n - 1]}, against a goal of ${format(goal)}. ` +
        `${reached.filter(Boolean).length} of ${n} days reach it. ` +
        `Most on ${titles?.[data.indexOf(Math.max(...data))] ?? labels[data.indexOf(Math.max(...data))]} with ${format(Math.max(...data))}.`,
    { xLabel, yLabel },
  );

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ChartLegend
            items={[
              { label: "Reached goal", color, marker: "square" },
              { label: "Below goal", color: pale, marker: "square" },
              { label: `Goal ${format(goal)}`, color: GOAL, marker: "line" },
            ]}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <g transform={`translate(${left} ${MARGIN.top})`}>
              {centers.map((c, i) => (
                <Tube key={i} x={c - tube / 2} width={tube} top={0} bottom={innerH} active={active === i} />
              ))}
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
              {centers.map((c, i) => (
                <TubeFill
                  key={i}
                  x={c - tube / 2}
                  width={tube}
                  bottom={innerH}
                  level={y(data[i] ?? 0)}
                  color={reached[i] ? color : pale}
                  play={inView}
                  delay={staggerDelay(i, n)}
                  className="transition-[fill] duration-200"
                />
              ))}
              <g aria-hidden="true" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} style={{ stroke: GOAL }}>
                {centers.map((c, i) => (
                  <line key={i} x1={c - tube / 2 - 3} x2={c + tube / 2 + 3} y1={goalY} y2={goalY} />
                ))}
              </g>
            </g>
          </svg>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + centers[active]}
            y={MARGIN.top + Math.min(y(data[active]), goalY)}
            offset={tube / 2 + 8}
            title={titles?.[active] ?? labels[active]}
            items={[
              { label: name, value: format(data[active]), color: reached[active] ? color : pale, marker: "square" },
            ]}
          >
            <p className={reached[active] ? "mt-0.5 font-medium text-success-strong" : "mt-0.5 text-muted-foreground"}>
              {reached[active] ? "Goal reached" : `${format(goal - data[active])} short of the goal`}
            </p>
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : name}
        columns={["Day", name, "Goal reached"]}
        rows={labels.map((l, i) => [titles?.[i] ?? l, format(data[i]), reached[i] ? "Yes" : "No"])}
      />
    </ChartCard>
  );
}
