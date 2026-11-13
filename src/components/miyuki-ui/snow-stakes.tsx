"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  closestIndex,
  formatNumber,
  staggerDelay,
  textWidth,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SnowStakesDatum {
  label: string;
  title?: string;
  depth: number;
  fresh?: number;
  temperature?: number;
}

export interface SnowStakesProps extends Omit<ChartCardProps, "children"> {
  data: SnowStakesDatum[];
  max?: number;
  unit?: string;
  temperatureUnit?: string;
  height?: number;
  summary?: string;
}

const MARGIN = { top: 10, bottom: 26 };
const RISE = 1.5;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const signed = (n: number, digits = 0) => `${n > 0 ? "+" : ""}${formatNumber(n, digits)}`;

function niceMax(value: number) {
  const raw = Math.max(1, value) * 1.12;
  const exp = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * exp >= raw) return m * exp;
  return 10 * exp;
}

function majorStep(max: number) {
  const exp = 10 ** Math.floor(Math.log10(max));
  for (const m of [0.5, 1, 2, 2.5, 5]) if (max / (m * exp) <= 4) return m * exp;
  return 5 * exp;
}

function mound(cx: number, ground: number, top: number, band: number, seed: string) {
  const h = Math.max(0, ground - top);
  const base = band * Math.min(0.94, 0.7 + h * 0.004);
  const crown = band * 0.58;
  const r = Math.min(9, h * 0.45, crown * 0.3);
  const rng = createRng(seed);
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const amp = Math.min(1.5, h * 0.08);
  const bump = (x: number) => amp * (0.65 * Math.sin(x * 0.19 + p1) + 0.35 * Math.sin(x * 0.47 + p2));
  const l = cx - crown / 2;
  const rr = cx + crown / 2;
  const flare = Math.min(h * 0.32, 26);
  let d = `M ${cx - base / 2} ${ground} C ${l - 1} ${ground - flare * 0.15} ${l} ${ground - flare} ${l} ${Math.max(top + r, ground - flare * 1.4)}`;
  d += ` L ${l} ${top + r}`;
  d += ` Q ${l} ${top + bump(l + r) * 0.4} ${l + r} ${top + bump(l + r)}`;
  for (let x = l + r + 4; x < rr - r; x += 4) d += ` L ${x} ${top + bump(x)}`;
  d += ` L ${rr - r} ${top + bump(rr - r)} Q ${rr} ${top + bump(rr - r) * 0.4} ${rr} ${top + r}`;
  d += ` L ${rr} ${Math.max(top + r, ground - flare * 1.4)} C ${rr} ${ground - flare} ${rr + 1} ${ground - flare * 0.15} ${cx + base / 2} ${ground} Z`;
  return d;
}

export function SnowStakes({
  data,
  max,
  unit = "cm",
  temperatureUnit = "°C",
  height = 240,
  summary,
  label,
  className,
  ...props
}: SnowStakesProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion() ?? false;
  const [clock, setClock] = useState(0);

  const n = data.length;
  const top = max ?? niceMax(Math.max(0, ...data.map((d) => d.depth)));
  const step = majorStep(top);
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const band = n > 0 ? width / n : 0;
  const centers = data.map((_, i) => band * (i + 0.5));
  const stake = Math.max(8, Math.min(13, band * 0.18));
  const y = (v: number) => MARGIN.top + innerH - (Math.min(v, top) / top) * innerH;
  const ground = MARGIN.top + innerH;
  const done = reduce || clock >= RISE + staggerDelay(n - 1, n) + 0.05;

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    let start = -1;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = (now - start) / 1000;
      setClock(t);
      if (t < RISE + 0.5) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: n - 1,
    locate: (px) => (width > 0 ? closestIndex(centers, px) : null),
  });

  const shown = data.map((d, i) => {
    const fresh = Math.max(0, Math.min(d.fresh ?? 0, d.depth));
    if (done) return { base: d.depth - fresh, fresh };
    const p = clamp01((clock - staggerDelay(i, n)) / RISE);
    return {
      base: (d.depth - fresh) * easeOut(clamp01(p / 0.7)),
      fresh: fresh * easeOut(clamp01((p - 0.6) / 0.4)),
    };
  });

  const fmt = (v: number) => `${formatNumber(v)} ${unit}`;
  const highest = data.reduce((b, d, i) => (d.depth > data[b].depth ? i : b), 0);
  const description =
    summary ??
    (n > 0
      ? `Snow depth at ${n} stakes, from ${fmt(data[0].depth)} at ${data[0].title ?? data[0].label} to ${fmt(data[n - 1].depth)} at ${data[n - 1].title ?? data[n - 1].label}. Deepest ${fmt(data[highest].depth)}.`
      : "No data.");

  const ticks: number[] = [];
  const minor = step / 5;
  for (let v = minor; v <= top + 1e-6; v += minor) ticks.push(Math.round(v * 1e6) / 1e6);

  const tip = active != null ? data[active] : null;
  const widest = data.reduce((w, d) => Math.max(w, textWidth(d.label)), 0);
  const stride = band > 0 ? Math.max(1, Math.ceil((widest + 8) / band)) : 1;

  return (
    <ChartCard
      label={label}
      {...props}
      className={cn(
        "[--miyuki-snow-stakes-old:color-mix(in_oklab,var(--brand)_9%,var(--card))] [--miyuki-snow-stakes-new:var(--card)]",
        "[--miyuki-snow-stakes-shade:color-mix(in_oklab,var(--brand)_30%,var(--card))] [--miyuki-snow-stakes-line:color-mix(in_oklab,var(--brand)_42%,transparent)]",
        "[--miyuki-snow-stakes-edge:color-mix(in_oklab,var(--brand)_34%,transparent)]",
        "dark:[--miyuki-snow-stakes-old:color-mix(in_oklab,var(--foreground)_74%,var(--muted-foreground))] dark:[--miyuki-snow-stakes-new:var(--foreground)]",
        "dark:[--miyuki-snow-stakes-shade:color-mix(in_oklab,var(--brand)_40%,var(--muted-foreground))] dark:[--miyuki-snow-stakes-line:color-mix(in_oklab,var(--brand)_70%,transparent)]",
        "dark:[--miyuki-snow-stakes-edge:transparent]",
        className,
      )}
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <linearGradient id={`${id}-shade`} x1="0" x2="1" y1="0" y2="0">
                <stop
                  offset="0.5"
                  style={{
                    stopColor: "var(--miyuki-snow-stakes-shade)",
                    stopOpacity: 0,
                  }}
                />
                <stop
                  offset="1"
                  style={{
                    stopColor: "var(--miyuki-snow-stakes-shade)",
                    stopOpacity: 0.95,
                  }}
                />
              </linearGradient>
              <linearGradient id={`${id}-depth`} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0"
                  style={{
                    stopColor: "var(--miyuki-snow-stakes-shade)",
                    stopOpacity: 0,
                  }}
                />
                <stop
                  offset="1"
                  style={{
                    stopColor: "var(--miyuki-snow-stakes-shade)",
                    stopOpacity: 0.45,
                  }}
                />
              </linearGradient>
            </defs>
            <line x1={0} x2={width} y1={ground + 0.5} y2={ground + 0.5} className="stroke-border-strong" />
            {data.map((d, i) => {
              const cx = centers[i];
              const dim = active != null && active !== i;
              const { base, fresh } = shown[i];
              const surface = y(base + fresh);
              const seam = y(base);
              const shape = mound(cx, ground, surface, band, `stake-${i}-${d.label}`);
              const below = mound(cx, ground, seam, band, `stake-${i}-${d.label}`);
              const clip = `${id}-clip-${i}`;
              const reading = Math.round(base + fresh);
              const inside = ground - seam > 30;
              return (
                <g key={i} className={cn("transition-opacity duration-150 ease-settle", dim && "opacity-45")}>
                  <rect
                    x={cx - stake / 2}
                    y={MARGIN.top - 4}
                    width={stake}
                    height={innerH + 6}
                    rx={1.5}
                    strokeWidth={1}
                    className="stroke-border-strong"
                    style={{
                      fill: "color-mix(in oklab, var(--muted) 55%, var(--card))",
                    }}
                  />
                  <rect
                    x={cx - stake / 2}
                    y={MARGIN.top - 4}
                    width={stake}
                    height={5}
                    rx={1.5}
                    className={cn("transition-[fill] duration-150", active === i ? "fill-foreground" : "fill-brand")}
                  />
                  {ticks.map((v) => {
                    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
                    const half = Math.abs((v * 2) / step - Math.round((v * 2) / step)) < 1e-6;
                    const ty = Math.round(y(v)) + 0.5;
                    return (
                      <line
                        key={v}
                        x1={cx - stake / 2}
                        x2={cx - stake / 2 + (major ? stake : half ? stake * 0.6 : stake * 0.32)}
                        y1={ty}
                        y2={ty}
                        strokeWidth={major ? 1.2 : 1}
                        className={major ? "stroke-foreground/70" : "stroke-muted-foreground/60"}
                      />
                    );
                  })}
                  {ticks
                    .filter((v) => Math.abs(v / step - Math.round(v / step)) < 1e-6)
                    .map((v) => (
                      <text
                        key={`n${v}`}
                        transform={`translate(${cx + 0.5} ${y(v) + 4}) rotate(-90)`}
                        textAnchor="start"
                        dominantBaseline="central"
                        className="fill-foreground/75"
                        style={{
                          fontSize: Math.min(9, stake - 2),
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                        }}
                      >
                        {formatNumber(v)}
                      </text>
                    ))}
                  {surface < ground - 0.5 && (
                    <>
                      <clipPath id={clip}>
                        <path d={shape} />
                      </clipPath>
                      <path d={shape} style={{ fill: "var(--miyuki-snow-stakes-new)" }} />
                      <g clipPath={`url(#${clip})`}>
                        {seam < ground - 0.5 && (
                          <>
                            <path d={below} style={{ fill: "var(--miyuki-snow-stakes-old)" }} />
                            {fresh > 0.5 && (
                              <path
                                d={below}
                                fill="none"
                                strokeWidth={1}
                                style={{
                                  stroke: "var(--miyuki-snow-stakes-line)",
                                }}
                              />
                            )}
                          </>
                        )}
                        <path d={shape} fill={`url(#${id}-depth)`} />
                        <path d={shape} fill={`url(#${id}-shade)`} />
                      </g>
                      <path
                        d={shape}
                        fill="none"
                        strokeWidth={1}
                        style={{ stroke: "var(--miyuki-snow-stakes-edge)" }}
                      />
                    </>
                  )}
                  {reading > 0 && (
                    <text
                      x={cx}
                      y={inside ? seam + 15 : surface - 7}
                      textAnchor="middle"
                      className={cn("font-medium", inside ? "fill-foreground dark:fill-background" : "fill-foreground")}
                      style={{
                        fontSize: 11,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatNumber(reading)}
                    </text>
                  )}
                  {((n - 1 - i) % stride === 0 || active === i) && (
                    <text
                      x={cx}
                      y={ground + 17}
                      textAnchor="middle"
                      className={active === i ? "fill-foreground font-medium" : "fill-muted-foreground"}
                      style={{
                        fontSize: 11,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {width > 0 && tip && active != null && (
          <ChartTooltip
            x={centers[active]}
            y={y(tip.depth)}
            offset={band * 0.36 + 6}
            title={tip.title ?? tip.label}
            items={[
              { label: "Depth", value: fmt(tip.depth) },
              ...(tip.fresh != null ? [{ label: "New snow", value: `${signed(tip.fresh)} ${unit}` }] : []),
              ...(tip.temperature != null
                ? [
                    {
                      label: "Temperature",
                      value: `${formatNumber(tip.temperature, 1)} ${temperatureUnit}`,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Snow depth"}
        columns={["Stake", "Depth", "New snow", "Temperature"]}
        rows={data.map((d) => [
          d.title ?? d.label,
          fmt(d.depth),
          d.fresh != null ? `${signed(d.fresh)} ${unit}` : "",
          d.temperature != null ? `${formatNumber(d.temperature, 1)} ${temperatureUnit}` : "",
        ])}
      />
    </ChartCard>
  );
}
