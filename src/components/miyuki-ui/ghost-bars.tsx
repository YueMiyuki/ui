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
  formatCompact,
  formatNumber,
  formatPercent,
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

export interface GhostBarsProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  data: number[];
  previous?: number[];
  currentIndex?: number;
  currentName?: string;
  previousName?: string;
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

const MARGIN = { top: 4, right: 4, bottom: 24 };
const GHOST = "color-mix(in oklab, var(--brand-strong) 34%, transparent)";
const GHOST_WIDTH = 5;
const GHOST_GAP = 3;

export function GhostBars({
  labels,
  data,
  previous,
  currentIndex,
  currentName = "This year",
  previousName = "Last year",
  color = chartColors[0],
  format = (v) => formatNumber(v),
  formatAxis = formatCompact,
  height = 208,
  titles,
  legend = true,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  ...props
}: GhostBarsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);

  const n = labels.length;
  const now = currentIndex ?? n - 1;
  const room = axisTitleRoom({ xLabel, yLabel });
  const innerH = height - MARGIN.top - MARGIN.bottom - room.bottom;
  const { scale: y, ticks } = niceScale(Math.max(...data, ...(previous ?? [])) * 1.08, [innerH, 0]);
  const left = axisWidth(ticks, formatAxis) + 10 + room.left;
  const innerW = Math.max(0, width - left - MARGIN.right);
  const x = scaleBand<string>()
    .domain(labels.map((_, i) => String(i)))
    .range([0, innerW])
    .paddingInner(0.34)
    .paddingOuter(0.14);
  const ghost = previous ? GHOST_WIDTH + GHOST_GAP : 0;
  const tube = Math.max(6, Math.min(x.bandwidth() - ghost, 40));
  const centers = labels.map((_, i) => (x(String(i)) ?? 0) + x.bandwidth() / 2);
  const tubeX = centers.map((c) => c - (tube + ghost) / 2);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: Math.max(now, 0),
    locate: (px) => (innerW > 0 ? closestIndex(centers, px - left) : null),
  });

  const total = data.reduce((a, b) => a + b, 0);
  const best = data.indexOf(Math.max(...data));
  const description = withAxisTitles(
    summary ??
      `${currentName}, ${labels[0]} to ${labels[n - 1]}: ${format(total)} in all, highest in ${labels[best]} at ${format(data[best])}.` +
        (previous ? ` ${previousName} totalled ${format(previous.reduce((a, b) => a + b, 0))}.` : ""),
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
              { label: currentName, color, marker: "square" },
              ...(previous ? [{ label: previousName, color: GHOST, marker: "square" as const }] : []),
            ]}
          />
        ) : undefined)
      }
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <g transform={`translate(${left} ${MARGIN.top})`}>
              {tubeX.map((tx, i) => (
                <Tube key={i} x={tx} width={tube} top={0} bottom={innerH} active={active === i} />
              ))}
              <GridLines scale={y} width={innerW} ticks={ticks} />
              <AxisLeft scale={y} ticks={ticks} format={formatAxis} label={yLabel} />
              <AxisBottom
                scale={x}
                y={innerH}
                width={innerW}
                overflow={[left, MARGIN.right]}
                format={(_, i) => labels[i]}
                emphasis={active ?? (now >= 0 ? now : undefined)}
                label={xLabel}
              />
              {tubeX.map((tx, i) => (
                <g key={i}>
                  {previous && (
                    <TubeFill
                      x={tx + tube + GHOST_GAP}
                      width={GHOST_WIDTH}
                      radius={GHOST_WIDTH / 2}
                      bottom={innerH}
                      level={y(previous[i] ?? 0)}
                      color={GHOST}
                      play={inView}
                      delay={staggerDelay(i, n)}
                      dim={active != null && active !== i}
                    />
                  )}
                  <TubeFill
                    x={tx}
                    width={tube}
                    bottom={innerH}
                    level={y(data[i] ?? 0)}
                    color={color}
                    play={inView}
                    delay={staggerDelay(i, n)}
                    dim={active != null && active !== i}
                  />
                </g>
              ))}
              {now >= 0 && now < n && (
                <rect
                  aria-hidden="true"
                  x={tubeX[now] + 0.75}
                  y={0.75}
                  width={Math.max(0, tube - 1.5)}
                  height={Math.max(0, innerH - 1.5)}
                  rx={Math.min(6, tube / 2) - 0.75}
                  fill="none"
                  strokeWidth={1.5}
                  className="pointer-events-none stroke-foreground"
                />
              )}
            </g>
          </svg>
        )}
        {width > 0 && active != null && (
          <ChartTooltip
            x={left + centers[active]}
            y={MARGIN.top + y(Math.max(data[active] ?? 0, previous?.[active] ?? 0))}
            offset={(tube + ghost) / 2 + 8}
            title={titles?.[active] ?? labels[active]}
            items={[
              { label: currentName, value: format(data[active]), color, marker: "square" },
              ...(previous
                ? [{ label: previousName, value: format(previous[active]), color: GHOST, marker: "square" as const }]
                : []),
            ]}
          >
            {previous && previous[active] > 0 && (
              <p className="mt-1 border-t border-border pt-1 text-muted-foreground">
                <span
                  className={
                    data[active] >= previous[active]
                      ? "font-medium text-success-strong"
                      : "font-medium text-destructive-strong"
                  }
                >
                  {formatPercent(data[active] / previous[active] - 1, { signed: true })}
                </span>{" "}
                on {previousName.toLowerCase()}
                {active === now ? ", so far" : ""}
              </p>
            )}
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : currentName}
        columns={["Period", currentName, ...(previous ? [previousName] : [])]}
        rows={labels.map((l, i) => [titles?.[i] ?? l, format(data[i]), ...(previous ? [format(previous[i])] : [])])}
      />
    </ChartCard>
  );
}
