"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface PulseDotsProps extends ComponentProps<"div"> {
  gap?: number;
  radius?: number;
  color?: string;
  glowColor?: string;
  speedMin?: number;
  speedMax?: number;
  opacity?: number;
  interactive?: boolean;
  fade?: boolean;
}

const NIGHT = "--miyuki-pulse-dots-night";
const REACH = 150;
const STILL = 41.3;
const TABLE = 4096;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function buildTable() {
  const rng = createRng("pulse-dots");
  const table = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) table[i] = rng();
  return table;
}

function slot(col: number, row: number) {
  let h = Math.imul(col | 0, 0x27d4eb2d) ^ Math.imul(row | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function glowSprite(size: number, color: string, el: Element) {
  return makeSprite(size, (g, s) => {
    const c = s / 2;
    const gradient = g.createRadialGradient(c, c, 0, c, c, c);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      gradient.addColorStop(t, rgba(color, k === 8 ? 0 : Math.exp(-t * t * 4.5), el));
    }
    g.fillStyle = gradient;
    g.fillRect(0, 0, s, s);
  });
}

function makeSprite(size: number, paint: (g: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.max(2, Math.ceil(size));
  const g = canvas.getContext("2d");
  if (g) paint(g, canvas.width);
  return canvas;
}

export function PulseDots({
  gap = 14,
  radius = 1.4,
  color = "var(--foreground)",
  glowColor = "var(--brand)",
  speedMin = 0.4,
  speedMax = 1.3,
  opacity = 0.6,
  interactive = true,
  fade = true,
  className,
  children,
  ...props
}: PulseDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const table = buildTable();
    const step = Math.max(4, gap);
    const dotR = clamp(radius, 0.3, step / 2);
    const slow = Math.max(0.01, Math.min(speedMin, speedMax));
    const fast = Math.max(slow, speedMin, speedMax);
    const peak = clamp(opacity, 0, 1);
    const still = !!reduce;
    const follow = interactive && !still;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let count = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let edge = new Float32Array(0);
    let rate = new Float32Array(0);
    let phase = new Float32Array(0);
    let gate = new Float32Array(0);
    let level = new Float32Array(0);
    let spark = new Float32Array(0);
    let alpha = new Float32Array(0);
    let tint = new Float32Array(0);
    let halo = new Float32Array(0);

    let night = false;
    let dot: HTMLCanvasElement | null = null;
    let lit: HTMLCanvasElement | null = null;
    let glow: HTMLCanvasElement | null = null;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0 };
    let time = still ? STILL : 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const paintSprites = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const litColor = night ? `color-mix(in oklab, ${glowColor} 55%, white)` : glowColor;
      const disc = (fill: string) =>
        makeSprite((dotR * 2 + 2) * dpr, (g, size) => {
          g.fillStyle = rgba(fill, 1, canvas);
          g.beginPath();
          g.arc(size / 2, size / 2, dotR * dpr, 0, Math.PI * 2);
          g.fill();
        });
      dot = disc(color);
      lit = disc(litColor);
      glow = glowSprite(Math.max(dotR * 5, step * 0.9) * 2 * dpr, glowColor, canvas);
    };

    const layout = () => {
      const cols = Math.floor(w / step) + 1;
      const rows = Math.floor(h / step) + 1;
      const x0 = (w - (cols - 1) * step) / 2;
      const y0 = (h - (rows - 1) * step) / 2;
      const mc = Math.floor(cols / 2);
      const mr = Math.floor(rows / 2);
      count = cols * rows;
      if (xs.length < count) {
        xs = new Float32Array(count);
        ys = new Float32Array(count);
        edge = new Float32Array(count);
        rate = new Float32Array(count);
        phase = new Float32Array(count);
        gate = new Float32Array(count);
        level = new Float32Array(count);
        spark = new Float32Array(count);
        alpha = new Float32Array(count);
        tint = new Float32Array(count);
        halo = new Float32Array(count);
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = x0 + c * step;
          const y = y0 + r * step;
          xs[i] = x;
          ys[i] = y;
          if (fade) {
            const ex = (x - w / 2) / (w / 2);
            const ey = (y - h / 2) / (h / 2);
            const e = Math.sqrt(ex * ex * 0.9 + ey * ey);
            const k = clamp((e - 0.32) / 0.7, 0, 1);
            edge[i] = 1 - k * k * (3 - 2 * k);
          } else {
            edge[i] = 1;
          }
          const s = slot(c - mc, r - mr);
          const v = (n: number) => table[(s + n * 977) & (TABLE - 1)];
          rate[i] = slow + (fast - slow) * v(0);
          phase[i] = v(1) * Math.PI * 2;
          gate[i] = v(2) * Math.PI * 2;
          level[i] = 0.62 + 0.38 * v(3);
          spark[i] = v(4) < 0.36 ? 0.55 + 0.45 * v(5) : 0;
        }
      }
    };

    const draw = () => {
      if (!dot || !lit || !glow) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const on = pointer.on;
      const px = pointer.x;
      const py = pointer.y;
      const reach2 = REACH * REACH;
      for (let i = 0; i < count; i++) {
        const s = 0.5 + 0.5 * Math.sin(time * rate[i] + phase[i]);
        const g = 0.5 + 0.5 * Math.sin(time * rate[i] * 0.29 + gate[i]);
        let flare = s * s;
        flare *= flare;
        flare *= flare * g * g * spark[i];
        let a = edge[i] * (0.32 * level[i] + 0.14 * s + 0.54 * flare);
        let t = flare * 0.85;
        let hl = flare > 0.3 ? ((flare - 0.3) / 0.7) * edge[i] : 0;
        if (on > 0.002) {
          const dx = xs[i] - px;
          const dy = ys[i] - py;
          if (dx > -REACH && dx < REACH && dy > -REACH && dy < REACH) {
            const q = 1 - (dx * dx + dy * dy) / reach2;
            if (q > 0) {
              const p = q * q * on;
              const reveal = 0.4 + 0.6 * edge[i];
              a += (reveal - a) * p;
              t += (1 - t) * p;
              hl = Math.max(hl, p * p * reveal * 0.85);
            }
          }
        }
        alpha[i] = a * peak;
        tint[i] = t;
        halo[i] = hl;
      }

      const scale = dpr;
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      const gs = glow.width;
      const haloStrength = night ? 0.5 : 0.3;
      for (let i = 0; i < count; i++) {
        const hl = halo[i];
        if (hl < 0.015) continue;
        ctx.globalAlpha = hl * haloStrength;
        ctx.drawImage(glow, Math.round(xs[i] * scale - gs / 2), Math.round(ys[i] * scale - gs / 2));
      }
      const ds = dot.width;
      for (let i = 0; i < count; i++) {
        const a = alpha[i];
        if (a < 0.01) continue;
        const x = Math.round(xs[i] * scale - ds / 2);
        const y = Math.round(ys[i] * scale - ds / 2);
        const t = tint[i];
        if (t < 0.02) {
          ctx.globalAlpha = a;
          ctx.drawImage(dot, x, y);
        } else {
          ctx.globalAlpha = a * (1 - t);
          ctx.drawImage(dot, x, y);
          ctx.globalAlpha = Math.min(1, a * t * 1.25);
          ctx.drawImage(lit, x, y);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 16);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.on += (pointer.target - pointer.on) * (1 - Math.exp(-dt * (pointer.target ? 7 : 3.5)));
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
      const sprites = nd !== dpr || !dot;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (sprites) paintSprites();
      layout();
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.tx = event.clientX - box.left;
      pointer.ty = event.clientY - box.top;
      if (pointer.on < 0.01) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
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
  }, [gap, radius, color, glowColor, speedMin, speedMax, opacity, interactive, fade, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-pulse-dots-night:0] dark:[--miyuki-pulse-dots-night:1]",
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
