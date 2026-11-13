"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type DotMosaicShape = "circle" | "square";
export type DotMosaicDistortion = "repel" | "attract" | "swirl";
export type DotMosaicObjectFit = "cover" | "contain" | "fill";

export interface DotMosaicProps extends Omit<ComponentProps<"div">, "children"> {
  src: string;
  alt?: string;
  cellSize?: number;
  dotScale?: number;
  shape?: DotMosaicShape;
  interactive?: boolean;
  distortionMode?: DotMosaicDistortion;
  distortionRadius?: number;
  distortionStrength?: number;
  dropout?: number;
  grayscale?: boolean;
  tint?: string;
  tintStrength?: number;
  objectFit?: DotMosaicObjectFit;
  maxFps?: number;
}

const STIFFNESS = 170;
const DAMPING = 14;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const NIGHT = "--miyuki-dot-mosaic-night";
const MIN_DOT = 0.24;
const DAY_GAMMA = 0.85;
const DAY_CHROMA = 1.25;
const NIGHT_GAMMA = 0.7;

export function DotMosaic({
  src,
  alt,
  cellSize = 4,
  dotScale = 0.9,
  shape = "circle",
  interactive = true,
  distortionMode = "repel",
  distortionRadius = 90,
  distortionStrength = 1,
  dropout = 0.3,
  grayscale = false,
  tint,
  tintStrength = 0.35,
  objectFit = "cover",
  maxFps = 60,
  className,
  style,
  ...props
}: DotMosaicProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const glowCanvas = glowRef.current;
    const ctx = canvas?.getContext("2d");
    const gctx = glowCanvas?.getContext("2d");
    const still = document.createElement("canvas");
    const sctx = still.getContext("2d");
    if (!root || !canvas || !glowCanvas || !ctx || !gctx || !sctx) return;

    const live = interactive && !reduced;
    const cell = Math.max(2, cellSize);
    const radius = Math.max(8, distortionRadius);
    const minFrame = 1000 / Math.max(1, maxFps);

    let image: HTMLImageElement | null = null;
    let disposed = false;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let cellPx = 0;
    let originX = 0;
    let originY = 0;
    let count = 0;
    let slot = new Int32Array(0);
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let ox = new Float32Array(0);
    let oy = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let col: string[] = [];
    let size = new Float32Array(0);
    let night = false;
    let busy = new Uint8Array(0);
    let active: number[] = [];

    const pointer = { x: 0, y: 0, inside: false };
    let raf = 0;
    let last = 0;
    let onScreen = true;

    const fit = () => {
      if (!image) return null;
      const iw = image.naturalWidth || 1;
      const ih = image.naturalHeight || 1;
      if (objectFit === "fill") return { sx: 0, sy: 0, sw: iw, sh: ih, dx: 0, dy: 0, dw: w, dh: h };
      if (objectFit === "contain") {
        const s = Math.min(w / iw, h / ih);
        return { sx: 0, sy: 0, sw: iw, sh: ih, dx: (w - iw * s) / 2, dy: (h - ih * s) / 2, dw: iw * s, dh: ih * s };
      }
      const s = Math.max(w / iw, h / ih);
      const sw = w / s;
      const sh = h / s;
      return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh, dx: 0, dy: 0, dw: w, dh: h };
    };

    const build = () => {
      const f = fit();
      if (!image || !f || !w || !h) return;
      cols = Math.floor(w / cell);
      rows = Math.floor(h / cell);
      cellPx = Math.max(1, Math.round(cell * dpr));
      originX = Math.round(((w - cols * cell) / 2) * dpr);
      originY = Math.round(((h - rows * cell) / 2) * dpr);

      const k = 2;
      const probe = document.createElement("canvas");
      probe.width = cols * k;
      probe.height = rows * k;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) return;
      const scaleX = (cols * k) / (cols * cell);
      const scaleY = (rows * k) / (rows * cell);
      const offX = (w - cols * cell) / 2;
      const offY = (h - rows * cell) / 2;
      pctx.drawImage(
        image,
        f.sx,
        f.sy,
        f.sw,
        f.sh,
        (f.dx - offX) * scaleX,
        (f.dy - offY) * scaleY,
        f.dw * scaleX,
        f.dh * scaleY,
      );
      const data = pctx.getImageData(0, 0, cols * k, rows * k).data;
      const n = cols * rows;
      const rgb = new Float32Array(n * 3);
      const lum = new Float32Array(n);
      const alpha = new Float32Array(n);
      const stride = cols * k;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let R = 0;
          let G = 0;
          let B = 0;
          let A = 0;
          for (let y = 0; y < k; y++) {
            let o = ((r * k + y) * stride + c * k) * 4;
            for (let x = 0; x < k; x++, o += 4) {
              const a = data[o + 3];
              R += data[o] * a;
              G += data[o + 1] * a;
              B += data[o + 2] * a;
              A += a;
            }
          }
          const i = r * cols + c;
          alpha[i] = A / (k * k * 255);
          if (A > 0) {
            rgb[i * 3] = R / A;
            rgb[i * 3 + 1] = G / A;
            rgb[i * 3 + 2] = B / A;
          }
          lum[i] = (0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2]) / 255;
        }
      }

      const tintRgb = tint ? toRgba(tint, root) : null;
      const mix = clamp01(tintStrength);
      const floor = clamp01(dropout) * 0.3;
      night = cssVar(NIGHT, root) === "1";
      const ink = toRgba("var(--foreground)", root);

      const sorted = Float32Array.from(lum).sort();
      const lo = sorted[Math.floor(n * 0.01)] ?? 0;
      const hi = sorted[Math.floor(n * 0.996)] ?? 1;
      const span = Math.max(0.05, hi - lo);

      slot = new Int32Array(n).fill(-1);
      const keep: number[] = [];
      const cover = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        if (alpha[i] < 0.5) continue;
        const level = clamp01((lum[i] - lo) / span);
        const c = night ? level ** NIGHT_GAMMA : (1 - level) ** DAY_GAMMA;
        if (c < floor) continue;
        cover[i] = c;
        keep.push(i);
      }

      count = keep.length;
      hx = new Float32Array(count);
      hy = new Float32Array(count);
      ox = new Float32Array(count);
      oy = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      busy = new Uint8Array(count);
      size = new Float32Array(count);
      col = new Array(count);
      active = [];
      for (let d = 0; d < count; d++) {
        const i = keep[d];
        const c = i % cols;
        const r = (i - c) / cols;
        slot[i] = d;
        hx[d] = originX + (c + 0.5) * cellPx;
        hy[d] = originY + (r + 0.5) * cellPx;
        size[d] = cellPx * dotScale * (MIN_DOT + (1 - MIN_DOT) * Math.sqrt(cover[i]));
        let R = rgb[i * 3];
        let G = rgb[i * 3 + 1];
        let B = rgb[i * 3 + 2];
        if (grayscale) {
          const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          R = G = B = l;
        }
        if (tintRgb) {
          R += (tintRgb[0] * 255 - R) * mix;
          G += (tintRgb[1] * 255 - G) * mix;
          B += (tintRgb[2] * 255 - B) * mix;
        }
        if (night) {
          R = 255 * (R / 255) ** 0.62 * 0.92 + 20;
          G = 255 * (G / 255) ** 0.62 * 0.92 + 20;
          B = 255 * (B / 255) ** 0.62 * 0.92 + 20;
        } else {
          const grey = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          const pull = 0.04 + 0.14 * clamp01((lum[i] - lo) / span);
          R = grey + (R - grey) * DAY_CHROMA;
          G = grey + (G - grey) * DAY_CHROMA;
          B = grey + (B - grey) * DAY_CHROMA;
          R += (ink[0] * 255 - R) * pull;
          G += (ink[1] * 255 - G) * pull;
          B += (ink[2] * 255 - B) * pull;
        }
        const byte = (v: number) => Math.round(Math.min(255, Math.max(0, v)));
        col[d] = `rgb(${byte(R)},${byte(G)},${byte(B)})`;
      }
      paintStill();
      draw();
    };

    const dot = (g: CanvasRenderingContext2D, x: number, y: number, d: number) => {
      const s = size[d];
      if (shape === "square") g.rect(x - s / 2, y - s / 2, s, s);
      else {
        g.moveTo(x + s / 2, y);
        g.arc(x, y, s / 2, 0, Math.PI * 2);
      }
    };

    const paintStill = () => {
      still.width = canvas.width;
      still.height = canvas.height;
      sctx.clearRect(0, 0, still.width, still.height);
      const groups = new Map<string, number[]>();
      for (let d = 0; d < count; d++) {
        const list = groups.get(col[d]);
        if (list) list.push(d);
        else groups.set(col[d], [d]);
      }
      for (const [fill, list] of groups) {
        sctx.fillStyle = fill;
        sctx.beginPath();
        for (const d of list) dot(sctx, hx[d], hy[d], d);
        sctx.fill();
      }
    };

    const draw = () => {
      paint();
      gctx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      if (night) gctx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
    };

    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(still, 0, 0);
      if (!active.length) return;
      const half = cellPx / 2;
      for (const d of active) ctx.clearRect(hx[d] - half, hy[d] - half, cellPx, cellPx);
      for (const d of active) {
        ctx.fillStyle = col[d];
        ctx.beginPath();
        dot(ctx, hx[d] + ox[d], hy[d] + oy[d], d);
        ctx.fill();
      }
    };

    const target = (d: number, out: { x: number; y: number }) => {
      out.x = 0;
      out.y = 0;
      if (!pointer.inside) return false;
      const R = radius * dpr;
      const dx = hx[d] - pointer.x * dpr;
      const dy = hy[d] - pointer.y * dpr;
      const dist = Math.hypot(dx, dy);
      if (dist >= R) return false;
      const q = 1 - (dist / R) * (dist / R);
      const f = q * q * distortionStrength;
      const ux = dist > 0.001 ? dx / dist : 0;
      const uy = dist > 0.001 ? dy / dist : 0;
      if (distortionMode === "attract") {
        const pull = Math.min(dist * 0.8, R * 0.32 * f);
        out.x = -ux * pull;
        out.y = -uy * pull;
      } else if (distortionMode === "swirl") {
        const angle = 1.15 * f;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        out.x = dx * cos - dy * sin - dx - ux * R * 0.06 * f;
        out.y = dx * sin + dy * cos - dy - uy * R * 0.06 * f;
      } else {
        out.x = ux * R * 0.36 * f;
        out.y = uy * R * 0.36 * f;
      }
      return true;
    };

    const near: number[] = [];
    const goal = { x: 0, y: 0 };

    const step = (dt: number) => {
      near.length = 0;
      if (pointer.inside && cols) {
        const R = radius * dpr;
        const c0 = Math.max(0, Math.floor((pointer.x * dpr - R - originX) / cellPx));
        const c1 = Math.min(cols - 1, Math.ceil((pointer.x * dpr + R - originX) / cellPx));
        const r0 = Math.max(0, Math.floor((pointer.y * dpr - R - originY) / cellPx));
        const r1 = Math.min(rows - 1, Math.ceil((pointer.y * dpr + R - originY) / cellPx));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const d = slot[r * cols + c];
            if (d < 0) continue;
            near.push(d);
            if (!busy[d]) {
              busy[d] = 1;
              active.push(d);
            }
          }
        }
      }
      const next: number[] = [];
      const k = STIFFNESS;
      const damp = DAMPING;
      const settle = 0.05 * dpr;
      for (const d of active) {
        target(d, goal);
        const ax = k * (goal.x - ox[d]) - damp * vx[d];
        const ay = k * (goal.y - oy[d]) - damp * vy[d];
        vx[d] += ax * dt;
        vy[d] += ay * dt;
        ox[d] += vx[d] * dt;
        oy[d] += vy[d] * dt;
        const resting =
          Math.abs(ox[d] - goal.x) < settle &&
          Math.abs(oy[d] - goal.y) < settle &&
          Math.abs(vx[d]) < 2 &&
          Math.abs(vy[d]) < 2;
        if (resting && goal.x === 0 && goal.y === 0) {
          ox[d] = oy[d] = vx[d] = vy[d] = 0;
          busy[d] = 0;
        } else next.push(d);
      }
      active = next;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!onScreen || document.hidden) return;
      const elapsed = last ? now - last : 16;
      if (elapsed < minFrame - 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      let dt = Math.min(0.033, elapsed / 1000);
      while (dt > 0) {
        const s = Math.min(dt, 1 / 120);
        step(s);
        dt -= s;
      }
      draw();
      if (active.length || pointer.inside) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && onScreen && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const resize = () => {
      const nw = root.clientWidth;
      const nh = root.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      glowCanvas.width = Math.max(1, Math.round(w / 2));
      glowCanvas.height = Math.max(1, Math.round(h / 2));
      build();
    };

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - box.left) * w) / (box.width || 1);
      pointer.y = ((e.clientY - box.top) * h) / (box.height || 1);
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      wake();
    };

    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen && active.length) wake();
    });
    const onVisibility = () => {
      if (!document.hidden && active.length) wake();
    };
    const offTheme = onThemeChange(() => build());

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img
      .decode()
      .then(() => {
        if (disposed) return;
        image = img;
        root.style.setProperty("--miyuki-dot-mosaic-aspect", `${img.naturalWidth || 16} / ${img.naturalHeight || 10}`);
        w = 0;
        resize();
        ro.observe(root);
        io.observe(root);
      })
      .catch(() => {});

    document.addEventListener("visibilitychange", onVisibility);
    if (live) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerdown", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointercancel", onLeave);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      offTheme();
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
    };
  }, [
    src,
    cellSize,
    dotScale,
    shape,
    interactive,
    distortionMode,
    distortionRadius,
    distortionStrength,
    dropout,
    grayscale,
    tint,
    tintStrength,
    objectFit,
    maxFps,
    reduced,
  ]);

  return (
    <div
      {...props}
      ref={rootRef}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={cn(
        "relative isolate w-full aspect-(--miyuki-dot-mosaic-aspect)",
        "[--miyuki-dot-mosaic-night:0] dark:[--miyuki-dot-mosaic-night:1]",
        className,
      )}
      style={{ "--miyuki-dot-mosaic-aspect": "16 / 10", ...style } as CSSProperties}
    >
      <canvas
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block size-full opacity-70 blur-[6px] mix-blend-screen"
      />
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />
    </div>
  );
}
