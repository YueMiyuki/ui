"use client";

import { scaleLinear } from "d3-scale";
import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import {
  ActiveDot,
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  chartMotion,
  formatNumber,
  summarize,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export type RadarChartVariant = "filled" | "dotted" | "lines" | "score";

export interface RadarChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface RadarChartProps extends Omit<ChartCardProps, "children"> {
  labels: string[];
  series: RadarChartSeries[];
  variant?: RadarChartVariant;
  max?: number;
  levels?: number;
  titles?: string[];
  format?: (value: number) => string;
  meanLabel?: ReactNode;
  height?: number;
  legend?: boolean;
  summary?: string;
}

const TAU = Math.PI * 2;
const LABEL_GAP = 12;
const LINE = 16;
const FONT = 12;

interface Layout {
  cx: number;
  cy: number;
  R: number;
  boxes: { x: number; y: number }[];
}

function layout(width: number, height: number, sizes: { w: number; h: number }[]): Layout {
  const n = sizes.length;
  const angles = sizes.map((_, i) => (i / n) * TAU);
  const place = (R: number) =>
    sizes.map(({ w, h }, i) => {
      const s = Math.sin(angles[i]);
      const c = Math.cos(angles[i]);
      return { x: (R + LABEL_GAP) * s + (s * w) / 2, y: -(R + LABEL_GAP) * c - (c * h) / 2 };
    });
  for (let R = Math.min(width, height) / 2; R > 24; R -= 1) {
    const boxes = place(R);
    let minX = -R;
    let maxX = R;
    let minY = -R;
    let maxY = R;
    boxes.forEach((b, i) => {
      minX = Math.min(minX, b.x - sizes[i].w / 2);
      maxX = Math.max(maxX, b.x + sizes[i].w / 2);
      minY = Math.min(minY, b.y - sizes[i].h / 2);
      maxY = Math.max(maxY, b.y + sizes[i].h / 2);
    });
    if (maxX - minX <= width - 4 && maxY - minY <= height - 4) {
      return { R, cx: width / 2 - (minX + maxX) / 2, cy: height / 2 - (minY + maxY) / 2, boxes };
    }
  }
  return { R: 24, cx: width / 2, cy: height / 2, boxes: place(24) };
}

function useGrow(play: boolean, delay: number) {
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
  return grow;
}

function polygon(points: [number, number][], cx: number, cy: number, g: number) {
  return `${points
    .map(([x, y], i) => `${i ? "L" : "M"}${(cx + (x - cx) * g).toFixed(2)},${(cy + (y - cy) * g).toFixed(2)}`)
    .join("")}Z`;
}

function Vertex({
  grow,
  cx,
  cy,
  x,
  y,
  color,
}: {
  grow: MotionValue<number>;
  cx: number;
  cy: number;
  x: number;
  y: number;
  color: string;
}) {
  const px = useTransform(grow, (g) => cx + (x - cx) * g);
  const py = useTransform(grow, (g) => cy + (y - cy) * g);
  const opacity = useTransform(grow, (g) => (g > 0.02 ? 1 : 0));
  return (
    <motion.circle cx={px} cy={py} r={3.5} strokeWidth={2} style={{ fill: color, stroke: "var(--card)", opacity }} />
  );
}

interface ShapeProps {
  points: [number, number][];
  cx: number;
  cy: number;
  color: string;
  fill?: string;
  dashed?: boolean;
  dots: boolean;
  play: boolean;
  delay: number;
}

function Shape({ points, cx, cy, color, fill, dashed, dots, play, delay }: ShapeProps) {
  const grow = useGrow(play, delay);
  const d = useTransform(grow, (g) => polygon(points, cx, cy, Math.max(0, g)));
  const opacity = useTransform(grow, (g) => (g > 0.02 ? 1 : 0));
  return (
    <g>
      <motion.path
        d={d}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray={dashed ? "5 4" : undefined}
        style={{ fill: fill ?? "none", stroke: color, opacity }}
      />
      {dots && points.map(([x, y], i) => <Vertex key={i} grow={grow} cx={cx} cy={cy} x={x} y={y} color={color} />)}
    </g>
  );
}

export function RadarChart({
  labels,
  series,
  variant = "filled",
  max,
  levels = 4,
  titles,
  format = (v) => formatNumber(v),
  meanLabel = "Mean",
  height = 264,
  legend,
  summary,
  footer,
  label,
  ...props
}: RadarChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const id = useChartId("radar");

  const n = labels.length;
  const shown = variant === "lines" ? series : series.slice(0, 1);
  const colors = shown.map((s, i) => s.color ?? chartColor(i));
  const largest = Math.max(0, ...shown.flatMap((s) => s.data));
  const top =
    max ??
    scaleLinear()
      .domain([0, largest || 1])
      .nice(levels)
      .domain()[1];
  const scored = variant === "score";
  const first = shown[0]?.data ?? [];
  const mean = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;

  const sizes = labels.map((l, i) => {
    const w = Math.max(textWidth(l, FONT), scored ? textWidth(format(first[i] ?? 0), FONT) : 0);
    return { w, h: scored ? LINE * 2 : LINE };
  });
  const { cx, cy, R, boxes } = layout(width, height, sizes);
  const angle = (i: number) => (i / n) * TAU;
  const at = (i: number, r: number): [number, number] => [cx + r * Math.sin(angle(i)), cy - r * Math.cos(angle(i))];
  const radius = (v: number) => (R * Math.max(0, Math.min(v, top))) / (top || 1);
  const shapes = shown.map((s) => labels.map((_, i) => at(i, radius(s.data[i] ?? 0))));
  const rings = Array.from({ length: levels }, (_, k) => (R * (k + 1)) / levels);

  const { active, bind } = useNearestIndex({
    count: n,
    locate: (px, py) => {
      if (Math.hypot(px - cx, py - cy) > R + 48) return null;
      const turn = Math.atan2(px - cx, cy - py) / TAU;
      return Math.round((turn < 0 ? turn + 1 : turn) * n) % n;
    },
  });

  const description =
    summary ??
    (shown.length > 1
      ? `${shown.map((s) => s.name).join(" and ")} across ${n} axes. ` +
        shown.map((s) => `${s.name}: ${summarize(s.data, labels, format)}`).join(" ")
      : scored
        ? `Scores on ${n} axes with a mean of ${format(mean)}. ` +
          labels.map((l, i) => `${l} ${format(first[i] ?? 0)}`).join(", ") +
          "."
        : summarize(first, titles ?? labels, format));

  const grid = variant === "dotted" ? "dots" : "lines";
  const fill =
    variant === "filled" || variant === "score"
      ? `url(#${id}-fill)`
      : variant === "dotted"
        ? `color-mix(in oklab, ${colors[0]} 12%, transparent)`
        : undefined;
  const inward = ([vx, vy]: [number, number]) => {
    if (vx > cx + 1) return { side: "left", box: { left: 0, top: 0, width: vx, height }, x: vx, y: vy };
    if (vx < cx - 1) return { side: "right", box: { left: vx, top: 0, width: width - vx, height }, x: 0, y: vy };
    if (vy <= cy) return { side: "below", box: { left: 0, top: vy, width, height: height - vy }, x: vx, y: 0 };
    return { side: "above", box: { left: 0, top: 0, width, height: vy }, x: vx, y: vy };
  };
  const tip =
    active != null && !scored ? inward(at(active, Math.max(...shown.map((s) => radius(s.data[active] ?? 0))))) : null;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        ((legend ?? shown.length > 1) ? (
          <ChartLegend
            items={shown.map((s, i) => ({
              label: s.name,
              color: colors[i],
              marker: variant === "lines" ? (i === 1 ? "dashed" : "line") : "dot",
            }))}
          />
        ) : undefined)
      }
    >
      <div ref={plotRef} className="min-w-0">
        <ChartPlot summary={description} height={height} {...bind}>
          {width > 0 && (
            <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
              <defs>
                <radialGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R}>
                  <stop offset="0" style={{ stopColor: colors[0], stopOpacity: 0.06 }} />
                  <stop offset="1" style={{ stopColor: colors[0], stopOpacity: 0.3 }} />
                </radialGradient>
              </defs>
              {grid === "lines" ? (
                <g fill="none" className="stroke-border">
                  {rings.map((r, k) => (
                    <path
                      key={k}
                      d={polygon(
                        labels.map((_, i) => at(i, r)),
                        cx,
                        cy,
                        1,
                      )}
                      strokeDasharray={k === levels - 1 ? undefined : "2 4"}
                      className={k === levels - 1 ? "stroke-border-strong" : undefined}
                    />
                  ))}
                  {labels.map((_, i) => {
                    const [x, y] = at(i, R);
                    return (
                      <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={x}
                        y2={y}
                        className={cn("transition-[stroke] duration-150", active === i && "stroke-foreground/30")}
                      />
                    );
                  })}
                </g>
              ) : (
                <g>
                  <g
                    fill="none"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray="0 5"
                    className="stroke-muted-foreground/45"
                  >
                    {rings.map((r, k) => (
                      <circle key={k} cx={cx} cy={cy} r={r} />
                    ))}
                  </g>
                  {active != null && (
                    <line
                      x1={cx}
                      y1={cy}
                      x2={at(active, R)[0]}
                      y2={at(active, R)[1]}
                      className="stroke-foreground/30"
                    />
                  )}
                  <circle cx={cx} cy={cy} r={1.75} className="fill-muted-foreground/60" />
                </g>
              )}
              {shown.map((s, i) => (
                <Shape
                  key={s.name}
                  points={shapes[i]}
                  cx={cx}
                  cy={cy}
                  color={colors[i]}
                  fill={i === 0 ? fill : undefined}
                  dashed={variant === "lines" && i === 1}
                  dots={variant === "dotted"}
                  play={inView}
                  delay={i * 0.08}
                />
              ))}
              {active != null &&
                shown.map((_, i) => {
                  const [x, y] = shapes[i][active];
                  return <ActiveDot key={i} cx={x} cy={y} r={3.5} color={colors[i]} />;
                })}
              {scored && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={Math.min(30, R * 0.34)}
                  strokeWidth={1}
                  className="fill-card stroke-border"
                />
              )}
              <g style={{ fontSize: FONT, fontVariantNumeric: "tabular-nums" }} textAnchor="middle">
                {boxes.map((b, i) => (
                  <text
                    key={i}
                    x={cx + b.x}
                    y={cy + b.y - (scored ? LINE / 2 : 0)}
                    dy="0.34em"
                    className={cn(
                      "transition-[fill] duration-150",
                      active === i ? "fill-foreground font-medium" : "fill-muted-foreground",
                    )}
                  >
                    {labels[i]}
                    {scored && (
                      <tspan x={cx + b.x} dy={LINE} className="fill-foreground font-medium">
                        {format(first[i] ?? 0)}
                      </tspan>
                    )}
                  </text>
                ))}
              </g>
            </svg>
          )}
          {width > 0 && scored && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: cx, top: cy }}
            >
              <span className="font-display text-[22px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums [text-box:trim-both_cap_alphabetic]">
                {format(mean)}
              </span>
              <span className="mt-1.5 text-[10px] leading-3 text-muted-foreground">{meanLabel}</span>
            </div>
          )}
          {width > 0 && tip && active != null && (
            <div key={tip.side} aria-hidden="true" className="pointer-events-none absolute" style={tip.box}>
              <ChartTooltip
                x={tip.x}
                y={tip.y}
                offset={14}
                placement={tip.side === "below" || tip.side === "above" ? "top" : "side"}
                title={titles?.[active] ?? labels[active]}
                items={shown.map((s, i) => ({
                  label: s.name,
                  value: format(s.data[active] ?? 0),
                  color: colors[i],
                  marker: variant === "lines" ? (i === 1 ? ("dashed" as const) : ("line" as const)) : ("dot" as const),
                }))}
              />
            </div>
          )}
        </ChartPlot>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : shown.map((s) => s.name).join(" and ")}
        columns={["Axis", ...shown.map((s) => s.name)]}
        rows={labels.map((l, i) => [titles?.[i] ?? l, ...shown.map((s) => format(s.data[i] ?? 0))])}
      />
    </ChartCard>
  );
}
