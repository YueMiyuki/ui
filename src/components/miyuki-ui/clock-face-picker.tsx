"use client";

import { Time } from "@internationalized/date";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import {
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, VisuallyHidden } from "react-aria-components";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { cn } from "@/lib/utils";

const SIZE = 236;
const C = SIZE / 2;
const FACE = 112;
const HOUR_LEN = 54;
const MINUTE_LEN = 88;
const DAY = 1440;
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const HOLD = { type: "spring", stiffness: 1100, damping: 60 } as const;

type Hand = "hour" | "minute";

export interface ClockFacePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  value?: Time;
  defaultValue?: Time;
  onChange?: (value: Time) => void;
  step?: number;
  hourCycle?: 12 | 24;
  label?: ReactNode;
  isDisabled?: boolean;
  ref?: Ref<HTMLDivElement>;
}

function wrap(total: number) {
  return ((total % DAY) + DAY) % DAY;
}

function shortest(a: number, b: number, turn: number) {
  return ((((b - a) % turn) + turn * 1.5) % turn) - turn / 2;
}

function nearestTurn(current: number, target: number) {
  return current + shortest(current, target, 360);
}

export function ClockFacePicker({
  value,
  defaultValue,
  onChange,
  step = 5,
  hourCycle,
  label,
  isDisabled = false,
  className,
  ...props
}: ClockFacePickerProps) {
  const reduce = useReducedMotion() ?? false;
  const { locale } = useLocale();
  const id = useId();
  const svgId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const minuteStep = Math.max(1, Math.min(30, Math.round(step)));
  const [internal, setInternal] = useState(() =>
    defaultValue ? defaultValue.hour * 60 + defaultValue.minute : 9 * 60,
  );
  const total = value ? value.hour * 60 + value.minute : internal;
  const hour = Math.floor(total / 60);
  const minute = total % 60;

  const cycle = useMemo<12 | 24>(() => {
    if (hourCycle) return hourCycle;
    try {
      const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions();
      return resolved.hourCycle === "h23" || resolved.hourCycle === "h24" ? 24 : 12;
    } catch {
      return 12;
    }
  }, [hourCycle, locale]);

  const periods = useMemo(() => {
    try {
      const f = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, timeZone: "UTC" });
      const am = f.formatToParts(new Date(Date.UTC(2020, 0, 1, 9))).find((p) => p.type === "dayPeriod")?.value;
      const pm = f.formatToParts(new Date(Date.UTC(2020, 0, 1, 21))).find((p) => p.type === "dayPeriod")?.value;
      return [am ?? "AM", pm ?? "PM"] as const;
    } catch {
      return ["AM", "PM"] as const;
    }
  }, [locale]);

  const spoken = (t: number) => {
    const h = Math.floor(t / 60);
    const m = t % 60;
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        hourCycle: cycle === 24 ? "h23" : "h12",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(2020, 0, 1, h, m)));
    } catch {
      return `${h}:${String(m).padStart(2, "0")}`;
    }
  };

  const set = (next: number) => {
    const t = wrap(next);
    if (t === total) return;
    if (value === undefined) setInternal(t);
    onChange?.(new Time(Math.floor(t / 60), t % 60));
  };

  const hourAngle = useMotionValue(((hour % 12) + minute / 60) * 30);
  const minuteAngle = useMotionValue(minute * 6);
  const [startAngles] = useState(() => [((hour % 12) + minute / 60) * 30, minute * 6]);
  const hourHand = useRef<SVGGElement>(null);
  const minuteHand = useRef<SVGGElement>(null);

  useEffect(() => {
    const a = hourAngle.on("change", (deg) => hourHand.current?.setAttribute("transform", `rotate(${deg} ${C} ${C})`));
    const b = minuteAngle.on("change", (deg) =>
      minuteHand.current?.setAttribute("transform", `rotate(${deg} ${C} ${C})`),
    );
    return () => {
      a();
      b();
    };
  }, [hourAngle, minuteAngle]);

  const [active, setActive] = useState<Hand | null>(null);
  const [dragging, setDragging] = useState<Hand | null>(null);

  useEffect(() => {
    const h = nearestTurn(hourAngle.get(), ((hour % 12) + minute / 60) * 30);
    const m = nearestTurn(minuteAngle.get(), minute * 6);
    if (reduce) {
      hourAngle.jump(h);
      minuteAngle.jump(m);
    } else {
      animate(hourAngle, h, dragging === "hour" ? HOLD : SETTLE);
      animate(minuteAngle, m, dragging === "minute" ? HOLD : SETTLE);
    }
  }, [hour, minute, reduce, hourAngle, minuteAngle, dragging]);
  const [ring, setRing] = useState(false);
  const pointerFocus = useRef(false);
  const faceRef = useRef<SVGSVGElement>(null);
  const hourInput = useRef<HTMLInputElement>(null);
  const minuteInput = useRef<HTMLInputElement>(null);

  const pointer = (e: ReactPointerEvent) => {
    const rect = faceRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - C;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE - C;
    return { deg: ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360, r: Math.hypot(x, y) };
  };

  const moveHand = (hand: Hand, deg: number, from: number) => {
    const h = Math.floor(from / 60);
    const m = from % 60;
    if (hand === "minute") {
      const target = (Math.round(deg / 6 / minuteStep) * minuteStep) % 60;
      return wrap(from + shortest(m, target, 60));
    }
    let best = 0;
    let gap = Infinity;
    for (let k = 0; k < 12; k++) {
      const d = Math.abs(shortest(deg, (k + m / 60) * 30, 360));
      if (d < gap) {
        gap = d;
        best = k;
      }
    }
    return wrap(from + shortest(h % 12, best, 12) * 60);
  };

  const focusHand = (hand: Hand) => {
    pointerFocus.current = true;
    (hand === "hour" ? hourInput : minuteInput).current?.focus({ preventScroll: true });
    pointerFocus.current = false;
    setRing(false);
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (isDisabled || e.button !== 0) return;
    e.preventDefault();
    const { deg, r } = pointer(e);
    if (r > FACE + 4) return;
    const dh = Math.abs(shortest(deg, ((hour % 12) + minute / 60) * 30, 360));
    const dm = Math.abs(shortest(deg, minute * 6, 360));
    const hand: Hand = r <= HOUR_LEN + 10 && dh < dm ? "hour" : "minute";
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(hand);
    focusHand(hand);
    set(moveHand(hand, deg, total));
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const { deg, r } = pointer(e);
    if (r < 8) return;
    set(moveHand(dragging, deg, total));
  };

  const onPointerUp = () => setDragging(null);

  const onKey = (hand: Hand) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const unit = hand === "hour" ? 60 : minuteStep;
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = total + unit;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = total - unit;
    else if (e.key === "PageUp") next = total + (hand === "hour" ? 180 : 60);
    else if (e.key === "PageDown") next = total - (hand === "hour" ? 180 : 60);
    else if (e.key === "Home") next = hand === "hour" ? minute : hour * 60;
    else if (e.key === "End")
      next = hand === "hour" ? 23 * 60 + minute : hour * 60 + Math.floor(59 / minuteStep) * minuteStep;
    if (next === null) return;
    e.preventDefault();
    setRing(true);
    if (hand === "minute" && (e.key.startsWith("Arrow") || e.key.startsWith("Page"))) {
      next = Math.round(next / minuteStep) * minuteStep;
    }
    set(next);
  };

  const onInput = (hand: Hand) => (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (Number.isNaN(n)) return;
    if (hand === "hour") set(n * 60 + minute);
    else set(hour * 60 + Math.min(59, Math.max(0, n)));
  };

  const focusProps = (hand: Hand) => ({
    onFocus: () => {
      setActive(hand);
      if (!pointerFocus.current) setRing(true);
    },
    onBlur: () => {
      setActive((a) => (a === hand ? null : a));
      setRing(false);
    },
  });

  const lit = dragging ?? active;
  const display = cycle === 12 ? String(hour % 12 || 12) : String(hour).padStart(2, "0");
  const pm = hour >= 12;

  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <div
      {...props}
      role="group"
      aria-labelledby={label != null ? `${id}-label` : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn("flex w-fit flex-col items-center gap-3", isDisabled && "opacity-50", className)}
    >
      <div className="flex w-full flex-col items-center gap-1.5">
        {label != null && (
          <span id={`${id}-label`} className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex items-baseline font-display text-4xl leading-none font-semibold tracking-[-0.03em] text-foreground tabular-nums"
          >
            <span className={cn("transition-colors duration-150 ease-settle", lit === "hour" && "text-brand-strong")}>
              {display}
            </span>
            <span className="px-0.5 text-muted-foreground">:</span>
            <span className={cn("transition-colors duration-150 ease-settle", lit === "minute" && "text-brand-strong")}>
              {String(minute).padStart(2, "0")}
            </span>
          </span>
          <VisuallyHidden>
            <input
              ref={hourInput}
              type="range"
              min={0}
              max={23}
              step={1}
              value={hour}
              disabled={isDisabled}
              aria-label="Hour"
              aria-valuetext={spoken(total)}
              aria-describedby={label != null ? `${id}-label` : undefined}
              onKeyDown={onKey("hour")}
              onChange={onInput("hour")}
              {...focusProps("hour")}
            />
            <input
              ref={minuteInput}
              type="range"
              min={0}
              max={59}
              step={minuteStep}
              value={minute}
              disabled={isDisabled}
              aria-label="Minute"
              aria-valuetext={spoken(total)}
              aria-describedby={label != null ? `${id}-label` : undefined}
              onKeyDown={onKey("minute")}
              onChange={onInput("minute")}
              {...focusProps("minute")}
            />
          </VisuallyHidden>
          {cycle === 12 && (
            <SegmentedControl
              size="sm"
              aria-label="Half of the day"
              isDisabled={isDisabled}
              selectedKeys={[pm ? "pm" : "am"]}
              onSelectionChange={(keys) => {
                const key = [...keys][0];
                if (key === "pm" && !pm) set(total + 720);
                if (key === "am" && pm) set(total - 720);
              }}
            >
              <Segment id="am">{periods[0]}</Segment>
              <Segment id="pm">{periods[1]}</Segment>
            </SegmentedControl>
          )}
        </div>
      </div>
      <div className="relative rounded-full shadow-md" style={{ width: SIZE, height: SIZE }}>
        <svg
          ref={faceRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full touch-none select-none",
            isDisabled ? "cursor-not-allowed" : dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <radialGradient id={`${svgId}-face`} cx="50%" cy="38%" r="70%">
              <stop offset="0.55" style={{ stopColor: "var(--card)" }} />
              <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--brand) 8%, var(--card))" }} />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={FACE} fill={`url(#${svgId}-face)`} strokeWidth={1} className="stroke-border" />
          <circle cx={C} cy={C} r={FACE - 4} fill="none" strokeWidth={1} className="stroke-border" opacity={0.6} />
          {ticks.map((i) => (
            <line
              key={i}
              x1={C}
              x2={C}
              y1={C - FACE + 9}
              y2={C - FACE + (i % 5 === 0 ? 17 : 13)}
              transform={`rotate(${i * 6} ${C} ${C})`}
              strokeWidth={i % 5 === 0 ? 1.6 : 1}
              strokeLinecap="round"
              className={i % 5 === 0 ? "stroke-foreground" : "stroke-muted-foreground"}
              opacity={i % 5 === 0 ? 0.75 : 0.4}
            />
          ))}
          {Array.from({ length: 12 }, (_, i) => {
            const n = i === 0 ? 12 : i;
            const a = (i * 30 * Math.PI) / 180;
            const r = FACE - 32;
            return (
              <text
                key={i}
                x={C + Math.sin(a) * r}
                y={C - Math.cos(a) * r}
                dy="0.35em"
                textAnchor="middle"
                className="fill-muted-foreground text-[13px] font-medium tabular-nums"
              >
                {n}
              </text>
            );
          })}
          <g ref={hourHand} transform={`rotate(${startAngles[0]} ${C} ${C})`}>
            {lit === "hour" && ring && (
              <line
                x1={C}
                x2={C}
                y1={C + 10}
                y2={C - HOUR_LEN}
                strokeWidth={13}
                strokeLinecap="round"
                className="stroke-ring"
              />
            )}
            <line
              x1={C}
              x2={C}
              y1={C + 10}
              y2={C - HOUR_LEN}
              strokeWidth={6.5}
              strokeLinecap="round"
              className={cn("transition-colors duration-150", lit === "hour" ? "stroke-brand" : "stroke-foreground")}
            />
          </g>
          <g ref={minuteHand} transform={`rotate(${startAngles[1]} ${C} ${C})`}>
            {lit === "minute" && ring && (
              <line
                x1={C}
                x2={C}
                y1={C + 14}
                y2={C - MINUTE_LEN}
                strokeWidth={10}
                strokeLinecap="round"
                className="stroke-ring"
              />
            )}
            <line
              x1={C}
              x2={C}
              y1={C + 14}
              y2={C - MINUTE_LEN}
              strokeWidth={3.5}
              strokeLinecap="round"
              className={cn("transition-colors duration-150", lit === "minute" ? "stroke-brand" : "stroke-foreground")}
            />
            <circle
              cx={C}
              cy={C - MINUTE_LEN + 2}
              r={lit === "minute" ? 4 : 0}
              className="fill-brand transition-[r] duration-150"
            />
          </g>
          <circle cx={C} cy={C} r={5.5} strokeWidth={2} className="fill-card stroke-foreground" />
        </svg>
      </div>
    </div>
  );
}
