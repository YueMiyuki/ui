"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PromptGlowProps extends ComponentProps<"div"> {
  active?: boolean;
  radius?: number;
  duration?: number;
  color?: string;
}

const P = "--miyuki-prompt-glow";

function pointAt(s: number, w: number, h: number, r: number): [number, number] {
  const hx = w / 2;
  const hy = h / 2;
  const top = Math.max(0, hx - r);
  const side = Math.max(0, h - 2 * r);
  const flat = Math.max(0, w - 2 * r);
  const arc = (Math.PI * r) / 2;
  const corner = (cx: number, cy: number, from: number, t: number): [number, number] => {
    const a = from + (t / arc) * (Math.PI / 2);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  if (s < top) return [s, -hy];
  s -= top;
  if (s < arc) return corner(hx - r, -hy + r, -Math.PI / 2, s);
  s -= arc;
  if (s < side) return [hx, -hy + r + s];
  s -= side;
  if (s < arc) return corner(hx - r, hy - r, 0, s);
  s -= arc;
  if (s < flat) return [hx - r - s, hy];
  s -= flat;
  if (s < arc) return corner(-hx + r, hy - r, Math.PI / 2, s);
  s -= arc;
  if (s < side) return [-hx, hy - r - s];
  s -= side;
  if (s < arc) return corner(-hx + r, -hy + r, Math.PI, s);
  s -= arc;
  return [-hx + r + s, -hy];
}

function angleAt(s: number, w: number, h: number, r: number, perimeter: number) {
  const [x, y] = pointAt(((s % perimeter) + perimeter) % perimeter, w, h, r);
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

export function PromptGlow({
  active = false,
  radius = 18,
  duration = 2.4,
  color = "var(--brand)",
  className,
  style,
  children,
  ...props
}: PromptGlowProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const state = useRef({ level: active ? 1 : 0, s: 0, w: 0, h: 0 });
  const [initial] = useState(() => ({ level: active ? 1 : 0 }));

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const st = state.current;
    const r = Math.max(0, radius);
    let raf = 0;
    let last = 0;
    let onScreen = true;

    const paint = () => {
      const w = st.w;
      const h = st.h;
      if (!w || !h) return;
      const rr = Math.min(r, w / 2, h / 2);
      const perimeter = 2 * (w - 2 * rr) + 2 * (h - 2 * rr) + 2 * Math.PI * rr;
      const length = Math.min(280, Math.max(90, perimeter * 0.2));
      const lead = Math.min(18, length * 0.12);
      const s = reduce ? Math.max(0, w / 2 - rr) + (Math.PI * rr) / 4 : st.s;
      const tail = angleAt(s - length, w, h, rr, perimeter);
      const head = angleAt(s, w, h, rr, perimeter);
      const end = angleAt(s + lead, w, h, rr, perimeter);
      const span = (head - tail + 360) % 360;
      const reach = (end - tail + 360) % 360;
      el.style.setProperty(`${P}-from`, `${tail.toFixed(2)}deg`);
      el.style.setProperty(`${P}-mid`, `${(span * 0.55).toFixed(2)}deg`);
      el.style.setProperty(`${P}-head`, `${span.toFixed(2)}deg`);
      el.style.setProperty(`${P}-end`, `${Math.max(reach, span + 0.5).toFixed(2)}deg`);
      el.style.setProperty(`${P}-level`, st.level.toFixed(3));
    };

    const measure = () => {
      st.w = el.offsetWidth;
      st.h = el.offsetHeight;
      if (st.s === 0) st.s = Math.max(0, st.w / 2 - r) * 0.4;
      paint();
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const target = active ? 1 : 0;
      const tau = reduce ? 0.06 : active ? 0.32 : 0.42;
      st.level += (target - st.level) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - st.level) < 0.002) st.level = target;
      if (!reduce && st.w && st.h) {
        const rr = Math.min(r, st.w / 2, st.h / 2);
        const perimeter = 2 * (st.w - 2 * rr) + 2 * (st.h - 2 * rr) + 2 * Math.PI * rr;
        st.s = (st.s + (perimeter / Math.max(0.2, duration)) * dt * st.level) % perimeter;
      }
      paint();
      const resting = !active && st.level === 0;
      const still = reduce && st.level === target;
      if (resting || still || !onScreen) {
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
    });
    visibility.observe(el);
    start();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      visibility.disconnect();
    };
  }, [active, radius, duration, reduce]);

  const stops = (head: string) =>
    `conic-gradient(from var(${P}-from, 0deg), transparent 0deg, color-mix(in oklab, var(${P}-color) 60%, transparent) var(${P}-mid, 40deg), ${head} var(${P}-head, 70deg), transparent var(${P}-end, 76deg))`;
  const ring: CSSProperties = {
    background: stops(`var(${P}-core)`),
    padding: 1.5,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
  };

  return (
    <div
      ref={root}
      aria-busy={active || undefined}
      {...props}
      style={
        {
          [`${P}-color`]: color,
          [`${P}-level`]: initial.level,
          [`${P}-radius`]: `${radius}px`,
          ...style,
        } as CSSProperties
      }
      className={cn(
        "relative isolate",
        "[--miyuki-prompt-glow-core:color-mix(in_oklab,var(--miyuki-prompt-glow-color),var(--foreground)_12%)]",
        "dark:[--miyuki-prompt-glow-core:color-mix(in_oklab,var(--miyuki-prompt-glow-color),white_60%)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[14%] -bottom-4 -z-10 h-8 rounded-[50%] opacity-[calc(var(--miyuki-prompt-glow-level)*0.16)] blur-xl dark:opacity-[calc(var(--miyuki-prompt-glow-level)*0.4)]"
        style={{ background: `var(${P}-color)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px -z-10 rounded-[calc(var(--miyuki-prompt-glow-radius)+1px)] opacity-[calc(var(--miyuki-prompt-glow-level)*0.45)] blur-[6px] dark:opacity-[calc(var(--miyuki-prompt-glow-level)*0.85)]"
        style={{ background: stops(`var(${P}-color)`) }}
      />
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[var(--miyuki-prompt-glow-radius)] opacity-[var(--miyuki-prompt-glow-level)]"
        style={ring}
      />
    </div>
  );
}
