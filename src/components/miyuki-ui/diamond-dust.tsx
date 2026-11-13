"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type DiamondDustDirection = "none" | "up" | "down";

export interface DiamondDustProps extends ComponentProps<"div"> {
  density?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  direction?: DiamondDustDirection;
  color?: string;
  twinkle?: boolean;
  glints?: boolean;
  interactive?: boolean;
}

const NIGHT = "--miyuki-diamond-dust-night";
const DEFAULT_COLOR = "var(--miyuki-diamond-dust-color)";
const MAX_PARTICLES = 4000;
const REACH = 130;
const PUSH = 46;
const STILL = 7.4;
const ARM = 4.4;
const REF = 64;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function makeSprite(paint: (g: CanvasRenderingContext2D, c: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = REF;
  const g = canvas.getContext("2d");
  if (g) paint(g, REF / 2);
  return canvas;
}

function falloff(g: CanvasRenderingContext2D, c: number, color: string, el: Element, tight: number) {
  const gradient = g.createRadialGradient(c, c, 0, c, c, c);
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    gradient.addColorStop(t, rgba(color, k === 8 ? 0 : Math.exp(-t * t * tight), el));
  }
  return gradient;
}

export function DiamondDust({
  density = 80,
  minSize = 0.4,
  maxSize = 1.8,
  speed = 1,
  direction = "none",
  color,
  twinkle = true,
  glints = true,
  interactive = false,
  className,
  children,
  ...props
}: DiamondDustProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = !!reduce;
    const follow = interactive && !still;
    const rate = Math.max(0, speed);
    const lo = Math.max(0.1, Math.min(minSize, maxSize));
    const hi = Math.max(lo, minSize, maxSize);
    const fill = color ?? DEFAULT_COLOR;

    const u = new Float32Array(MAX_PARTICLES);
    const v = new Float32Array(MAX_PARTICLES);
    const size = new Float32Array(MAX_PARTICLES);
    const near = new Float32Array(MAX_PARTICLES);
    const vx = new Float32Array(MAX_PARTICLES);
    const vy = new Float32Array(MAX_PARTICLES);
    const sway = new Float32Array(MAX_PARTICLES);
    const swayRate = new Float32Array(MAX_PARTICLES);
    const swayPhase = new Float32Array(MAX_PARTICLES);
    const flicker = new Float32Array(MAX_PARTICLES);
    const phase = new Float32Array(MAX_PARTICLES);
    const base = new Float32Array(MAX_PARTICLES);
    const ox = new Float32Array(MAX_PARTICLES);
    const oy = new Float32Array(MAX_PARTICLES);
    const rng = createRng(`diamond-dust:${direction}`);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      u[i] = rng();
      v[i] = rng();
      const n = rng() ** 2.2;
      near[i] = n;
      size[i] = lo + (hi - lo) * n;
      const fall = (0.6 + 0.4 * n) * rng.range(0.75, 1.25);
      if (direction === "down") {
        vx[i] = rng.range(-3, 3);
        vy[i] = 26 * fall;
        sway[i] = rng.range(5, 14);
      } else if (direction === "up") {
        vx[i] = rng.range(-2, 2);
        vy[i] = -18 * fall;
        sway[i] = rng.range(3, 9);
      } else {
        vx[i] = rng.range(-2.5, 2.5);
        vy[i] = rng.range(-2.5, 2.5);
        sway[i] = rng.range(2, 6);
      }
      swayRate[i] = rng.range(0.25, 0.7);
      swayPhase[i] = rng.range(0, Math.PI * 2);
      flicker[i] = rng.range(1.2, 4.2);
      phase[i] = rng.range(0, Math.PI * 2);
      base[i] = rng.range(0.55, 1);
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    let count = 0;
    let night = false;
    let dot: HTMLCanvasElement | null = null;
    let glint: HTMLCanvasElement | null = null;
    let halo: HTMLCanvasElement | null = null;

    const pointer = { x: 0, y: 0, on: 0, target: 0 };
    let time = still ? STILL : 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const paintSprites = () => {
      night = cssVar(NIGHT, canvas) === "1";
      dot = makeSprite((g, c) => {
        g.fillStyle = falloff(g, c, fill, canvas, 3.2);
        g.fillRect(0, 0, REF, REF);
        g.fillStyle = rgba(fill, 1, canvas);
        g.beginPath();
        g.arc(c, c, c * 0.42, 0, Math.PI * 2);
        g.fill();
      });
      glint = makeSprite((g, c) => {
        const k = REF * 0.036;
        g.beginPath();
        g.moveTo(0, c);
        g.lineTo(c, c - k);
        g.lineTo(REF, c);
        g.lineTo(c, c + k);
        g.closePath();
        g.moveTo(c, 0);
        g.lineTo(c + k, c);
        g.lineTo(c, REF);
        g.lineTo(c - k, c);
        g.closePath();
        g.fillStyle = falloff(g, c, fill, canvas, 2.4);
        g.fill();
        const core = c / ARM;
        const gradient = g.createRadialGradient(c, c, 0, c, c, core * 1.6);
        gradient.addColorStop(0, rgba(fill, 1, canvas));
        gradient.addColorStop(0.45, rgba(fill, 0.85, canvas));
        gradient.addColorStop(1, rgba(fill, 0, canvas));
        g.fillStyle = gradient;
        g.fillRect(0, 0, REF, REF);
      });
      halo = makeSprite((g, c) => {
        g.fillStyle = falloff(g, c, fill, canvas, 4.5);
        g.fillRect(0, 0, REF, REF);
      });
    };

    const draw = () => {
      if (!dot || !glint || !halo) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";

      const glintFrom = lo + (hi - lo) * 0.72;
      const pull = still ? 0 : 1;
      for (let i = 0; i < count; i++) {
        const r = size[i];
        const s = swayRate[i] * time * pull + swayPhase[i];
        const x = (u[i] * (w + 40) - 20 + Math.sin(s) * sway[i] + ox[i]) * dpr;
        const y = (v[i] * (h + 40) - 20 + Math.cos(s * 0.8) * sway[i] * 0.5 + oy[i]) * dpr;
        let a = base[i];
        let grow = 1;
        if (twinkle) {
          const f = 0.5 + 0.5 * Math.sin(time * flicker[i] * Math.max(0.2, rate) + phase[i]);
          a *= 0.18 + 0.82 * f * f;
          grow = 0.7 + 0.45 * f;
        } else {
          a *= 0.8;
        }
        if (a < 0.02) continue;
        if (glints && r >= glintFrom) {
          const span = r * ARM * 2 * grow * dpr;
          if (night) {
            const hs = r * 9 * dpr;
            ctx.globalAlpha = a * 0.28;
            ctx.drawImage(halo, x - hs / 2, y - hs / 2, hs, hs);
          }
          ctx.globalAlpha = Math.min(1, a * (night ? 1 : 0.95));
          ctx.drawImage(glint, x - span / 2, y - span / 2, span, span);
        } else {
          const span = r * (night ? 3 : 3.4) * dpr;
          ctx.globalAlpha = Math.min(1, a);
          ctx.drawImage(dot, x - span / 2, y - span / 2, span, span);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const step = (dt: number) => {
      const fw = w + 40;
      const fh = h + 40;
      const move = dt * rate;
      const ease = 1 - Math.exp(-dt * 5);
      pointer.on += (pointer.target - pointer.on) * (1 - Math.exp(-dt * 4));
      const on = pointer.on;
      for (let i = 0; i < count; i++) {
        let nu = u[i] + (vx[i] * move) / fw;
        let nv = v[i] + (vy[i] * move) / fh;
        if (nu < 0) nu += 1;
        else if (nu >= 1) nu -= 1;
        if (nv < 0) nv += 1;
        else if (nv >= 1) nv -= 1;
        u[i] = nu;
        v[i] = nv;
        if (!follow) continue;
        let tx = 0;
        let ty = 0;
        if (on > 0.002) {
          const dx = nu * fw - 20 - pointer.x;
          const dy = nv * fh - 20 - pointer.y;
          if (dx > -REACH && dx < REACH && dy > -REACH && dy < REACH) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < REACH) {
              const q = 1 - d / REACH;
              const push = (q * q * PUSH * (0.6 + 0.6 * near[i]) * on) / Math.max(d, 1);
              tx = dx * push;
              ty = dy * push;
            }
          }
        }
        ox[i] += (tx - ox[i]) * ease;
        oy[i] += (ty - oy[i]) * ease;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      step(dt);
      draw();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      count = clamp(Math.round((((w + 40) * (h + 40)) / 100000) * Math.max(0, density)), 0, MAX_PARTICLES);
      if (!dot) paintSprites();
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.target = 1;
    };
    const onLeave = (event: PointerEvent) => {
      if (event.type === "pointerleave" || event.pointerType !== "mouse") pointer.target = 0;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      paintSprites();
      draw();
    });
    if (follow) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerdown", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointerup", onLeave);
      root.addEventListener("pointercancel", onLeave);
    }
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerup", onLeave);
      root.removeEventListener("pointercancel", onLeave);
    };
  }, [density, minSize, maxSize, speed, direction, color, twinkle, interactive, reduce, glints]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-diamond-dust-color:var(--brand)] [--miyuki-diamond-dust-night:0]",
        "dark:[--miyuki-diamond-dust-color:color-mix(in_oklab,var(--foreground)_78%,var(--brand))] dark:[--miyuki-diamond-dust-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full" />
      </div>
      {children}
    </div>
  );
}
