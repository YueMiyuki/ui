"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type RefObject, useEffect, useRef } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface StarFieldProps extends ComponentProps<"div"> {
  density?: number;
  twinkle?: boolean;
  colors?: string[];
}

export interface FallingStarsProps extends ComponentProps<"div"> {
  minDelay?: number;
  maxDelay?: number;
  minSpeed?: number;
  maxSpeed?: number;
  angle?: [number, number];
  color?: string;
  trailColor?: string;
}

const DEFAULT_STAR_COLORS = ["var(--foreground)", "var(--brand)", "var(--chart-6)"];
const MAX_STARS = 3000;
const SPRITE = 64;
const STILL = 9.3;
const SLOTS = 4;
const DRAG = 1.7;
const TAIL_TIME = 0.3;
const TAIL_W = 256;
const TAIL_H = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isNight(el: Element) {
  const [r, g, b] = toRgba("var(--background)", el);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function sprite(paint: (g: CanvasRenderingContext2D) => void, width = SPRITE, height = SPRITE) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d");
  if (g) paint(g);
  return canvas;
}

function radial(g: CanvasRenderingContext2D, color: string, el: Element, stops: [number, number][]) {
  const c = SPRITE / 2;
  const gradient = g.createRadialGradient(c, c, 0, c, c, c);
  for (const [at, alpha] of stops) gradient.addColorStop(at, rgba(color, alpha, el));
  g.fillStyle = gradient;
  g.fillRect(0, 0, SPRITE, SPRITE);
}

interface Loop {
  start: () => void;
  stop: () => void;
}

function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setup: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => {
    resize: (w: number, h: number, dpr: number) => void;
    theme: () => void;
    frame: (dt: number) => void;
    still: () => void;
    dispose?: () => void;
  } | null,
  still: boolean,
  deps: unknown[],
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scene = setup(canvas, ctx);
    if (!scene) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let onScreen = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
      last = now;
      scene.frame(dt);
    };
    const loop: Loop = {
      start: () => {
        if (raf) return;
        last = 0;
        raf = requestAnimationFrame(tick);
      },
      stop: () => {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    };
    const sync = () => (onScreen && !document.hidden && !still ? loop.start() : loop.stop());

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
      scene.resize(w, h, dpr);
      if (still) scene.still();
      else scene.frame(0);
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
      scene.theme();
      if (still) scene.still();
      else scene.frame(0);
    });
    scene.theme();
    resize();

    return () => {
      loop.stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      scene.dispose?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, ...deps]);
}

export function StarField({
  density = 60,
  twinkle = true,
  colors = DEFAULT_STAR_COLORS,
  className,
  ...props
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = !!useReducedMotion();
  const palette = colors.length > 0 ? colors : DEFAULT_STAR_COLORS;
  const paletteKey = palette.join("|");

  useCanvasLoop(
    canvasRef,
    (canvas, ctx) => {
      const tints = paletteKey.split("|");
      const rng = createRng("star-field:field");
      const u = new Float32Array(MAX_STARS);
      const v = new Float32Array(MAX_STARS);
      const size = new Float32Array(MAX_STARS);
      const tier = new Uint8Array(MAX_STARS);
      const hue = new Uint8Array(MAX_STARS);
      const base = new Float32Array(MAX_STARS);
      const rate = new Float32Array(MAX_STARS);
      const phase = new Float32Array(MAX_STARS);
      const depth = new Float32Array(MAX_STARS);
      for (let i = 0; i < MAX_STARS; i++) {
        u[i] = rng();
        v[i] = rng();
        const roll = rng();
        tier[i] = roll < 0.07 ? 2 : roll < 0.33 ? 1 : 0;
        size[i] = tier[i] === 2 ? rng.range(1.35, 1.75) : tier[i] === 1 ? rng.range(0.85, 1.1) : rng.range(0.45, 0.7);
        const tint = rng();
        hue[i] = tints.length < 2 || tint < 0.84 ? 0 : tints.length < 3 || tint < 0.94 ? 1 : 2;
        base[i] = tier[i] === 0 ? rng.range(0.35, 0.8) : rng.range(0.7, 1);
        rate[i] = rng.range(0.35, 1.4);
        phase[i] = rng.range(0, Math.PI * 2);
        depth[i] = tier[i] === 2 ? rng.range(0.25, 0.45) : rng.range(0.35, 0.7);
      }

      let w = 0;
      let h = 0;
      let dpr = 1;
      let count = 0;
      let night = false;
      let time = STILL;
      let dots: HTMLCanvasElement[] = [];
      let halos: HTMLCanvasElement[] = [];

      const draw = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (dots.length === 0) return;
        ctx.globalCompositeOperation = night ? "lighter" : "source-over";
        for (let i = 0; i < count; i++) {
          let a = base[i];
          if (twinkle) {
            const s = 0.5 + 0.5 * Math.sin(time * rate[i] + phase[i]);
            a *= 1 - depth[i] + depth[i] * s * s;
          }
          if (!night) a *= tier[i] === 0 ? 0.55 : 0.75;
          if (a < 0.02) continue;
          const x = u[i] * w * dpr;
          const y = v[i] * h * dpr;
          const r = size[i] * (night ? 1 : 0.85) * dpr;
          const k = hue[i];
          if (night && tier[i] > 0) {
            const span = r * (tier[i] === 2 ? 11 : 6);
            ctx.globalAlpha = a * (tier[i] === 2 ? 0.42 : 0.24);
            ctx.drawImage(halos[k], x - span / 2, y - span / 2, span, span);
          }
          const span = r * 3.2;
          ctx.globalAlpha = Math.min(1, a);
          ctx.drawImage(dots[k], x - span / 2, y - span / 2, span, span);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      };

      return {
        resize: (nw, nh, nd) => {
          w = nw;
          h = nh;
          dpr = nd;
          count = clamp(Math.round(((w * h) / 100000) * Math.max(0, density)), 0, MAX_STARS);
        },
        theme: () => {
          night = isNight(canvas);
          dots = tints.slice(0, 3).map((tint) =>
            sprite((g) =>
              radial(g, tint, canvas, [
                [0, 1],
                [0.3, 1],
                [0.42, 0.55],
                [0.7, 0.12],
                [1, 0],
              ]),
            ),
          );
          halos = tints.slice(0, 3).map((tint) =>
            sprite((g) =>
              radial(g, tint, canvas, [
                [0, 0.9],
                [0.12, 0.45],
                [0.35, 0.12],
                [0.7, 0.025],
                [1, 0],
              ]),
            ),
          );
        },
        frame: (dt) => {
          time += dt;
          draw();
        },
        still: () => {
          time = STILL;
          draw();
        },
      };
    },
    reduce,
    [density, twinkle, paletteKey],
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

export function FallingStars({
  minDelay = 1800,
  maxDelay = 5200,
  minSpeed = 620,
  maxSpeed = 1050,
  angle = [24, 40],
  color = "var(--foreground)",
  trailColor = "var(--brand)",
  className,
  ...props
}: FallingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = !!useReducedMotion();
  const [a0, a1] = angle;

  useCanvasLoop(
    canvasRef,
    (canvas, ctx) => {
      const lo = Math.max(0, Math.min(minDelay, maxDelay)) / 1000;
      const hi = Math.max(lo, minDelay / 1000, maxDelay / 1000);
      const vLo = Math.max(1, Math.min(minSpeed, maxSpeed));
      const vHi = Math.max(vLo, minSpeed, maxSpeed);
      const angLo = (Math.min(a0, a1) * Math.PI) / 180;
      const angHi = (Math.max(a0, a1) * Math.PI) / 180;

      const sx = new Float32Array(SLOTS);
      const sy = new Float32Array(SLOTS);
      const dx = new Float32Array(SLOTS);
      const dy = new Float32Array(SLOTS);
      const v0 = new Float32Array(SLOTS);
      const age = new Float32Array(SLOTS);
      const life = new Float32Array(SLOTS);
      const live = new Uint8Array(SLOTS);

      let w = 0;
      let h = 0;
      let dpr = 1;
      let night = false;
      let wait = 0.45 + Math.random() * 0.4;
      let dirty = false;
      let head: HTMLCanvasElement | null = null;
      let glow: HTMLCanvasElement | null = null;
      let tail: HTMLCanvasElement | null = null;

      const launch = (slot: number, pick: () => number) => {
        const theta = angLo + (angHi - angLo) * pick();
        const cx = Math.cos(theta);
        const cy = Math.sin(theta);
        const speed = vLo + (vHi - vLo) * pick();
        const span = 1.1 + 0.6 * pick();
        const travel = (speed / DRAG) * (1 - Math.exp(-DRAG * span));
        const reachX = travel * Math.abs(cx) * 0.85;
        const reachY = travel * Math.abs(cy) * 0.85;
        const xMin = cx >= 0 ? w * 0.04 : Math.min(w * 0.96, reachX);
        const xMax = cx >= 0 ? Math.max(xMin, w * 0.96 - reachX) : w * 0.96;
        const yMin = cy >= 0 ? h * 0.03 : Math.min(h * 0.95, h * 0.35 + reachY);
        const yMax = cy >= 0 ? Math.max(yMin, Math.min(h * 0.3, h * 0.9 - reachY)) : h * 0.95;
        life[slot] = span;
        sx[slot] = xMin + (xMax - xMin) * pick();
        sy[slot] = yMin + (yMax - yMin) * pick();
        dx[slot] = cx;
        dy[slot] = cy;
        v0[slot] = speed;
        age[slot] = 0;
        live[slot] = 1;
      };

      const draw = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dirty = false;
        if (!head || !glow || !tail) return;
        ctx.globalCompositeOperation = night ? "lighter" : "source-over";
        for (let s = 0; s < SLOTS; s++) {
          if (!live[s]) continue;
          dirty = true;
          const t = age[s];
          const u = t / life[s];
          const env = Math.min(1, u / 0.07) * (1 - u) ** 1.5;
          const decay = Math.exp(-DRAG * t);
          const dist = (v0[s] / DRAG) * (1 - decay);
          const x = sx[s] + dx[s] * dist;
          const y = sy[s] + dy[s] * dist;
          const speed = v0[s] * decay;
          const len = Math.min(320, speed * TAIL_TIME) * (0.5 + 0.5 * env) * Math.min(1, t / 0.18 + 0.15);
          const thick = night ? 3 : 2.4;
          ctx.globalAlpha = env * (night ? 0.95 : 0.8);
          ctx.setTransform(dx[s] * dpr, dy[s] * dpr, -dy[s] * dpr, dx[s] * dpr, x * dpr, y * dpr);
          ctx.drawImage(tail, -len, -thick / 2, len, thick);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (night) {
            const g = 26;
            ctx.globalAlpha = env * 0.55;
            ctx.drawImage(glow, x - g / 2, y - g / 2, g, g);
          }
          const r = night ? 7 : 5;
          ctx.globalAlpha = Math.min(1, env * 1.15);
          ctx.drawImage(head, x - r / 2, y - r / 2, r, r);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      };

      return {
        resize: (nw, nh, nd) => {
          w = nw;
          h = nh;
          dpr = nd;
        },
        theme: () => {
          night = isNight(canvas);
          head = sprite((g) =>
            radial(g, color, canvas, [
              [0, 1],
              [0.35, 1],
              [0.6, 0.35],
              [1, 0],
            ]),
          );
          glow = sprite((g) =>
            radial(g, trailColor, canvas, [
              [0, 0.8],
              [0.2, 0.35],
              [0.5, 0.08],
              [1, 0],
            ]),
          );
          tail = sprite(
            (g) => {
              const gradient = g.createLinearGradient(0, 0, TAIL_W, 0);
              gradient.addColorStop(0, rgba(trailColor, 0, canvas));
              gradient.addColorStop(0.55, rgba(trailColor, 0.35, canvas));
              gradient.addColorStop(0.88, rgba(trailColor, 0.85, canvas));
              gradient.addColorStop(1, rgba(color, 1, canvas));
              g.fillStyle = gradient;
              g.beginPath();
              g.moveTo(0, TAIL_H / 2 - 0.4);
              g.lineTo(TAIL_W, 1);
              g.arc(TAIL_W - TAIL_H / 2 + 1, TAIL_H / 2, TAIL_H / 2 - 1, -Math.PI / 2, Math.PI / 2);
              g.lineTo(0, TAIL_H / 2 + 0.4);
              g.closePath();
              g.fill();
            },
            TAIL_W,
            TAIL_H,
          );
        },
        frame: (dt) => {
          if (dt > 0) {
            wait -= dt;
            if (wait <= 0) {
              const slot = live.indexOf(0);
              if (slot >= 0) launch(slot, Math.random);
              wait = lo + (hi - lo) * Math.random();
            }
            for (let s = 0; s < SLOTS; s++) {
              if (!live[s]) continue;
              age[s] += dt;
              if (age[s] >= life[s]) live[s] = 0;
            }
          }
          if (dirty || live.includes(1) || dt === 0) draw();
        },
        still: () => {
          live.fill(0);
          const rng = createRng("star-field:still");
          launch(0, rng);
          age[0] = life[0] * 0.32;
          draw();
        },
      };
    },
    reduce,
    [minDelay, maxDelay, minSpeed, maxSpeed, a0, a1, color, trailColor],
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
