"use client";

import { animate, type MotionStyle, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  composeRenderProps,
  Label,
  Slider,
  type SliderProps,
  type SliderRenderProps,
  SliderThumb,
  SliderTrack,
  useLocale,
} from "react-aria-components";
import { cn } from "@/lib/utils";

type SliderState = SliderRenderProps["state"];

const SWEEP = 270;
const START = -135;
const SIZE = 248;
const C = SIZE / 2;
const KNOB = 82;
const DETENT = { type: "spring", stiffness: 640, damping: 21, mass: 0.7 } as const;
const FOLLOW = { type: "spring", stiffness: 1400, damping: 52, mass: 0.6 } as const;

export interface DialThermostatProps extends Omit<SliderProps<number>, "children" | "orientation"> {
  label?: ReactNode;
  unit?: string;
  coldColor?: string;
  hotColor?: string;
  size?: number;
  ref?: Ref<HTMLDivElement>;
}

function decimalsOf(step: number) {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

function unitFormat(unit: string, decimals: number): Intl.NumberFormatOptions {
  const digits = { minimumFractionDigits: 0, maximumFractionDigits: decimals };
  if (unit === "°C") return { style: "unit", unit: "celsius", ...digits };
  if (unit === "°F") return { style: "unit", unit: "fahrenheit", ...digits };
  return digits;
}

export function DialThermostat({
  label,
  unit = "°C",
  minValue = 0,
  maxValue = 100,
  step = 1,
  coldColor = "var(--brand)",
  hotColor = "var(--chart-5)",
  size = SIZE,
  formatOptions,
  className,
  style,
  ...props
}: DialThermostatProps) {
  const decimals = decimalsOf(step);
  return (
    <Slider
      {...props}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      formatOptions={formatOptions ?? unitFormat(unit, decimals)}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/dial flex w-fit flex-col items-center gap-3 data-[disabled]:opacity-50",
          "[--miyuki-dial-thermostat-mid:color-mix(in_oklab,var(--muted-foreground)_70%,var(--card))]",
          "dark:[--miyuki-dial-thermostat-mid:color-mix(in_oklab,var(--muted-foreground)_88%,var(--card))]",
          cls,
        ),
      )}
      style={composeRenderProps(
        style,
        (s) =>
          ({
            "--miyuki-dial-thermostat-cold": coldColor,
            "--miyuki-dial-thermostat-hot": hotColor,
            ...s,
          }) as CSSProperties,
      )}
    >
      {({ state, isDisabled }) => (
        <>
          {label != null && <Label className="text-sm font-medium text-foreground">{label}</Label>}
          <Dial
            state={state}
            isDisabled={isDisabled}
            minValue={minValue}
            maxValue={maxValue}
            step={step}
            unit={unit}
            decimals={decimals}
            size={Math.max(160, size)}
          />
        </>
      )}
    </Slider>
  );
}

interface DialProps {
  state: SliderState;
  isDisabled: boolean;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string;
  decimals: number;
  size: number;
}

function Dial({ state, isDisabled, minValue, maxValue, step, unit, decimals, size }: DialProps) {
  const k = size / SIZE;
  const ring = `radial-gradient(farthest-side, transparent calc(100% - ${7 * k}px), #000 calc(100% - ${6.5 * k}px))`;
  const reduce = useReducedMotion() ?? false;
  const { locale } = useLocale();
  const dialRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const range = maxValue - minValue || 1;
  const value = state.values[0];
  const toAngle = (v: number) => START + (Math.min(range, Math.max(0, v - minValue)) / range) * SWEEP;

  const rest = toAngle(value);
  const angle = useMotionValue(rest);
  const drag = useRef<{ id: number; raw: number; last: number } | null>(null);
  const latest = useRef({ state, toAngle, reduce, isDisabled });

  useEffect(() => {
    latest.current = { state, toAngle, reduce, isDisabled };
  });

  useEffect(() => {
    if (drag.current) return;
    const target = rest;
    if (reduce) angle.jump(target);
    else animate(angle, target, DETENT);
  }, [rest, reduce, angle]);

  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;
    let armed = false;
    let timer = 0;
    let acc = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (armed = true), 420);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !armed && (e.movementX || e.movementY)) arm();
    };
    const leave = () => {
      window.clearTimeout(timer);
      armed = false;
      acc = 0;
    };
    const wheel = (e: WheelEvent) => {
      const { state: s, isDisabled: off } = latest.current;
      if (off) return;
      const focused = document.activeElement === inputRef.current;
      if (!focused && !armed) return;
      const unitPx = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 240 : 1;
      const delta = -(Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX) * unitPx;
      const v = s.values[0];
      if (delta > 0 ? v >= s.getThumbMaxValue(0) : v <= s.getThumbMinValue(0)) {
        acc = 0;
        return;
      }
      e.preventDefault();
      if (Math.sign(delta) !== Math.sign(acc)) acc = 0;
      acc += delta;
      let moves = 0;
      while (acc >= 36 && moves < 4) {
        acc -= 36;
        moves++;
        s.setThumbDragging(0, true);
        s.incrementThumb(0);
        s.setThumbDragging(0, false);
      }
      while (acc <= -36 && moves < 4) {
        acc += 36;
        moves++;
        s.setThumbDragging(0, true);
        s.decrementThumb(0);
        s.setThumbDragging(0, false);
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  const pointerAngle = (e: ReactPointerEvent) => {
    const rect = dialRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    return { deg: (Math.atan2(x, -y) * 180) / Math.PI, r: Math.hypot(x, y) * (SIZE / rect.width) };
  };

  const snap = (v: number) =>
    Math.min(maxValue, Math.max(minValue, minValue + Math.round((v - minValue) / step) * step));

  const detent = (raw: number) => {
    const s = snap(raw);
    const d = (raw - s) / step;
    const shaped = s + Math.sign(d) * 0.5 * Math.abs(2 * d) ** 3 * step;
    return toAngle(Math.min(maxValue, Math.max(minValue, shaped)));
  };

  const follow = (raw: number) => {
    if (reduce) angle.jump(toAngle(snap(raw)));
    else animate(angle, detent(raw), FOLLOW);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDisabled || e.button !== 0) return;
    e.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    const { deg, r } = pointerAngle(e);
    let raw = value;
    if (r > KNOB + 4) {
      const clamped = Math.max(START, Math.min(START + SWEEP, deg));
      raw = minValue + ((clamped - START) / SWEEP) * range;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, raw, last: deg };
    state.setThumbDragging(0, true);
    state.setThumbValue(0, snap(raw));
    follow(raw);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const { deg, r } = pointerAngle(e);
    if (r < 14) return;
    let delta = deg - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.last = deg;
    d.raw = Math.min(maxValue, Math.max(minValue, d.raw + (delta / SWEEP) * range));
    const next = snap(d.raw);
    if (next !== state.values[0]) state.setThumbValue(0, next);
    follow(d.raw);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    state.setThumbDragging(0, false);
    const target = toAngle(snap(d.raw));
    if (reduce) angle.jump(target);
    else animate(angle, target, DETENT);
  };

  const fraction = useTransform(angle, (a) => (a - START) / SWEEP);
  const sweep = useTransform(angle, (a) => `${Math.max(0, a - START)}deg`);
  const tint = useTransform(fraction, (raw) => {
    const f = Math.min(1, Math.max(0, raw));
    const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
    return f < 0.5
      ? `color-mix(in oklab, var(--miyuki-dial-thermostat-mid) ${pct(f * 2)}, var(--miyuki-dial-thermostat-cold))`
      : `color-mix(in oklab, var(--miyuki-dial-thermostat-hot) ${pct(f * 2 - 1)}, var(--miyuki-dial-thermostat-mid))`;
  });

  const formatted = useMemo(() => {
    const unitOptions = unitFormat(unit, decimals);
    try {
      return new Intl.NumberFormat(locale, unitOptions).formatToParts(value);
    } catch {
      return [{ type: "integer", value: String(value) }] as Intl.NumberFormatPart[];
    }
  }, [locale, unit, decimals, value]);
  const number = formatted
    .filter((p) => p.type !== "unit" && p.type !== "literal")
    .map((p) => (p.type === "minusSign" ? "−" : p.value))
    .join("");
  const suffix = unit === "°C" || unit === "°F" ? "°" : unit;

  const ticks = useMemo(() => {
    const count = Math.round(range / step);
    const every = count > 48 ? Math.ceil(count / 48) : 1;
    const out: { a: number; major: boolean }[] = [];
    for (let i = 0; i <= count; i += every) {
      const v = minValue + i * step;
      const major = Math.abs(v - Math.round(v)) < 1e-9 && (count <= 24 || Math.round(v) % 5 === 0);
      out.push({ a: START + (i / count) * SWEEP, major });
    }
    return out;
  }, [range, step, minValue]);

  const knurl = useMemo(() => Array.from({ length: 72 }, (_, i) => i * 5), []);

  return (
    <div
      ref={dialRef}
      className={cn(
        "relative touch-none select-none",
        isDisabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
      )}
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 225deg, color-mix(in oklab, var(--muted-foreground) 22%, var(--muted)) 0deg 270deg, transparent 270deg)",
          mask: ring,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={
          {
            "--miyuki-dial-thermostat-sweep": sweep,
            background:
              "conic-gradient(in oklab from 225deg, var(--miyuki-dial-thermostat-cold) 0deg, var(--miyuki-dial-thermostat-mid) 135deg, var(--miyuki-dial-thermostat-hot) 270deg, transparent 270deg)",
            mask: `${ring} intersect, conic-gradient(from 225deg, #000 var(--miyuki-dial-thermostat-sweep), transparent var(--miyuki-dial-thermostat-sweep))`,
          } as MotionStyle
        }
      />
      <div aria-hidden="true" className="absolute inset-0 rotate-[-135deg]">
        <span
          className="absolute top-0 left-1/2 size-[7px] -translate-x-1/2 rounded-full"
          style={{ background: "var(--miyuki-dial-thermostat-cold)" }}
        />
      </div>
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ rotate: angle }}>
        <motion.span
          className="absolute top-0 left-1/2 size-[7px] -translate-x-1/2 rounded-full"
          style={
            {
              "--miyuki-dial-thermostat-tint": tint,
              background: "var(--miyuki-dial-thermostat-tint)",
            } as MotionStyle
          }
        />
      </motion.div>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="pointer-events-none absolute inset-0 size-full"
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={C}
            x2={C}
            y1={C - 103}
            y2={C - (t.major ? 94 : 98)}
            transform={`rotate(${t.a} ${C} ${C})`}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
            className="stroke-muted-foreground"
            opacity={t.major ? 0.7 : 0.35}
          />
        ))}
      </svg>
      <span
        aria-hidden="true"
        className="absolute -translate-x-1/2 text-xs text-muted-foreground tabular-nums"
        style={{ left: (C - 84) * k, top: (C + 94) * k }}
      >
        {state.getFormattedValue(minValue).replace(/-/g, "−")}
      </span>
      <span
        aria-hidden="true"
        className="absolute -translate-x-1/2 text-xs text-muted-foreground tabular-nums"
        style={{ left: (C + 84) * k, top: (C + 94) * k }}
      >
        {state.getFormattedValue(maxValue).replace(/-/g, "−")}
      </span>
      <div
        className={cn(
          "absolute rounded-full transition-[box-shadow] duration-150 ease-settle",
          "shadow-md group-has-[[data-focus-visible]]/dial:ring-[3px] group-has-[[data-focus-visible]]/dial:ring-ring",
        )}
        style={{ left: (C - KNOB) * k, top: (C - KNOB) * k, width: KNOB * 2 * k, height: KNOB * 2 * k }}
      >
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full border border-border bg-card",
            "[--miyuki-dial-thermostat-sheen:color-mix(in_oklab,var(--brand)_7%,transparent)] dark:[--miyuki-dial-thermostat-sheen:color-mix(in_oklab,white_7%,transparent)]",
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, transparent 66%, var(--miyuki-dial-thermostat-sheen) 100%), linear-gradient(to bottom, transparent 45%, color-mix(in oklab, var(--brand) 6%, transparent))",
          }}
        />
        <motion.div aria-hidden="true" className="absolute inset-0" style={{ rotate: angle }}>
          <svg viewBox={`0 0 ${KNOB * 2} ${KNOB * 2}`} className="absolute inset-0 size-full">
            {knurl.map((a) => (
              <line
                key={a}
                x1={KNOB}
                x2={KNOB}
                y1={2.5}
                y2={8}
                transform={`rotate(${a} ${KNOB} ${KNOB})`}
                strokeWidth={1}
                className="stroke-border-strong"
              />
            ))}
            <circle cx={KNOB} cy={KNOB} r={KNOB - 9.5} fill="none" strokeWidth={1} className="stroke-border" />
            <motion.rect
              x={KNOB - 2}
              y={12}
              width={4}
              height={10}
              rx={2}
              style={
                {
                  "--miyuki-dial-thermostat-tint": tint,
                  fill: "var(--miyuki-dial-thermostat-tint)",
                } as MotionStyle
              }
            />
          </svg>
        </motion.div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex items-start font-display font-semibold tracking-[-0.03em] text-foreground tabular-nums">
            <span className="leading-none" style={{ fontSize: 42 * k }}>
              {number}
            </span>
            <span className="ml-0.5 leading-none text-muted-foreground" style={{ fontSize: 18 * k, marginTop: 4 * k }}>
              {suffix}
            </span>
          </span>
        </div>
      </div>
      <SliderTrack className="pointer-events-none absolute top-1/2 left-1/2 size-px overflow-hidden opacity-0">
        <SliderThumb inputRef={inputRef} className="size-px" />
      </SliderTrack>
    </div>
  );
}
