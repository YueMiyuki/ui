"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface RippleCursorProps extends ComponentProps<"div"> {
  color?: string;
  strength?: number;
}

const NIGHT = "--miyuki-ripple-cursor-night";
const CAP = 72;
const SPACING = 34;

type Rgb = [number, number, number];

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgba = (c: Rgb, a: number) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${Math.max(0, a).toFixed(3)})`;

export function RippleCursor({
  color = "var(--brand)",
  strength = 1,
  className,
  children,
  ...props
}: RippleCursorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = reduce;
    const rx = new Float32Array(CAP);
    const ry = new Float32Array(CAP);
    const born = new Float32Array(CAP);
    const amp = new Float32Array(CAP);
    const reach = new Float32Array(CAP);
    const life = new Float32Array(CAP);
    let count = 0;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let night = false;
    let light: Rgb = [1, 1, 1];
    let dark: Rgb = [0, 0, 0];
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = true;
    let pointer: { x: number; y: number; t: number } | null = null;
    let travelled = 0;
    let speed = 0;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const [r, g, b] = toRgba(color, canvas);
      const tint: Rgb = [r, g, b];
      light = night ? mixRgb(tint, [1, 1, 1], 0.55) : mixRgb(tint, [1, 1, 1], 0.9);
      dark = night ? mixRgb(tint, [0.02, 0.03, 0.06], 0.78) : mixRgb(tint, [0.05, 0.08, 0.16], 0.35);
    };

    const spawn = (x: number, y: number, a: number, r: number, l: number, delay = 0) => {
      let i = count;
      if (count < CAP) count++;
      else {
        i = 0;
        for (let k = 1; k < CAP; k++) if (born[k] < born[i]) i = k;
      }
      rx[i] = x;
      ry[i] = y;
      born[i] = time + delay;
      amp[i] = a;
      reach[i] = r;
      life[i] = l;
    };

    const ring = (i: number) => {
      const t = time - born[i];
      if (t < 0) return;
      const k = t / life[i];
      const r = still ? reach[i] : 2 + reach[i] * (1 - (1 - k) ** 1.7);
      const fade = ((1 - k) ** 1.8 * Math.min(1, t / 0.06)) / (1 + r / 90);
      const a = amp[i] * fade;
      if (a < 0.004) return;
      const band = 1.4 + r * 0.03;
      const outer = r + band * 1.3;
      const inner = Math.max(0, r - band * 3.6);
      const span = outer - inner;
      const at = (d: number) => Math.min(1, Math.max(0, (d - inner) / span));
      const g = ctx.createRadialGradient(rx[i], ry[i], inner, rx[i], ry[i], outer);
      const hi = night ? 0.62 : 0.95;
      const lo = night ? 0.7 : 0.42;
      g.addColorStop(0, rgba(dark, 0));
      g.addColorStop(at(r - band * 3), rgba(dark, a * lo * 0.3));
      g.addColorStop(at(r - band * 2.1), rgba(light, a * hi * 0.4));
      g.addColorStop(at(r - band * 1.05), rgba(dark, a * lo));
      g.addColorStop(at(r - band * 0.45), rgba(dark, 0));
      g.addColorStop(at(r), rgba(light, a * hi));
      g.addColorStop(1, rgba(light, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rx[i], ry[i], outer, 0, Math.PI * 2);
      if (inner > 0) ctx.arc(rx[i], ry[i], inner, 0, Math.PI * 2, true);
      ctx.fill();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < count; i++) ring(i);
    };

    const prune = () => {
      for (let i = 0; i < count; i++) {
        if (time - born[i] < life[i]) continue;
        count--;
        rx[i] = rx[count];
        ry[i] = ry[count];
        born[i] = born[count];
        amp[i] = amp[count];
        reach[i] = reach[count];
        life[i] = life[count];
        i--;
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0;
      last = now;
      time += dt;
      speed *= Math.exp(-dt * 5);
      prune();
      draw();
      if (count > 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const local = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const sx = box.width ? root.offsetWidth / box.width : 1;
      const sy = box.height ? root.offsetHeight / box.height : 1;
      return { x: (e.clientX - box.left) * sx, y: (e.clientY - box.top) * sy };
    };

    const onMove = (e: PointerEvent) => {
      if (still || strength <= 0) return;
      const at = local(e);
      const prev = pointer;
      pointer = { ...at, t: e.timeStamp };
      if (!prev) return;
      const dx = at.x - prev.x;
      const dy = at.y - prev.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const v = Math.min(3000, dist / Math.max(0.004, (e.timeStamp - prev.t) / 1000));
      speed += (v - speed) * 0.4;
      let left = SPACING - travelled;
      let placed = 0;
      while (left <= dist) {
        const f = left / dist;
        const lift = Math.min(1, speed / 1400);
        const jitter = (Math.random() - 0.5) * 6;
        spawn(
          prev.x + dx * f - (dy / dist) * jitter,
          prev.y + dy * f + (dx / dist) * jitter,
          strength * (0.34 + 0.3 * lift),
          24 + 26 * lift + Math.random() * 10,
          0.95 + 0.3 * lift + Math.random() * 0.2,
        );
        left += SPACING;
        placed++;
      }
      travelled = (travelled + dist) % SPACING;
      if (placed) wake();
    };

    const onLeave = () => {
      pointer = null;
    };

    const onDown = (e: PointerEvent) => {
      if (strength <= 0) return;
      const at = local(e);
      pointer = { ...at, t: e.timeStamp };
      if (still) spawn(at.x, at.y, strength, 40, 0.5);
      else {
        spawn(at.x, at.y, strength * 1.7, 170, 2.1);
        spawn(at.x, at.y, strength * 1.05, 120, 2.9, 0.2);
      }
      wake();
    };

    const resize = () => {
      const nw = root.offsetWidth;
      const nh = root.offsetHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen && count) wake();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden && count) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    readColors();
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [color, strength, reduce]);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative isolate",
        "[--miyuki-ripple-cursor-night:0] dark:[--miyuki-ripple-cursor-night:1]",
        className,
      )}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" />
      {children}
    </div>
  );
}
