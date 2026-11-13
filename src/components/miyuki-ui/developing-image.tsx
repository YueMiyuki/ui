"use client";

import { useReducedMotion } from "motion/react";
import { type HTMLAttributes, type Ref, useEffect, useLayoutEffect, useRef } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface DevelopingImageProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  src: string;
  alt?: string;
  progress?: number;
  duration?: number;
  cellSize?: number;
  gap?: number;
  bandHeight?: number;
  effect?: "shimmer" | "wave";
  colors?: string[];
  onDone?: () => void;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--brand-soft)"];

type Rgb = [number, number, number];

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const css = ([r, g, b]: Rgb, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
const rgb = (c: Rgba): Rgb => [c[0] * 255, c[1] * 255, c[2] * 255];

function hash(c: number, r: number) {
  let h = Math.imul(c | 0, 0x27d4eb2d) ^ Math.imul(r | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

interface Area {
  w: number;
  h: number;
  x: number;
  y: number;
  gw: number;
  gh: number;
}

function sampleCover(img: HTMLImageElement, cols: number, rows: number, area: Area) {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g || !img.naturalWidth || !img.naturalHeight) return null;
  const scale = Math.max(area.w / img.naturalWidth, area.h / img.naturalHeight);
  const ix = (area.w - img.naturalWidth * scale) / 2;
  const iy = (area.h - img.naturalHeight * scale) / 2;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, (area.x - ix) / scale, (area.y - iy) / scale, area.gw / scale, area.gh / scale, 0, 0, cols, rows);
  try {
    return g.getImageData(0, 0, cols, rows).data;
  } catch {
    return null;
  }
}

export function DevelopingImage({
  src,
  alt = "",
  progress,
  duration = 4,
  cellSize = 10,
  gap = 2,
  bandHeight = 0.25,
  effect = "shimmer",
  colors = DEFAULT_COLORS,
  onDone,
  className,
  ...props
}: DevelopingImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const reduce = useReducedMotion();
  const target = useRef(progress);
  const finished = useRef(onDone);
  const palette = (colors.length > 0 ? colors : DEFAULT_COLORS).join("|");
  const controlled = progress !== undefined;

  const wake = useRef<() => void>(undefined);

  useEffect(() => {
    target.current = progress;
    finished.current = onDone;
    wake.current?.();
  });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    img.style.opacity = "0";
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const root = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !img || !ctx) return;

    const cell = Math.max(3, cellSize);
    const space = Math.max(0, gap);
    const pitch = cell + space;
    const band = clamp(bandHeight, 0.05, 0.8);
    const lap = Math.max(0.3, duration);
    const tones = palette.split("|");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let ox = 0;
    let oy = 0;
    let coarse: Uint8ClampedArray | null = null;
    let fine: Uint8ClampedArray | null = null;
    let soft: Uint8ClampedArray | null = null;
    let wash: HTMLCanvasElement | null = null;
    let haze: HTMLCanvasElement | null = null;
    let base: Rgb = [240, 244, 248];
    let ink: Rgb = [30, 40, 60];
    let glow: Rgb = [255, 255, 255];
    let water: Rgb[] = [];
    let night = false;
    let loaded = false;
    let raf = 0;
    let last = 0;
    let time = 0;
    let shown = controlled ? clamp(target.current ?? 0) : 0;
    let fading = false;
    let onScreen = true;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const readColors = () => {
      base = rgb(toRgba("var(--muted)", canvas));
      ink = rgb(toRgba("var(--foreground)", canvas));
      const bg = toRgba("var(--background)", canvas);
      night = bg[0] + bg[1] + bg[2] < 1.2;
      glow = night ? [255, 255, 255] : rgb(toRgba("var(--card)", canvas));
      water = tones.map((t) => rgb(toRgba(t, canvas)));
    };

    const pixel = (data: Uint8ClampedArray | null, stride: number, c: number, r: number): Rgb | null => {
      if (!data) return null;
      const i = (r * stride + c) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    const sample = () => {
      if (!loaded || !cols) return;
      const area = { w, h, x: ox, y: oy, gw: cols * pitch, gh: rows * pitch };
      coarse = sampleCover(img, cols, rows, area);
      fine = sampleCover(img, cols * 2, rows * 2, area);
      const tiny = sampleCover(img, 6, 4, area);
      if (tiny) {
        const up = document.createElement("canvas");
        up.width = cols;
        up.height = rows;
        const g = up.getContext("2d", { willReadFrequently: true });
        const small = document.createElement("canvas");
        small.width = 6;
        small.height = 4;
        small.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(tiny), 6, 4), 0, 0);
        wash = small;
        if (g) {
          g.imageSmoothingQuality = "high";
          g.drawImage(small, 0, 0, cols, rows);
          soft = g.getImageData(0, 0, cols, rows).data;
        }
      }
    };

    const hazeColor = (c: number, r: number): Rgb => {
      const jitter = hash(c, r) - 0.5;
      let col = base;
      const tint = pixel(soft, cols, c, r);
      if (tint) col = mix(col, tint, night ? 0.28 : 0.22);
      return mix(col, jitter > 0 ? glow : ink, Math.abs(jitter) * (night ? 0.08 : 0.06));
    };

    const buildHaze = () => {
      if (!w || !h) return;
      haze = document.createElement("canvas");
      haze.width = canvas.width;
      haze.height = canvas.height;
      const g = haze.getContext("2d");
      if (!g) return;
      g.scale(dpr, dpr);
      g.fillStyle = css(base);
      g.fillRect(0, 0, w, h);
      if (wash) {
        g.globalAlpha = night ? 0.24 : 0.2;
        g.imageSmoothingQuality = "high";
        g.drawImage(wash, ox, oy, cols * pitch, rows * pitch);
        g.globalAlpha = 1;
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          g.fillStyle = css(hazeColor(c, r));
          g.beginPath();
          g.roundRect(ox + c * pitch, oy + r * pitch, cell, cell, Math.min(2.5, cell / 4));
          g.fill();
        }
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!w || !h || !haze) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bandH = Math.max(pitch * 2, band * h);
      const zone = Math.max(pitch * 4, bandH * 0.9);
      const bottom = shown * h;
      const top = bottom - bandH;

      if (bottom < h) {
        const y0 = Math.max(0, bottom);
        ctx.drawImage(haze, 0, y0 * dpr, canvas.width, (h - y0) * dpr, 0, y0, w, h - y0);
      }

      const still = !!reduce;
      const radius = Math.min(2.5, cell / 4);

      if (bottom > 0) {
        const first = Math.max(0, Math.ceil((top - oy - cell / 2) / pitch));
        const bandTop = Math.max(0, oy + first * pitch - space / 2);
        ctx.fillStyle = css(base);
        ctx.fillRect(0, bandTop, w, Math.max(0, Math.min(h, bottom) - bandTop));
        const r0 = first;
        const r1 = Math.min(rows - 1, Math.ceil((bottom - oy) / pitch));
        for (let r = r0; r <= r1; r++) {
          const cy = oy + r * pitch + cell / 2;
          if (cy < top || cy > bottom) continue;
          const v = (cy - top) / bandH;
          for (let c = 0; c < cols; c++) {
            const seed = hash(c + 911, r + 37);
            const tone = water[Math.floor(seed ** 1.7 * water.length)] ?? glow;
            let s: number;
            if (still) s = 0.5;
            else if (effect === "wave") s = 0.5 + 0.5 * Math.sin(c * 0.42 - time * 3.2 + r * 0.55);
            else s = 0.5 + 0.5 * Math.sin(time * (2.2 + seed * 4.5) + seed * 40);
            const picture = pixel(coarse, cols, c, r);
            const m = smooth(0.05, 0.95, v);
            let col = picture ? mix(picture, tone, 0.12 + m * 0.7) : tone;
            col = mix(col, glow, s * (night ? 0.45 : 0.4) * (0.4 + m * 0.6));
            const k = 0.62 + 0.38 * s;
            const size = cell * k;
            const inset = (cell - size) / 2;
            ctx.fillStyle = css(col, 0.55 + 0.45 * s);
            ctx.beginPath();
            ctx.roundRect(ox + c * pitch + inset, oy + r * pitch + inset, size, size, radius * k);
            ctx.fill();
          }
        }

        const edge = Math.min(h, bottom);
        const lead = water[0] ?? glow;
        const sheen = ctx.createLinearGradient(0, edge - 14, 0, edge);
        sheen.addColorStop(0, css(lead, 0));
        sheen.addColorStop(1, css(night ? mix(lead, glow, 0.35) : lead, night ? 0.55 : 0.4));
        ctx.fillStyle = sheen;
        ctx.fillRect(0, edge - 14, w, 14);
        ctx.fillStyle = css(night ? mix(lead, glow, 0.5) : lead, 0.9);
        ctx.fillRect(0, edge - 1.5, w, 1.5);
      }

      if (top > 0 && (coarse || fine)) {
        const z0 = Math.max(0, top - zone);
        const r0 = Math.max(0, Math.floor((z0 - oy) / pitch));
        const r1 = Math.min(rows - 1, Math.ceil((top - oy) / pitch));
        const half = pitch / 2;
        const small = Math.max(1, half - space / 2);
        for (let r = r0; r <= r1; r++) {
          for (let sub = 0; sub < 2; sub++) {
            const fy = oy + r * pitch + sub * half;
            const fcy = fy + small / 2;
            if (fcy > top) continue;
            const u = (top - fcy) / zone;
            if (u > 1) continue;
            const a = smooth(0.08, 0.42, u) * (1 - smooth(0.42, 1, u));
            if (a < 0.02) continue;
            for (let c = 0; c < cols * 2; c++) {
              const col = pixel(fine, cols * 2, c, r * 2 + sub);
              if (!col) continue;
              ctx.fillStyle = css(col, a);
              ctx.fillRect(ox + c * half, fy, small, small);
            }
          }
          const cy = oy + r * pitch + cell / 2;
          if (cy > top) continue;
          const u = (top - cy) / zone;
          const a = 1 - smooth(0, 0.55, u);
          if (a < 0.02) continue;
          for (let c = 0; c < cols; c++) {
            const col = pixel(coarse, cols, c, r);
            if (!col) continue;
            ctx.fillStyle = css(col, a);
            ctx.beginPath();
            ctx.roundRect(ox + c * pitch, oy + r * pitch, cell, cell, radius);
            ctx.fill();
          }
        }
      }
    };

    const finish = () => {
      if (fading) return;
      fading = true;
      canvas.style.transition = `opacity ${reduce ? 150 : 520}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      canvas.style.opacity = "0";
      fadeTimer = setTimeout(
        () => {
          stop();
          root?.setAttribute("aria-busy", "false");
          finished.current?.();
        },
        reduce ? 160 : 540,
      );
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = last ? Math.min(0.25, (now - last) / 1000) : 0;
      const dt = Math.min(0.05, elapsed);
      last = now;
      time += dt;
      if (controlled) {
        const goal = clamp(target.current ?? 0);
        shown += (goal - shown) * (1 - Math.exp(-dt * 6));
        if (Math.abs(goal - shown) < 0.0005) shown = goal;
      } else {
        shown = clamp(shown + elapsed / lap);
      }
      draw();
      if (shown >= 1) finish();
      else if (fading) {
        fading = false;
        clearTimeout(fadeTimer);
        canvas.style.transition = "none";
        canvas.style.opacity = "1";
        root?.setAttribute("aria-busy", "true");
      }
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !(fading && shown >= 1);
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        stop();
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
      cols = Math.max(1, Math.ceil((w + space) / pitch));
      rows = Math.max(1, Math.ceil((h + space) / pitch));
      ox = (w - (cols * pitch - space)) / 2;
      oy = (h - (rows * pitch - space)) / 2;
      sample();
      buildHaze();
      draw();
      img.style.opacity = "1";
    };

    const onLoad = () => {
      loaded = true;
      sample();
      buildHaze();
      draw();
    };

    wake.current = () => {
      if (controlled && clamp(target.current ?? 0) !== shown) {
        if (fading && clamp(target.current ?? 0) < 1) shown = Math.min(shown, 0.9999);
        sync();
      }
    };
    root?.setAttribute("aria-busy", "true");
    readColors();
    if (img.complete && img.naturalWidth) onLoad();
    img.addEventListener("load", onLoad);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      buildHaze();
      draw();
    });
    resize();
    sync();

    return () => {
      stop();
      wake.current = undefined;
      clearTimeout(fadeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      img.removeEventListener("load", onLoad);
      offTheme();
    };
  }, [src, duration, cellSize, gap, bandHeight, effect, palette, reduce, controlled]);

  return (
    <div aria-busy="true" {...props} className={cn("relative isolate overflow-hidden bg-muted", className)}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        style={{ opacity: 0 }}
      />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />
    </div>
  );
}
