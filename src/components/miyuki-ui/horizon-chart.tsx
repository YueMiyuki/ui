"use client";

import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX } from "d3-shape";
import { type ReactNode, useRef } from "react";
import {
  AxisBottom,
  AxisTitle,
  axisTitleRoom,
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  crisp,
  formatNumber,
  RevealMask,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
  withAxisTitles,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface HorizonChartSeries {
  label: string;
  values: number[];
  title?: string;
  baseline?: number;
}

export interface HorizonChartProps extends Omit<ChartCardProps, "children"> {
  series: HorizonChartSeries[];
  labels: string[];
  titles?: string[];
  ticks?: number[];
  bands?: number;
  baseline?: number;
  step?: number;
  rowHeight?: number;
  colors?: [above: string, below: string];
  unit?: string;
  format?: (value: number) => string;
  formatStep?: (value: number) => string;
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  summary?: string;
}

const GAP = 3;
const AXIS = 26;
const LABEL_GAP = 12;
const READOUT_GAP = 12;
const LABEL_SIZE = 12;

function niceStep(raw: number): number {
  const exp = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * exp >= raw - 1e-12) return m * exp;
  return 10 * exp;
}

function decimals(step: number): number {
  for (let d = 0; d < 4; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-9) return d;
  return 4;
}

export function HorizonChart({
  series,
  labels,
  titles,
  ticks,
  bands = 3,
  baseline = 0,
  step,
  rowHeight = 30,
  colors = ["var(--chart-1)", "var(--chart-5)"],
  unit = "",
  format,
  formatStep,
  xLabel,
  yLabel,
  summary,
  footer,
  label,
  className,
  ...props
}: HorizonChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const id = useChartId("horizon");

  const n = labels.length;
  const count = series.length;
  const folds = Math.max(1, Math.round(bands));
  const deviation = (s: HorizonChartSeries, j: number) => (s.values[j] ?? 0) - (s.baseline ?? baseline);
  const reach = series.reduce((m, s) => Math.max(m, ...labels.map((_, j) => Math.abs(deviation(s, j)))), 0);
  const band = step ?? niceStep(reach / folds || 1);
  const digits = decimals(band);
  const precise = digits === 0 ? 0 : digits + 1;
  const signed = (v: number) => {
    const text = formatNumber(Math.abs(v), precise);
    return `${v > 0 ? "+" : v < 0 ? "−" : ""}${text}${unit ? ` ${unit}` : ""}`;
  };
  const fmt = format ?? signed;
  const fmtStep = formatStep ?? ((v: number) => `${formatNumber(v, digits)}${unit ? ` ${unit}` : ""}`);

  const room = axisTitleRoom({ xLabel, yLabel });
  const labelW = series.reduce((w, s) => Math.max(w, textWidth(s.label, LABEL_SIZE)), 0) + LABEL_GAP + room.left;
  const readoutW =
    series.reduce((w, s) => Math.max(w, ...s.values.map((_, j) => textWidth(fmt(deviation(s, j)), LABEL_SIZE))), 0) +
    READOUT_GAP +
    14;
  const innerW = Math.max(0, width - labelW - readoutW);
  const rowsH = count * rowHeight + Math.max(0, count - 1) * GAP;
  const height = rowsH + AXIS + room.bottom;
  const x = scaleLinear()
    .domain([0, Math.max(1, n - 1)])
    .range([0, innerW]);
  const xs = labels.map((_, j) => x(j));
  const scale = rowHeight / band;
  const rowTop = (i: number) => i * (rowHeight + GAP);

  const shade = (k: number, side: 0 | 1) => {
    const t = folds > 1 ? k / (folds - 1) : 1;
    const p = `calc(var(--miyuki-horizon-chart-floor) + (100% - var(--miyuki-horizon-chart-floor)) * ${t.toFixed(3)})`;
    return `color-mix(in oklab, ${colors[side]} ${p}, var(--card))`;
  };
  const shadeOf = (v: number) => {
    if (Math.abs(v) < 1e-12) return "var(--muted)";
    const k = Math.min(folds - 1, Math.floor(Math.abs(v) / band - 1e-9));
    return shade(Math.max(0, k), v > 0 ? 0 : 1);
  };

  const path = (s: HorizonChartSeries) =>
    area<number>()
      .x((_, j) => xs[j])
      .y0(0)
      .y1((_, j) => -deviation(s, j) * scale)
      .curve(curveMonotoneX)(labels.map((_, j) => j)) ?? "";

  const autoTicks = (() => {
    if (ticks) return ticks;
    const widest = labels.reduce((w, l) => Math.max(w, textWidth(l)), 0);
    const per = n > 1 ? innerW / (n - 1) : innerW;
    const stride = Math.max(1, Math.ceil((widest + 18) / Math.max(per, 1e-9)));
    const out: number[] = [];
    for (let j = 0; j < n; j += stride) out.push(j);
    return out;
  })();

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => {
      if (innerW <= 0 || n === 0) return null;
      const j = Math.round(x.invert(px - labelW));
      return Math.max(0, Math.min(n - 1, j));
    },
  });

  const shown = active ?? n - 1;
  const name = typeof label === "string" ? label : "Series";
  const dateOf = (j: number) => titles?.[j] ?? labels[j];

  const description = withAxisTitles(
    (() => {
      if (summary) return summary;
      if (n === 0 || count === 0) return "No data.";
      const parts = series.map((s) => {
        let hi = 0;
        let lo = 0;
        labels.forEach((_, j) => {
          if (deviation(s, j) > deviation(s, hi)) hi = j;
          if (deviation(s, j) < deviation(s, lo)) lo = j;
        });
        return `${s.title ?? s.label}: highest ${fmt(deviation(s, hi))} on ${dateOf(hi)}, lowest ${fmt(deviation(s, lo))} on ${dateOf(lo)}, latest ${fmt(deviation(s, n - 1))}`;
      });
      return (
        `${count} series from ${dateOf(0)} to ${dateOf(n - 1)}, as differences from the baseline, folded into ${folds} bands of ${fmtStep(band)}; ` +
        `above in blue, below in red. ${parts.join(". ")}.`
      );
    })(),
    { xLabel, yLabel },
  );

  const keyItems = [
    ...Array.from({ length: folds }, (_, k) => ({ color: shade(folds - 1 - k, 1), low: -(folds - k) * band })),
    ...Array.from({ length: folds }, (_, k) => ({ color: shade(k, 0), low: k * band })),
  ];
  const legend = (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <p className="text-[13px] leading-5 text-muted-foreground">
        Each shade is {fmtStep(band)}; below in red, above in blue
      </p>
      <div aria-hidden="true" className="flex flex-col gap-1">
        <div className="flex gap-0.5">
          {keyItems.map((item, k) => (
            <span
              key={k}
              className={cn(
                "h-2 w-7 rounded-[2px]",
                k === 0 && "rounded-l-full",
                k === keyItems.length - 1 && "rounded-r-full",
              )}
              style={{ background: item.color }}
            />
          ))}
        </div>
        <div className="relative h-3 text-[11px] leading-none text-muted-foreground tabular-nums">
          {Array.from({ length: folds * 2 + 1 }, (_, k) => k - folds)
            .filter((k) => folds <= 4 || k % Math.ceil(folds / 3) === 0 || Math.abs(k) === folds)
            .map((k) => (
              <span
                key={k}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${((k + folds) / (folds * 2)) * 100}%` }}
              >
                {k === 0 ? "0" : `${k > 0 ? "+" : "−"}${formatNumber(Math.abs(k) * band, digits)}`}
              </span>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <ChartCard
      label={label}
      {...props}
      footer={footer ?? legend}
      className={cn("[--miyuki-horizon-chart-floor:30%] dark:[--miyuki-horizon-chart-floor:44%]", className)}
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={`${id}-reveal`} width={innerW} height={rowsH} play={inView} />
              <clipPath id={`${id}-row`}>
                <rect x={0} y={-rowHeight} width={innerW} height={rowHeight} rx={4} />
              </clipPath>
            </defs>
            <g aria-hidden="true" style={{ fontSize: LABEL_SIZE }}>
              {series.map((s, i) => (
                <text
                  key={i}
                  x={labelW - LABEL_GAP}
                  y={rowTop(i) + rowHeight / 2}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-foreground"
                >
                  {s.label}
                </text>
              ))}
            </g>
            <AxisTitle side="left" x={0} y={0} length={rowsH}>
              {yLabel}
            </AxisTitle>
            <g transform={`translate(${labelW} 0)`}>
              <AxisBottom
                scale={x}
                ticks={autoTicks}
                y={rowsH}
                width={innerW}
                overflow={[labelW, readoutW]}
                format={(v) => labels[Number(v)] ?? ""}
                label={xLabel}
                className={cn("transition-opacity duration-150", active != null && "opacity-40")}
              />
              {series.map((_, i) => (
                <rect key={i} x={0} y={rowTop(i)} width={innerW} height={rowHeight} rx={4} className="fill-muted" />
              ))}
              <g mask={`url(#${id}-reveal)`}>
                {series.map((s, i) => {
                  const d = path(s);
                  return (
                    <g key={i} transform={`translate(0 ${rowTop(i) + rowHeight})`}>
                      <g clipPath={`url(#${id}-row)`}>
                        {Array.from({ length: folds }, (_, k) => (
                          <path
                            key={`a${k}`}
                            d={d}
                            transform={`translate(0 ${k * rowHeight})`}
                            style={{ fill: shade(k, 0) }}
                          />
                        ))}
                        {Array.from({ length: folds }, (_, k) => (
                          <path
                            key={`b${k}`}
                            d={d}
                            transform={`translate(0 ${k * rowHeight}) scale(1 -1)`}
                            style={{ fill: shade(k, 1) }}
                          />
                        ))}
                      </g>
                    </g>
                  );
                })}
              </g>
              {active != null && (
                <g aria-hidden="true" className="pointer-events-none">
                  <line
                    x1={0}
                    x2={0}
                    y1={-2}
                    y2={rowsH + 2}
                    strokeWidth={1}
                    className="stroke-foreground transition-transform duration-150 ease-settle motion-reduce:transition-none"
                    style={{ transform: `translateX(${crisp(xs[active])}px)` }}
                  />
                  {(() => {
                    const text = labels[active];
                    const w = textWidth(text) + 14;
                    const left = Math.max(-labelW, Math.min(innerW + readoutW - w, xs[active] - w / 2));
                    return (
                      <g style={{ transform: `translate(${left}px, ${rowsH + 5}px)` }}>
                        <rect width={w} height={18} rx={9} className="fill-foreground" />
                        <text
                          x={w / 2}
                          y={9}
                          dy="0.35em"
                          textAnchor="middle"
                          className="fill-background font-medium"
                          style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
            <g aria-hidden="true" transform={`translate(${labelW + innerW + READOUT_GAP} 0)`}>
              {series.map((s, i) => {
                const v = deviation(s, shown);
                return (
                  <g key={i} transform={`translate(0 ${rowTop(i) + rowHeight / 2})`}>
                    <rect
                      x={0}
                      y={-4}
                      width={8}
                      height={8}
                      rx={2}
                      style={{ fill: shadeOf(v) }}
                      className="transition-[fill] duration-150"
                    />
                    <text
                      x={14}
                      dy="0.35em"
                      className={cn(
                        "transition-[fill] duration-150",
                        active != null ? "fill-foreground font-medium" : "fill-muted-foreground",
                      )}
                      style={{ fontSize: LABEL_SIZE, fontVariantNumeric: "tabular-nums" }}
                    >
                      {fmt(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </ChartPlot>
      <p aria-live="polite" className="sr-only">
        {active != null
          ? `${dateOf(active)}: ${series.map((s) => `${s.label} ${fmt(deviation(s, active))}`).join(", ")}`
          : ""}
      </p>
      <ChartTable
        caption={name}
        columns={["Date", ...series.map((s) => s.title ?? s.label)]}
        rows={labels.map((_, j) => [dateOf(j), ...series.map((s) => fmt(deviation(s, j)))])}
      />
    </ChartCard>
  );
}
