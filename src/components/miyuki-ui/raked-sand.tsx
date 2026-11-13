"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface RakedSandProps extends ComponentProps<"div"> {
  spacing?: number;
  lineColor?: string;
  shade?: number;
}

type Vec3 = [number, number, number];

interface Stone {
  left: number;
  top: number;
  right: number;
  bottom: number;
  radius: number;
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  r: number;
}

const NIGHT = "--miyuki-raked-sand-night";
const RINGS = 4;
const TINES = 5;
const SETTLE = 1.4;
const FRESH_CELL = 4;
const LIGHT: Vec3 = (() => {
  const v: Vec3 = [-0.42, -0.62, 0.66];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r * 255, g * 255, b * 255];
}

function sdRound(px: number, py: number, cx: number, cy: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

const LUT = 2048;
const PROFILE = (() => {
  const out = new Float32Array(LUT + 1);
  for (let i = 0; i <= LUT; i++) {
    const c = 0.5 + 0.5 * Math.cos((i / LUT) * Math.PI * 2);
    out[i] = 1 - c * Math.sqrt(c);
  }
  return out;
})();

function profile(u: number) {
  const f = u - Math.floor(u);
  return PROFILE[(f * LUT) | 0];
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(512);
  for (let i = 0; i < 512; i++) table[i] = rng();
  const at = (x: number, y: number) => table[((x & 255) + ((y * 71) & 255)) & 511];
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
}

export function RakedSand({ spacing = 9, lineColor, shade = 0.6, className, children, ...props }: RakedSandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dampRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wet = dampRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    const wctx = wet?.getContext("2d");
    if (!root || !canvas || !ctx || !wet || !wctx) return;

    const still = !!reduce;
    const s = Math.max(4, spacing);
    const strength = clamp(shade, 0, 1);
    const noise = makeNoise("raked-sand");
    const grainRng = createRng("raked-sand:grain");
    const grain = new Float32Array(256 * 256);
    for (let i = 0; i < grain.length; i++) grain[i] = grainRng();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cw = 0;
    let ch = 0;
    let hgt = new Float32Array(0);
    let fw = 0;
    let fh = 0;
    let fresh = new Float32Array(0);
    let wetImage: ImageData | null = null;
    let wetUntil = -1;
    let image: ImageData | null = null;
    let pixels = new Uint32Array(0);
    let stones: Stone[] = [];
    let night = false;
    let base: Vec3 = [240, 244, 248];
    let lit: Vec3 = [255, 255, 255];
    let dark: Vec3 = [80, 100, 130];
    let damp: Vec3 = [120, 130, 150];

    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    const rake = { down: false, id: -1, x: 0, y: 0, hx: 0, hy: 0, has: false };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      if (night) {
        base = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--background) 86%, var(--foreground)) 92%, var(--brand))",
          canvas,
        );
        lit = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--foreground) 50%, var(--background)) 85%, var(--brand))",
          canvas,
        );
        dark = rgb(lineColor ?? "color-mix(in oklab, var(--background) 70%, black)", canvas);
        damp = rgb("color-mix(in oklab, var(--background) 92%, var(--brand))", canvas);
      } else {
        base = rgb("color-mix(in oklab, var(--background) 55%, var(--card))", canvas);
        lit = rgb("var(--card)", canvas);
        dark = rgb(lineColor ?? "color-mix(in oklab, var(--brand) 42%, var(--foreground))", canvas);
        damp = rgb(
          "color-mix(in oklab, var(--background) 78%, color-mix(in oklab, var(--brand) 50%, var(--foreground)))",
          canvas,
        );
      }
    };

    const measureStones = () => {
      const box = root.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      const gap = s * 0.55;
      stones = Array.from(root.querySelectorAll<HTMLElement>("[data-stone]")).map((el) => {
        const r = el.getBoundingClientRect();
        const left = (r.left - box.left) * sx;
        const top = (r.top - box.top) * sy;
        const right = (r.right - box.left) * sx;
        const bottom = (r.bottom - box.top) * sy;
        const radius = Math.min(
          parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
          (right - left) / 2,
          (bottom - top) / 2,
        );
        const vt = Math.floor((top - gap) / s) * s;
        const vb = Math.ceil((bottom + gap) / s) * s;
        const e = (top - vt + (vb - bottom)) / 2;
        const hx = (right - left) / 2 + e;
        const hy = (vb - vt) / 2;
        return {
          left,
          top,
          right,
          bottom,
          radius,
          cx: (left + right) / 2,
          cy: (vt + vb) / 2,
          hx,
          hy,
          r: Math.min(radius + e, hx, hy),
        };
      });
    };

    const warp = (x: number, y: number) =>
      (noise(x / 230 + y / 1400, y / 900) - 0.5) * 3.2 + (noise(x / 61 + 17, y / 300 + 3) - 0.5) * 1.1;

    const WARP_STEP = 4;
    let warpRow = new Float32Array(0);

    const fillRows = (py0: number, py1: number) => {
      const zone = RINGS * s;
      const reach = zone + s;
      const cols = Math.ceil(w / WARP_STEP) + 2;
      if (warpRow.length < cols) warpRow = new Float32Array(cols);
      for (let py = py0; py < py1; py++) {
        const y = (py + 0.5) / dpr;
        for (let c = 0; c < cols; c++) warpRow[c] = warp(c * WARP_STEP, y);
        const near = stones.filter((st) => y > st.cy - st.hy - reach - 4 && y < st.cy + st.hy + reach + 4);
        const row = py * cw;
        for (let px = 0; px < cw; px++) {
          const x = (px + 0.5) / dpr;
          const cf = x / WARP_STEP;
          const ci = cf | 0;
          const yw = y + warpRow[ci] + (warpRow[ci + 1] - warpRow[ci]) * (cf - ci);
          const line = profile(yw / s);
          let d = Infinity;
          for (let k = 0; k < near.length; k++) {
            const st = near[k];
            if (x < st.cx - st.hx - reach || x > st.cx + st.hx + reach) continue;
            const v = sdRound(x, yw, st.cx, st.cy, st.hx, st.hy, st.r);
            if (v < d) d = v;
          }
          hgt[row + px] = d < zone ? profile(d / s) : d < zone + s * 0.5 ? Math.min(profile(d / s), line) : line;
        }
      }
    };

    const shadeRect = (x0: number, y0: number, x1: number, y1: number) => {
      if (!image) return;
      const ax = clamp(Math.floor(x0 * dpr) - 1, 0, cw - 1);
      const ay = clamp(Math.floor(y0 * dpr) - 1, 0, ch - 1);
      const bx = clamp(Math.ceil(x1 * dpr) + 1, 0, cw - 1);
      const by = clamp(Math.ceil(y1 * dpr) + 1, 0, ch - 1);
      shadeRows(ax, ay, bx, by);
      ctx.putImageData(image, 0, 0, ax, ay, bx - ax + 1, by - ay + 1);
    };

    const shadeRows = (ax: number, ay: number, bx: number, by: number) => {
      const depth = s * 0.2 * (0.55 + 0.9 * strength);
      const kLit = night ? 1.1 * (0.4 + strength) : 0.95 * (0.4 + strength);
      const kDark = night ? 1.25 * (0.4 + strength) : 0.88 * (0.4 + strength);
      const [lx, ly, lz] = LIGHT;
      const near = stones.map((st) => [st.left - 18, st.top - 18, st.right + 22, st.bottom + 24] as const);
      for (let py = ay; py <= by; py++) {
        const row = py * cw;
        const up = py > 0 ? row - cw : row;
        const dn = py < ch - 1 ? row + cw : row;
        const y = (py + 0.5) / dpr;
        for (let px = ax; px <= bx; px++) {
          const i = row + px;
          const x = (px + 0.5) / dpr;
          const deep = depth * dpr * 0.5;
          const hx = (hgt[px < cw - 1 ? i + 1 : i] - hgt[px > 0 ? i - 1 : i]) * deep;
          const hy = (hgt[dn + px] - hgt[up + px]) * deep;
          const n = 1 / Math.sqrt(1 + hx * hx + hy * hy);
          const v = (-hx * lx - hy * ly + lz) * n - lz;
          let r = base[0];
          let g = base[1];
          let b = base[2];
          if (v > 0) {
            const t = Math.min(1, v * kLit);
            r += (lit[0] - r) * t;
            g += (lit[1] - g) * t;
            b += (lit[2] - b) * t;
          } else {
            const t = Math.min(1, -v * kDark);
            r += (dark[0] - r) * t;
            g += (dark[1] - g) * t;
            b += (dark[2] - b) * t;
          }
          const cave = (1 - hgt[i]) * (night ? 0.16 : 0.1) * (0.5 + strength);
          r += (dark[0] - r) * cave;
          g += (dark[1] - g) * cave;
          b += (dark[2] - b) * cave;
          for (let k = 0; k < stones.length; k++) {
            const box = near[k];
            if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
            const st = stones[k];
            const hxs = (st.right - st.left) / 2;
            const hys = (st.bottom - st.top) / 2;
            const cx = (st.left + st.right) / 2;
            const cy = (st.top + st.bottom) / 2;
            const cast = sdRound(x - 5, y - 7, cx, cy, hxs, hys, st.radius);
            const hug = sdRound(x, y, cx, cy, hxs, hys, st.radius);
            const t =
              Math.max(0, 1 - Math.max(0, cast + 2) / 14) ** 2 * 0.42 +
              Math.max(0, 1 - Math.max(0, hug) / 5) ** 2 * 0.3;
            if (t <= 0) continue;
            r += (dark[0] - r) * t;
            g += (dark[1] - g) * t;
            b += (dark[2] - b) * t;
          }
          const gr = grain[(px & 255) | ((py & 255) << 8)];
          const speck = gr > 0.992 ? 0.5 : gr < 0.006 ? -0.35 : 0;
          const k = 1 + (gr - 0.5) * (night ? 0.07 : 0.045);
          r = r * k;
          g = g * k;
          b = b * k;
          if (speck > 0) {
            r += (lit[0] - r) * speck;
            g += (lit[1] - g) * speck;
            b += (lit[2] - b) * speck;
          } else if (speck < 0) {
            r += (dark[0] - r) * -speck;
            g += (dark[1] - g) * -speck;
            b += (dark[2] - b) * -speck;
          }
          pixels[i] = 0xff000000 | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255);
        }
      }
    };

    let job = 0;
    let jobRow = 0;
    let jobPhase: "fill" | "shade" | null = null;

    const pump = () => {
      job = 0;
      const start = performance.now();
      while (jobPhase && performance.now() - start < 12) {
        const rows = Math.max(8, Math.round(48 / dpr));
        const end = Math.min(ch, jobRow + rows);
        if (jobPhase === "fill") fillRows(jobRow, end);
        else shadeRows(0, jobRow, cw - 1, end - 1);
        jobRow = end;
        if (jobRow >= ch) {
          if (jobPhase === "fill") {
            jobPhase = "shade";
            jobRow = 0;
          } else {
            jobPhase = null;
            if (image) ctx.putImageData(image, 0, 0);
          }
        }
      }
      if (jobPhase) job = window.setTimeout(pump, 0);
    };

    const startJob = (phase: "fill" | "shade") => {
      if (job) window.clearTimeout(job);
      if (jobPhase === "fill") phase = "fill";
      jobPhase = phase;
      jobRow = 0;
      pump();
    };

    const shadeAll = () => {
      if (!image) return;
      startJob("shade");
    };

    const rebuild = () => {
      if (w === 0 || h === 0) return;
      cw = canvas.width;
      ch = canvas.height;
      hgt = new Float32Array(cw * ch);
      fw = Math.ceil(w / FRESH_CELL) + 1;
      fh = Math.ceil(h / FRESH_CELL) + 1;
      fresh = new Float32Array(fw * fh).fill(-1e6);
      wet.width = fw;
      wet.height = fh;
      wet.style.width = `${fw * FRESH_CELL}px`;
      wet.style.height = `${fh * FRESH_CELL}px`;
      wetImage = wctx.createImageData(fw, fh);
      wetUntil = -1;
      image = ctx.createImageData(cw, ch);
      pixels = new Uint32Array(image.data.buffer);
      measureStones();
      ctx.fillStyle = `rgb(${base.map(Math.round).join(", ")})`;
      ctx.fillRect(0, 0, cw, ch);
      startJob("fill");
    };

    const insideStone = (x: number, y: number) => {
      for (const st of stones) {
        if (x > st.left - 2 && x < st.right + 2 && y > st.top - 2 && y < st.bottom + 2) {
          if (
            sdRound(
              x,
              y,
              (st.left + st.right) / 2,
              (st.top + st.bottom) / 2,
              (st.right - st.left) / 2,
              (st.bottom - st.top) / 2,
              st.radius,
            ) < 1.5
          )
            return true;
        }
      }
      return false;
    };

    const carve = (ax: number, ay: number, bx: number, by: number, dx: number, dy: number) => {
      const half = ((TINES - 1) / 2) * s;
      const edge = half + s * 0.5;
      const ux = dx;
      const uy = dy;
      const len = Math.max(0, (bx - ax) * ux + (by - ay) * uy);
      const nx = -uy;
      const ny = ux;
      const minX = Math.min(ax, bx) - edge - 1;
      const maxX = Math.max(ax, bx) + edge + 1;
      const minY = Math.min(ay, by) - edge - 1;
      const maxY = Math.max(ay, by) + edge + 1;
      const px0 = clamp(Math.floor(minX * dpr), 0, cw - 1);
      const px1 = clamp(Math.ceil(maxX * dpr), 0, cw - 1);
      const py0 = clamp(Math.floor(minY * dpr), 0, ch - 1);
      const py1 = clamp(Math.ceil(maxY * dpr), 0, ch - 1);
      const lead = s * 0.15;
      for (let py = py0; py <= py1; py++) {
        const y = (py + 0.5) / dpr;
        for (let px = px0; px <= px1; px++) {
          const x = (px + 0.5) / dpr;
          const rx = x - ax;
          const ry = y - ay;
          const along = rx * ux + ry * uy;
          if (along < -lead || along > len + lead) continue;
          const off = rx * nx + ry * ny;
          const a = Math.abs(off);
          if (a > edge) continue;
          if (insideStone(x, y)) continue;
          const i = py * cw + px;
          const v = profile(off / s);
          hgt[i] = a <= half ? v : Math.min(hgt[i], v);
        }
      }
      for (
        let y = Math.max(0, Math.floor(minY / FRESH_CELL));
        y <= Math.min(fh - 1, Math.ceil(maxY / FRESH_CELL));
        y++
      ) {
        for (
          let x = Math.max(0, Math.floor(minX / FRESH_CELL));
          x <= Math.min(fw - 1, Math.ceil(maxX / FRESH_CELL));
          x++
        ) {
          const cx = (x + 0.5) * FRESH_CELL - ax;
          const cy = (y + 0.5) * FRESH_CELL - ay;
          const along = cx * ux + cy * uy;
          if (along < -FRESH_CELL || along > len + FRESH_CELL) continue;
          if (Math.abs(cx * nx + cy * ny) > edge + FRESH_CELL) continue;
          fresh[y * fw + x] = time;
        }
      }
      bounds.x0 = Math.min(bounds.x0, minX);
      bounds.y0 = Math.min(bounds.y0, minY);
      bounds.x1 = Math.max(bounds.x1, maxX);
      bounds.y1 = Math.max(bounds.y1, maxY);
    };

    const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };

    const drag = (x: number, y: number) => {
      if (!rake.has) {
        rake.x = x;
        rake.y = y;
        rake.hx = x;
        rake.hy = y;
        rake.has = true;
        return;
      }
      const mx = x - rake.x;
      const my = y - rake.y;
      const dist = Math.hypot(mx, my);
      if (dist < 0.5) return;
      const handle = s * 4;
      const n = Math.ceil(dist / Math.max(1, s * 0.35));
      bounds.x0 = bounds.y0 = Infinity;
      bounds.x1 = bounds.y1 = -Infinity;
      for (let k = 1; k <= n; k++) {
        const px = rake.x + (mx * k) / n;
        const py = rake.y + (my * k) / n;
        const dx = px - rake.hx;
        const dy = py - rake.hy;
        const l = Math.hypot(dx, dy);
        if (l <= handle) continue;
        const ux = dx / l;
        const uy = dy / l;
        const nx = px - ux * handle;
        const ny = py - uy * handle;
        carve(rake.hx, rake.hy, nx, ny, ux, uy);
        rake.hx = nx;
        rake.hy = ny;
      }
      rake.x = x;
      rake.y = y;
      if (bounds.x1 < bounds.x0) return;
      shadeRect(bounds.x0, bounds.y0, bounds.x1, bounds.y1);
      if (!still) {
        wetUntil = time + SETTLE;
        wake();
      }
    };

    const paintWet = () => {
      if (!wetImage) return;
      const data = wetImage.data;
      const alpha = night ? 0.5 : 0.42;
      for (let i = 0; i < fw * fh; i++) {
        const f = clamp(1 - (time - fresh[i]) / SETTLE, 0, 1);
        const o = i * 4;
        data[o] = damp[0];
        data[o + 1] = damp[1];
        data[o + 2] = damp[2];
        data[o + 3] = Math.round(f * f * (3 - 2 * f) * alpha * 255);
      }
      wctx.putImageData(wetImage, 0, 0);
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt;
      paintWet();
      raf = time <= wetUntil ? requestAnimationFrame(frame) : 0;
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden || time > wetUntil) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (onScreen && !document.hidden) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = root.clientWidth;
      const nh = root.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) {
        measureAgain();
        return;
      }
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      rebuild();
    };

    const measureAgain = () => {
      const before = JSON.stringify(
        stones.map((st) => [st.left, st.top, st.right, st.bottom, st.radius].map(Math.round)),
      );
      measureStones();
      const after = JSON.stringify(
        stones.map((st) => [st.left, st.top, st.right, st.bottom, st.radius].map(Math.round)),
      );
      if (before !== after) rebuild();
    };

    const local = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      return [
        ((event.clientX - box.left) * w) / (box.width || 1),
        ((event.clientY - box.top) * h) / (box.height || 1),
      ] as const;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || jobPhase === "fill") return;
      const el = event.target as Element | null;
      if (
        el?.closest(
          "[data-stone], a, button, input, select, textarea, label, [role='button'], [contenteditable='true']",
        )
      )
        return;
      rake.down = true;
      rake.id = event.pointerId;
      rake.has = false;
      const [x, y] = local(event);
      drag(x, y);
      event.preventDefault();
    };
    const onMove = (event: PointerEvent) => {
      if (!rake.down || event.pointerId !== rake.id) return;
      const [x, y] = local(event);
      drag(x, y);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== rake.id) return;
      rake.down = false;
      rake.has = false;
    };

    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    root.querySelectorAll("[data-stone]").forEach((el) => ro.observe(el));
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      shadeAll();
    });
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (job) window.clearTimeout(job);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [spacing, lineColor, shade, reduce]);

  return (
    <div
      className={cn(
        "relative isolate touch-pan-y overflow-hidden",
        "[--miyuki-raked-sand-night:0] dark:[--miyuki-raked-sand-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full" />
        <canvas ref={dampRef} className="absolute top-0 left-0 block" />
      </div>
      {children}
    </div>
  );
}
