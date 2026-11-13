"use client";

import { motion, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  composeRenderProps,
  Label,
  Slider,
  SliderOutput,
  type SliderProps,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type ThermometerSliderOrientation = "vertical" | "horizontal";

export interface ThermometerSliderProps extends Omit<SliderProps<number>, "children" | "orientation"> {
  label?: ReactNode;
  unit?: string;
  orientation?: ThermometerSliderOrientation;
  length?: number;
  coldColor?: string;
  warmColor?: string;
  ref?: Ref<HTMLDivElement>;
}

const TUBE = 9;
const BORE = 3.5;
const CAP = 12;
const NECK = 12;
const BULB = 16;
const HIT = 36;
const FILLET = 3;
const LIQUID = { stiffness: 280, damping: 22, mass: 1 };

const minus = (text: string) => text.replace(/-/g, "−");

function decimalsOf(step: number) {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

function niceStep(range: number, slots: number) {
  for (const base of [1, 2, 2.5, 5]) {
    for (let exp = -2; exp <= 4; exp++) {
      const step = base * 10 ** exp;
      if (range / step <= slots) return step;
    }
  }
  return range;
}

function scale(min: number, max: number, length: number) {
  const range = max - min || 1;
  const major = niceStep(range, Math.max(2, Math.floor(length / 34)));
  const px = (length / range) * major;
  const minor = px / 5 >= 5 ? major / 5 : px / 2 >= 5 ? major / 2 : major;
  const ticks: { value: number; major: boolean }[] = [];
  const first = Math.ceil(min / minor - 1e-9) * minor;
  for (let v = first; v <= max + 1e-9; v += minor) {
    const value = Math.round(v * 1e6) / 1e6;
    ticks.push({ value, major: Math.abs(value / major - Math.round(value / major)) < 1e-6 });
  }
  return ticks;
}

function glassPath(length: number) {
  const cy = length + NECK + BULB;
  const join = cy - Math.sqrt(BULB * BULB - TUBE * TUBE);
  const fx = TUBE + FILLET;
  const fy = cy - Math.sqrt(BULB * BULB - fx * fx);
  const top = -CAP;
  return (
    `M ${-TUBE} ${top + TUBE} A ${TUBE} ${TUBE} 0 0 1 ${TUBE} ${top + TUBE} V ${join - 5} ` +
    `Q ${TUBE} ${join} ${fx} ${fy} A ${BULB} ${BULB} 0 1 1 ${-fx} ${fy} Q ${-TUBE} ${join} ${-TUBE} ${join - 5} Z`
  );
}

function unitFormat(unit: string, decimals: number): Intl.NumberFormatOptions {
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  if (unit === "°C") return { style: "unit", unit: "celsius", ...digits };
  if (unit === "°F") return { style: "unit", unit: "fahrenheit", ...digits };
  return digits;
}

export function ThermometerSlider({
  label,
  unit = "°C",
  orientation = "vertical",
  length,
  minValue = -30,
  maxValue = 40,
  step = 1,
  coldColor = "var(--brand)",
  warmColor = "var(--chart-5)",
  formatOptions,
  className,
  style,
  ...props
}: ThermometerSliderProps) {
  const vertical = orientation === "vertical";
  const decimals = decimalsOf(step);

  return (
    <Slider
      {...props}
      orientation={orientation}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      formatOptions={formatOptions ?? unitFormat(unit, decimals)}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/thermometer flex flex-col gap-2 data-[disabled]:opacity-50",
          "[--miyuki-thermometer-slider-mid:color-mix(in_oklab,var(--muted-foreground)_78%,var(--card))]",
          "[--miyuki-thermometer-slider-glint:rgb(255_255_255/0.9)] dark:[--miyuki-thermometer-slider-glint:rgb(255_255_255/0.2)]",
          "dark:[--miyuki-thermometer-slider-mid:color-mix(in_oklab,var(--muted-foreground)_92%,var(--card))]",
          vertical ? "w-fit" : "w-full",
          cls,
        ),
      )}
      style={composeRenderProps(
        style,
        (s) =>
          ({
            "--miyuki-thermometer-slider-cold": coldColor,
            "--miyuki-thermometer-slider-warm": warmColor,
            ...s,
          }) as CSSProperties,
      )}
    >
      {label != null && <Label className="text-sm font-medium text-foreground">{label}</Label>}
      <div
        className="relative"
        style={
          vertical
            ? { paddingTop: CAP + 4, paddingBottom: NECK + BULB * 2 + 4, paddingLeft: 30, paddingRight: 76 }
            : { paddingLeft: NECK + BULB * 2 + 4, paddingRight: CAP + 14, paddingTop: 22, paddingBottom: 20 }
        }
      >
        <Instrument
          vertical={vertical}
          length={length}
          minValue={minValue}
          maxValue={maxValue}
          format={(v) => `${minus(v.toFixed(decimals))} ${unit}`.trim()}
        />
      </div>
    </Slider>
  );
}

interface InstrumentProps {
  vertical: boolean;
  length?: number;
  minValue: number;
  maxValue: number;
  format: (value: number) => string;
}

function Instrument({ vertical, length, minValue, maxValue, format }: InstrumentProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(length ?? (vertical ? 200 : 260));
  const L = vertical ? (length ?? 200) : (length ?? measured);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (vertical || length != null || !el || typeof ResizeObserver === "undefined") return;
    setMeasured(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setMeasured(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [vertical, length]);

  return (
    <SliderTrack
      ref={trackRef}
      className={cn("relative touch-none", vertical ? "w-9" : "h-9 w-full min-w-40")}
      style={vertical ? { height: L } : undefined}
    >
      {({ state }) => (
        <Column
          vertical={vertical}
          L={L}
          value={state.values[0]}
          minValue={minValue}
          maxValue={maxValue}
          format={format}
        />
      )}
    </SliderTrack>
  );
}

interface ColumnProps {
  vertical: boolean;
  L: number;
  value: number;
  minValue: number;
  maxValue: number;
  format: (value: number) => string;
}

function Column({ vertical, L, value, minValue, maxValue, format }: ColumnProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reduce = useReducedMotion();
  const range = maxValue - minValue || 1;
  const fraction = Math.min(1, Math.max(0, (value - minValue) / range));
  const spring = useSpring(fraction, LIQUID);
  const velocity = useVelocity(spring);

  useEffect(() => {
    if (reduce) spring.jump(fraction);
    else spring.set(fraction);
  }, [fraction, reduce, spring]);

  const cy = L + NECK + BULB;
  const ceiling = -CAP + BORE + 2;
  const level = (f: number) => Math.max(ceiling, (1 - f) * L);

  const liquid = useTransform([spring, velocity], ([f, v]: number[]) => {
    const top = level(f);
    const lift = Math.max(-2.6, Math.min(2.6, (v * L) / 420));
    const dip = 1.1 - lift;
    return `M ${-BORE} ${top} Q 0 ${top + dip * 2} ${BORE} ${top} V ${cy} H ${-BORE} Z`;
  });
  const rim = useTransform([spring, velocity], ([f, v]: number[]) => {
    const top = level(f);
    const lift = Math.max(-2.6, Math.min(2.6, (v * L) / 420));
    const dip = 1.1 - lift;
    return `M ${-BORE + 0.6} ${top + 0.5} Q 0 ${top + dip * 2 + 0.5} ${BORE - 0.6} ${top + 0.5}`;
  });
  const along = useTransform(spring, (f) => (vertical ? level(f) : L - level(f)));

  const ticks = scale(minValue, maxValue, L);
  const placeTick = (v: number) => ((v - minValue) / range) * L;
  const mid = HIT / 2;
  const frame = vertical ? `translate(${mid} 0)` : `matrix(0 -1 -1 0 ${L} ${mid})`;
  const shine = vertical ? -1 : 1;

  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient
            id={`${id}-sheen`}
            gradientUnits="userSpaceOnUse"
            x1={BORE * shine}
            x2={-BORE * shine}
            y1="0"
            y2="0"
          >
            <stop offset="0" stopColor="white" stopOpacity="0.1" />
            <stop offset="0.28" stopColor="white" stopOpacity="0.42" />
            <stop offset="0.6" stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity="0.16" />
          </linearGradient>
          <radialGradient
            id={`${id}-bulb`}
            cx={vertical ? 0.34 : 0.66}
            cy={vertical ? 0.32 : 0.68}
            fx={vertical ? 0.34 : 0.66}
            fy={vertical ? 0.32 : 0.68}
            r="0.8"
          >
            <stop offset="0" stopColor="white" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="white" stopOpacity="0.08" />
            <stop offset="1" stopColor="black" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id={`${id}-liquid`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={L} y2={0}>
            {[0, 0.25, 0.5, 0.75, 1].map((offset) => (
              <stop
                key={offset}
                offset={offset}
                style={{
                  stopColor:
                    offset === 0.5
                      ? "var(--miyuki-thermometer-slider-mid)"
                      : `color-mix(in oklab, var(--miyuki-thermometer-slider-${offset < 0.5 ? "cold" : "warm"}) ${Math.abs(offset - 0.5) * 200}%, var(--miyuki-thermometer-slider-mid))`,
                }}
              />
            ))}
          </linearGradient>
          <linearGradient id={`${id}-glass`} gradientUnits="userSpaceOnUse" x1={-TUBE} x2={TUBE} y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--brand) 10%, var(--card))" }} />
            <stop offset="0.45" style={{ stopColor: "var(--card)" }} />
            <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--brand) 14%, var(--card))" }} />
          </linearGradient>
        </defs>
        <g transform={frame}>
          <path
            d={glassPath(L)}
            fill="none"
            strokeWidth={6}
            className="stroke-ring opacity-0 transition-opacity duration-150 ease-settle group-has-[[data-focus-visible]]/thermometer:opacity-100"
          />
          <path
            d={glassPath(L)}
            fill={`url(#${id}-glass)`}
            strokeWidth={1}
            style={{ stroke: "color-mix(in oklab, var(--border-strong) 70%, var(--muted-foreground))" }}
          />
          <rect
            x={-BORE}
            y={-CAP + 4}
            width={BORE * 2}
            height={cy - (-CAP + 4)}
            rx={BORE}
            style={{ fill: "color-mix(in oklab, var(--border) 70%, var(--card))" }}
          />
          {ticks.map((t) => {
            const y = L - placeTick(t.value);
            return (
              <line
                key={t.value}
                x1={-TUBE - 3}
                x2={-TUBE - (t.major ? 10 : 6)}
                y1={y}
                y2={y}
                strokeWidth={1}
                strokeLinecap="round"
                className="stroke-muted-foreground"
                opacity={t.major ? 0.85 : 0.4}
              />
            );
          })}
          <circle cx={0} cy={cy} r={BULB - 3.5} style={{ fill: "var(--miyuki-thermometer-slider-cold)" }} />
          <motion.path d={liquid} fill={`url(#${id}-liquid)`} />
          <motion.path d={liquid} fill={`url(#${id}-sheen)`} />
          <motion.path
            d={rim}
            fill="none"
            stroke="white"
            strokeOpacity={0.55}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
          <circle cx={0} cy={cy} r={BULB - 3.5} fill={`url(#${id}-bulb)`} />
          <rect
            x={shine * (TUBE - 3.4) - 0.9}
            y={-CAP + 5}
            width={1.8}
            height={L + CAP + NECK - 4}
            rx={0.9}
            style={{ fill: "var(--miyuki-thermometer-slider-glint)" }}
          />
          <path
            d={
              vertical
                ? `M -10.5 ${cy - 5} A 11.6 11.6 0 0 1 -4 ${cy - 10.6}`
                : `M 5 ${cy + 10.5} A 11.6 11.6 0 0 0 10.6 ${cy + 4}`
            }
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            style={{ stroke: "var(--miyuki-thermometer-slider-glint)" }}
          />
        </g>
        <g className="fill-muted-foreground" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
          {ticks
            .filter((t) => t.major)
            .map((t) => {
              const s = placeTick(t.value);
              return vertical ? (
                <text key={t.value} x={mid - TUBE - 14} y={L - s} dy="0.34em" textAnchor="end">
                  {minus(String(t.value))}
                </text>
              ) : (
                <text key={t.value} x={s} y={mid + TUBE + 21} textAnchor="middle">
                  {minus(String(t.value))}
                </text>
              );
            })}
        </g>
      </svg>
      <motion.div
        className="pointer-events-none absolute top-0 left-0"
        style={vertical ? { y: along, x: mid + TUBE + 4 } : { x: along, y: mid - TUBE - 6 }}
      >
        <div
          className={cn(
            "flex items-center",
            vertical ? "-translate-y-1/2 gap-1.5" : "-translate-x-1/2 -translate-y-full flex-col-reverse gap-0.5",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("shrink-0 rounded-full bg-border-strong", vertical ? "h-px w-2.5" : "h-1.5 w-px")}
          />
          <SliderOutput className="text-sm font-semibold whitespace-nowrap text-foreground tabular-nums">
            {({ state }) => format(state.values[0])}
          </SliderOutput>
        </div>
      </motion.div>
      <SliderThumb
        className={cn(
          "cursor-grab rounded-full outline-none data-[dragging]:cursor-grabbing",
          vertical ? "left-1/2 h-6 w-9" : "top-1/2 h-9 w-6",
        )}
      />
    </>
  );
}
