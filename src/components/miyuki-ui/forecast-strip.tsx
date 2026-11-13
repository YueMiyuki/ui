"use client";

import { area, curveMonotoneX, line } from "d3-shape";
import { Snowflake } from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { WeatherIcon, type WeatherKind } from "@/components/miyuki-ui/weather-icon";
import { cn } from "@/lib/utils";

export interface ForecastDay {
  id: string;
  label: string;
  date: string;
  title?: string;
  kind: WeatherKind;
  summary: string;
  high: number;
  low: number;
  snow: number;
}

export interface ForecastHour {
  time: string;
  kind: WeatherKind;
  temp: number;
  snow: number;
}

export interface ForecastStripProps extends Omit<ComponentProps<"section">, "onChange" | "defaultValue"> {
  days: ForecastDay[];
  hours?: Record<string, ForecastHour[]>;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (id: string | null) => void;
  label?: ReactNode;
  caption?: ReactNode;
  startTime?: string;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const CELL = 52;
const ZONE_TOP = 64;
const ZONE_H = 88;
const DOT_TOP = 26;
const DOT_BOTTOM = 72;
const MIN_SPAN = 8;

const kindName: Record<WeatherKind, string> = {
  clear: "Clear",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  rain: "Rain",
  sleet: "Sleet",
  snow: "Snow",
  "heavy-snow": "Heavy snow",
  wind: "Wind",
  thunder: "Thunder",
  "clear-night": "Clear",
};

function degrees(t: number) {
  const r = Math.round(t);
  return `${r < 0 ? "−" : ""}${Math.abs(r)}°`;
}

function ease(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function domain(temps: number[]): [number, number] {
  let lo = Math.min(...temps);
  let hi = Math.max(...temps);
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = mid - MIN_SPAN / 2;
    hi = mid + MIN_SPAN / 2;
  }
  return [lo, hi];
}

function minutes(time: string) {
  const m = /^(\d{1,2})(?::(\d{2}))?/.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : NaN;
}

function Hours({ hours, title, start }: { hours: ForecastHour[]; title: string; start: string }) {
  const reduce = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);
  const from = minutes(start);
  const startIndex = Number.isNaN(from)
    ? 0
    : Math.max(
        0,
        hours.findIndex((h) => minutes(h.time) >= from),
      );
  const gradient = `miyuki-forecast-strip-${useId().replace(/[^\w-]/g, "")}`;
  const temps = hours.map((h) => h.temp);
  const target = temps.length ? [...temps, ...domain(temps)] : [];
  const signature = target.join(",");
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useLayoutEffect(() => {
    const el = strip.current;
    if (el) el.scrollLeft = startIndex * CELL;
  }, [startIndex]);

  useEffect(() => {
    const to = signature ? signature.split(",").map(Number) : [];
    const from = current.current;
    const same = from.length === to.length;
    const duration = reduce || !same ? 0 : 440;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = duration ? Math.min(1, Math.max(0, now - start) / duration) : 1;
      const e = ease(p);
      const next = to.map((t, i) => (same ? from[i] + (t - from[i]) * e : t));
      current.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signature, reduce]);

  const count = Math.max(0, shown.length - 2);
  const min = shown[count] ?? 0;
  const max = shown[count + 1] ?? 1;
  const span = Math.max(1, max - min);
  const y = (t: number) => DOT_TOP + ((max - t) / span) * (DOT_BOTTOM - DOT_TOP);
  const points = shown.slice(0, count).map((t, i) => [i * CELL + CELL / 2, y(t)] as [number, number]);
  const width = hours.length * CELL;
  const linePath = line().curve(curveMonotoneX)(points) ?? "";
  const areaPath =
    area()
      .curve(curveMonotoneX)
      .y0(ZONE_H)
      .y1((p) => p[1])(points) ?? "";
  const freezing = min < 0 && max > 0 ? y(0) : null;

  return (
    <div className="mx-1 rounded-lg has-[>:focus-visible]:ring-[3px] has-[>:focus-visible]:ring-ring">
      <div
        ref={strip}
        tabIndex={0}
        role="group"
        aria-label={`Hours for ${title}, scroll sideways for more`}
        className={cn(
          "overflow-x-auto overscroll-x-contain rounded-lg outline-none [scrollbar-width:thin]",
          "snap-x snap-proximity scroll-px-2",
          "[mask-image:linear-gradient(to_right,transparent,#000_10px,#000_calc(100%-10px),transparent)]",
        )}
      >
        <div className="relative px-2" style={{ width: width + 16 }}>
          <svg
            aria-hidden="true"
            width={width}
            height={ZONE_H}
            className="pointer-events-none absolute left-2 overflow-visible"
            style={{ top: ZONE_TOP }}
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.26 }} />
                <stop offset="1" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {freezing != null && (
              <>
                <line
                  x1={0}
                  x2={width}
                  y1={Math.round(freezing) + 0.5}
                  y2={Math.round(freezing) + 0.5}
                  strokeDasharray="2 4"
                  className="stroke-border-strong"
                />
                <text x={2} y={freezing + 12} className="fill-muted-foreground" style={{ fontSize: 10 }}>
                  0°
                </text>
              </>
            )}
            <path d={areaPath} fill={`url(#${gradient})`} />
            <path
              d={linePath}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ stroke: "var(--chart-1)" }}
            />
            {points.map(([px, py], i) => (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={3}
                strokeWidth={2}
                style={{ fill: "var(--chart-1)", stroke: "var(--muted)" }}
              />
            ))}
          </svg>
          <ol className="relative flex">
            {hours.map((h, i) => (
              <li key={i} className="flex shrink-0 snap-start flex-col items-center pt-3 pb-3" style={{ width: CELL }}>
                <span className="h-4 text-xs leading-4 text-muted-foreground tabular-nums">{h.time}</span>
                <WeatherIcon kind={h.kind} size={20} label={kindName[h.kind]} className="mt-2 text-foreground" />
                <span className="relative mt-1 block w-full" style={{ height: ZONE_H }}>
                  <span
                    className="absolute inset-x-0 top-0 text-center text-xs leading-4 font-medium text-foreground tabular-nums"
                    style={{
                      transform: `translateY(${(points[i]?.[1] ?? 0) - 22}px)`,
                    }}
                  >
                    {degrees(h.temp)}
                  </span>
                </span>
                <span
                  className={cn(
                    "h-4 text-[11px] leading-4 tabular-nums",
                    h.snow >= 30 ? "font-medium text-brand-strong" : "text-muted-foreground",
                  )}
                >
                  <span className="sr-only">Chance of snow </span>
                  {Math.round(h.snow)}%
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function ForecastStrip({
  days,
  hours,
  value,
  defaultValue = null,
  onChange,
  label,
  caption,
  startTime = "06:00",
  className,
  ...props
}: ForecastStripProps) {
  const reduce = useReducedMotion();
  const [inner, setInner] = useState<string | null>(defaultValue);
  const selected = value !== undefined ? value : inner;
  const headingId = useId();
  const notch = `${headingId}-notch`;
  const [gridRef, seen] = useSeen<HTMLDivElement>();
  const grown = seen || !!reduce;

  const weekMin = Math.min(...days.map((d) => d.low));
  const weekMax = Math.max(...days.map((d) => d.high));
  const weekSpan = Math.max(1, weekMax - weekMin);

  const day = days.find((d) => d.id === selected) ?? null;
  const dayHours = day && hours ? hours[day.id] : undefined;
  const open = day != null && dayHours != null && dayHours.length > 0;
  const title = day ? (day.title ?? `${day.label} ${day.date}`) : "";

  const choose = (next: string | null) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  const first = days[0];
  const last = days[days.length - 1];

  return (
    <section
      aria-labelledby={label != null ? headingId : undefined}
      {...props}
      className={cn(
        "@container w-full rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm @[30rem]:p-5",
        className,
      )}
    >
      {(label != null || caption != null || first) && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-1 @[30rem]:px-1.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            {label != null && (
              <h3 id={headingId} className="text-base leading-6 font-semibold tracking-[-0.01em] text-foreground">
                {label}
              </h3>
            )}
            {caption != null && <p className="text-[13px] leading-5 text-muted-foreground">{caption}</p>}
          </div>
          {first && last && (
            <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
              {first.label} {first.date} – {last.label} {last.date}
            </p>
          )}
        </header>
      )}
      <div ref={gridRef} className="mt-3 @[30rem]:mt-4">
        <ToggleButtonGroup
          aria-label="Days"
          selectionMode="single"
          selectedKeys={selected ? [selected] : []}
          onSelectionChange={(keys) => choose(([...keys][0] as string | undefined) ?? null)}
          className="grid grid-cols-7 gap-0.5 @[30rem]:gap-1"
        >
          {days.map((d, i) => {
            const top = ((weekMax - d.high) / weekSpan) * 100;
            const bottom = ((d.low - weekMin) / weekSpan) * 100;
            return (
              <ToggleButton
                key={d.id}
                id={d.id}
                aria-label={`${d.title ?? `${d.label} ${d.date}`}, ${d.summary}, high ${degrees(d.high)}, low ${degrees(d.low)}, ${Math.round(d.snow)}% chance of snow`}
                className={({ isSelected, isHovered, isFocusVisible, isPressed }) =>
                  cn(
                    "flex min-w-0 cursor-default flex-col items-center rounded-xl px-0.5 pt-2.5 pb-2.5 outline-none select-none @[30rem]:pt-3",
                    "transition-[background-color,box-shadow,scale] duration-200 ease-settle",
                    isSelected ? "bg-brand-soft" : isHovered ? "bg-accent" : "bg-transparent",
                    isPressed && "scale-[0.97]",
                    isFocusVisible && "ring-[3px] ring-ring",
                  )
                }
              >
                {({ isSelected }) => (
                  <>
                    <span className="text-[13px] leading-4 font-medium text-foreground">{d.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 text-xs leading-4 tabular-nums",
                        isSelected ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {d.date}
                    </span>
                    <WeatherIcon kind={d.kind} size={32} className="mt-2 size-7 text-foreground @[30rem]:size-8" />
                    <span className="mt-2 text-sm leading-5 font-medium text-foreground tabular-nums">
                      {degrees(d.high)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative my-1.5 h-11 w-1.5 rounded-full bg-muted ring-1 ring-border ring-inset @[30rem]:h-14 @[30rem]:w-2"
                    >
                      <span
                        className="absolute inset-x-0 origin-bottom rounded-full bg-brand transition-transform duration-700 ease-settle motion-reduce:transition-none"
                        style={{
                          top: `${top}%`,
                          bottom: `${bottom}%`,
                          transform: grown ? "none" : "scaleY(0)",
                          transitionDelay: grown && !reduce ? `${i * 45}ms` : undefined,
                        }}
                      />
                    </span>
                    <span className="text-sm leading-5 text-muted-foreground tabular-nums">{degrees(d.low)}</span>
                    <span
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-0.5 text-[11px] leading-4 tabular-nums @[30rem]:text-xs",
                        d.snow >= 30 ? "font-medium text-brand-strong" : "text-muted-foreground",
                      )}
                    >
                      <Snowflake aria-hidden="true" className="size-2.5 shrink-0 @[30rem]:size-3" strokeWidth={2} />
                      {Math.round(d.snow)}%
                    </span>
                  </>
                )}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </div>
      <AnimatePresence initial={false}>
        {open && day && dayHours && (
          <motion.div
            key="hours"
            role="region"
            aria-label={`Hourly forecast, ${title}`}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : {
                    height: 0,
                    opacity: 0,
                    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
                  }
            }
            transition={reduce ? { duration: 0.12 } : SETTLE}
            className="overflow-hidden"
          >
            <div className="relative pt-2.5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-7 gap-0.5 @[30rem]:gap-1"
              >
                {days.map((d) => (
                  <span key={d.id} className="flex justify-center">
                    {d.id === day.id && (
                      <motion.svg
                        layoutId={notch}
                        transition={reduce ? { duration: 0 } : SETTLE}
                        width={20}
                        height={9}
                        viewBox="0 0 20 9"
                        className="mt-0.5 block overflow-visible"
                      >
                        <path d="M0 9L8.4 1.2Q10 -0.3 11.6 1.2L20 9Z" className="fill-muted" />
                        <path
                          d="M0 9L8.4 1.2Q10 -0.3 11.6 1.2L20 9"
                          fill="none"
                          strokeWidth={1}
                          className="stroke-transparent dark:stroke-border"
                        />
                      </motion.svg>
                    )}
                  </span>
                ))}
              </div>
              <div className="relative rounded-xl bg-muted pt-3 pb-1 dark:ring-1 dark:ring-border dark:ring-inset">
                <div className="flex items-baseline justify-between gap-3 px-3.5">
                  <p className="text-[13px] leading-5 font-medium text-foreground">{title}</p>
                  <p className="text-xs leading-5 text-muted-foreground">Hourly, °C</p>
                </div>
                <Hours hours={dayHours} title={title} start={startTime} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
