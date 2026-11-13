"use client";

import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartMotion,
  chartRamp,
  formatNumber,
  staggerDelay,
  textWidth,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface HeatmapChartProps extends Omit<ChartCardProps, "children"> {
  rows: string[];
  columns: string[];
  data: number[][];
  rowTitles?: string[];
  columnTitles?: string[];
  name?: string;
  colors?: readonly string[];
  thresholds?: number[];
  format?: (value: number) => string;
  formatLegend?: (value: number) => string;
  cellHeight?: number;
  legend?: boolean;
  summary?: string;
}

const AXIS = 22;
const LABEL_GAP = 10;
const axisText = { fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;

function niceStep(max: number, bins: number): number {
  const raw = Math.max(max, 1) / bins;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function stepOf(value: number, thresholds: readonly number[]): number {
  let step = 0;
  while (step < thresholds.length && value >= thresholds[step]) step++;
  return step;
}

export function HeatmapChart({
  rows,
  columns,
  data,
  rowTitles,
  columnTitles,
  name,
  colors = chartRamp,
  thresholds,
  format = (v) => formatNumber(v),
  formatLegend = (v) => formatNumber(v),
  cellHeight = 22,
  legend = true,
  summary,
  footer,
  label,
  ...props
}: HeatmapChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const play = inView || !!reduce;

  const seriesName = name ?? (typeof label === "string" ? label : "Value");
  const nr = rows.length;
  const nc = columns.length;
  const value = (r: number, c: number) => data[r]?.[c] ?? 0;
  const all = data.flat();
  const max = Math.max(0, ...all);
  const bins = colors.length;
  const step = niceStep(max, bins);
  const bounds = thresholds ?? Array.from({ length: bins - 1 }, (_, k) => (k + 1) * step);
  const colorOf = (v: number) => colors[Math.min(colors.length - 1, stepOf(v, bounds))];

  const left = rows.reduce((w, r) => Math.max(w, textWidth(r)), 0) + LABEL_GAP;
  const innerW = Math.max(0, width - left);
  const gap = innerW / Math.max(1, nc) < 18 ? 2 : 3;
  const cellW = Math.max(1, (innerW - gap * (nc - 1)) / Math.max(1, nc));
  const cellH = Math.min(cellHeight, Math.max(14, Math.round(cellW * 1.25)));
  const pitchX = cellW + gap;
  const pitchY = cellH + gap;
  const gridH = nr * pitchY - gap;
  const height = gridH + AXIS;
  const rx = Math.min(5, cellW / 2, cellH / 2);
  const widest = columns.reduce((w, c) => Math.max(w, textWidth(c)), 0);
  const stride = Math.max(1, Math.ceil((widest + 8) / pitchX));

  const { active, setActive, bind } = useNearestIndex({
    count: nr * nc,
    columns: nc,
    focusIndex: all.indexOf(max),
    locate: (px, py) => {
      if (innerW <= 0) return null;
      const c = Math.floor((px - left + gap / 2) / pitchX);
      const r = Math.floor((py + gap / 2) / pitchY);
      if (c < 0 || c >= nc || r < 0 || r >= nr) return null;
      return r * nc + c;
    },
  });
  const ar = active != null ? Math.floor(active / nc) : null;
  const ac = active != null ? active % nc : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (active != null && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      const r = Math.floor(active / nc);
      setActive(event.key === "Home" ? r * nc : r * nc + nc - 1);
      return;
    }
    bind.onKeyDown(event);
  };

  let busiest = 0;
  let quietest = 0;
  all.forEach((v, i) => {
    if (v > all[busiest]) busiest = i;
    if (v < all[quietest]) quietest = i;
  });
  const rowName = (r: number) => rowTitles?.[r] ?? rows[r];
  const colName = (c: number) => columnTitles?.[c] ?? columns[c];
  const rowTotals = rows.map((_, r) => columns.reduce((sum, __, c) => sum + value(r, c), 0));
  const topRow = rowTotals.indexOf(Math.max(...rowTotals));
  const description =
    summary ??
    `${seriesName}, ${rowName(0)} to ${rowName(nr - 1)} in ${nc} blocks a day. ` +
      `Busiest ${rowName(Math.floor(busiest / nc))}, ${colName(busiest % nc)}, at ${format(all[busiest] ?? 0)}; ` +
      `quietest ${rowName(Math.floor(quietest / nc))}, ${colName(quietest % nc)}, at ${format(all[quietest] ?? 0)}. ` +
      `Busiest day overall ${rowName(topRow)}.`;

  const legendRow = legend ? (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <p className="text-[13px] leading-5 text-muted-foreground">{seriesName} per block</p>
      <div aria-hidden="true" className="flex gap-0.5">
        {colors.map((color, k) => (
          <div key={k} className="flex w-8 flex-col gap-1">
            <span
              className={cn(
                "h-2 rounded-[2px]",
                k === 0 && "rounded-l-full",
                k === colors.length - 1 && "rounded-r-full",
              )}
              style={{ background: color }}
            />
            <span className="text-[11px] leading-none text-muted-foreground tabular-nums">
              {k === 0 ? formatLegend(0) : `${formatLegend(bounds[k - 1])}${k === colors.length - 1 ? "+" : ""}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <ChartCard label={label} {...props} footer={footer ?? legendRow}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind} onKeyDown={onKeyDown}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <g aria-hidden="true" className="fill-muted-foreground" style={axisText} textAnchor="end">
              {rows.map((r, i) => (
                <text
                  key={i}
                  x={left - LABEL_GAP}
                  y={i * pitchY + cellH / 2}
                  dy="0.34em"
                  className={cn("transition-[fill] duration-150", i === ar && "fill-foreground font-medium")}
                >
                  {r}
                </text>
              ))}
            </g>
            <g aria-hidden="true" className="fill-muted-foreground" style={axisText} textAnchor="middle">
              {columns.map((c, j) =>
                j % stride === 0 || j === ac ? (
                  <text
                    key={j}
                    x={left + j * pitchX + cellW / 2}
                    y={gridH + 17}
                    className={cn(j === ac && "fill-foreground font-medium")}
                  >
                    {c}
                  </text>
                ) : null,
              )}
            </g>
            <g transform={`translate(${left} 0)`}>
              {rows.map((_, r) =>
                columns.map((__, c) => (
                  <motion.rect
                    key={`${r}-${c}`}
                    aria-hidden="true"
                    x={c * pitchX}
                    y={r * pitchY}
                    width={cellW}
                    height={cellH}
                    rx={rx}
                    initial={reduce ? false : { opacity: 0, scale: 0.55 }}
                    animate={{ opacity: play ? 1 : 0, scale: play ? 1 : 0.55 }}
                    transition={
                      reduce ? { duration: 0 } : { ...chartMotion.settle, delay: staggerDelay(c, nc) + r * 0.018 }
                    }
                    className="transition-[fill] duration-200 ease-settle"
                    style={{ fill: colorOf(value(r, c)), transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )),
              )}
              {ar != null && ac != null && (
                <rect
                  aria-hidden="true"
                  x={-1.75}
                  y={-1.75}
                  width={cellW + 3.5}
                  height={cellH + 3.5}
                  rx={rx + 1.75}
                  fill="none"
                  strokeWidth={1.5}
                  className="pointer-events-none stroke-foreground transition-transform duration-200 ease-settle motion-reduce:transition-none"
                  style={{ transform: `translate(${ac * pitchX}px, ${ar * pitchY}px)` }}
                />
              )}
            </g>
          </svg>
        )}
        {width > 0 && ar != null && ac != null && (
          <ChartTooltip
            x={left + ac * pitchX + cellW / 2}
            y={ar * pitchY + cellH / 2}
            offset={cellW / 2 + 8}
            title={`${rowName(ar)}, ${colName(ac)}`}
            items={[
              { label: seriesName, value: format(value(ar, ac)), color: colorOf(value(ar, ac)), marker: "square" },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : seriesName}
        columns={["", ...columns.map((_, c) => colName(c))]}
        rows={rows.map((_, r) => [rowName(r), ...columns.map((__, c) => format(value(r, c)))])}
      />
    </ChartCard>
  );
}
