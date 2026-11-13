"use client";

import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface RidgeProgressProps extends Omit<ComponentProps<"div">, "children"> {
  seed?: number | string;
  height?: number;
  container?: RefObject<HTMLElement | null>;
  color?: string;
  flagColor?: string;
}

interface Ridge {
  width: number;
  step: number;
  heights: number[];
  summit: number;
}

const STEP = 3;
const SPAN = 4096;
const FLAG_ROOM = 10;
const BASE = 2;
const PAD = 7;
const FOLLOW = { stiffness: 320, damping: 40, mass: 0.6 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function scrollerOf(container?: RefObject<HTMLElement | null>) {
  return container?.current ?? null;
}

function lattice(rng: () => number, scale: number) {
  const count = Math.ceil(SPAN / scale) + 2;
  const knots = Array.from({ length: count }, () => rng() * 2 - 1);
  return (x: number) => {
    const f = (x % SPAN) / scale;
    const i = Math.floor(f);
    const t = f - i;
    const s = t * t * (3 - 2 * t);
    return knots[i] + (knots[i + 1] - knots[i]) * s;
  };
}

function smax(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

function makeRidge(seed: number | string, width: number, far: boolean): Ridge {
  const rng = createRng(seed);
  const at = rng.range(0.74, 0.86);
  const start = rng.range(0.3, 0.42);
  const end = rng.range(0.42, 0.56);
  const fine = lattice(rng, 9);
  const grain = lattice(rng, 23);
  const summitX = width * at;
  const envelope = (u: number) =>
    u <= at ? start + (1 - start) * (u / at) ** 1.4 : 1 - (1 - end) * ((u - at) / (1 - at)) ** 0.75;

  const peaks: { x: number; h: number; left: number; right: number }[] = [];
  const gap = far ? [90, 170] : [58, 120];
  for (let x = -rng.range(0, gap[0]); x < width + gap[1]; x += rng.range(gap[0], gap[1])) {
    if (Math.abs(x - summitX) < gap[0] * 0.7) continue;
    const u = clamp(x / width, 0, 1);
    peaks.push({
      x,
      h: envelope(u) * (far ? rng.range(0.55, 0.85) : rng.range(0.6, 0.9)),
      left: rng.range(0.006, 0.013) * (far ? 0.7 : 1),
      right: rng.range(0.006, 0.013) * (far ? 0.7 : 1),
    });
  }
  if (!far) peaks.push({ x: summitX, h: 1, left: rng.range(0.008, 0.011), right: rng.range(0.009, 0.013) });

  const n = Math.max(2, Math.ceil(width / STEP));
  const step = width / n;
  const heights: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = i * step;
    let h = 0.12;
    for (const p of peaks) {
      const d = x - p.x;
      const cone = p.h - Math.abs(d) * (d < 0 ? p.left : p.right);
      h = smax(h, cone, 0.06);
    }
    h += (far ? 0.012 : 0.022) * fine(x + 300) + 0.02 * grain(x + 900);
    heights.push(h);
  }
  let hi = -Infinity;
  let best = 0;
  heights.forEach((h, i) => {
    if (h > hi) {
      hi = h;
      best = i;
    }
  });
  return {
    width,
    step,
    heights: heights.map((h) => clamp(h / hi, 0, 1) * (far ? 0.92 : 1)),
    summit: best * step,
  };
}

function heightAt(ridge: Ridge, x: number) {
  const f = clamp(x / ridge.step, 0, ridge.heights.length - 1);
  const i = Math.min(ridge.heights.length - 2, Math.floor(f));
  return ridge.heights[i] + (ridge.heights[i + 1] - ridge.heights[i]) * (f - i);
}

function crest(ridge: Ridge, y: (h: number) => number) {
  return ridge.heights
    .map((h, i) => `${i === 0 ? "M" : "L"}${(i * ridge.step).toFixed(1)} ${y(h).toFixed(2)}`)
    .join("");
}

function silhouette(ridge: Ridge, y: (h: number) => number, bottom: number) {
  return `M0 ${bottom}${crest(ridge, y).replace(/^M/, "L")}L${ridge.width} ${bottom}Z`;
}

function pennant(wave: number, time: number) {
  const len = 9;
  const tall = 6;
  const top: string[] = [];
  const bottom: string[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const sway = wave * 2.2 * u * Math.sin(u * 5.4 - time * 15);
    const reach = len * u * (1 - wave * 0.14 * Math.abs(Math.sin(time * 9)));
    top.push(`${reach.toFixed(2)} ${((tall / 2) * u + sway).toFixed(2)}`);
    bottom.unshift(`${reach.toFixed(2)} ${(tall - (tall / 2) * u + sway).toFixed(2)}`);
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

export function RidgeProgress({
  seed = "ridge",
  height = 28,
  container,
  color = "var(--brand)",
  flagColor = "var(--chart-5)",
  className,
  style,
  "aria-label": ariaLabel = "Reading progress",
  ...props
}: RidgeProgressProps) {
  const uid = useId().replace(/[^\w-]/g, "");
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const edgeRef = useRef<SVGLineElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const flagRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(1200);
  const [percent, setPercent] = useState(0);
  const [reached, setReached] = useState(false);

  const H = Math.max(18, height);
  const relief = H - FLAG_ROOM - BASE;
  const toY = (h: number) => H - BASE - h * relief;
  const farY = (h: number) => H - BASE - 1 - h * relief * 0.7;

  const ridge = useMemo(() => makeRidge(seed, width, false), [seed, width]);
  const far = useMemo(() => makeRidge(`${seed}-far`, width, true), [seed, width]);

  const progress = useMotionValue(0);
  const smooth = useSpring(progress, FOLLOW);

  const paint = (p: number) => {
    const x = PAD + p * Math.max(0, ridge.width - PAD * 2);
    const y = toY(heightAt(ridge, x));
    clipRef.current?.setAttribute("width", String(x));
    const edge = edgeRef.current;
    if (edge) {
      edge.setAttribute("x1", String(x));
      edge.setAttribute("x2", String(x));
      edge.setAttribute("y1", String(y + 1.5));
      edge.style.opacity = p > 0.002 ? "" : "0";
    }
    const marker = markerRef.current;
    if (marker) marker.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    return x;
  };

  const climb = (p: number) => {
    const x = paintRef.current(p);
    if (x >= ridge.summit - 0.5) setReached(true);
    else if (x < ridge.summit - 6) setReached(false);
  };

  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
    paint(reduce ? progress.get() : smooth.get());
  });

  useMotionValueEvent(smooth, "change", (p) => {
    if (!reduce) climb(p);
  });
  useMotionValueEvent(progress, "change", (p) => {
    if (reduce) climb(p);
    setPercent(Math.round(p * 100));
  });

  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollerOf(container);
    const scrollTarget: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = scroller ?? document.scrollingElement ?? document.documentElement;
      const view = scroller ? scroller.clientHeight : window.innerHeight;
      const range = el.scrollHeight - view;
      progress.set(range > 0 ? clamp(el.scrollTop / range, 0, 1) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const resize = () => {
      if (root && root.offsetWidth > 0) setWidth(root.offsetWidth);
      read();
      smooth.jump(progress.get());
    };
    resize();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(resize);
    if (root) ro.observe(root);
    ro.observe(scroller ?? document.body);
    return () => {
      cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [container, progress, smooth]);

  useEffect(() => {
    const path = flagRef.current;
    if (!path) return;
    path.setAttribute("d", pennant(0, 0));
    if (!reached || reduce) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.max(0, (now - start) / 1000);
      const wave = t < 1.6 ? Math.exp(-t * 2.4) * Math.min(1, t * 8) : 0;
      path.setAttribute("d", pennant(wave, t));
      if (t < 1.6) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reached, reduce]);

  const summitY = toY(heightAt(ridge, ridge.summit));

  return (
    <div
      {...props}
      ref={rootRef}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("pointer-events-none", container ? "sticky top-0 z-10" : "fixed inset-x-0 top-0 z-40", className)}
      style={
        {
          height: H,
          "--miyuki-ridge-progress-water": color,
          "--miyuki-ridge-progress-flag": flagColor,
          ...style,
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${ridge.width} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <defs>
          <clipPath id={`${uid}-read`}>
            <rect ref={clipRef} x="0" y="-20" width="0" height={H + 40} />
          </clipPath>
          <linearGradient id={`${uid}-water`} x1="0" y1={FLAG_ROOM} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop
              offset="0"
              style={{ stopColor: "color-mix(in oklab, var(--miyuki-ridge-progress-water) 72%, white)" }}
            />
            <stop offset="1" style={{ stopColor: "var(--miyuki-ridge-progress-water)" }} />
          </linearGradient>
        </defs>
        <path
          d={silhouette(far, farY, H)}
          className="fill-[color-mix(in_oklab,var(--foreground)_6%,var(--background))] dark:fill-[color-mix(in_oklab,var(--foreground)_8%,var(--background))]"
        />
        <path
          d={silhouette(ridge, toY, H)}
          className="fill-[color-mix(in_oklab,var(--foreground)_14%,var(--background))] dark:fill-[color-mix(in_oklab,var(--foreground)_17%,var(--background))]"
        />
        <path
          d={crest(ridge, toY)}
          fill="none"
          strokeWidth={1}
          strokeLinejoin="round"
          className="stroke-[color-mix(in_oklab,var(--foreground)_32%,var(--background))]"
        />
        <g clipPath={`url(#${uid}-read)`}>
          <path d={silhouette(far, farY, H)} className="fill-(--miyuki-ridge-progress-water) opacity-[0.16]" />
          <path d={silhouette(ridge, toY, H)} fill={`url(#${uid}-water)`} />
          <path
            d={crest(ridge, toY)}
            fill="none"
            strokeWidth={1.25}
            strokeLinejoin="round"
            className="stroke-[color-mix(in_oklab,var(--miyuki-ridge-progress-water)_40%,white)] dark:stroke-[color-mix(in_oklab,var(--miyuki-ridge-progress-water)_50%,white)]"
          />
        </g>
        <line
          ref={edgeRef}
          x1="0"
          x2="0"
          y1={H}
          y2={H}
          strokeWidth={1.5}
          className="stroke-[color-mix(in_oklab,var(--miyuki-ridge-progress-water)_40%,white)]"
        />
      </svg>
      <svg
        aria-hidden="true"
        width={12}
        height={FLAG_ROOM}
        viewBox={`0 0 12 ${FLAG_ROOM}`}
        className="absolute left-0 overflow-visible"
        style={{ transform: `translateX(${ridge.summit - 0.5}px)`, top: summitY - FLAG_ROOM + 0.5 }}
      >
        <line x1="0.5" y1="0.5" x2="0.5" y2={FLAG_ROOM} strokeWidth={1} className="stroke-foreground/70" />
        <path
          ref={flagRef}
          transform="translate(1 0.5)"
          className={cn(
            "transition-[fill] duration-300",
            reached
              ? "fill-(--miyuki-ridge-progress-flag)"
              : "fill-[color-mix(in_oklab,var(--foreground)_34%,var(--background))]",
          )}
        />
      </svg>
      <span ref={markerRef} aria-hidden="true" className="absolute top-0 left-0 block size-0">
        <span className="absolute -top-[4.5px] -left-[4.5px] size-[9px] rounded-full border-2 border-foreground bg-background shadow-xs" />
      </span>
    </div>
  );
}
