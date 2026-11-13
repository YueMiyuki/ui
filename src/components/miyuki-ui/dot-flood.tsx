"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type DotFloodOrigin = "center" | "pointer";

export interface DotFloodProps extends ComponentProps<"div"> {
  active?: boolean;
  colors?: string[];
  dotSize?: number;
  gap?: number;
  speed?: number;
  origin?: DotFloodOrigin;
}

const DEFAULT_COLORS = ["var(--brand)"];
const LEVELS = [0.16, 0.3, 0.46, 0.66, 1];
const WEIGHTS = [0.26, 0.28, 0.22, 0.16, 0.08];
const STEPS = 16;
const MAX_DOTS = 80_000;
const RAGGED = 26;
const REVEAL = 0.62;
const RECEDE = 0.34;
const FADE_IN = 0.14;
const FADE_OUT = 0.08;
const POINTER_WINDOW = 400;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isNight(el: Element) {
  const [r, g, b] = toRgba("var(--background)", el);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;

function pickLevel(roll: number) {
  let acc = 0;
  for (let i = 0; i < WEIGHTS.length; i++) {
    acc += WEIGHTS[i];
    if (roll < acc) return i;
  }
  return WEIGHTS.length - 1;
}

export function DotFlood({
  active,
  colors = DEFAULT_COLORS,
  dotSize = 3,
  gap = 5,
  speed = 1,
  origin = "center",
  className,
  ...props
}: DotFloodProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlRef = useRef<((on: boolean) => void) | null>(null);
  const reduce = !!useReducedMotion();
  const palette = (colors.length > 0 ? colors : DEFAULT_COLORS).slice(0, 3);
  const paletteKey = palette.join("|");
  const on = active ?? true;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const tints = paletteKey.split("|");
    const pace = Math.max(0.05, speed);
    const still = reduce;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let n = 0;
    let size = 1;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let dist = new Float32Array(0);
    let rough = new Float32Array(0);
    let hue = new Uint8Array(0);
    let level = new Uint8Array(0);
    let next = new Float32Array(0);
    let presence = new Float32Array(0);
    let target = new Uint8Array(0);
    let order = new Int32Array(0);
    const counts = new Int32Array(3 * STEPS);
    const starts = new Int32Array(3 * STEPS);

    let fills: string[] = [];
    let peak = 1;
    let mode: "idle" | "reveal" | "recede" | "shown" = "idle";
    let want = false;
    let progress = 0;
    let reach = 0;
    let time = 0;
    let raf = 0;
    let last = 0;
    let onScreen = false;
    const entry = { x: 0, y: 0, at: -1e9 };
    const exit = { x: 0, y: 0, at: -1e9 };

    const readColors = () => {
      const night = isNight(canvas);
      peak = night ? 0.95 : 0.8;
      fills = [];
      for (let c = 0; c < 3; c++) {
        const tint = tints[c % tints.length];
        const [r, g, b, a] = toRgba(night ? tint : `color-mix(in oklab, ${tint} 88%, var(--foreground))`, canvas);
        for (let q = 0; q < STEPS; q++) {
          fills.push(
            `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${((a * q) / (STEPS - 1)).toFixed(3)})`,
          );
        }
      }
    };

    const layout = () => {
      size = Math.max(1, Math.round(dotSize * dpr));
      const pitch = Math.max(size + 1, Math.round((dotSize + Math.max(0, gap)) * dpr));
      const W = Math.round(w * dpr);
      const H = Math.round(h * dpr);
      let cols = Math.max(0, Math.floor((W - size) / pitch) + 1);
      let rows = Math.max(0, Math.floor((H - size) / pitch) + 1);
      while (cols * rows > MAX_DOTS) {
        cols = Math.floor(cols * 0.9);
        rows = Math.floor(rows * 0.9);
      }
      const ox = Math.floor((W - ((cols - 1) * pitch + size)) / 2);
      const oy = Math.floor((H - ((rows - 1) * pitch + size)) / 2);
      n = cols * rows;
      px = new Float32Array(n);
      py = new Float32Array(n);
      dist = new Float32Array(n);
      rough = new Float32Array(n);
      hue = new Uint8Array(n);
      level = new Uint8Array(n);
      next = new Float32Array(n);
      presence = new Float32Array(n);
      target = new Uint8Array(n);
      order = new Int32Array(n);
      const rng = createRng(`dot-flood:${cols}x${rows}`);
      const shown = mode === "shown" || mode === "reveal";
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, i++) {
          px[i] = ox + c * pitch;
          py[i] = oy + r * pitch;
          rough[i] = rng() * RAGGED;
          hue[i] = Math.floor(rng() * tints.length);
          level[i] = pickLevel(rng());
          next[i] = rng() * 0.6;
          presence[i] = shown ? 1 : 0;
          target[i] = shown ? 1 : 0;
        }
      }
      if (mode === "reveal") mode = "shown";
    };

    const aim = (x: number, y: number) => {
      const fx = x * dpr;
      const fy = y * dpr;
      let far = 0;
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(px[i] - fx, py[i] - fy) / dpr + rough[i];
        dist[i] = d;
        if (d > far) far = d;
      }
      reach = far;
    };

    const pointFor = (mark: { x: number; y: number; at: number }) => {
      if (origin === "pointer" && performance.now() - mark.at < POINTER_WINDOW) {
        return [clamp(mark.x, 0, w), clamp(mark.y, 0, h)] as const;
      }
      return [w / 2, h / 2] as const;
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      counts.fill(0);
      for (let i = 0; i < n; i++) {
        const p = presence[i];
        if (p <= 0) continue;
        const q = Math.round(p * LEVELS[level[i]] * peak * (STEPS - 1));
        if (q > 0) counts[hue[i] * STEPS + q]++;
      }
      let sum = 0;
      for (let b = 0; b < counts.length; b++) {
        starts[b] = sum;
        sum += counts[b];
      }
      if (sum === 0) return;
      counts.fill(0);
      for (let i = 0; i < n; i++) {
        const p = presence[i];
        if (p <= 0) continue;
        const q = Math.round(p * LEVELS[level[i]] * peak * (STEPS - 1));
        if (q <= 0) continue;
        const b = hue[i] * STEPS + q;
        order[starts[b] + counts[b]++] = i;
      }
      for (let b = 0; b < counts.length; b++) {
        const count = counts[b];
        if (count === 0) continue;
        ctx.fillStyle = fills[b];
        ctx.beginPath();
        const from = starts[b];
        for (let k = 0; k < count; k++) {
          const i = order[from + k];
          ctx.rect(px[i], py[i], size, size);
        }
        ctx.fill();
      }
    };

    const step = (dt: number) => {
      time += dt;
      if (mode === "reveal" || mode === "recede") {
        const span = (mode === "reveal" ? REVEAL : RECEDE) / pace;
        progress = still ? 1 : Math.min(1, progress + dt / span);
        const front =
          mode === "reveal" ? easeOut(progress) * (reach + 1) : (1 - easeIn(progress)) * (reach + 1) - RAGGED;
        for (let i = 0; i < n; i++) {
          const inside = dist[i] <= front;
          if (mode === "reveal") {
            if (inside && !target[i]) {
              target[i] = 1;
              if (!still) {
                level[i] = LEVELS.length - 1;
                next[i] = time + (0.12 + Math.random() * 0.2) / pace;
              }
            }
          } else if (!inside) {
            target[i] = 0;
          }
        }
        if (progress >= 1) mode = mode === "reveal" ? "shown" : "idle";
      }

      const rise = dt / (still ? 0.16 : FADE_IN / pace);
      const fall = dt / (still ? 0.12 : FADE_OUT / pace);
      let lit = false;
      for (let i = 0; i < n; i++) {
        let p = presence[i];
        if (target[i]) p = Math.min(1, p + rise);
        else if (p > 0) p = Math.max(0, p - fall);
        presence[i] = p;
        if (p > 0) lit = true;
        if (!still && p > 0 && time >= next[i]) {
          level[i] = pickLevel(Math.random());
          next[i] = time + (0.1 + Math.random() * 0.55) / pace;
        }
      }
      draw();
      return lit || mode === "reveal" || mode === "recede";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 1 / 60;
      last = now;
      const busy = step(dt);
      const settled = still ? mode === "shown" && presence.every((p) => p >= 1) : false;
      if ((!busy && mode === "idle") || settled) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const sync = () => {
      const needed = want || mode !== "idle" || presence.some((p) => p > 0);
      const run =
        onScreen && !document.hidden && needed && !(still && mode === "shown" && !presence.some((p) => p < 1));
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const set = (value: boolean) => {
      if (value === want && mode !== "idle") return;
      if (!value && mode === "idle" && !presence.some((p) => p > 0)) return;
      want = value;
      if (value) {
        const [x, y] = pointFor(entry);
        aim(x, y);
        mode = "reveal";
      } else {
        const [x, y] = pointFor(exit);
        aim(x, y);
        mode = "recede";
      }
      progress = 0;
      sync();
    };
    controlRef.current = set;

    const local = (event: PointerEvent, mark: { x: number; y: number; at: number }) => {
      const box = canvas.getBoundingClientRect();
      mark.x = event.clientX - box.left;
      mark.y = event.clientY - box.top;
      mark.at = performance.now();
    };
    const onEnter = (event: PointerEvent) => local(event, entry);
    const onLeave = (event: PointerEvent) => local(event, exit);

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
      layout();
      if (want && mode !== "shown") {
        const [x, y] = pointFor(entry);
        aim(x, y);
      }
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerdown", onEnter);
    host.addEventListener("pointerleave", onLeave);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    readColors();
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      controlRef.current = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerdown", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      offTheme();
    };
  }, [paletteKey, dotSize, gap, speed, origin, reduce]);

  useEffect(() => {
    controlRef.current?.(on);
  }, [on, paletteKey, dotSize, gap, speed, origin, reduce]);

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
