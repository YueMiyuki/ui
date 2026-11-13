"use client";

import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  composeRenderProps,
  Label,
  Slider,
  type SliderProps,
  SliderThumb,
  SliderTrack,
  useLocale,
} from "react-aria-components";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

const HEIGHT = 150;
const TOP = 26;
const BOTTOM = 12;
const SAMPLES = 240;
const TRAVEL = { type: "spring", stiffness: 380, damping: 36 } as const;
const HOLD = { type: "spring", stiffness: 1600, damping: 80 } as const;

export interface RidgeSliderProps
  extends Omit<SliderProps<number>, "children" | "orientation" | "minValue" | "maxValue" | "formatOptions"> {
  label?: ReactNode;
  points?: number[];
  seed?: number | string;
  minAltitude?: number;
  maxAltitude?: number;
  ref?: Ref<HTMLDivElement>;
}

function seededRidge(seed: number | string) {
  const rng = createRng(seed);
  const peaks = [
    { c: rng.range(0.22, 0.34), h: rng.range(0.1, 0.16), w: rng.range(0.08, 0.12) },
    { c: rng.range(0.46, 0.6), h: rng.range(0.16, 0.23), w: rng.range(0.07, 0.1) },
    { c: rng.range(0.7, 0.82), h: rng.range(0.07, 0.12), w: rng.range(0.05, 0.08) },
  ];
  const count = 49;
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    let y = 0.88 * x ** 1.6;
    for (const p of peaks) {
      const u = Math.abs(x - p.c) / p.w;
      if (u < 1) y += p.h * (1 - u) ** 2;
    }
    raw.push(y + rng.range(-0.014, 0.014) * Math.sin(Math.PI * x));
  }
  const end = raw[count - 1];
  const out = raw.map((y) => Math.min(0.97, Math.max(0.01, y / end)));
  out[0] = 0;
  out[count - 1] = 1;
  return out;
}

function monotone(points: number[], samples: number) {
  const n = points.length;
  if (n < 2) return Array.from({ length: samples + 1 }, () => points[0] ?? 0);
  const h = 1 / (n - 1);
  const d = points.slice(1).map((p, i) => (p - points[i]) / h);
  const m = points.map((_, i) =>
    i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  const out: number[] = [];
  for (let j = 0; j <= samples; j++) {
    const x = j / samples;
    const i = Math.min(n - 2, Math.floor(x / h));
    const t = (x - i * h) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    out.push(
      (2 * t3 - 3 * t2 + 1) * points[i] +
        (t3 - 2 * t2 + t) * h * m[i] +
        (-2 * t3 + 3 * t2) * points[i + 1] +
        (t3 - t2) * h * m[i + 1],
    );
  }
  return out;
}

function yAt(f: number) {
  return TOP + (1 - f) * (HEIGHT - TOP - BOTTOM);
}

function sample(profile: number[], t: number) {
  const f = Math.min(1, Math.max(0, t)) * (profile.length - 1);
  const i = Math.min(profile.length - 2, Math.floor(f));
  return profile[i] + (profile[i + 1] - profile[i]) * (f - i);
}

export function RidgeSlider({
  label,
  points,
  seed = 7,
  minAltitude = 0,
  maxAltitude = 1000,
  step = 1,
  className,
  ...props
}: RidgeSliderProps) {
  const profile = useMemo(() => {
    const source = points && points.length >= 2 ? points.map((p) => Math.min(1, Math.max(0, p))) : seededRidge(seed);
    return monotone(source, SAMPLES);
  }, [points, seed]);

  return (
    <Slider
      {...props}
      minValue={0}
      maxValue={100}
      step={step}
      formatOptions={{ style: "unit", unit: "percent", maximumFractionDigits: 0 }}
      className={composeRenderProps(className, (cls) =>
        cn("group/ridge flex w-full flex-col gap-2 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ state }) => (
        <Route
          label={label}
          profile={profile}
          t={state.getThumbPercent(0)}
          dragging={state.isThumbDragging(0)}
          minAltitude={minAltitude}
          maxAltitude={maxAltitude}
        />
      )}
    </Slider>
  );
}

interface RouteProps {
  label?: ReactNode;
  profile: number[];
  t: number;
  dragging: boolean;
  minAltitude: number;
  maxAltitude: number;
}

function Route({ label, profile, t, dragging, minAltitude, maxAltitude }: RouteProps) {
  const reduce = useReducedMotion() ?? false;
  const { locale } = useLocale();
  const id = useId();
  const shown = useMotionValue(t);

  useEffect(() => {
    if (reduce) shown.jump(t);
    else animate(shown, t, dragging ? HOLD : TRAVEL);
  }, [t, dragging, reduce, shown]);

  const metres = useMemo(
    () => new Intl.NumberFormat(locale, { style: "unit", unit: "meter", maximumFractionDigits: 0 }),
    [locale],
  );
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
    [locale],
  );
  const altitudeAt = (v: number) => minAltitude + sample(profile, v) * (maxAltitude - minAltitude);
  const peak = useMemo(() => {
    let best = 0;
    for (let i = 1; i < profile.length; i++) if (profile[i] > profile[best]) best = i;
    return best / (profile.length - 1);
  }, [profile]);
  const percentText = useTransform(shown, (v) => percent.format(Math.round(Math.min(1, Math.max(0, v)) * 100) / 100));
  const altitudeText = useTransform(shown, (v) => metres.format(Math.round(altitudeAt(Math.min(1, Math.max(0, v))))));

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        {label != null ? <Label className="text-sm font-medium text-foreground">{label}</Label> : <span />}
        <span className="flex items-baseline gap-2 text-sm tabular-nums">
          <motion.span className="text-muted-foreground">{percentText}</motion.span>
          <span aria-hidden="true" className="text-border-strong">
            /
          </span>
          <motion.span id={`${id}-altitude`} className="font-medium text-foreground">
            {altitudeText}
          </motion.span>
        </span>
      </div>
      <SliderTrack
        className="relative mb-5 touch-none data-[disabled]:cursor-not-allowed"
        style={{ height: HEIGHT, marginInline: 7 }}
      >
        <Terrain
          profile={profile}
          shown={shown}
          peak={peak}
          valley={metres.format(Math.round(altitudeAt(0)))}
          summit={metres.format(Math.round(altitudeAt(peak)))}
        />
        <SliderThumb
          aria-describedby={`${id}-altitude`}
          className="size-7 cursor-grab rounded-full outline-none data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed"
          style={{ top: yAt(sample(profile, t)) }}
        />
      </SliderTrack>
    </>
  );
}

interface TerrainProps {
  profile: number[];
  shown: MotionValue<number>;
  peak: number;
  valley: string;
  summit: string;
}

function Terrain({ profile, shown, peak, valley, summit }: TerrainProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const x = useTransform(shown, (v) => v * width);
  const y = useTransform(shown, (v) => yAt(sample(profile, v)));
  const clip = useTransform(shown, (v) => v * width);
  const drop = useTransform(y, (v) => HEIGHT - v);

  const line = useMemo(() => {
    if (!width) return "";
    let d = "";
    for (let j = 0; j < profile.length; j++) {
      const px = (j / (profile.length - 1)) * width;
      d += `${j ? "L" : "M"}${px.toFixed(2)} ${yAt(profile[j]).toFixed(2)}`;
    }
    return d;
  }, [profile, width]);
  const area = line ? `${line}L${width} ${HEIGHT}L0 ${HEIGHT}Z` : "";
  const peakX = peak * width;
  const peakY = yAt(sample(profile, peak));

  return (
    <div ref={boxRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id={`${id}-snow`} x1="0" x2="0" y1={TOP} y2={HEIGHT} gradientUnits="userSpaceOnUse">
              <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--brand) 14%, var(--card))" }} />
              <stop
                offset="1"
                style={{ stopColor: "color-mix(in oklab, var(--brand) 2%, var(--background))" }}
                stopOpacity="0"
              />
            </linearGradient>
            <linearGradient id={`${id}-water`} x1="0" x2="0" y1={TOP} y2={HEIGHT} gradientUnits="userSpaceOnUse">
              <stop offset="0" style={{ stopColor: "var(--brand)" }} stopOpacity="0.26" />
              <stop offset="1" style={{ stopColor: "var(--brand)" }} stopOpacity="0.02" />
            </linearGradient>
            <clipPath id={`${id}-climbed`}>
              <motion.rect x={-4} y={-40} height={HEIGHT + 80} width={clip} />
            </clipPath>
          </defs>
          <path d={area} fill={`url(#${id}-snow)`} />
          <path
            d={line}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="1 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-muted-foreground"
          />
          <g clipPath={`url(#${id}-climbed)`}>
            <path d={area} fill={`url(#${id}-water)`} />
            <path
              d={line}
              fill="none"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-brand"
            />
          </g>
          <g transform={`translate(${peakX} ${peakY})`}>
            <line y1={-3} y2={-19} strokeWidth={1.25} className="stroke-foreground" />
            <path
              d={peak > 0.8 ? "M -0.6 -19 L -9 -16 L -0.6 -13 Z" : "M 0.6 -19 L 9 -16 L 0.6 -13 Z"}
              className="fill-foreground"
            />
          </g>
        </svg>
      )}
      <span className="absolute bottom-0 left-0 translate-y-full pt-1 text-xs text-muted-foreground tabular-nums">
        {valley}
      </span>
      <span
        className="absolute -translate-y-1/2 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
        style={peak > 0.8 ? { right: (1 - peak) * width + 16, top: peakY - 12 } : { left: peakX + 14, top: peakY - 12 }}
      >
        {summit}
      </span>
      <motion.div className="absolute top-0 left-0" style={{ x, y }}>
        <motion.span
          className="absolute left-0 top-0 w-px -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--border-strong)_0_3px,transparent_3px_6px)]"
          style={{ height: drop }}
        />
        <span
          className={cn(
            "absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-card shadow-sm",
            "transition-[scale,box-shadow] duration-150 ease-settle",
            "group-has-[[data-dragging]]/ridge:scale-110 group-has-[[data-dragging]]/ridge:ring-[4px] group-has-[[data-dragging]]/ridge:ring-ring/50",
            "group-has-[[data-focus-visible]]/ridge:ring-[3px] group-has-[[data-focus-visible]]/ridge:ring-ring",
          )}
        />
      </motion.div>
    </div>
  );
}
