"use client";

import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface PathBloomProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  colors?: string[];
  height?: string;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)", "var(--chart-6)", "var(--chart-4)"];
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const BEFORE = 40;
const AFTER = 12;
const HEAD = 0.07;

type Pt = [number, number];

interface Stream {
  d: string;
  color: string;
  from: number;
  to: number;
  arrive: number;
}

interface Layout {
  w: number;
  h: number;
  cx: number;
  cy: number;
  streams: Stream[];
  arrived: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

function toPath(points: Pt[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function length(points: Pt[], upto = points.length) {
  let total = 0;
  for (let i = 1; i < upto; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

function build(w: number, h: number, headerBottom: number, colors: string[]): Layout {
  const n = colors.length;
  const rng = createRng(`path-bloom:${n}`);
  const narrow = w < 640;
  const top = Math.max(headerBottom + (narrow ? 40 : 56), h * 0.32);
  const bottom = h - Math.max(48, h * 0.09);
  const band = Math.max(80, bottom - top);
  const cx = w * (narrow ? 0.56 : 0.62);
  const cy = clamp(top + band * 0.5, top, h - 120);
  const exitY = cy - Math.min(48, band * 0.18);
  const spacing = n > 1 ? band / (n - 1) : 0;
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));

  const streams = colors.map((color, i) => {
    const startY = n > 1 ? top + spacing * i : cy;
    const offset = (i - (n - 1) / 2) * 1.5;
    const freq = (1.55 + rng.range(0, 0.35)) * clamp(w / 900, 0.62, 1);
    const phase = i * 2.5 + rng.range(-0.35, 0.35);
    const amp = Math.max(20, spacing * (narrow ? 0.75 : 0.95)) * rng.range(0.85, 1.1);
    const points: Pt[] = [];
    for (let s = 0; s <= BEFORE; s++) {
      const t = s / BEFORE;
      const merge = smoothstep(0.04, 1, t);
      const fade = (1 - t) ** 1.15;
      const x = lerp(-24, cx, t);
      const y =
        lerp(startY, cy + offset, merge) +
        amp * fade * Math.sin(Math.PI * 2 * freq * t + phase) * smoothstep(0, 0.12, t);
      points.push([x, y]);
    }
    for (let s = 1; s <= AFTER; s++) {
      const u = s / AFTER;
      points.push([lerp(cx, w + 24, u), lerp(cy, exitY, smoothstep(0, 1, u)) + offset * (1 + u * 0.8)]);
    }
    const k = order[i];
    const from = 0.02 + 0.07 * k;
    const to = from + 0.6;
    const share = length(points, BEFORE + 1) / length(points);
    return { d: toPath(points), color, from, to, arrive: from + ((share - HEAD) / (1 - HEAD)) * (to - from) };
  });

  return { w, h, cx, cy, streams, arrived: Math.max(...streams.map((s) => s.arrive)) };
}

function StreamPath({ stream, progress, twin }: { stream: Stream; progress: MotionValue<number>; twin?: boolean }) {
  const drawn = useTransform(
    progress,
    (p) => HEAD + (1 - HEAD) * clamp((p - stream.from) / (stream.to - stream.from), 0, 1),
  );
  return (
    <motion.path
      d={stream.d}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={twin ? 8 : 2.25}
      style={{
        pathLength: drawn,
        stroke: `color-mix(in oklab, ${stream.color} 84%, var(--miyuki-path-bloom-ink))`,
      }}
    />
  );
}

export function PathBloom({
  title,
  description,
  colors = DEFAULT_COLORS,
  height = "300vh",
  className,
  style,
  children,
  ...props
}: PathBloomProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const paletteKey = palette.join("|");
  const [layout, setLayout] = useState<Layout | null>(null);
  const [arrived, setArrived] = useState(false);
  const [focused, setFocused] = useState(false);
  const shown = arrived || focused;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 240, damping: 40, restDelta: 0.0005 });
  const progress = reduce ? scrollYProgress : smooth;

  useEffect(() => {
    const stage = stageRef.current;
    const header = headerRef.current;
    if (!stage || !header) return;
    const tints = paletteKey.split("|");
    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w === 0 || h === 0) return;
      const bottom = header.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
      setLayout((prev) =>
        prev && prev.w === w && prev.h === h && prev.streams.length === tints.length
          ? prev
          : build(w, h, bottom, tints),
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(header);
    measure();
    return () => ro.disconnect();
  }, [paletteKey]);

  useMotionValueEvent(progress, "change", (p) => {
    if (!layout) return;
    const next = p >= layout.arrived - 0.005;
    setArrived((prev) => (prev === next ? prev : next));
  });

  return (
    <section
      {...props}
      ref={sectionRef}
      className={cn(
        "relative [--miyuki-path-bloom-ink:var(--foreground)] dark:[--miyuki-path-bloom-ink:white]",
        className,
      )}
      style={{ height, ...style } as CSSProperties}
    >
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        <div ref={headerRef} className="relative z-10 max-w-xl px-6 pt-12 sm:px-12 sm:pt-16">
          <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
            {title}
          </h2>
          {description != null ? <p className="mt-4 text-base text-muted-foreground">{description}</p> : null}
        </div>
        {layout ? (
          <>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
              viewBox={`0 0 ${layout.w} ${layout.h}`}
              fill="none"
            >
              <g
                className="stroke-border-strong opacity-70 dark:opacity-80"
                strokeWidth={1}
                strokeDasharray="1 7"
                strokeLinecap="round"
              >
                {layout.streams.map((stream, i) => (
                  <path key={i} d={stream.d} />
                ))}
              </g>
              <g className="opacity-[0.16] mix-blend-multiply blur-[5px] dark:opacity-70 dark:mix-blend-plus-lighter">
                {layout.streams.map((stream, i) => (
                  <StreamPath key={i} stream={stream} progress={progress} twin />
                ))}
              </g>
              <g className="opacity-90 mix-blend-multiply dark:opacity-95 dark:mix-blend-plus-lighter">
                {layout.streams.map((stream, i) => (
                  <StreamPath key={i} stream={stream} progress={progress} />
                ))}
              </g>
            </svg>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{ left: layout.cx, top: layout.cy }}
            >
              <motion.span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--brand)_80%,var(--miyuki-path-bloom-ink))] dark:bg-[color-mix(in_oklab,var(--brand)_45%,white)] dark:shadow-[0_0_16px_4px_color-mix(in_oklab,var(--brand)_60%,transparent)]"
                initial={false}
                animate={{ scale: arrived ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : arrived
                      ? { type: "spring", stiffness: 500, damping: 30 }
                      : { duration: 0.12 }
                }
              />
              <motion.span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand"
                initial={false}
                animate={arrived && !reduce ? { scale: [1, 5], opacity: [0.6, 0] } : { scale: 1, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </>
        ) : null}
        {children != null ? (
          <motion.div
            className="absolute z-10 -translate-x-1/2 pt-7"
            style={layout ? { left: layout.cx, top: layout.cy } : { left: "50%", bottom: 48 }}
            initial={false}
            animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 8 }}
            transition={shown ? (reduce ? { duration: 0.15 } : SETTLE) : { duration: 0.12 }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
            }}
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
