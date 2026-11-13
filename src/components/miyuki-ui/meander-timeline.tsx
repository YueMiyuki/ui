"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface MeanderTimelineItem {
  title: ReactNode;
  date: ReactNode;
  content?: ReactNode;
}

export interface MeanderTimelineProps extends Omit<ComponentProps<"div">, "children"> {
  items: MeanderTimelineItem[];
}

interface Bend {
  y: number;
  x: number;
  side: "left" | "right";
  from: [number, number];
  to: [number, number];
}

interface Course {
  width: number;
  height: number;
  narrow: boolean;
  river: string;
  bends: Bend[];
  samples: Float32Array;
}

const BAND = 18;
const NARROW = 640;
const SAMPLES = 240;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f = (v: number) => Math.round(v * 10) / 10;

function cubic(a: number, b: number, c: number, d: number, t: number) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function chart(points: [number, number][]) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  const segs: [number, number, number, number, number, number, number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const k = (y1 - y0) * 0.55;
    d += `C${f(x0)} ${f(y0 + k)} ${f(x1)} ${f(y1 - k)} ${f(x1)} ${f(y1)}`;
    segs.push([x0, y0, x0, y0 + k, x1, y1 - k, x1, y1]);
  }
  const samples = new Float32Array(SAMPLES * 4);
  for (let s = 0; s < SAMPLES; s++) {
    const g = (s / (SAMPLES - 1)) * segs.length;
    const i = Math.min(segs.length - 1, Math.floor(g));
    const t = g - i;
    const [ax, ay, bx, by, cx, cy, dx, dy] = segs[i];
    const x = cubic(ax, bx, cx, dx, t);
    const y = cubic(ay, by, cy, dy, t);
    const u = 1 - t;
    const tx = 3 * u * u * (bx - ax) + 6 * u * t * (cx - bx) + 3 * t * t * (dx - cx);
    const ty = 3 * u * u * (by - ay) + 6 * u * t * (cy - by) + 3 * t * t * (dy - cy);
    samples[s * 4] = x;
    samples[s * 4 + 1] = y;
    samples[s * 4 + 2] = Math.atan2(ty, tx);
  }
  return { d, samples };
}

function along(samples: Float32Array, y: number) {
  const n = samples.length / 4;
  if (y <= samples[1]) return { x: samples[0], y: samples[1], angle: samples[2] };
  for (let i = 1; i < n; i++) {
    const y1 = samples[i * 4 + 1];
    if (y1 < y) continue;
    const y0 = samples[(i - 1) * 4 + 1];
    const t = y1 > y0 ? (y - y0) / (y1 - y0) : 0;
    const a0 = samples[(i - 1) * 4 + 2];
    const a1 = samples[i * 4 + 2];
    return {
      x: samples[(i - 1) * 4] + (samples[i * 4] - samples[(i - 1) * 4]) * t,
      y,
      angle: a0 + (a1 - a0) * t,
    };
  }
  return { x: samples[(n - 1) * 4], y: samples[(n - 1) * 4 + 1], angle: samples[(n - 1) * 4 + 2] };
}

function Leaf() {
  return (
    <svg viewBox="-10 -10 20 20" width="20" height="20" className="block overflow-visible">
      <path
        d="M-8.5 0C-5 -5.2 3 -5.4 8 0C3 5.4 -5 5.2 -8.5 0Z"
        className="fill-[color-mix(in_oklab,var(--chart-4)_88%,var(--success))] stroke-[color-mix(in_oklab,var(--warning-strong)_70%,transparent)]"
        strokeWidth={0.8}
      />
      <path
        d="M-8.5 0L5.5 0M-2.5 0L0.5 -2.6M1.5 0L4 -2M-2.5 0L0.5 2.6M1.5 0L4 2"
        className="stroke-warning-strong/55"
        strokeWidth={0.7}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M-8.5 0L-11 0.8" className="stroke-warning-strong/70" strokeWidth={0.9} strokeLinecap="round" />
    </svg>
  );
}

export function MeanderTimeline({ items, className, ...props }: MeanderTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const front = useRef<SVGLinearGradientElement>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [course, setCourse] = useState<Course | null>(null);
  const [reached, setReached] = useState(-1);
  const level = useRef(0);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const width = root.clientWidth;
    const height = root.clientHeight;
    const narrow = width < NARROW;
    const bends: Bend[] = [];
    const points: [number, number][] = [];
    if (narrow) points.push([22, 0]);
    else points.push([width / 2, 0]);
    cards.current.forEach((card, i) => {
      if (!card) return;
      const top = card.offsetTop;
      const left = card.offsetLeft;
      const right = left + card.offsetWidth;
      const y = top + Math.min(card.offsetHeight / 2, 64);
      if (narrow) {
        const x = 22 + (i % 2 ? -5 : 5);
        points.push([x, y]);
        bends.push({ y, x, side: "right", from: [left - 2, y + 14], to: [x + BAND / 2 - 1, y + 4] });
      } else {
        const side = left < width / 2 - 10 ? "left" : "right";
        const x = side === "left" ? right + 44 : left - 44;
        points.push([x, y]);
        bends.push({
          y,
          x,
          side,
          from: side === "left" ? [right + 2, y - 8] : [left - 2, y - 8],
          to: side === "left" ? [x - BAND / 2 + 1, y + 10] : [x + BAND / 2 - 1, y + 10],
        });
      }
    });
    points.push(narrow ? [22, height] : [width / 2, height]);
    const { d, samples } = chart(points);
    setCourse({ width, height, narrow, river: d, bends, samples });
  }, []);

  useLayoutEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    cards.current.forEach((card) => card && ro.observe(card));
    return () => ro.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !course) return;
    let raf = 0;
    let shown = level.current;
    let sway = 0;
    let last = 0;
    let target = 0;

    const place = (y: number, t: number) => {
      const g = front.current;
      if (g) {
        g.setAttribute("y1", String(f(y - 34)));
        g.setAttribute("y2", String(f(y + 2)));
      }
      const el = leaf.current;
      if (el) {
        const p = along(course.samples, clamp(y, 2, course.height - 40));
        const turn = (p.angle * 180) / Math.PI + (reduce ? 0 : Math.sin(t * 0.9) * 9 + Math.sin(t * 2.3) * 3);
        el.style.transform = `translate(${f(p.x)}px, ${f(p.y)}px) rotate(${f(turn)}deg)`;
        el.style.opacity = y > 4 ? "1" : "0";
      }
      let n = -1;
      course.bends.forEach((b, i) => {
        if (y >= b.y - 4) n = i;
      });
      setReached((prev) => (prev === n ? prev : n));
    };

    const read = () => {
      const rect = root.getBoundingClientRect();
      const view = window.innerHeight;
      const scroller = document.scrollingElement ?? document.documentElement;
      const range = scroller.scrollHeight - view;
      const progress = range > 0 ? clamp(scroller.scrollTop / range, 0, 1) : 1;
      const line = view * (0.45 + 0.55 * progress ** 4);
      target = clamp(line - rect.top, 0, course.height);
    };

    const tick = (now: number) => {
      const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0;
      last = now;
      sway += dt;
      shown = reduce ? target : shown + (target - shown) * (1 - Math.exp(-dt * 7));
      level.current = shown;
      place(shown, sway);
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => read();
    read();
    if (reduce) {
      place(target, 0);
      const still = () => {
        read();
        place(target, 0);
      };
      window.addEventListener("scroll", still, { passive: true });
      window.addEventListener("resize", still);
      return () => {
        window.removeEventListener("scroll", still);
        window.removeEventListener("resize", still);
      };
    }

    let visible = true;
    const run = () => {
      if (raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const halt = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (visible) run();
      else halt();
    });
    io.observe(root);
    const onVisibility = () => (document.hidden ? halt() : run());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    run();
    return () => {
      halt();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [course, reduce]);

  const mask = `miyuki-meander-timeline-${uid}`;

  return (
    <div {...props} ref={rootRef} className={cn("relative isolate", className)}>
      {course ? (
        <svg
          aria-hidden="true"
          width={course.width}
          height={course.height}
          viewBox={`0 0 ${course.width} ${course.height}`}
          className="pointer-events-none absolute inset-0 -z-10 overflow-visible"
          fill="none"
          strokeLinecap="round"
        >
          <defs>
            <linearGradient ref={front} id={`${mask}-front`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask
              id={mask}
              maskUnits="userSpaceOnUse"
              x="-40"
              y="-40"
              width={course.width + 80}
              height={course.height + 80}
            >
              <rect
                x="-40"
                y="-40"
                width={course.width + 80}
                height={course.height + 80}
                fill={`url(#${mask}-front)`}
              />
            </mask>
          </defs>
          <g>
            <path d={course.river} className="stroke-brand/[0.07] dark:stroke-brand/[0.09]" strokeWidth={BAND + 22} />
            <path d={course.river} className="stroke-muted" strokeWidth={BAND + 2} />
            <path
              d={course.river}
              className="stroke-border-strong/70"
              strokeWidth={BAND + 2}
              strokeDasharray="0.5 7"
              opacity={0.6}
            />
            {course.bends.map((b, i) => (
              <path
                key={`bed-${i}`}
                d={`M${f(b.from[0])} ${f(b.from[1])}Q${f((b.from[0] + b.to[0]) / 2)} ${f(b.from[1] + 1)} ${f(b.to[0])} ${f(b.to[1])}`}
                className="stroke-muted"
                strokeWidth={6}
              />
            ))}
            <g mask={`url(#${mask})`}>
              <path d={course.river} className="stroke-brand/55 dark:stroke-brand/45" strokeWidth={BAND} />
              <path d={course.river} className="stroke-brand/70 dark:stroke-brand/60" strokeWidth={BAND - 8} />
              <path
                d={course.river}
                className={cn(
                  "stroke-white/55 dark:stroke-brand-strong/70",
                  !reduce && "animate-[miyuki-meander-timeline-flow_2.6s_linear_infinite]",
                )}
                strokeWidth={1.5}
                strokeDasharray="10 26"
              />
            </g>
          </g>
          {course.bends.map((b, i) => (
            <path
              key={`stream-${i}`}
              d={`M${f(b.from[0])} ${f(b.from[1])}Q${f((b.from[0] + b.to[0]) / 2)} ${f(b.from[1] + 1)} ${f(b.to[0])} ${f(b.to[1])}`}
              pathLength={1}
              className="stroke-brand/65 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:duration-150 dark:stroke-brand/55"
              strokeWidth={3.5}
              strokeDasharray="1 1"
              strokeDashoffset={i <= reached ? 0 : 1}
            />
          ))}
        </svg>
      ) : null}
      <style href="miyuki-meander-timeline" precedence="miyuki">{`
        @keyframes miyuki-meander-timeline-flow { to { stroke-dashoffset: -36; } }
      `}</style>
      <ol className={cn("relative flex flex-col gap-10 py-14", course?.narrow ? "pl-14" : "")}>
        {items.map((item, i) => {
          const narrow = course?.narrow ?? false;
          const left = !narrow && i % 2 === 0;
          return (
            <li
              key={i}
              ref={(el) => {
                cards.current[i] = el;
              }}
              data-reached={i <= reached || undefined}
              className={cn(
                "group/event relative rounded-xl border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow] duration-300",
                "data-[reached]:border-brand/35 data-[reached]:shadow-md",
                narrow ? "w-full" : "w-[38%]",
                !narrow && (left ? "self-start" : "self-end"),
              )}
            >
              <p className="text-[13px] text-muted-foreground tabular-nums transition-colors duration-300 group-data-[reached]/event:text-brand-strong">
                {item.date}
              </p>
              <h3 className="mt-0.5 text-base font-semibold tracking-[-0.01em] text-balance">{item.title}</h3>
              {item.content ? <div className="mt-1.5 text-sm text-muted-foreground">{item.content}</div> : null}
            </li>
          );
        })}
      </ol>
      {course ? (
        <div
          ref={leaf}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 -mt-2.5 -ml-2.5 opacity-0 drop-shadow-[0_1px_1.5px_oklch(0.25_0.05_250/0.35)] transition-opacity duration-300 will-change-transform"
        >
          <Leaf />
        </div>
      ) : null}
    </div>
  );
}
