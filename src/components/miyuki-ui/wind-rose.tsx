"use client";

import { scaleLinear } from "d3-scale";
import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartMotion,
  formatNumber,
  staggerDelay,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface WindRoseDatum {
  direction: string | number;
  bands: number[];
}

export interface WindRoseProps extends Omit<ChartCardProps, "children"> {
  data: WindRoseDatum[];
  bands: string[];
  unit?: string;
  colors?: string[];
  format?: (value: number) => string;
  height?: number;
  legend?: boolean;
  summary?: string;
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const NAMES = [
  "North",
  "North-north-east",
  "North-east",
  "East-north-east",
  "East",
  "East-south-east",
  "South-east",
  "South-south-east",
  "South",
  "South-south-west",
  "South-west",
  "West-south-west",
  "West",
  "West-north-west",
  "North-west",
  "North-north-west",
];
const LABEL_ROOM = 22;

const rad = (deg: number) => (deg * Math.PI) / 180;

function bearing(direction: string | number, index: number, count: number) {
  if (typeof direction === "number") return ((direction % 360) + 360) % 360;
  const k = POINTS.indexOf(direction.trim().toUpperCase());
  return k >= 0 ? k * 22.5 : (index * 360) / count;
}

function nameOf(direction: string | number, deg: number) {
  const k = Math.round(deg / 22.5) % 16;
  if (Math.abs(deg - Math.round(deg / 22.5) * 22.5) < 0.01) return { short: POINTS[k], long: NAMES[k] };
  const text = typeof direction === "string" ? direction : `${formatNumber(deg)}°`;
  return { short: text, long: text };
}

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (a: number, r: number) =>
    `${(cx + r * Math.sin(rad(a))).toFixed(2)},${(cy - r * Math.cos(rad(a))).toFixed(2)}`;
  if (r1 - r0 < 0.05) return "";
  return `M${p(a0, r1)}A${r1},${r1} 0 0 1 ${p(a1, r1)}L${p(a1, r0)}A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`;
}

function rampColor(k: number, n: number) {
  const t = n <= 1 ? 1 : k / (n - 1);
  const p = Math.round(100 * t ** 0.9);
  return p >= 100
    ? "var(--brand-strong)"
    : `color-mix(in oklab, var(--brand-strong) ${p}%, var(--miyuki-wind-rose-pale))`;
}

interface SpokeProps {
  cx: number;
  cy: number;
  hub: number;
  radii: number[];
  a0: number;
  a1: number;
  colors: string[];
  play: boolean;
  delay: number;
  dim: boolean;
}

function Band({
  grow,
  cx,
  cy,
  hub,
  r0,
  r1,
  a0,
  a1,
  color,
}: {
  grow: MotionValue<number>;
  cx: number;
  cy: number;
  hub: number;
  r0: number;
  r1: number;
  a0: number;
  a1: number;
  color: string;
}) {
  const d = useTransform(grow, (g) => sector(cx, cy, hub + (r0 - hub) * g, hub + (r1 - hub) * g, a0, a1));
  return <motion.path d={d} strokeWidth={1} strokeLinejoin="round" style={{ fill: color, stroke: "var(--card)" }} />;
}

function Spoke({ cx, cy, hub, radii, a0, a1, colors, play, delay, dim }: SpokeProps) {
  const reduce = useReducedMotion();
  const grow = useMotionValue(0);
  useEffect(() => {
    if (reduce) {
      grow.jump(1);
      return;
    }
    if (!play) return;
    const controls = animate(grow, 1, { ...chartMotion.fill, delay });
    return () => controls.stop();
  }, [grow, play, reduce, delay]);
  return (
    <g className={cn("transition-opacity duration-200 ease-settle", dim && "opacity-35")}>
      {radii.slice(1).map((r1, k) => (
        <Band key={k} grow={grow} cx={cx} cy={cy} hub={hub} r0={radii[k]} r1={r1} a0={a0} a1={a1} color={colors[k]} />
      ))}
    </g>
  );
}

export function WindRose({
  data,
  bands,
  unit = "m/s",
  colors,
  format = (v) => `${formatNumber(v, 1)}%`,
  height = 300,
  legend = true,
  summary,
  label,
  value,
  caption,
  footer,
  className,
  ...props
}: WindRoseProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const vaneRef = useRef<SVGGElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();

  const n = data.length;
  const nb = bands.length;
  const palette = bands.map((_, k) => colors?.[k] ?? rampColor(k, nb));
  const angles = data.map((d, i) => bearing(d.direction, i, n));
  const names = data.map((d, i) => nameOf(d.direction, angles[i]));
  const totals = data.map((d) => d.bands.reduce((s, v) => s + Math.max(0, v), 0));
  const bandTotals = bands.map((_, k) => data.reduce((s, d) => s + Math.max(0, d.bands[k] ?? 0), 0));
  const largest = Math.max(0, ...totals);
  const prevailing = totals.indexOf(largest);

  const scale = scaleLinear()
    .domain([0, largest || 1])
    .nice(4);
  const ticks = scale.ticks(4).filter((t) => t > 0);
  const top = scale.domain()[1];

  const R = Math.max(40, Math.min(width, height) / 2 - LABEL_ROOM);
  const hub = Math.max(16, Math.round(R * 0.16));
  const cx = width / 2;
  const cy = height / 2;
  const radius = (v: number) => Math.sqrt(hub * hub + ((R * R - hub * hub) * Math.max(0, v)) / (top || 1));
  const half = (360 / Math.max(n, 1)) * 0.39;
  const radiiOf = (d: WindRoseDatum) => {
    let sum = 0;
    return [hub, ...bands.map((_, k) => radius((sum += Math.max(0, d.bands[k] ?? 0))))];
  };

  let gap = 180;
  let gapScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mid = angles[i] + ((((angles[j] - angles[i]) % 360) + 360) % 360) / 2;
    const load = Math.max(totals[i], totals[j]) / (largest || 1);
    const score = Math.abs(Math.cos(rad(mid))) * 0.6 + (mid > 90 && mid < 270 ? 0.15 : 0) - load * 2;
    if (score > gapScore) {
      gapScore = score;
      gap = mid;
    }
  }
  const ringLabels: { t: number; x: number; y: number }[] = [];
  for (const t of [...ticks].reverse()) {
    const r = radius(t);
    const x = cx + r * Math.sin(rad(gap));
    const y = cy - r * Math.cos(rad(gap));
    if (ringLabels.every((l) => Math.abs(l.y - y) >= 12 || Math.abs(l.x - x) >= 30)) ringLabels.push({ t, x, y });
  }

  const { active, bind } = useNearestIndex({
    count: n,
    focusIndex: prevailing,
    locate: (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      if (d > R + LABEL_ROOM || d < hub * 0.5) return null;
      const a = ((((Math.atan2(px - cx, cy - py) * 180) / Math.PI) % 360) + 360) % 360;
      let best = -1;
      let bestD = Infinity;
      angles.forEach((b, i) => {
        const delta = Math.abs(((a - b + 540) % 360) - 180);
        if (delta < bestD) {
          bestD = delta;
          best = i;
        }
      });
      return best >= 0 ? best : null;
    },
  });

  const vane = useRef({ angle: Number.NaN });
  const goal = n > 0 ? angles[prevailing] : 0;
  useLayoutEffect(() => {
    const v = vane.current;
    if (!Number.isNaN(v.angle)) vaneRef.current?.setAttribute("transform", `rotate(${v.angle.toFixed(2)} ${cx} ${cy})`);
  });
  useEffect(() => {
    const v = vane.current;
    const set = (a: number) => {
      v.angle = a;
      vaneRef.current?.setAttribute("transform", `rotate(${a.toFixed(2)} ${cx} ${cy})`);
    };
    if (reduce) {
      set(goal);
      return;
    }
    if (Number.isNaN(v.angle)) set(goal + 110);
    if (!inView) return;
    const from = v.angle;
    const to = from + ((((goal - from) % 360) + 540) % 360) - 180;
    const controls = animate(from, to, {
      type: "spring",
      stiffness: 120,
      damping: 6.5,
      mass: 1,
      delay: 0.15,
      onUpdate: set,
    });
    return () => controls.stop();
  }, [goal, inView, reduce, cx, cy]);

  const at = (a: number, r: number) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))] as const;
  const strongest = nb > 0 ? data.map((d) => d.bands[nb - 1] ?? 0) : [];
  const strongestFrom = strongest.indexOf(Math.max(0, ...strongest));
  const quietest = totals.indexOf(Math.min(...totals));
  const description =
    summary ??
    (n === 0
      ? "No wind data."
      : `Wind rose of ${n} directions with ${nb} speed bands. Prevailing wind from the ${names[prevailing].long.toLowerCase()}, ${format(largest)} of the time. ` +
        (nb > 1 ? `Most often ${bands[bandTotals.indexOf(Math.max(...bandTotals))]} ${unit}. ` : "") +
        (nb > 1
          ? `The strongest band, ${bands[nb - 1]} ${unit}, blows most often from the ${names[strongestFrom].long.toLowerCase()}. `
          : "") +
        `Least wind from the ${names[quietest].long.toLowerCase()}, ${format(totals[quietest])}.`);

  const tipAt = active != null ? at(angles[active], radius(totals[active])) : null;
  const shown = new Set<number>();
  angles.forEach((a, i) => {
    if (Math.abs(a / 45 - Math.round(a / 45)) < 0.001) shown.add(i);
  });

  const legendRow = legend ? (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <p className="text-[13px] leading-5 text-muted-foreground">Wind speed, {unit}</p>
      <div aria-hidden="true" className="flex gap-0.5">
        {bands.map((b, k) => (
          <div key={k} className="flex w-10 flex-col gap-1">
            <span
              className={cn("h-2 rounded-[2px]", k === 0 && "rounded-l-full", k === nb - 1 && "rounded-r-full")}
              style={{ background: palette[k] }}
            />
            <span className="text-[11px] leading-none text-muted-foreground tabular-nums">{b}</span>
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <ChartCard
      label={label}
      value={value ?? (n > 0 ? names[prevailing].long : undefined)}
      caption={caption ?? (n > 0 ? `prevailing, ${format(largest)} of the time` : undefined)}
      footer={footer ?? legendRow}
      {...props}
      className={cn(
        "[--miyuki-wind-rose-pale:color-mix(in_oklab,var(--brand-strong)_15%,var(--muted))] dark:[--miyuki-wind-rose-pale:color-mix(in_oklab,var(--brand-strong)_32%,var(--muted))]",
        className,
      )}
    >
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
            <g fill="none" strokeWidth={1}>
              {angles.map((a, i) => {
                const [x0, y0] = at(a, hub);
                const [x1, y1] = at(a, R + 4);
                return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeDasharray="2 4" className="stroke-border" />;
              })}
              {ticks.map((t, k) => (
                <circle
                  key={t}
                  cx={cx}
                  cy={cy}
                  r={radius(t)}
                  strokeDasharray={k === ticks.length - 1 ? undefined : "2 4"}
                  className={k === ticks.length - 1 ? "stroke-border-strong" : "stroke-border"}
                />
              ))}
              {angles.map((a, i) => {
                const [x0, y0] = at(a, R);
                const [x1, y1] = at(a, R + (shown.has(i) ? 5 : 3.5));
                return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-border-strong" />;
              })}
            </g>
            {data.map((d, i) => (
              <Spoke
                key={i}
                cx={cx}
                cy={cy}
                hub={hub}
                radii={radiiOf(d)}
                a0={angles[i] - half}
                a1={angles[i] + half}
                colors={palette}
                play={inView}
                delay={staggerDelay(i, n) * 1.5}
                dim={active != null && active !== i}
              />
            ))}
            <g style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums" }} className="fill-muted-foreground">
              {ringLabels.map(({ t, x, y }) => (
                <text
                  key={t}
                  x={x + (Math.sin(rad(gap)) >= 0 ? 4 : -4)}
                  y={y + (Math.cos(rad(gap)) > 0 ? 7 : -6)}
                  dy="0.35em"
                  textAnchor={Math.sin(rad(gap)) >= 0 ? "start" : "end"}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  style={{ paintOrder: "stroke", stroke: "var(--card)" }}
                >
                  {format(t).replace(/\.0(?=\D*$)/, "")}
                </text>
              ))}
            </g>
            <g textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
              {angles.map((a, i) => {
                const isActive = active === i;
                if (!shown.has(i) && !isActive) return null;
                const cardinal = Math.abs(a / 90 - Math.round(a / 90)) < 0.001;
                const [x, y] = at(a, R + 14);
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    dy="0.35em"
                    style={{ fontSize: cardinal ? 12 : 11 }}
                    className={cn(
                      "transition-[fill] duration-150",
                      isActive || cardinal ? "fill-foreground" : "fill-muted-foreground",
                      (isActive || cardinal) && "font-medium",
                    )}
                  >
                    {names[i].short}
                  </text>
                );
              })}
            </g>
            <circle cx={cx} cy={cy} r={hub - 1.5} strokeWidth={1} className="fill-card stroke-border-strong" />
            <g ref={vaneRef}>
              <path
                d={`M${cx},${cy - hub + 4}L${cx + 4.2},${cy - hub + 12}L${cx + 1},${cy - hub + 10.8}L${cx + 1},${cy + hub - 10}L${cx + 5},${cy + hub - 4.5}L${cx},${cy + hub - 7}L${cx - 5},${cy + hub - 4.5}L${cx - 1},${cy + hub - 10}L${cx - 1},${cy - hub + 10.8}L${cx - 4.2},${cy - hub + 12}Z`}
                strokeLinejoin="round"
                strokeWidth={0.8}
                className="fill-foreground stroke-foreground"
              />
              <circle cx={cx} cy={cy} r={2.4} strokeWidth={1.2} className="fill-card stroke-foreground" />
            </g>
          </svg>
        )}
        {width > 0 && active != null && tipAt && (
          <ChartTooltip
            x={tipAt[0]}
            y={tipAt[1]}
            offset={10}
            title={`From the ${names[active].long.toLowerCase()}`}
            items={bands
              .map((b, k) => ({
                label: `${b} ${unit}`,
                value: format(data[active].bands[k] ?? 0),
                color: palette[k],
                marker: "square" as const,
              }))
              .reverse()}
          >
            <div className="mt-1 flex justify-between gap-4 border-t border-border pt-1">
              <span className="text-muted-foreground">All speeds</span>
              <span className="font-medium text-foreground tabular-nums">{format(totals[active])}</span>
            </div>
          </ChartTooltip>
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Wind rose"}
        columns={["Direction", ...bands.map((b) => `${b} ${unit}`), "All speeds"]}
        rows={data.map((d, i) => [names[i].long, ...bands.map((_, k) => format(d.bands[k] ?? 0)), format(totals[i])])}
      />
    </ChartCard>
  );
}
