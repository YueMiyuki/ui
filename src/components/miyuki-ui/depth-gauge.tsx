"use client";

import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface DepthGaugeProps extends Omit<ComponentProps<"div">, "children"> {
  max?: number;
  side?: "left" | "right";
  container?: RefObject<HTMLElement | null>;
  unit?: string;
  color?: string;
}

const FOLLOW = { stiffness: 420, damping: 42, mass: 0.6 };
const NICE = [1, 2, 2.5, 5, 10];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function scrollerOf(container?: RefObject<HTMLElement | null>) {
  return container?.current ?? null;
}

function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const n of NICE) if (n * mag >= raw) return n * mag;
  return 10 * mag;
}

function scrollState(scroller: HTMLElement | null) {
  const el = scroller ?? document.scrollingElement ?? document.documentElement;
  const view = scroller ? scroller.clientHeight : window.innerHeight;
  return { el, range: Math.max(0, el.scrollHeight - view) };
}

export function DepthGauge({
  max = 100,
  side = "right",
  container,
  unit = "m",
  color = "var(--brand)",
  className,
  style,
  "aria-label": ariaLabel = "Depth",
  ...props
}: DepthGaugeProps) {
  const reduce = useReducedMotion() ?? false;
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [depth, setDepth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [view, setView] = useState(0);

  const minor = niceStep(max / 18);
  const major = niceStep(minor * 4.5);
  const ticks: number[] = [];
  for (let d = 0; d <= max + 1e-6; d += minor) ticks.push(Math.round(d * 1000) / 1000);
  const left = side === "left";

  const progress = useMotionValue(0);
  const shown = useSpring(progress, FOLLOW);

  const paint = (f: number) => {
    const track = trackRef.current;
    const h = track?.offsetHeight ?? 0;
    const p = clamp(f, 0, 1);
    if (fillRef.current) fillRef.current.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(3)}% 0 round 999px)`;
    if (markerRef.current) markerRef.current.style.transform = `translateY(${(p * h).toFixed(2)}px)`;
    if (readoutRef.current) readoutRef.current.textContent = `${Math.round(p * max)} ${unit}`;
    rootRef.current?.style.setProperty("--miyuki-depth-gauge-mix", `${(p * 100).toFixed(2)}%`);
  };

  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
    paint(reduce ? progress.get() : shown.get());
  });

  useMotionValueEvent(shown, "change", (f) => {
    if (!reduce) paintRef.current(f);
  });
  useMotionValueEvent(progress, "change", (f) => {
    if (reduce) paintRef.current(f);
    setDepth(Math.round(f * max));
  });

  useEffect(() => {
    const scroller = scrollerOf(container);
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const { el, range } = scrollState(scroller);
      progress.set(range > 0 ? clamp(el.scrollTop / range, 0, 1) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    shown.jump(progress.get());
    target.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(() => {
      read();
      if (scroller) setView(scroller.clientHeight);
      paintRef.current(shown.get());
    });
    ro.observe(scroller ?? document.body);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [container, progress, shown]);

  const goTo = (f: number, smooth: boolean) => {
    const scroller = scrollerOf(container);
    const { range } = scrollState(scroller);
    (scroller ?? window).scrollTo({ top: clamp(f, 0, 1) * range, behavior: smooth && !reduce ? "smooth" : "auto" });
  };

  const fractionAt = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0;
    return clamp((clientY - rect.top) / rect.height, 0, 1);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    goTo(fractionAt(event.clientY), true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const f = fractionAt(event.clientY);
    if (event.pointerType === "mouse") setHover(f);
    if (dragging.current && event.buttons & 1) goTo(f, false);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const now = progress.get() * max;
    const keys: Record<string, number> = {
      ArrowDown: now + minor,
      ArrowRight: now + minor,
      ArrowUp: now - minor,
      ArrowLeft: now - minor,
      PageDown: now + major,
      PageUp: now - major,
      Home: 0,
      End: max,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = clamp(keys[event.key], 0, max);
    const snapped = event.key.startsWith("Arrow") ? Math.round(next / minor) * minor : next;
    goTo(snapped / max, true);
  };

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "z-30 flex w-[4.5rem] select-none",
        container ? "sticky top-3" : "fixed inset-y-14",
        container ? (left ? "mr-auto" : "ml-auto") : left ? "left-3" : "right-3",
        left ? "justify-start" : "justify-end",
        className,
      )}
      style={
        {
          ...(container ? { height: Math.max(0, view - 24), marginBottom: -Math.max(0, view - 24) } : null),
          "--miyuki-depth-gauge-water": color,
          "--miyuki-depth-gauge-mix": "0%",
          ...style,
        } as CSSProperties
      }
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={depth}
        aria-valuetext={`${depth} ${unit === "m" ? "metres" : unit}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        className={cn(
          "group/gauge relative h-full w-10 cursor-pointer rounded-lg outline-none",
          "[--miyuki-depth-gauge-surface:color-mix(in_oklab,var(--miyuki-depth-gauge-water)_32%,var(--background))]",
          "[--miyuki-depth-gauge-deep:color-mix(in_oklab,var(--miyuki-depth-gauge-water)_60%,var(--foreground))]",
          "dark:[--miyuki-depth-gauge-surface:color-mix(in_oklab,var(--miyuki-depth-gauge-water)_70%,white)]",
          "dark:[--miyuki-depth-gauge-deep:color-mix(in_oklab,var(--miyuki-depth-gauge-water)_34%,var(--background))]",
          "focus-visible:ring-[3px] focus-visible:ring-ring",
        )}
      >
        <div ref={trackRef} className="absolute inset-y-0 w-0" style={left ? { left: 9 } : { right: 9 }}>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 -left-[3px] w-1.5 rounded-full bg-[linear-gradient(in_oklab_to_bottom,var(--miyuki-depth-gauge-surface),var(--miyuki-depth-gauge-deep))] opacity-30 dark:opacity-25"
          />
          <div
            ref={fillRef}
            aria-hidden="true"
            className="absolute inset-y-0 -left-[3px] w-1.5 rounded-full bg-[linear-gradient(in_oklab_to_bottom,var(--miyuki-depth-gauge-surface),var(--miyuki-depth-gauge-deep))] dark:shadow-[0_0_10px_color-mix(in_oklab,var(--miyuki-depth-gauge-water)_35%,transparent)]"
            style={{ clipPath: "inset(0 0 100% 0 round 999px)" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 -left-[3px] w-1.5 rounded-full ring-1 ring-foreground/10 ring-inset"
          />
          {ticks.map((d) => {
            const isMajor = Math.abs(d / major - Math.round(d / major)) < 1e-6;
            return (
              <span
                key={d}
                aria-hidden="true"
                className={cn("absolute h-px", isMajor ? "w-2 bg-muted-foreground/80" : "w-1 bg-muted-foreground/45")}
                style={{
                  top: `${(d / max) * 100}%`,
                  ...(left ? { left: 6 } : { right: 6 }),
                }}
              />
            );
          })}
          {hover != null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-[7px] h-0.5 w-3.5 -translate-y-1/2 rounded-full bg-foreground/45"
              style={{ top: `${hover * 100}%` }}
            />
          )}
          <div ref={markerRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0">
            <span
              className={cn(
                "absolute top-0 size-3 -translate-y-1/2 rounded-full border-2 border-background bg-[color-mix(in_oklab,var(--miyuki-depth-gauge-surface),var(--miyuki-depth-gauge-deep)_var(--miyuki-depth-gauge-mix))] shadow-sm",
                "-left-1.5",
              )}
            />
            <span
              className={cn(
                "absolute top-0 flex -translate-y-1/2 items-center gap-1.5 rounded-md border border-border bg-popover py-0.5 pr-1.5 pl-1 text-xs leading-4 font-medium whitespace-nowrap text-popover-foreground tabular-nums shadow-sm",
                left ? "left-4" : "right-4",
              )}
            >
              <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--miyuki-depth-gauge-surface),var(--miyuki-depth-gauge-deep)_var(--miyuki-depth-gauge-mix))] ring-1 ring-foreground/10 ring-inset" />
              <span ref={readoutRef}>0 {unit}</span>
            </span>
          </div>
        </div>
        {hover != null && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -translate-y-1/2 text-xs whitespace-nowrap text-muted-foreground tabular-nums",
              left ? "left-6" : "right-6",
            )}
            style={{ top: `${hover * 100}%` }}
          >
            {Math.round(hover * max)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
