"use client";

import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import {
  ActiveDot,
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  formatNumber,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface BarometerWord {
  label: string;
  at: number;
}

export interface BarometerProps extends Omit<ChartCardProps, "children"> {
  value: number;
  previous?: number;
  min?: number;
  max?: number;
  hours?: number;
  unit?: string;
  words?: BarometerWord[];
  size?: number;
  settable?: boolean;
  onPreviousChange?: (value: number) => void;
  format?: (value: number) => string;
  summary?: string;
}

const HALF = 140;
const WORDS: BarometerWord[] = [
  { label: "Stormy", at: 965 },
  { label: "Rain", at: 983 },
  { label: "Change", at: 1002 },
  { label: "Fair", at: 1022 },
  { label: "Very dry", at: 1043 },
];
const STEP = 1 / 240;

const rad = (deg: number) => (deg * Math.PI) / 180;
const pad2 = (n: number) => String(n).padStart(2, "0");

function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  if (Math.abs(to - from) < 0.05) return "";
  const [a, b] = from < to ? [from, to] : [to, from];
  const x0 = cx + r * Math.sin(rad(a));
  const y0 = cy - r * Math.cos(rad(a));
  const x1 = cx + r * Math.sin(rad(b));
  const y1 = cy - r * Math.cos(rad(b));
  return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

interface Sim {
  angle: number;
  vel: number;
  q: number;
  qv: number;
  goal: number;
  m: number;
  mv: number;
  mGoal: number;
  raf: number;
  last: number;
  cx: number;
  cy: number;
  r: number;
  needle: SVGGElement | null;
  marker: SVGGElement | null;
  trend: SVGPathElement | null;
}

const REST = {
  angle: Number.NaN,
  vel: 0,
  q: 0,
  qv: 0,
  goal: 0,
  m: Number.NaN,
  mv: 0,
  mGoal: 0,
  raf: 0,
  last: 0,
  cx: 0,
  cy: 0,
  r: 0,
};

function paintSim(s: Sim) {
  if (Number.isNaN(s.angle)) return;
  const a = s.angle + s.q;
  s.needle?.setAttribute("transform", `rotate(${a.toFixed(3)} ${s.cx} ${s.cy})`);
  s.marker?.setAttribute("transform", `rotate(${s.m.toFixed(3)} ${s.cx} ${s.cy})`);
  s.trend?.setAttribute("d", arcPath(s.cx, s.cy, s.r, s.m, a));
}

function runSim(s: Sim) {
  if (s.raf) return;
  s.last = 0;
  const tick = (now: number) => {
    const dt = s.last ? Math.min(0.05, Math.max(0, (now - s.last) / 1000)) : 1 / 60;
    s.last = now;
    for (let t = 0; t < dt; t += STEP) {
      const acc = 46 * (s.goal - s.angle) - 8.6 * s.vel;
      s.vel += acc * STEP;
      s.angle += s.vel * STEP;
      const qa = -2400 * s.q - 9 * s.qv - 2.6 * Math.max(-320, Math.min(320, acc));
      s.qv += qa * STEP;
      s.q += s.qv * STEP;
      const ma = 160 * (s.mGoal - s.m) - 24 * s.mv;
      s.mv += ma * STEP;
      s.m += s.mv * STEP;
    }
    paintSim(s);
    const resting =
      Math.abs(s.goal - s.angle) < 0.01 &&
      Math.abs(s.vel) < 0.02 &&
      Math.abs(s.q) < 0.004 &&
      Math.abs(s.qv) < 0.05 &&
      Math.abs(s.mGoal - s.m) < 0.01 &&
      Math.abs(s.mv) < 0.02;
    if (resting) {
      s.angle = s.goal;
      s.m = s.mGoal;
      s.vel = s.q = s.qv = s.mv = 0;
      s.raf = 0;
      paintSim(s);
      return;
    }
    s.raf = requestAnimationFrame(tick);
  };
  s.raf = requestAnimationFrame(tick);
}

export function Barometer({
  value,
  previous,
  min = 960,
  max = 1060,
  hours = 3,
  unit = "hPa",
  words = WORDS,
  size = 296,
  settable = true,
  onPreviousChange,
  format = (v) => formatNumber(v, Number.isInteger(v) ? 0 : 1),
  summary,
  label,
  action,
  ...props
}: BarometerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const trendRef = useRef<SVGPathElement>(null);
  const { width: room } = useChartSize(boxRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const id = useChartId("barometer");

  const [own, setOwn] = useState<{ value: number; at: string; base?: number } | null>(null);
  const override = own && own.base === previous ? own : null;
  const marker = override?.value ?? previous ?? value;
  const period = override ? `since ${override.at}` : `in ${hours} ${hours === 1 ? "hour" : "hours"}`;

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo || 1;
  const angleOf = (v: number) => -HALF + ((Math.min(hi, Math.max(lo, v)) - lo) / span) * HALF * 2;

  const D = Math.round(Math.max(160, Math.min(room || size, size)));
  const R = D / 2;
  const width = room > 0 ? D : 0;
  const cx = R;
  const cy = R;
  const height = D;
  const rArc = R - 13;
  const rNum = R - 35;
  const rWord = R - 59;

  const major = niceStep(span / 10);
  const minor = major / 10 >= 1 || span <= 120 ? major / 10 : major / 5;
  const ticks: { v: number; kind: 0 | 1 | 2 }[] = [];
  const first = Math.ceil(lo / minor - 1e-9);
  for (let k = first; k * minor <= hi + 1e-9; k++) {
    const v = +(k * minor).toFixed(6);
    const kind =
      Math.abs(v / major - Math.round(v / major)) < 1e-6
        ? 2
        : Math.abs((2 * v) / major - Math.round((2 * v) / major)) < 1e-6
          ? 1
          : 0;
    ticks.push({ v, kind });
  }

  const target = angleOf(value);
  const markerAngle = angleOf(marker);
  const shownWords = words.filter((w) => w.at >= lo && w.at <= hi);
  let nearestWord = -1;
  shownWords.forEach((w, i) => {
    if (nearestWord < 0 || Math.abs(w.at - value) < Math.abs(shownWords[nearestWord].at - value)) nearestWord = i;
  });

  const change = value - marker;
  const digits = Number.isInteger(change) ? 0 : 1;
  const flat = Math.abs(change) < 0.5;
  const trend = flat ? "Steady" : change > 0 ? "Rising" : "Falling";
  const changeText = flat
    ? `${override ? "" : "over "}${override ? period : `${hours} ${hours === 1 ? "hour" : "hours"}`}`
    : `${formatNumber(Math.abs(change), digits)} ${unit} ${period}`;
  const previousTitle = override ? `Set at ${override.at}` : `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const sim = useRef<Sim>({ ...REST, needle: null, marker: null, trend: null });

  useLayoutEffect(() => {
    const s = sim.current;
    s.cx = cx;
    s.cy = cy;
    s.r = R - 8.5;
    s.needle = needleRef.current;
    s.marker = markerRef.current;
    s.trend = trendRef.current;
    paintSim(s);
  });

  const play = inView || !!reduce;
  useEffect(() => {
    const s = sim.current;
    const goal = play ? target : markerAngle;
    if (Number.isNaN(s.angle) || reduce) {
      s.angle = goal;
      s.m = markerAngle;
      s.vel = s.q = s.qv = s.mv = 0;
    }
    s.goal = goal;
    s.mGoal = markerAngle;
    if (reduce) {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      paintSim(s);
      return;
    }
    runSim(s);
  }, [target, markerAngle, play, reduce]);

  useEffect(() => {
    const s = sim.current;
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  const tap = () => {
    if (reduce) return;
    const s = sim.current;
    s.qv += s.qv >= 0 ? 58 : -58;
    runSim(s);
  };

  const { active, bind } = useNearestIndex({
    count: 2,
    locate: (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      if (d > R + 6 || d < 4) return null;
      const a = (Math.atan2(px - cx, cy - py) * 180) / Math.PI;
      const toMain = Math.abs(a - target);
      const toMarker = Math.abs(a - markerAngle);
      if (Math.min(toMain, toMarker) > 16) return null;
      return toMarker + 1.5 < toMain ? 1 : 0;
    },
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      tap();
      return;
    }
    bind.onKeyDown(event);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    bind.onPointerDown(event);
    if (event.button === 0) tap();
  };

  const setMarker = () => {
    const now = new Date();
    setOwn({ value, at: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`, base: previous });
    onPreviousChange?.(value);
  };

  const at = (deg: number, r: number) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))] as const;
  const wordName = nearestWord >= 0 ? shownWords[nearestWord].label : null;
  const description =
    summary ??
    `Barometer reading ${format(value)} ${unit}, ${trend.toLowerCase()}` +
      (flat ? "" : ` ${formatNumber(Math.abs(change), digits)} ${unit}`) +
      ` ${override ? period : `in ${hours} ${hours === 1 ? "hour" : "hours"}`}, against the marker at ${format(marker)} ${unit}. ` +
      `Dial from ${format(lo)} to ${format(hi)} ${unit}` +
      (wordName ? `; the needle points to ${wordName}.` : ".");

  const activeAngle = active === 1 ? markerAngle : target;
  const tip = active != null ? at(activeAngle, rArc) : null;

  return (
    <ChartCard
      label={label}
      action={
        action ??
        (settable ? (
          <Button variant="secondary" size="sm" onPress={setMarker} isDisabled={Math.abs(marker - value) < 0.05}>
            Set marker
          </Button>
        ) : undefined)
      }
      {...props}
    >
      <div ref={boxRef} className="min-w-0">
        <ChartPlot
          ref={plotRef}
          summary={description}
          height={height}
          {...bind}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          className="mx-auto rounded-full"
          style={{ width: D }}
        >
          {width > 0 && (
            <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
              <defs>
                <radialGradient id={`${id}-face`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R}>
                  <stop offset="0.72" style={{ stopColor: "var(--card)" }} />
                  <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--foreground) 5%, var(--card))" }} />
                </radialGradient>
                <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0.6"
                    dy="1.4"
                    stdDeviation="1.1"
                    floodOpacity="0.28"
                    style={{ floodColor: "var(--miyuki-barometer-shade)" }}
                  />
                </filter>
                {shownWords.map((w, i) => {
                  const a = angleOf(w.at);
                  const flip = Math.abs(a) > 95;
                  const reach = Math.min(48, (180 / Math.PI) * (70 / rWord));
                  const [x0, y0] = at(flip ? a + reach : a - reach, rWord);
                  const [x1, y1] = at(flip ? a - reach : a + reach, rWord);
                  return (
                    <path
                      key={i}
                      id={`${id}-word-${i}`}
                      d={`M${x0.toFixed(2)},${y0.toFixed(2)}A${rWord},${rWord} 0 0 ${flip ? 0 : 1} ${x1.toFixed(2)},${y1.toFixed(2)}`}
                    />
                  );
                })}
              </defs>
              <g className="[--miyuki-barometer-shade:var(--foreground)] dark:[--miyuki-barometer-shade:var(--background)]">
                <circle cx={cx} cy={cy} r={R - 0.5} fill="none" strokeWidth={1} className="stroke-border-strong" />
                <circle cx={cx} cy={cy} r={R - 4} strokeWidth={1} fill={`url(#${id}-face)`} className="stroke-border" />
                <path
                  d={arcPath(cx, cy, rArc, -HALF, HALF)}
                  fill="none"
                  strokeWidth={1}
                  className="stroke-foreground/45"
                />
                <g strokeLinecap="butt">
                  {ticks.map(({ v, kind }) => {
                    const a = angleOf(v);
                    const [x1, y1] = at(a, rArc);
                    const [x2, y2] = at(a, rArc - (kind === 2 ? 11 : kind === 1 ? 7.5 : 4.5));
                    return (
                      <line
                        key={v}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        strokeWidth={kind === 2 ? 1.5 : 1}
                        className={
                          kind === 2
                            ? "stroke-foreground/80"
                            : kind === 1
                              ? "stroke-foreground/50"
                              : "stroke-foreground/28"
                        }
                      />
                    );
                  })}
                </g>
                <g
                  className="fill-muted-foreground"
                  style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                  textAnchor="middle"
                >
                  {ticks
                    .filter((t) => t.kind === 2)
                    .map(({ v }) => {
                      const [x, y] = at(angleOf(v), rNum);
                      return (
                        <text key={v} x={x} y={y} dy="0.35em">
                          {String(v)}
                        </text>
                      );
                    })}
                </g>
                <g style={{ fontSize: 11.5 }} textAnchor="middle">
                  {shownWords.map((w, i) => (
                    <text
                      key={i}
                      dominantBaseline="central"
                      className={cn(
                        "transition-[fill] duration-300 ease-settle",
                        i === nearestWord ? "fill-foreground font-medium" : "fill-muted-foreground",
                      )}
                    >
                      <textPath href={`#${id}-word-${i}`} startOffset="50%">
                        {w.label}
                      </textPath>
                    </text>
                  ))}
                </g>
                <text
                  x={cx}
                  y={cy + R * 0.46}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 11 }}
                >
                  {unit}
                </text>
                <path ref={trendRef} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-brand/55" />
                {tip && (
                  <ActiveDot
                    cx={tip[0]}
                    cy={tip[1]}
                    r={3}
                    color={active === 1 ? "var(--brand)" : "var(--foreground)"}
                  />
                )}
                <g ref={needleRef} filter={`url(#${id}-shadow)`}>
                  <path
                    d={`M${cx - 2.4},${cy}L${cx - 0.55},${cy - (rArc - 1)}L${cx + 0.55},${cy - (rArc - 1)}L${cx + 2.4},${cy}L${cx + 1.6},${cy + R * 0.2}L${cx - 1.6},${cy + R * 0.2}Z`}
                    className="fill-foreground"
                  />
                  <circle
                    cx={cx}
                    cy={cy + R * 0.2 + 4}
                    r={4.6}
                    fill="none"
                    strokeWidth={1.8}
                    className="stroke-foreground"
                  />
                  <circle cx={cx} cy={cy} r={5.5} className="fill-foreground" />
                </g>
                <g ref={markerRef}>
                  <line
                    x1={cx}
                    y1={cy - 8.5}
                    x2={cx}
                    y2={cy - (rArc - 13)}
                    strokeWidth={1.5}
                    className="stroke-brand"
                  />
                  <path
                    d={`M${cx},${cy - (rArc - 3)}L${cx + 3.6},${cy - (rArc - 14)}L${cx - 3.6},${cy - (rArc - 14)}Z`}
                    className="fill-brand"
                  />
                  <line x1={cx} y1={cy + 8.5} x2={cx} y2={cy + R * 0.15} strokeWidth={1.5} className="stroke-brand" />
                  <circle cx={cx} cy={cy + R * 0.15 + 2.2} r={2.4} className="fill-brand" />
                  <circle cx={cx} cy={cy} r={8.5} fill="none" strokeWidth={1.6} className="stroke-brand" />
                </g>
                <circle cx={cx} cy={cy} r={2.2} className="fill-card" />
              </g>
            </svg>
          )}
          {width > 0 && tip && active != null && (
            <ChartTooltip
              x={tip[0]}
              y={tip[1]}
              offset={14}
              title={active === 0 ? "Now" : previousTitle}
              items={[
                {
                  label: "Pressure",
                  value: `${format(active === 0 ? value : marker)} ${unit}`,
                  color: active === 0 ? "var(--foreground)" : "var(--brand)",
                },
                ...(active === 0 && !flat
                  ? [
                      {
                        label: "Change",
                        value: `${change > 0 ? "+" : "−"}${formatNumber(Math.abs(change), digits)} ${unit}`,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </ChartPlot>
      </div>
      <div className="mt-4 flex flex-col items-center text-center">
        <p className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl leading-none font-semibold tracking-[-0.025em] text-foreground tabular-nums">
            {format(value)}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </p>
        <p className="mt-3 inline-flex h-6 items-center gap-1.5 rounded-full bg-secondary pr-2.5 pl-2 text-[13px] text-secondary-foreground tabular-nums">
          <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
            <path
              d={flat ? "M2 6h7.5M7 3.5 9.5 6 7 8.5" : "M3 3l6 6M9 4.5V9H4.5"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: !flat && change > 0 ? "scaleY(-1)" : undefined, transformOrigin: "6px 6px" }}
            />
          </svg>
          <span className="font-medium text-foreground">{trend}</span>
          <span className="text-muted-foreground">{changeText}</span>
        </p>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : "Barometer"}
        columns={["Reading", "Pressure"]}
        rows={[
          ["Now", `${format(value)} ${unit}`],
          [previousTitle, `${format(marker)} ${unit}`],
          ["Change", `${flat ? "" : change > 0 ? "+" : "−"}${formatNumber(Math.abs(change), digits)} ${unit}`],
        ]}
      />
    </ChartCard>
  );
}
