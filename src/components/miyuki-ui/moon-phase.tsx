"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type Ref, useEffect, useId, useRef, useState } from "react";
import { RadioButton, RadioField, RadioGroup } from "react-aria-components";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type MoonHemisphere = "north" | "south";
export type MoonDate = Date | string;

export interface MoonPhaseProps extends Omit<ComponentProps<"figure">, "children"> {
  date: MoonDate;
  size?: number;
  showLabel?: boolean;
  hemisphere?: MoonHemisphere;
  ref?: Ref<HTMLElement>;
}

export interface MoonStripProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  from: MoonDate;
  days?: number;
  value?: MoonDate;
  onChange?: (date: string) => void;
  label?: string;
  hemisphere?: MoonHemisphere;
  ref?: Ref<HTMLDivElement>;
}

const SYNODIC = 29.530588853;
const EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86_400_000;
const K = 0.5523;

function dayOf(date: MoonDate): number {
  if (typeof date === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], 12);
    const parsed = new Date(date);
    return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12);
  }
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function moonPhase(date: MoonDate) {
  const ms = dayOf(date);
  const phase = ((((ms - EPOCH) / DAY / SYNODIC) % 1) + 1) % 1;
  const age = phase * SYNODIC;
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  const name =
    age < 1 || age > SYNODIC - 1
      ? "New moon"
      : age < 6.38
        ? "Waxing crescent"
        : age < 8.38
          ? "First quarter"
          : age < 13.77
            ? "Waxing gibbous"
            : age < 15.77
              ? "Full moon"
              : age < 21.15
                ? "Waning gibbous"
                : age < 23.15
                  ? "Last quarter"
                  : "Waning crescent";
  return { phase, age, illumination, name };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function litPath(phase: number, cx: number, cy: number, R: number) {
  const p = ((phase % 1) + 1) % 1;
  const c = Math.cos(p * 2 * Math.PI);
  const aR = p <= 0.5 ? R : -R * c;
  const aL = p <= 0.5 ? -R * c : R;
  const P = (x: number, y: number) => `${r2(x)} ${r2(y)}`;
  return (
    `M${P(cx, cy - R)}` +
    `C${P(cx + aR * K, cy - R)} ${P(cx + aR, cy - R * K)} ${P(cx + aR, cy)}` +
    `C${P(cx + aR, cy + R * K)} ${P(cx + aR * K, cy + R)} ${P(cx, cy + R)}` +
    `C${P(cx - aL * K, cy + R)} ${P(cx - aL, cy + R * K)} ${P(cx - aL, cy)}` +
    `C${P(cx - aL, cy - R * K)} ${P(cx - aL * K, cy - R)} ${P(cx, cy - R)}Z`
  );
}

const MARIA: [number, number, number, number, number][] = [
  [-0.55, 0.0, 0.27, 0.44, 0.75],
  [-0.28, -0.42, 0.25, 0.21, 1],
  [0.0, -0.72, 0.4, 0.075, 0.7],
  [0.2, -0.36, 0.15, 0.14, 1],
  [0.34, -0.06, 0.19, 0.15, 0.9],
  [0.68, -0.27, 0.1, 0.085, 1],
  [0.55, 0.17, 0.1, 0.16, 0.8],
  [0.36, 0.31, 0.08, 0.08, 0.75],
  [-0.16, 0.38, 0.17, 0.13, 0.8],
  [-0.47, 0.4, 0.09, 0.08, 0.85],
  [0.02, -0.18, 0.08, 0.06, 0.8],
  [-0.24, -0.05, 0.09, 0.07, 0.6],
];

const MARIA_PATHS = (() => {
  const rng = createRng("moon-phase:maria");
  return MARIA.map(([x, y, rx, ry, o]) => {
    const a = rng.range(0, Math.PI * 2);
    const b = rng.range(0, Math.PI * 2);
    const c = rng.range(0, Math.PI * 2);
    const pts: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      const k = 1 + 0.16 * Math.sin(2 * t + a) + 0.1 * Math.sin(3 * t + b) + 0.06 * Math.sin(5 * t + c);
      pts.push([x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k]);
    }
    return { pts, opacity: o };
  });
})();

function maria(cx: number, cy: number, R: number) {
  return MARIA_PATHS.map(({ pts, opacity }) => ({
    d: `${pts.map(([x, y], i) => `${i ? "L" : "M"}${r2(cx + x * R)} ${r2(cy + y * R)}`).join("")}Z`,
    opacity,
  }));
}

function MoonDisc({
  phase,
  size,
  hemisphere,
  detail = true,
}: {
  phase: number;
  size: number;
  hemisphere: MoonHemisphere;
  detail?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion() === true;
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const shown = useRef(phase);
  const [first] = useState(phase);
  const pad = detail ? size * 0.16 : size * 0.06;
  const box = size + pad * 2;
  const c = box / 2;
  const R = size / 2;

  useEffect(() => {
    const el = pathRef.current;
    const glow = glowRef.current;
    const from = shown.current;
    if (!el || from === phase) return;
    const set = (p: number) => {
      shown.current = p;
      const d = litPath(p, c, c, R);
      el.setAttribute("d", d);
      glow?.setAttribute("d", d);
    };
    if (reduce) {
      set(phase);
      return;
    }
    let x = from;
    let v = 0;
    let last = -1;
    let frame = requestAnimationFrame(function step(now) {
      const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = 140 * (phase - x) - 24 * v;
      v += a * dt;
      x += v * dt;
      if (Math.abs(phase - x) < 0.0004 && Math.abs(v) < 0.002) {
        set(phase);
        return;
      }
      set(x);
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, reduce, c, R]);

  const d = litPath(first, c, c, R);
  const blur = Math.max(0.5, size * 0.018);
  const seas = maria(c, c, R);

  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      <svg
        width={r2(box)}
        height={r2(box)}
        viewBox={`0 0 ${r2(box)} ${r2(box)}`}
        aria-hidden="true"
        className="absolute block overflow-visible"
        style={{ left: -pad, top: -pad }}
      >
        <defs>
          <clipPath id={`${uid}-disc`}>
            <circle cx={c} cy={c} r={R} />
          </clipPath>
          <clipPath id={`${uid}-lit`}>
            <path ref={pathRef} d={d} />
          </clipPath>
          {detail && (
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={r2(size * 0.07)} />
            </filter>
          )}
          <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={r2(blur)} />
          </filter>
          <radialGradient id={`${uid}-limb`} cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="var(--miyuki-moon-phase-limb)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--miyuki-moon-phase-limb)" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <g transform={hemisphere === "south" ? `rotate(180 ${r2(c)} ${r2(c)})` : undefined}>
          {detail && (
            <path
              ref={glowRef}
              d={d}
              filter={`url(#${uid}-glow)`}
              className="fill-[var(--miyuki-moon-phase-glow)] opacity-60"
            />
          )}
          <circle cx={c} cy={c} r={R} className="fill-[var(--miyuki-moon-phase-night)]" />
          <g clipPath={`url(#${uid}-disc)`}>
            <g filter={`url(#${uid}-soft)`} className="fill-[var(--miyuki-moon-phase-mare)]">
              {seas.map((m, i) => (
                <path key={i} d={m.d} opacity={m.opacity} />
              ))}
            </g>
            <g clipPath={`url(#${uid}-lit)`}>
              <circle cx={c} cy={c} r={R} className="fill-[var(--miyuki-moon-phase-day)]" />
              <g filter={`url(#${uid}-soft)`} className="fill-[var(--miyuki-moon-phase-mare-lit)]">
                {seas.map((m, i) => (
                  <path key={i} d={m.d} opacity={m.opacity} />
                ))}
              </g>
              <circle cx={c} cy={c} r={R} fill={`url(#${uid}-limb)`} />
            </g>
          </g>
          <circle
            cx={c}
            cy={c}
            r={R - 0.5}
            fill="none"
            strokeWidth={1}
            className="stroke-[var(--miyuki-moon-phase-rim)]"
          />
        </g>
      </svg>
    </span>
  );
}

const palette = cn(
  "[--miyuki-moon-phase-day:color-mix(in_oklab,var(--card)_76%,var(--chart-4))]",
  "[--miyuki-moon-phase-night:color-mix(in_oklab,var(--brand-strong)_15%,var(--background))]",
  "[--miyuki-moon-phase-mare:color-mix(in_oklab,var(--brand-strong)_6%,transparent)]",
  "[--miyuki-moon-phase-mare-lit:color-mix(in_oklab,var(--warning-strong)_16%,transparent)]",
  "[--miyuki-moon-phase-limb:color-mix(in_oklab,var(--warning-strong)_22%,transparent)]",
  "[--miyuki-moon-phase-glow:var(--chart-4)]",
  "[--miyuki-moon-phase-rim:color-mix(in_oklab,var(--brand-strong)_22%,transparent)]",
  "dark:[--miyuki-moon-phase-day:color-mix(in_oklab,var(--foreground)_95%,var(--chart-4))]",
  "dark:[--miyuki-moon-phase-night:color-mix(in_oklab,var(--foreground)_8%,var(--background))]",
  "dark:[--miyuki-moon-phase-mare:color-mix(in_oklab,var(--foreground)_5%,transparent)]",
  "dark:[--miyuki-moon-phase-mare-lit:color-mix(in_oklab,color-mix(in_oklab,var(--background)_70%,var(--brand))_24%,transparent)]",
  "dark:[--miyuki-moon-phase-limb:color-mix(in_oklab,var(--background)_40%,transparent)]",
  "dark:[--miyuki-moon-phase-glow:var(--foreground)]",
  "dark:[--miyuki-moon-phase-rim:color-mix(in_oklab,var(--foreground)_10%,transparent)]",
);

export function MoonPhase({
  date,
  size = 160,
  showLabel = false,
  hemisphere = "north",
  className,
  ref,
  ...props
}: MoonPhaseProps) {
  const info = moonPhase(date);
  const [target, setTarget] = useState({
    key: iso(dayOf(date)),
    phase: info.phase,
  });
  const key = iso(dayOf(date));
  if (key !== target.key) {
    const days = (dayOf(date) - dayOf(target.key)) / DAY;
    let delta = info.phase - (((target.phase % 1) + 1) % 1);
    if (days >= 0) delta = ((delta % 1) + 1) % 1;
    else delta = -(((-delta % 1) + 1) % 1);
    setTarget({ key, phase: target.phase + delta });
  }
  const percent = Math.round(info.illumination * 100);
  const spoken = `${info.name}, ${percent}% illuminated`;

  return (
    <figure ref={ref} {...props} className={cn("inline-flex flex-col items-center gap-4", palette, className)}>
      <div role="img" aria-label={spoken}>
        <MoonDisc phase={target.phase} size={size} hemisphere={hemisphere} />
      </div>
      {showLabel && (
        <figcaption className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-base font-medium text-foreground">{info.name}</span>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {percent}% illuminated · {info.age.toFixed(1)} days old
          </span>
        </figcaption>
      )}
    </figure>
  );
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
});
const fullFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function MoonStrip({
  from,
  days = 14,
  value,
  onChange,
  label = "Day",
  hemisphere = "north",
  className,
  ref,
  ...props
}: MoonStripProps) {
  const start = dayOf(from);
  const list = Array.from({ length: Math.max(1, days) }, (_, i) => {
    const ms = start + i * DAY;
    return { ms, key: iso(ms), ...moonPhase(iso(ms)) };
  });
  const near = (target: number) => {
    let best = -1;
    let bestD = 0.75;
    list.forEach((d, i) => {
      const diff = Math.abs(((d.age - target + SYNODIC * 1.5) % SYNODIC) - SYNODIC / 2);
      if (diff < bestD) {
        bestD = diff;
        best = i;
      }
    });
    return best;
  };
  const newAt = near(0);
  const fullAt = near(SYNODIC / 2);
  const selected = value != null ? iso(dayOf(value)) : undefined;
  const columns =
    list.length > 7
      ? "grid-cols-7 sm:grid-cols-[repeat(var(--miyuki-moon-phase-days),minmax(0,1fr))]"
      : "grid-cols-[repeat(var(--miyuki-moon-phase-days),minmax(0,1fr))]";

  const cell = (d: (typeof list)[number], i: number, active: boolean) => (
    <>
      <span className="text-[11px] leading-4 text-muted-foreground">{weekdayFormat.format(d.ms)}</span>
      <MoonDisc phase={d.phase} size={26} hemisphere={hemisphere} detail={false} />
      <span
        className={cn(
          "text-[13px] leading-4 font-medium tabular-nums",
          active ? "text-foreground" : "text-foreground/80",
        )}
      >
        {dayFormat.format(d.ms)}
      </span>
      <span
        className={cn(
          "h-4 text-[11px] leading-4 font-medium",
          i === fullAt || i === newAt ? "text-brand-strong" : "text-transparent",
        )}
      >
        {i === fullAt ? "Full" : i === newAt ? "New" : "·"}
      </span>
    </>
  );

  const style = { "--miyuki-moon-phase-days": list.length } as CSSProperties;
  const small = cn(
    "[--miyuki-moon-phase-night:color-mix(in_oklab,var(--brand-strong)_30%,var(--background))]",
    "[--miyuki-moon-phase-day:color-mix(in_oklab,var(--card)_62%,var(--chart-4))]",
    "dark:[--miyuki-moon-phase-night:color-mix(in_oklab,var(--foreground)_8%,var(--background))]",
    "dark:[--miyuki-moon-phase-day:color-mix(in_oklab,var(--foreground)_95%,var(--chart-4))]",
  );

  if (!onChange) {
    return (
      <div ref={ref} {...props} className={cn(palette, small, className)} style={{ ...style, ...props.style }}>
        <ol className={cn("grid gap-y-3", columns)}>
          {list.map((d, i) => (
            <li
              key={d.key}
              aria-label={`${fullFormat.format(d.ms)}: ${d.name}`}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg px-0.5 py-2",
                d.key === selected && "bg-brand-soft",
              )}
            >
              {cell(d, i, d.key === selected)}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div ref={ref} {...props} className={cn(palette, small, className)} style={{ ...style, ...props.style }}>
      <RadioGroup
        aria-label={label}
        orientation="horizontal"
        value={selected ?? null}
        onChange={(key) => onChange(key)}
      >
        <div className={cn("grid gap-y-1", columns)}>
          {list.map((d, i) => (
            <RadioField key={d.key} value={d.key} className="flex">
              <RadioButton
                aria-label={`${fullFormat.format(d.ms)}: ${d.name}`}
                className={({ isSelected, isFocusVisible, isHovered }) =>
                  cn(
                    "flex w-full cursor-default flex-col items-center gap-1.5 rounded-lg px-0.5 py-2 outline-none select-none",
                    "transition-colors duration-150 ease-settle",
                    isSelected ? "bg-brand-soft" : isHovered && "bg-accent",
                    isFocusVisible && "ring-[3px] ring-ring",
                  )
                }
              >
                {({ isSelected }) => cell(d, i, isSelected)}
              </RadioButton>
            </RadioField>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
