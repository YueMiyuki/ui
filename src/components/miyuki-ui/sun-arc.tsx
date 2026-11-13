"use client";

import { Sunrise, Sunset } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface SunArcProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  sunrise: string;
  sunset: string;
  time?: string;
  defaultTime?: string;
  onTimeChange?: (time: string) => void;
  label?: ReactNode;
  twilight?: number;
  height?: number;
  ref?: Ref<HTMLDivElement>;
}

const SUN = 11;

function toMinutes(value: string | undefined, fallback: number) {
  const m = value ? /^(\d{1,2}):(\d{2})/.exec(value) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
}

function toClock(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function span(minutes: number) {
  const m = Math.round(Math.abs(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function SunArc({
  sunrise,
  sunset,
  time,
  defaultTime,
  onTimeChange,
  label,
  twilight = 30,
  height = 196,
  className,
  ref,
  ...props
}: SunArcProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rise = toMinutes(sunrise, 360);
  const set = Math.max(rise + 1, toMinutes(sunset, 1080));
  const noon = (rise + set) / 2;
  const pad = Math.max(40, twilight + 15);
  const min = Math.floor(rise - pad);
  const max = Math.ceil(set + pad);
  const [own, setOwn] = useState(() => toMinutes(defaultTime, Math.round(noon)));
  const value = Math.min(max, Math.max(min, time !== undefined ? toMinutes(time, own) : own));
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const spoken = `${toClock(value)}, ${
    value < rise
      ? `${span(rise - value)} before sunrise`
      : value > set
        ? `${span(value - set)} after sunset`
        : `${span(set - value)} of daylight left`
  }`;
  useLayoutEffect(() => {
    inputRef.current?.setAttribute("aria-valuetext", spoken);
  });

  const H = height;
  const horizon = H - 30;
  const top = SUN + 12;
  const lift = horizon - top;
  const m = SUN + 2;
  const inner = Math.max(1, width - m * 2);
  const xOf = (t: number) => m + ((t - min) / (max - min)) * inner;
  const yOf = (t: number) => horizon - lift * Math.sin((Math.PI * (t - rise)) / (set - rise));
  const curve = (a: number, b: number) => {
    const n = Math.max(2, Math.ceil(Math.abs(xOf(b) - xOf(a)) / 3));
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      d += `${i ? "L" : "M"}${r2(xOf(t))} ${r2(yOf(t))}`;
    }
    return d;
  };
  const shown = Math.min(set, Math.max(rise, value));
  const hours: number[] = [];
  for (let h = Math.ceil(min / 60); h * 60 <= max; h++) hours.push(h * 60);
  const band = Math.max(1, xOf(rise) - xOf(rise - twilight));

  const change = (v: number) => {
    if (time === undefined) setOwn(v);
    onTimeChange?.(toClock(v));
  };

  const status =
    value < rise
      ? `${span(rise - value)} until sunrise`
      : value > set
        ? `Set ${span(value - set)} ago`
        : `${span(set - value)} of light left`;

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "w-full",
        "[--miyuki-sun-arc-day:color-mix(in_oklab,var(--chart-4)_82%,var(--warning-strong))] [--miyuki-sun-arc-dawn:var(--chart-5)] [--miyuki-sun-arc-sun:var(--chart-4)]",
        "dark:[--miyuki-sun-arc-day:var(--chart-4)]",
        className,
      )}
    >
      <Slider
        minValue={min}
        maxValue={max}
        step={1}
        value={value}
        onChange={(v) => change(v as number)}
        className="flex flex-col gap-3"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label className="text-sm font-medium text-foreground">{label ?? "Time of day"}</Label>
            <span className="text-[13px] text-muted-foreground">{status}</span>
          </div>
          <span className="font-display text-3xl leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
            {toClock(value)}
          </span>
        </div>
        <div ref={stageRef} className="relative w-full select-none" style={{ height: H }}>
          {width > 0 && (
            <>
              <svg
                width={width}
                height={H}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-visible"
              >
                <defs>
                  <linearGradient
                    id={`${uid}-path`}
                    gradientUnits="userSpaceOnUse"
                    x1={xOf(rise)}
                    x2={xOf(set)}
                    y1="0"
                    y2="0"
                  >
                    <stop offset="0" stopColor="var(--miyuki-sun-arc-dawn)" />
                    <stop offset="0.3" stopColor="var(--miyuki-sun-arc-day)" />
                    <stop offset="0.7" stopColor="var(--miyuki-sun-arc-day)" />
                    <stop offset="1" stopColor="var(--miyuki-sun-arc-dawn)" />
                  </linearGradient>
                  <linearGradient id={`${uid}-wash`} x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="var(--miyuki-sun-arc-day)"
                      className="[stop-opacity:0.2] dark:[stop-opacity:0.12]"
                    />
                    <stop offset="1" stopColor="var(--miyuki-sun-arc-day)" stopOpacity="0.01" />
                  </linearGradient>
                  <radialGradient id={`${uid}-dusk`} cx="0.5" cy="0.5" r="0.5">
                    <stop
                      offset="0"
                      stopColor="var(--miyuki-sun-arc-dawn)"
                      className="[stop-opacity:0.2] dark:[stop-opacity:0.28]"
                    />
                    <stop
                      offset="0.5"
                      stopColor="var(--chart-3)"
                      className="[stop-opacity:0.08] dark:[stop-opacity:0.12]"
                    />
                    <stop offset="1" stopColor="var(--chart-3)" stopOpacity="0" />
                  </radialGradient>
                  <clipPath id={`${uid}-sky`}>
                    <rect x={-40} y={-40} width={width + 80} height={horizon + 40} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${uid}-sky)`}>
                  {[rise, set].map((t) => (
                    <ellipse
                      key={t}
                      cx={r2(xOf(t) + (t === rise ? -band / 2 : band / 2))}
                      cy={horizon}
                      rx={r2(band * 2.6)}
                      ry={r2(lift * 0.5)}
                      fill={`url(#${uid}-dusk)`}
                    />
                  ))}
                  {value > rise && (
                    <path
                      d={`${curve(rise, shown)}L${r2(xOf(shown))} ${horizon}L${r2(xOf(rise))} ${horizon}Z`}
                      fill={`url(#${uid}-wash)`}
                    />
                  )}
                </g>
                <path
                  d={curve(rise, set)}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="1.5 5"
                  strokeLinecap="round"
                  className="stroke-muted-foreground/60"
                />
                <path
                  d={curve(rise - twilight, rise) + curve(set, set + twilight)}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="1.5 5"
                  strokeLinecap="round"
                  className="stroke-muted-foreground/25"
                />
                {value > rise && (
                  <path
                    d={curve(rise, shown)}
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    stroke={`url(#${uid}-path)`}
                  />
                )}
                <line x1={0} x2={width} y1={horizon} y2={horizon} strokeWidth={1} className="stroke-border-strong" />
                <line
                  x1={xOf(noon)}
                  x2={xOf(noon)}
                  y1={horizon}
                  y2={r2(yOf(noon) + SUN + 6)}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  className="stroke-border-strong"
                />
                {hours.map((h) => (
                  <g key={h}>
                    <line
                      x1={r2(xOf(h))}
                      x2={r2(xOf(h))}
                      y1={horizon + 1}
                      y2={horizon + (h % 180 === 0 ? 6 : 4)}
                      strokeWidth={1}
                      className={h % 180 === 0 ? "stroke-muted-foreground/70" : "stroke-border-strong"}
                    />
                    {h % 180 === 0 && (
                      <text
                        x={r2(xOf(h))}
                        y={horizon + 20}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[11px] tabular-nums"
                      >
                        {toClock(h)}
                      </text>
                    )}
                  </g>
                ))}
                {[rise, set].map((t) => (
                  <circle key={t} cx={r2(xOf(t))} cy={horizon} r={2.5} className="fill-[var(--miyuki-sun-arc-dawn)]" />
                ))}
              </svg>
              <SliderTrack
                className="cursor-pointer touch-none"
                style={{ position: "absolute", top: 0, bottom: 0, left: m, right: m }}
              >
                <SliderThumb
                  inputRef={inputRef}
                  className="cursor-grab outline-none data-[dragging]:cursor-grabbing"
                  style={({ state }) => {
                    const v = state.values[0];
                    return {
                      top: yOf(v),
                      width: SUN * 2 + 12,
                      height: SUN * 2 + 12,
                      transform: "translate(-50%, -50%)",
                    };
                  }}
                >
                  {({ isFocusVisible, isDragging, state }) => {
                    const y = yOf(state.values[0]);
                    const below = Math.max(0, y + SUN + 6 - horizon);
                    return (
                      <>
                        <span
                          className="absolute inset-0 transition-transform duration-200 ease-settle"
                          style={{
                            clipPath: below > 0 ? `inset(-24px -24px ${r2(below)}px -24px)` : undefined,
                            transform: isDragging ? "scale(1.08)" : undefined,
                          }}
                        >
                          <span className="absolute inset-0 rounded-full bg-[var(--miyuki-sun-arc-sun)] opacity-40 blur-[7px]" />
                          <span
                            className="absolute inset-[6px] rounded-full shadow-sm ring-1 ring-[var(--miyuki-sun-arc-day)]"
                            style={{
                              background:
                                "radial-gradient(circle at 38% 34%, color-mix(in oklab, var(--miyuki-sun-arc-sun) 40%, white) 0%, var(--miyuki-sun-arc-sun) 58%, color-mix(in oklab, var(--miyuki-sun-arc-sun) 78%, var(--miyuki-sun-arc-dawn)) 100%)",
                            }}
                          />
                        </span>
                        <span
                          className={cn(
                            "pointer-events-none absolute inset-[3px] rounded-full ring-ring transition-shadow duration-150",
                            isFocusVisible && "ring-[3px]",
                          )}
                        />
                      </>
                    );
                  }}
                </SliderThumb>
              </SliderTrack>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1.5">
            <Sunrise aria-hidden="true" className="size-4" />
            Sunrise <span className="font-medium text-foreground">{toClock(rise)}</span>
          </span>
          <span className="hidden text-center sm:block">{span(set - rise)} of daylight</span>
          <span className="flex items-center gap-1.5">
            Sunset <span className="font-medium text-foreground">{toClock(set)}</span>
            <Sunset aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Slider>
    </div>
  );
}
