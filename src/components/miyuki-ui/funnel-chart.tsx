"use client";

import { area, curveMonotoneX } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartMarker,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartMotion,
  formatNumber,
  formatPercent,
  RevealMask,
  staggerDelay,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface FunnelChartStage {
  name: string;
  value: number;
  color?: string;
}

export interface FunnelChartProps extends Omit<ChartCardProps, "children"> {
  stages: FunnelChartStage[];
  format?: (value: number) => string;
  height?: number;
  tiles?: boolean;
  track?: boolean;
  summary?: string;
}

interface Edge {
  x: number;
  h: number;
}

const SEAM = 2;
const RADIUS = 10;
const MIN_HALF = 12;

export function FunnelChart({
  stages,
  format = (v) => formatNumber(v),
  height = 168,
  tiles = true,
  track = true,
  summary,
  footer,
  label,
  ...props
}: FunnelChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const revealId = useChartId("funnel-reveal");
  const clipId = useChartId("funnel-clip");

  const n = stages.length;
  const colors = stages.map((s, i) => s.color ?? chartColor(i));
  const first = stages[0]?.value ?? 0;
  const top = Math.max(1, ...stages.map((s) => s.value));
  const mid = height / 2;
  const half = (v: number) => Math.max(MIN_HALF, (mid * Math.max(0, v)) / top);
  const col = n > 0 ? width / n : 0;
  const centers = stages.map((_, i) => col * (i + 0.5));
  const halves = stages.map((s) => half(s.value));

  const edges: Edge[] =
    n > 0
      ? [{ x: 0, h: halves[0] }, ...centers.map((x, i) => ({ x, h: halves[i] })), { x: width, h: halves[n - 1] }]
      : [];
  const band =
    area<Edge>()
      .x((e) => e.x)
      .y0((e) => mid + e.h)
      .y1((e) => mid - e.h)
      .curve(curveMonotoneX)(edges) ?? "";

  const { active, setActive, bind } = useNearestIndex({
    count: n,
    focusIndex: 0,
    locate: (px) => (col > 0 ? Math.max(0, Math.min(n - 1, Math.floor(px / col))) : null),
  });

  const share = (v: number) => formatPercent(first > 0 ? v / first : 0, { digits: 0 });
  const description =
    summary ??
    `Funnel of ${n} stages, from ${stages[0]?.name} at ${format(first)} to ${stages[n - 1]?.name} at ${format(stages[n - 1]?.value ?? 0)}. ` +
      stages
        .slice(1)
        .map((s) => `${s.name} ${format(s.value)}, ${share(s.value)} of the first stage.`)
        .join(" ");

  const tileList =
    tiles && n > 0 ? (
      <div className="@container">
        <ul className="grid grid-cols-2 gap-2 @sm:grid-cols-4" onPointerLeave={() => setActive(null)}>
          {stages.map((s, i) => (
            <li
              key={i}
              onPointerEnter={() => setActive(i)}
              className={cn(
                "min-w-0 rounded-lg bg-muted px-2.5 py-2 transition-[background-color,opacity] duration-150 ease-settle",
                active === i && "bg-accent",
                active != null && active !== i && "opacity-55",
              )}
            >
              <p className="flex items-center gap-1.5">
                <ChartMarker color={colors[i]} />
                <span className="text-[15px] leading-5 font-semibold text-foreground tabular-nums">
                  {format(s.value)}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground">{s.name}</p>
            </li>
          ))}
        </ul>
      </div>
    ) : undefined;

  return (
    <ChartCard label={label} {...props} footer={footer ?? tileList}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={width} height={height} play={inView} pad={2} />
              {stages.map((_, i) => {
                const l = i * col + (i > 0 ? SEAM / 2 : 0);
                const r = (i + 1) * col - (i < n - 1 ? SEAM / 2 : 0);
                const startCap = i === 0 ? RADIUS : 0;
                const endCap = i === n - 1 ? RADIUS : 0;
                return (
                  <clipPath key={i} id={`${clipId}-${i}`}>
                    <rect x={l + startCap} y={0} width={Math.max(0, r - l - startCap - endCap)} height={height} />
                    {i === 0 && (
                      <rect
                        x={0}
                        y={mid - halves[0]}
                        width={Math.max(0, r)}
                        height={halves[0] * 2}
                        rx={Math.min(RADIUS, halves[0])}
                      />
                    )}
                    {i === n - 1 && (
                      <rect
                        x={l}
                        y={mid - halves[n - 1]}
                        width={Math.max(0, width - l)}
                        height={halves[n - 1] * 2}
                        rx={Math.min(RADIUS, halves[n - 1])}
                      />
                    )}
                  </clipPath>
                );
              })}
            </defs>
            {track && <rect x={0} y={0} width={width} height={height} rx={RADIUS} className="fill-muted" />}
            <g mask={`url(#${revealId})`}>
              {stages.map((_, i) => (
                <path
                  key={i}
                  d={band}
                  clipPath={`url(#${clipId}-${i})`}
                  className="transition-opacity duration-150 ease-settle"
                  opacity={active != null && active !== i ? 0.4 : 1}
                  style={{ fill: colors[i] }}
                />
              ))}
            </g>
          </svg>
        )}
        {width > 0 &&
          stages.map((s, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
              style={{ left: centers[i], top: mid }}
            >
              <motion.span
                className="block rounded-full bg-card px-2 text-xs leading-5 font-medium whitespace-nowrap text-foreground tabular-nums shadow-xs"
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                transition={reduce ? { duration: 0 } : { ...chartMotion.settle, delay: 0.45 + staggerDelay(i, n) * 2 }}
              >
                {share(s.value)}
              </motion.span>
            </div>
          ))}
        {width > 0 && active != null && (
          <ChartTooltip
            x={centers[active]}
            y={mid}
            offset={34}
            title={stages[active].name}
            items={[
              { label: "Count", value: format(stages[active].value), color: colors[active] },
              ...(active > 0
                ? [
                    { label: "Of first stage", value: share(stages[active].value) },
                    {
                      label: "From previous",
                      value: formatPercent(
                        stages[active - 1].value > 0 ? stages[active].value / stages[active - 1].value : 0,
                        { digits: 0 },
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Funnel"}
        columns={["Stage", "Count", "Of first stage", "From previous"]}
        rows={stages.map((s, i) => [
          s.name,
          format(s.value),
          share(s.value),
          i > 0 && stages[i - 1].value > 0 ? formatPercent(s.value / stages[i - 1].value, { digits: 0 }) : "",
        ])}
      />
    </ChartCard>
  );
}
