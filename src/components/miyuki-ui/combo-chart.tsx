"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { type ReactNode, useRef } from "react";
import {
  ActiveDot,
  AxisBottom,
  AxisLeft,
  AxisRight,
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
  formatCompact,
  formatNumber,
  formatPercent,
  GridLines,
  niceScale,
  RevealMask,
  staggerDelay,
  Tube,
  TubeFill,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";

export interface ComboChartProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  bars: number[];
  line: number[];
  barName?: string;
  lineName?: string;
  barColor?: string;
  lineColor?: string;
  formatBar?: (value: number) => string;
  formatLine?: (value: number) => string;
  formatBarAxis?: (value: number) => string;
  formatLineAxis?: (value: number) => string;
  lineAxisClassName?: string;
  height?: number;
  titles?: string[];
  legend?: boolean;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  yRightLabel?: ReactNode;
  summary?: string;
}

const MARGIN = { top: 10, bottom: 24 };

function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= raw) return m * power;
  return 10 * power;
}

export function ComboChart({
  labels,
  bars,
  line: lineValues,
  barName = "Bars",
  lineName = "Line",
  barColor = chartColors[1],
  lineColor = chartColors[0],
  formatBar = (v) => formatNumber(v),
  formatLine = (v) => formatPercent(v),
  formatBarAxis = formatCompact,
  formatLineAxis = (v) => formatPercent(v, { digits: 1 }),
  lineAxisClassName = "fill-brand-strong",
  height = 208,
  titles,
  legend = true,
  xLabel,
  yLabel,
  yRightLabel,
  summary,
  footer,
  label,
  ...props
}: ComboChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("combo-reveal");

  const n = labels.length;
  const room = axisTitleRoom({ xLabel, yLabel, yRightLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const { scale: yBars, ticks } = niceScale(Math.max(...bars), [innerH, 0]);
  const steps = Math.max(1, ticks.length - 1);
  const lineStep = niceStep(Math.max(1e-9, ...lineValues) / steps);
  const yLine = scaleLinear()
    .domain([0, lineStep * steps])
    .range([innerH, 0]);
  const lineTicks = ticks.map((_, i) => i * lineStep);

  const left = axisWidth(ticks, formatBarAxis) + 10 + room.left;
  const right = axisWidth(lineTicks, formatLineAxis) + 10 + room.right;
  const innerW = Math.max(0, width - left - right);
  const x = scaleBand<string>()
    .domain(labels.map((_, i) => String(i)))
    .range([0, innerW])
    .paddingInner(0.38)
    .paddingOuter(0.12);
  const tube = Math.min(x.bandwidth(), 30);
  const centers = labels.map((_, i) => (x(String(i)) ?? 0) + x.bandwidth() / 2);
  const points = lineValues.map((v, i) => [centers[i], yLine(v)] as [number, number]);
  const linePath = line().curve(curveMonotoneX)(points) ?? "";

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (innerW > 0 ? closestIndex(centers, px - left) : null),
  });

  const description = withAxisTitles(
    summary ??
      `${barName} as bars and ${lineName.toLowerCase()} as a line, ${labels[0]} to ${labels[n - 1]}. ` +
        `${barName} peak at ${formatBar(Math.max(...bars))} in ${labels[bars.indexOf(Math.max(...bars))]}; ` +
        `${lineName.toLowerCase()} ranges from ${formatLine(Math.min(...lineValues))} to ${formatLine(Math.max(...lineValues))}.`,
    { xLabel, yLabel, yRightLabel },
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
              { label: barName, color: barColor, marker: "square" },
              { label: lineName, color: lineColor, marker: "line" },
            ]}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={innerW} height={innerH} play={inView} />
            </defs>
            <g transform={`translate(${left} ${MARGIN.top})`}>
              {centers.map((c, i) => (
                <Tube key={i} x={c - tube / 2} width={tube} top={0} bottom={innerH} active={active === i} />
              ))}
              <GridLines scale={yBars} width={innerW} ticks={ticks} />
              <AxisLeft scale={yBars} ticks={ticks} format={formatBarAxis} label={yLabel} />
              <AxisRight
                scale={yLine}
                width={innerW}
                ticks={lineTicks}
                format={formatLineAxis}
                label={yRightLabel}
                className={lineAxisClassName}
              />
              <AxisBottom
                scale={x}
                y={innerH}
                width={innerW}
                overflow={[left, right]}
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
                  level={yBars(bars[i])}
                  color={barColor}
                  play={inView}
                  delay={staggerDelay(i, n)}
                  dim={active != null && active !== i}
                />
              ))}
              <g mask={`url(#${revealId})`}>
                <path
                  d={linePath}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ stroke: lineColor }}
                />
                {points.map(([px, py], i) => (
                  <circle
                    key={i}
                    cx={px}
                    cy={py}
                    r={3.25}
                    strokeWidth={2}
                    style={{ fill: lineColor, stroke: "var(--card)" }}
                  />
                ))}
              </g>
              {active != null && <ActiveDot cx={points[active][0]} cy={points[active][1]} color={lineColor} />}
            </g>
          </svg>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + centers[active]}
            y={MARGIN.top + Math.min(points[active][1], yBars(bars[active]))}
            offset={tube / 2 + 8}
            title={titles?.[active] ?? labels[active]}
            items={[
              { label: barName, value: formatBar(bars[active]), color: barColor, marker: "square" },
              { label: lineName, value: formatLine(lineValues[active]), color: lineColor },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : `${barName} and ${lineName.toLowerCase()}`}
        columns={["Period", barName, lineName]}
        rows={labels.map((l, i) => [titles?.[i] ?? l, formatBar(bars[i]), formatLine(lineValues[i])])}
      />
    </ChartCard>
  );
}
