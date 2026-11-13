"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SteppingStone {
  id: string;
  label: ReactNode;
}

export interface SteppingStonesProps extends Omit<ComponentProps<"nav">, "children"> {
  steps: SteppingStone[];
  current: number;
  onStepChange?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
}

interface Geometry {
  width: number;
  height: number;
  points: [number, number][];
}

interface Hop {
  key: number;
  path: [number, number][];
}

const STRIP = 58;
const HOP_MS = 120;

const keyframes = `
@keyframes miyuki-stepping-stones-ring { 0% { transform: scale(0.62); opacity: 0; } 12% { opacity: 1; } 100% { transform: scale(2.1); opacity: 0; } }
@keyframes miyuki-stepping-stones-splash { 0% { transform: scale(0.25); opacity: 0.95; } 100% { transform: scale(1.7); opacity: 0; } }
@keyframes miyuki-stepping-stones-drift { from { transform: translate(-10px, 0); } to { transform: translate(10px, 0); } }
`;

function pebble(seed: string) {
  const rng = createRng(seed);
  const rx = rng.range(19, 22.5);
  const ry = rx * rng.range(0.66, 0.74);
  const a = rng.range(0, Math.PI * 2);
  const b = rng.range(0, Math.PI * 2);
  const c = rng.range(0, Math.PI * 2);
  const tilt = rng.range(-0.18, 0.18);
  const pts: string[] = [];
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const r = 1 + 0.055 * Math.sin(2 * t + a) + 0.04 * Math.sin(3 * t + b) + 0.018 * Math.sin(5 * t + c);
    const x = rx * r * Math.cos(t);
    const y = ry * r * Math.sin(t);
    pts.push(
      `${(x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(2)} ${(x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(2)}`,
    );
  }
  const specks = Array.from({ length: 7 }, () => ({
    x: rng.range(-rx * 0.6, rx * 0.6),
    y: rng.range(-ry * 0.5, ry * 0.5),
    r: rng.range(0.45, 0.95),
  }));
  return { d: `M${pts.join("L")}Z`, rx, ry, specks };
}

function Stone({ seed, state }: { seed: string; state: "done" | "current" | "ahead" }) {
  const shape = pebble(seed);
  const gid = useId().replace(/[^\w-]/g, "");
  const top =
    state === "done"
      ? "var(--miyuki-stepping-stones-wet)"
      : state === "current"
        ? "var(--miyuki-stepping-stones-damp)"
        : "var(--miyuki-stepping-stones-dry)";
  const side =
    state === "done"
      ? "var(--miyuki-stepping-stones-wet-side)"
      : state === "current"
        ? "var(--miyuki-stepping-stones-damp-side)"
        : "var(--miyuki-stepping-stones-dry-side)";
  return (
    <svg aria-hidden="true" viewBox="-28 -22 56 46" width={56} height={46} className="overflow-visible">
      <ellipse
        cx="0"
        cy="4"
        rx={shape.rx + 4}
        ry={shape.ry + 3}
        className="fill-[color-mix(in_oklab,var(--miyuki-stepping-stones-water-deep)_80%,transparent)] blur-[2.5px]"
      />
      <path
        d={shape.d}
        transform="translate(0 3.2)"
        style={{ fill: side }}
        className="transition-[fill] duration-500"
      />
      <defs>
        <radialGradient id={gid} cx="0.34" cy="0.28" r="0.85">
          <stop
            offset="0"
            style={{ stopColor: `color-mix(in oklab, ${top} 72%, white)` }}
            className="transition-[stop-color] duration-500"
          />
          <stop offset="0.7" style={{ stopColor: top }} className="transition-[stop-color] duration-500" />
        </radialGradient>
      </defs>
      <path d={shape.d} style={{ fill: top }} className="transition-[fill] duration-500" />
      <path d={shape.d} fill={`url(#${gid})`} className={state === "done" ? "opacity-60" : "opacity-100"} />
      {state === "ahead" &&
        shape.specks.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} className="fill-foreground/10" />)}
      {state !== "ahead" && (
        <g className={cn("transition-opacity duration-500", state === "done" ? "opacity-100" : "opacity-60")}>
          <ellipse
            cx={-shape.rx * 0.32}
            cy={-shape.ry * 0.42}
            rx={shape.rx * 0.42}
            ry={shape.ry * 0.2}
            transform={`rotate(-12 ${-shape.rx * 0.32} ${-shape.ry * 0.42})`}
            className="fill-white/35 blur-[0.6px] dark:fill-white/20"
          />
          <circle cx={shape.rx * 0.38} cy={shape.ry * 0.12} r={1.1} className="fill-white/45 dark:fill-white/25" />
          <circle cx={shape.rx * 0.18} cy={shape.ry * 0.42} r={0.8} className="fill-white/35 dark:fill-white/20" />
        </g>
      )}
      <path
        d={shape.d}
        fill="none"
        strokeWidth={state === "current" ? 1.8 : 0.8}
        className={cn(
          "transition-[stroke] duration-300",
          state === "current" ? "stroke-brand" : "stroke-[color-mix(in_oklab,var(--foreground)_14%,transparent)]",
        )}
      />
    </svg>
  );
}

export function SteppingStones({
  steps,
  current,
  onStepChange,
  orientation = "horizontal",
  className,
  style,
  "aria-label": ariaLabel = "Progress",
  ...props
}: SteppingStonesProps) {
  const vertical = orientation === "vertical";
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^\w-]/g, "");
  const listRef = useRef<HTMLOListElement>(null);
  const stoneRefs = useRef<(HTMLElement | null)[]>([]);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [hops, setHops] = useState<Hop[]>([]);
  const previous = useRef(current);
  const hopKey = useRef(0);
  const timers = useRef(new Set<number>());
  const index = Math.max(0, Math.min(steps.length - 1, current));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const points = stoneRefs.current
        .slice(0, steps.length)
        .map((el): [number, number] =>
          el ? [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2] : [0, 0],
        );
      setGeo((prev) => {
        const next = { width: list.offsetWidth, height: list.offsetHeight, points };
        if (
          prev &&
          prev.width === next.width &&
          prev.height === next.height &&
          prev.points.every((p, i) => p[0] === points[i]?.[0] && p[1] === points[i]?.[1]) &&
          prev.points.length === points.length
        )
          return prev;
        return next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [steps.length, vertical]);

  useEffect(() => {
    const from = previous.current;
    previous.current = index;
    if (from === index || reduce || !geo) return;
    const dir = index > from ? 1 : -1;
    const path: [number, number][] = [];
    for (let i = from; i !== index; i += dir) {
      const [ax, ay] = geo.points[i];
      const [bx, by] = geo.points[i + dir];
      const gapX = bx - ax;
      const gapY = by - ay;
      const len = Math.hypot(gapX, gapY) || 1;
      const reach = Math.min(0.5, 24 / len);
      for (const t of [reach, 0.5, 1 - reach]) path.push([ax + gapX * t, ay + gapY * t]);
    }
    const key = ++hopKey.current;
    const pending = timers.current;
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        pending.delete(id);
        fn();
      }, ms);
      pending.add(id);
    };
    later(() => setHops((h) => [...h, { key, path }]), 0);
    later(() => setHops((h) => h.filter((hop) => hop.key !== key)), path.length * HOP_MS + 900);
  }, [index, reduce, geo]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
    };
  }, []);

  const strip = geo && geo.points.length > 0 ? stripRect(geo, vertical) : null;
  const here = geo?.points[index];

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={cn("relative", vertical ? "inline-flex" : "w-full", className)}
      style={
        {
          ...style,
        } as CSSProperties
      }
    >
      <style href="miyuki-stepping-stones" precedence="miyuki">
        {keyframes}
      </style>
      <ol
        ref={listRef}
        className={cn(
          "relative isolate",
          "[--miyuki-stepping-stones-water:color-mix(in_oklab,var(--brand)_17%,var(--background))]",
          "[--miyuki-stepping-stones-water-deep:color-mix(in_oklab,var(--brand)_34%,var(--background))]",
          "[--miyuki-stepping-stones-dry:color-mix(in_oklab,var(--foreground)_9%,var(--card))]",
          "[--miyuki-stepping-stones-dry-side:color-mix(in_oklab,var(--foreground)_26%,var(--card))]",
          "[--miyuki-stepping-stones-damp:color-mix(in_oklab,var(--foreground)_30%,var(--card))]",
          "[--miyuki-stepping-stones-damp-side:color-mix(in_oklab,var(--foreground)_52%,var(--card))]",
          "[--miyuki-stepping-stones-wet:color-mix(in_oklab,var(--foreground)_74%,var(--card))]",
          "[--miyuki-stepping-stones-wet-side:var(--foreground)]",
          "dark:[--miyuki-stepping-stones-water:color-mix(in_oklab,var(--brand)_20%,var(--background))]",
          "dark:[--miyuki-stepping-stones-water-deep:color-mix(in_oklab,var(--brand)_8%,var(--background))]",
          "dark:[--miyuki-stepping-stones-dry:color-mix(in_oklab,var(--foreground)_62%,var(--background))]",
          "dark:[--miyuki-stepping-stones-dry-side:color-mix(in_oklab,var(--foreground)_40%,var(--background))]",
          "dark:[--miyuki-stepping-stones-damp:color-mix(in_oklab,var(--foreground)_40%,var(--background))]",
          "dark:[--miyuki-stepping-stones-damp-side:color-mix(in_oklab,var(--foreground)_24%,var(--background))]",
          "dark:[--miyuki-stepping-stones-wet:color-mix(in_oklab,var(--foreground)_17%,var(--background))]",
          "dark:[--miyuki-stepping-stones-wet-side:color-mix(in_oklab,var(--foreground)_6%,var(--background))]",
          vertical ? "flex flex-col gap-3" : "grid",
        )}
        style={vertical ? undefined : { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {geo && strip && (
          <svg
            aria-hidden="true"
            width={geo.width}
            height={geo.height}
            className="pointer-events-none absolute top-0 left-0 -z-10 overflow-visible"
          >
            <defs>
              <clipPath id={`${uid}-water`}>
                <rect {...strip} />
              </clipPath>
              <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2={vertical ? "1" : "0"} y2={vertical ? "0" : "1"}>
                <stop offset="0" style={{ stopColor: "var(--miyuki-stepping-stones-water-deep)" }} />
                <stop offset="0.45" style={{ stopColor: "var(--miyuki-stepping-stones-water)" }} />
                <stop offset="1" style={{ stopColor: "var(--miyuki-stepping-stones-water)" }} />
              </linearGradient>
            </defs>
            <rect {...strip} fill={`url(#${uid}-sheen)`} />
            <g clipPath={`url(#${uid}-water)`}>
              <Wavelets strip={strip} vertical={vertical} still={reduce} seed={uid} />
              {here && (
                <g transform={`translate(${here[0]} ${here[1]})`}>
                  {(reduce ? [0.9, 1.35] : [0, 1, 2]).map((n, i) => (
                    <g
                      key={i}
                      className="origin-center [transform-box:fill-box]"
                      style={
                        reduce
                          ? { transform: `scale(${n})`, opacity: 0.6 - i * 0.2 }
                          : {
                              animation: `miyuki-stepping-stones-ring 2.7s cubic-bezier(0.2,0.6,0.35,1) ${n * 0.9}s infinite both`,
                            }
                      }
                    >
                      <Ripple rx={26} ry={vertical ? 21 : 15} />
                    </g>
                  ))}
                </g>
              )}
              {hops.map((hop) => (
                <g key={hop.key}>
                  {hop.path.map(([x, y], i) => (
                    <g key={i} transform={`translate(${x} ${y})`}>
                      <g
                        className="origin-center [transform-box:fill-box]"
                        style={{
                          animation: `miyuki-stepping-stones-splash 620ms cubic-bezier(0.2,0.7,0.3,1) ${i * HOP_MS}ms both`,
                        }}
                      >
                        <Ripple rx={i % 3 === 2 ? 15 : 10.5} ry={i % 3 === 2 ? 9 : 6.5} />
                      </g>
                    </g>
                  ))}
                  <Droplet path={hop.path} />
                </g>
              ))}
            </g>
          </svg>
        )}
        {steps.map((step, i) => {
          const state = i < index ? "done" : i === index ? "current" : "ahead";
          const go = onStepChange && i < index;
          const stone = <Stone seed={`${step.id}-${i}`} state={state} />;
          const status = state === "done" ? "completed" : state === "current" ? "current step" : "not started";
          return (
            <li
              key={step.id}
              aria-current={state === "current" ? "step" : undefined}
              className={cn("flex min-w-0", vertical ? "flex-row items-center gap-3" : "flex-col items-center gap-2")}
            >
              {go ? (
                <button
                  type="button"
                  ref={(el) => {
                    stoneRefs.current[i] = el;
                  }}
                  onClick={() => onStepChange(i)}
                  aria-label={`Go back to ${typeof step.label === "string" ? step.label : `step ${i + 1}`}`}
                  className="grid h-14 w-14 shrink-0 cursor-pointer place-items-center rounded-full outline-none transition-transform duration-150 ease-settle hover:-translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring active:translate-y-px"
                >
                  {stone}
                </button>
              ) : (
                <span
                  ref={(el) => {
                    stoneRefs.current[i] = el;
                  }}
                  className="grid h-14 w-14 shrink-0 place-items-center"
                >
                  {stone}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 text-[13px] leading-4 transition-colors duration-300",
                  vertical ? "text-left" : "text-center",
                  state === "current"
                    ? "font-medium text-foreground"
                    : state === "done"
                      ? "text-foreground/80"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
                <span className="sr-only">, {status}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function stripRect(geo: Geometry, vertical: boolean) {
  const first = geo.points[0];
  const last = geo.points[geo.points.length - 1];
  if (vertical) {
    const top = Math.max(0, first[1] - 34);
    return { x: first[0] - STRIP / 2, y: top, width: STRIP, height: last[1] + 34 - top, rx: STRIP / 2 };
  }
  const left = Math.max(-8, first[0] - 46);
  return {
    x: left,
    y: first[1] - STRIP / 2 + 2,
    width: Math.min(geo.width + 8, last[0] + 46) - left,
    height: STRIP,
    rx: STRIP / 2,
  };
}

function Ripple({ rx, ry }: { rx: number; ry: number }) {
  return (
    <>
      <ellipse
        cx="0"
        cy="1"
        rx={rx}
        ry={ry}
        fill="none"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        className="stroke-brand/45"
      />
      <ellipse
        cx="0"
        cy="-0.4"
        rx={rx}
        ry={ry}
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-white/80 dark:stroke-brand-strong/60"
      />
    </>
  );
}

function Wavelets({
  strip,
  vertical,
  still,
  seed,
}: {
  strip: { x: number; y: number; width: number; height: number };
  vertical: boolean;
  still: boolean;
  seed: string;
}) {
  const rng = createRng(seed);
  const along = vertical ? strip.height : strip.width;
  const across = vertical ? strip.width : strip.height;
  const count = Math.max(5, Math.round(along / 46));
  const marks = Array.from({ length: count }, () => ({
    a: rng.range(0.02, 0.98) * along,
    c: rng.range(0.18, 0.82) * across,
    len: rng.range(14, 34),
    o: rng.range(0.35, 0.8),
  }));
  return (
    <g
      className="opacity-80 dark:opacity-45"
      style={still ? undefined : { animation: `miyuki-stepping-stones-drift 16s ease-in-out infinite alternate` }}
    >
      {marks.map((m, i) => {
        const x = vertical ? strip.x + m.c : strip.x + m.a;
        const y = vertical ? strip.y + m.a : strip.y + m.c;
        return (
          <path
            key={i}
            d={
              vertical
                ? `M${x} ${y - m.len / 2}q1.2 ${m.len / 2} 0 ${m.len}`
                : `M${x - m.len / 2} ${y}q${m.len / 2} 1.2 ${m.len} 0`
            }
            fill="none"
            strokeWidth="1"
            strokeLinecap="round"
            opacity={m.o}
            className="stroke-white dark:stroke-brand-strong/50"
          />
        );
      })}
    </g>
  );
}

function Droplet({ path }: { path: [number, number][] }) {
  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || path.length === 0) return;
    const frames: Keyframe[] = [];
    const total = path.length;
    const [sx, sy] = path[0];
    frames.push({ transform: `translate(${sx}px, ${sy}px) scale(0.6)`, opacity: 0, offset: 0 });
    for (let i = 0; i < total; i++) {
      const [x, y] = path[i];
      const [px, py] = i === 0 ? path[0] : path[i - 1];
      if (i > 0) {
        const len = Math.hypot(x - px, y - py) || 1;
        const lift = Math.min(7, len * 0.35);
        frames.push({
          transform: `translate(${(x + px) / 2 + ((y - py) / len) * lift}px, ${(y + py) / 2 - ((x - px) / len) * lift}px) scale(1.25)`,
          opacity: 1,
          offset: (i - 0.5) / total,
        });
      }
      frames.push({
        transform: `translate(${x}px, ${y}px) scale(0.75)`,
        opacity: 1,
        offset: Math.max(0.02, i / total),
      });
    }
    frames.push({
      transform: `translate(${path[total - 1][0]}px, ${path[total - 1][1]}px) scale(0.4)`,
      opacity: 0,
      offset: 1,
    });
    const anim = el.animate(frames, { duration: total * HOP_MS + 60, easing: "linear", fill: "both" });
    return () => anim.cancel();
  }, [path]);
  return <circle ref={ref} r="2.4" className="fill-white stroke-brand/50 dark:fill-brand-strong" strokeWidth="0.8" />;
}
