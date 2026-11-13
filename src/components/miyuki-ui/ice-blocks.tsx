"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type IceBlocksVariant = "isometric" | "perspective";

export interface IceBlocksProps extends ComponentProps<"div"> {
  variant?: IceBlocksVariant;
  cellSize?: number;
  gap?: number;
  amplitude?: number;
  damping?: number;
  speed?: number;
  idleRipples?: boolean;
  idleDelay?: number;
  topColor?: string;
  leftColor?: string;
  rightColor?: string;
  glow?: boolean;
  glowColor?: string;
}

const DAY_FACES = {
  top: "color-mix(in oklab, var(--brand) 3%, var(--card))",
  left: "color-mix(in oklab, var(--brand) 15%, var(--background))",
  right: "color-mix(in oklab, var(--brand) 30%, var(--background))",
};
const NIGHT_FACES = {
  top: "color-mix(in oklab, var(--brand) 22%, var(--card))",
  left: "color-mix(in oklab, var(--brand) 11%, var(--background))",
  right: "color-mix(in oklab, var(--brand) 4%, var(--background))",
};
const COS30 = Math.cos(Math.PI / 6);
const SQRT1_2 = Math.SQRT1_2;
const WAVE = 0.15;
const SPRING = 0.01;
const LEVELS = 33;
const RANGE = 1.3;
const FOGS = 8;
const MARGIN = 5;
const BLOCKS = 4500;
const FACES = [
  { shade: 1, order: [3, 2, 1, 4, 5, 6] },
  { shade: 2, order: [2, 1, 4, 5] },
  { shade: 0, order: [0, 1, 2, 3] },
] as const;
const CREST = 0.14;
const DROP: [number, number] = [0.9, 2.1];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  1,
];
const css = (c: Rgba) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
const cssA = (c: Rgba, a: number) =>
  `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)} / ${a.toFixed(3)})`;

export function IceBlocks({
  variant = "isometric",
  cellSize = 28,
  gap = 2,
  amplitude = 18,
  damping = 0.96,
  speed = 1,
  idleRipples = true,
  idleDelay = 2500,
  topColor,
  leftColor,
  rightColor,
  glow = true,
  glowColor = "var(--brand)",
  className,
  children,
  ...props
}: IceBlocksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = !!reduce;
    const persp = variant === "perspective";
    const c = Math.max(6, cellSize);
    const pitch = c + Math.max(0, gap);
    const amp = Math.max(0, amplitude);
    const keep = Math.cbrt(clamp(damping, 0, 1));
    const rate = Math.max(0, speed) * 60;
    const depth = c + amp * RANGE + 2;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let fadeFrom = 0;
    let fadeTo = 0;
    let sharp = 2;
    let slow = 0;
    let pts = new Float32Array(0);
    let steps = new Uint8Array(0);
    let lifts = new Float32Array(0);
    const seen = new Uint8Array(LEVELS);
    let cols = 0;
    let rows = 0;
    let uMin = 0;
    let height = new Float32Array(0);
    let vel = new Float32Array(0);
    let sponge = new Float32Array(0);

    let ox = 0;
    let oy = 0;
    let half = 0;
    let rise = 0;

    let focal = 1;
    let cy = 0;
    let cosT = 1;
    let sinT = 0;
    let camH = 0;
    let zNear = 0;
    let q = pitch * SQRT1_2;
    let rowZ = new Float32Array(0);
    let rowFog = new Uint8Array(0);

    let night = false;
    let faces: string[][][] = [];
    let rim: Rgba = [0, 0, 0, 1];

    let last = 0;
    let acc = 0;
    let raf = 0;
    let onScreen = false;
    let lastMove = -Infinity;
    let nextDrop = 0;
    let clock = 0;
    let pointer: { x: number; y: number } | null = null;
    let trail: { x: number; y: number } | null = null;
    const rng = createRng(`ice-blocks:${variant}`);

    const readColors = () => {
      const bg = toRgba("var(--background)", canvas);
      night = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.4;
      const base = night ? NIGHT_FACES : DAY_FACES;
      const top = toRgba(topColor ?? base.top, canvas);
      const left = toRgba(leftColor ?? base.left, canvas);
      const right = toRgba(rightColor ?? base.right, canvas);
      const ink = toRgba("var(--foreground)", canvas);
      rim = toRgba(glowColor, canvas);
      const deep = mix(right, night ? bg : ink, night ? 0.55 : 0.2);
      const hollow = night ? mix(mix(left, right, 0.5), bg, 0.35) : mix(left, right, 0.45);
      const bright = night ? mix(mix(top, rim, 0.5), ink, 0.18) : mix(top, rim, 0.06);
      faces = [];
      for (let f = 0; f < FOGS; f++) {
        const fog = persp ? (f / (FOGS - 1)) * 0.85 : 0;
        const level: string[][] = [];
        for (let k = 0; k < LEVELS; k++) {
          const t = -RANGE + (2 * RANGE * k) / (LEVELS - 1);
          const up = Math.min(1, Math.max(0, t) / 0.7) ** 0.7;
          const down = Math.min(1, Math.max(0, -t) / 0.7) ** 0.7;
          let ct = down > 0 ? mix(top, hollow, down * 0.85) : mix(top, bright, up * 0.8);
          let cl = down > 0 ? mix(left, right, down * 0.6) : mix(left, top, up * 0.35);
          let cr = down > 0 ? mix(right, deep, down * 0.7) : mix(right, left, up * 0.35);
          if (fog > 0) {
            ct = mix(ct, bg, fog);
            cl = mix(cl, bg, fog);
            cr = mix(cr, bg, fog);
          }
          level.push([css(ct), css(cl), css(cr)]);
        }
        faces.push(level);
      }
    };

    const valid = (col: number, row: number) => ((col + uMin + row) & 1) === 0;

    const layout = () => {
      if (persp) {
        focal = Math.max(w, h) * 0.85;
        cy = h / 2;
        const horizon = h * 0.14;
        const theta = Math.atan((cy - horizon) / focal);
        cosT = Math.cos(theta);
        sinT = Math.sin(theta);
        const down = Math.atan((h - cy) / focal);
        const nearScale = 1.55;
        const ray = focal / nearScale / Math.cos(down);
        camH = ray * Math.sin(theta + down);
        zNear = camH / Math.tan(theta + down) - pitch * 1.5;
        q = pitch * SQRT1_2;
        const blocks = (far: number) => {
          const deep = Math.ceil((far - zNear) / q) + MARGIN + 2;
          const wide = Math.ceil(((w / 2 + pitch * 2) * (far * cosT + camH * sinT)) / focal / q) + MARGIN;
          return deep * (wide + 0.5);
        };
        let farScale = 0.42;
        let zFar = (focal / farScale - camH * sinT) / cosT;
        while (
          farScale > 0.16 &&
          cy - (focal * (-camH * cosT + zFar * sinT)) / (zFar * cosT + camH * sinT) > h * 0.24
        ) {
          const next = (focal / (farScale * 0.86) - camH * sinT) / cosT;
          if (blocks(next) > BLOCKS) break;
          farScale *= 0.86;
          zFar = next;
        }
        const span = Math.ceil((zFar - zNear) / q);
        rows = span + MARGIN + 2;
        const reach = ((w / 2 + pitch * 2) * (zFar * cosT + camH * sinT)) / focal;
        const uHalf = Math.ceil(reach / q) + MARGIN;
        cols = uHalf * 2 + 1;
        uMin = -uHalf;
        rowZ = new Float32Array(rows);
        rowFog = new Uint8Array(rows);
        for (let r = 0; r < rows; r++) {
          const z = zNear + (rows - 1 - MARGIN - r) * q;
          rowZ[r] = z;
          const t = clamp((z - zNear) / Math.max(1, zFar - zNear), 0, 1);
          rowFog[r] = Math.round(clamp((t - 0.25) / 0.75, 0, 1) * (FOGS - 1));
        }
        const yFar = cy - (focal * (-camH * cosT + zFar * sinT)) / (zFar * cosT + camH * sinT);
        const a = Math.max(0, yFar / h);
        const b = Math.min(1, a + 0.32);
        fadeFrom = a * h;
        fadeTo = b * h;
      } else {
        half = pitch * COS30;
        rise = pitch * 0.5;
        const uHalf = Math.ceil((w / 2 + c) / half) + MARGIN;
        const vTop = Math.floor((-c / 2 - depth) / rise) - MARGIN;
        const vBottom = Math.ceil((h + c / 2 + amp * RANGE) / rise) + MARGIN;
        cols = uHalf * 2 + 1;
        uMin = -uHalf;
        rows = vBottom - vTop + 1;
        ox = w / 2;
        oy = vTop * rise;
        fadeFrom = fadeTo = 0;
      }
      const n = cols * rows;
      height = new Float32Array(n);
      vel = new Float32Array(n);
      sponge = new Float32Array(n);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const edge = Math.min(r, rows - 1 - r, col, cols - 1 - col);
          sponge[r * cols + col] = edge >= MARGIN ? keep : keep * (0.86 + 0.028 * edge);
        }
      }
    };

    const step = () => {
      const U = cols;
      const V = rows;
      for (let r = 0; r < V; r++) {
        for (let col = (uMin + r) & 1; col < U; col += 2) {
          const i = r * U + col;
          const hi = height[i];
          const s =
            (col > 0 && r > 0 ? height[i - U - 1] : 0) +
            (col < U - 1 && r > 0 ? height[i - U + 1] : 0) +
            (col > 0 && r < V - 1 ? height[i + U - 1] : 0) +
            (col < U - 1 && r < V - 1 ? height[i + U + 1] : 0);
          vel[i] = (vel[i] + (s - 4 * hi) * WAVE - hi * SPRING) * sponge[i];
        }
      }
      let energy = 0;
      for (let r = 0; r < V; r++) {
        for (let col = (uMin + r) & 1; col < U; col += 2) {
          const i = r * U + col;
          const next = clamp(height[i] + vel[i], -RANGE, RANGE);
          height[i] = next;
          energy += Math.abs(vel[i]) + Math.abs(next) * 0.02;
        }
      }
      return energy;
    };

    const kick = (u: number, v: number, strength: number, sigma: number) => {
      const reach = Math.ceil(sigma * 3);
      const r0 = Math.max(0, Math.floor(v - reach));
      const r1 = Math.min(rows - 1, Math.ceil(v + reach));
      const c0 = Math.max(0, Math.floor(u - uMin - reach));
      const c1 = Math.min(cols - 1, Math.ceil(u - uMin + reach));
      const k = 1 / (2 * sigma * sigma);
      for (let r = r0; r <= r1; r++) {
        for (let col = c0; col <= c1; col++) {
          if (!valid(col, r)) continue;
          const du = col + uMin - u;
          const dv = r - v;
          const d2 = (du * du + dv * dv) * 0.5;
          vel[r * cols + col] -= strength * Math.exp(-d2 * k);
        }
      }
    };

    const toGrid = (x: number, y: number): [number, number] | null => {
      if (!persp) return [(x - ox) / half, (y - oy) / rise];
      const xn = (x - w / 2) / focal;
      const yn = (cy - y) / focal;
      const dy = yn * cosT - sinT;
      if (dy >= -1e-3) return null;
      const t = camH / -dy;
      const X = xn * t;
      const Z = (yn * sinT + cosT) * t;
      const v = rows - 1 - MARGIN - (Z - zNear) / q;
      return [X / q, v];
    };

    const drop = () => {
      const pick = toGrid(w * (0.12 + rng() * 0.76), h * (persp ? 0.45 + rng() * 0.45 : 0.1 + rng() * 0.8));
      if (pick) kick(pick[0], pick[1], 0.9, 1.9);
    };

    const push = () => {
      if (!pointer) return;
      const to = toGrid(pointer.x, pointer.y);
      const from = trail ? toGrid(trail.x, trail.y) : null;
      trail = pointer;
      if (!to) return;
      if (!from) return;
      const du = to[0] - from[0];
      const dv = to[1] - from[1];
      const dist = Math.hypot(du, dv) * SQRT1_2;
      if (dist < 0.02) return;
      const n = Math.min(24, Math.ceil(dist / 0.5));
      const each = Math.min(0.8, 0.16 * dist) / n;
      for (let s = 1; s <= n; s++) kick(from[0] + (du * s) / n, from[1] + (dv * s) / n, each, 1.3);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = "round";
      const U = cols;
      const shine = glow && faces.length > 0;
      const glowWidth = night ? 1.4 : 1.1;
      const top = c / 2;
      const hw = c * COS30;

      if (!persp) {
        const level = faces[0];
        for (let r = 0; r < rows; r++) {
          const by = oy + r * rise;
          if (by - top - amp * RANGE > h || by + top + depth < 0) continue;
          for (let col = (uMin + r) & 1; col < U; col += 2) {
            const sx = ox + (col + uMin) * half;
            if (sx + hw < 0 || sx - hw > w) continue;
            const t = height[r * U + col];
            const sy = by - t * amp;
            const shade = level[Math.round(((t + RANGE) / (2 * RANGE)) * (LEVELS - 1))];
            const s = depth + t * amp;
            ctx.fillStyle = shade[1];
            ctx.beginPath();
            ctx.moveTo(sx - hw, sy);
            ctx.lineTo(sx, sy + top);
            ctx.lineTo(sx + hw, sy);
            ctx.lineTo(sx + hw, sy + s);
            ctx.lineTo(sx, sy + top + s);
            ctx.lineTo(sx - hw, sy + s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade[2];
            ctx.beginPath();
            ctx.moveTo(sx, sy + top);
            ctx.lineTo(sx + hw, sy);
            ctx.lineTo(sx + hw, sy + s);
            ctx.lineTo(sx, sy + top + s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade[0];
            ctx.beginPath();
            ctx.moveTo(sx, sy - top);
            ctx.lineTo(sx + hw, sy);
            ctx.lineTo(sx, sy + top);
            ctx.lineTo(sx - hw, sy);
            ctx.closePath();
            ctx.fill();
            if (shine && t > CREST) {
              const g = clamp((t - CREST) / 0.36, 0, 1);
              ctx.globalCompositeOperation = night ? "lighter" : "source-over";
              ctx.fillStyle = cssA(rim, g * (night ? 0.2 : 0.1));
              ctx.fill();
              ctx.strokeStyle = cssA(rim, g * (night ? 0.95 : 0.7));
              ctx.lineWidth = glowWidth;
              ctx.beginPath();
              ctx.moveTo(sx - hw + 0.5, sy);
              ctx.lineTo(sx, sy + top - 0.5);
              ctx.lineTo(sx + hw - 0.5, sy);
              ctx.stroke();
              ctx.globalCompositeOperation = "source-over";
            }
          }
        }
        return;
      }

      const e = c * SQRT1_2;
      const bottom = -depth;
      const skirt = Math.max(0, gap) * 3 + 2;
      const px = new Float32Array(7);
      const py = new Float32Array(7);
      const most = (U >> 1) + 2;
      if (steps.length < most) {
        pts = new Float32Array(most * 14);
        steps = new Uint8Array(most);
        lifts = new Float32Array(most);
      }
      const project = (X: number, Y: number, Z: number, k: number) => {
        const zc = Z * cosT + (camH - Y) * sinT;
        const yc = (Y - camH) * cosT + Z * sinT;
        px[k] = w / 2 + (focal * X) / zc;
        py[k] = cy - (focal * yc) / zc;
      };
      for (let r = 0; r < rows; r++) {
        const Z = rowZ[r];
        if (Z <= 1) continue;
        const level = faces[rowFog[r]];
        const scale = focal / (Z * cosT + camH * sinT);
        const yRest = cy - scale * (-camH * cosT + Z * sinT);
        if (yRest - scale * (c + amp * RANGE) > h) continue;
        let count = 0;
        seen.fill(0);
        for (let col = (uMin + r) & 1; col < U; col += 2) {
          const X = (col + uMin) * q;
          const sxr = w / 2 + X * scale;
          if (sxr + scale * c < 0 || sxr - scale * c > w) continue;
          const t = height[r * U + col];
          const Y = t * amp;
          project(X, Y, Z + e, 0);
          project(X + e, Y, Z, 1);
          project(X, Y, Z - e, 2);
          project(X - e, Y, Z, 3);
          const near = r + 1 < rows;
          const left = near && col > 0 ? height[(r + 1) * U + col - 1] * amp : bottom;
          const right = near && col < U - 1 ? height[(r + 1) * U + col + 1] * amp : bottom;
          const low = Math.max(bottom, Math.min(Y, left, right) - skirt);
          project(X + e, low, Z, 4);
          project(X, low, Z - e, 5);
          project(X - e, low, Z, 6);
          const at = count * 14;
          for (let k = 0; k < 7; k++) {
            pts[at + k * 2] = px[k];
            pts[at + k * 2 + 1] = py[k];
          }
          const step = Math.round(((t + RANGE) / (2 * RANGE)) * (LEVELS - 1));
          steps[count] = step;
          lifts[count] = t;
          seen[step] = 1;
          count += 1;
        }
        const ring = (at: number, order: readonly number[]) => {
          ctx.moveTo(pts[at + order[0] * 2], pts[at + order[0] * 2 + 1]);
          for (let k = 1; k < order.length; k++) ctx.lineTo(pts[at + order[k] * 2], pts[at + order[k] * 2 + 1]);
          ctx.closePath();
        };
        for (let step = 0; step < LEVELS; step++) {
          if (!seen[step]) continue;
          const shade = level[step];
          for (let face = 0; face < 3; face++) {
            ctx.fillStyle = shade[FACES[face].shade];
            ctx.beginPath();
            for (let i = 0; i < count; i++) if (steps[i] === step) ring(i * 14, FACES[face].order);
            ctx.fill();
          }
        }
        if (!shine) continue;
        for (let i = 0; i < count; i++) {
          const t = lifts[i];
          if (t <= CREST) continue;
          const at = i * 14;
          const g = clamp((t - CREST) / 0.36, 0, 1) * (1 - rowFog[r] / FOGS);
          ctx.globalCompositeOperation = night ? "lighter" : "source-over";
          ctx.fillStyle = cssA(rim, g * (night ? 0.2 : 0.1));
          ctx.beginPath();
          ring(at, FACES[2].order);
          ctx.fill();
          ctx.strokeStyle = cssA(rim, g * (night ? 0.95 : 0.7));
          ctx.lineWidth = glowWidth * Math.min(1.2, scale);
          ctx.beginPath();
          ctx.moveTo(pts[at + 6], pts[at + 7]);
          ctx.lineTo(pts[at + 4], pts[at + 5]);
          ctx.lineTo(pts[at + 2], pts[at + 3]);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      }
      if (fadeTo > fadeFrom) {
        const veil = ctx.createLinearGradient(0, fadeFrom, 0, fadeTo);
        veil.addColorStop(0, "#000");
        veil.addColorStop(1, "#0000");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, w, fadeTo);
        ctx.globalCompositeOperation = "source-over";
      }
    };

    const prewarm = () => {
      const seeds = createRng(`ice-blocks:${variant}:${cols}x${rows}`);
      for (let i = 0; i < 3; i++) {
        const pick = toGrid(w * (0.15 + seeds() * 0.7), h * (persp ? 0.5 + seeds() * 0.4 : 0.15 + seeds() * 0.7));
        if (pick) kick(pick[0], pick[1], 0.9, 1.9);
        for (let s = 0; s < 16 + i * 6; s++) step();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const since = last ? now - last : 0;
      const dt = last ? Math.min(0.05, since / 1000) : 1 / 60;
      last = now;
      if (dpr > 1) {
        slow = since > 26 && since < 200 ? slow + 1 : Math.max(0, slow - 2);
        if (slow > 24) {
          slow = 0;
          sharp = sharp > 1.5 ? 1.5 : 1;
          dpr = Math.min(sharp, window.devicePixelRatio || 1);
          canvas.width = Math.max(1, Math.round(w * dpr));
          canvas.height = Math.max(1, Math.round(h * dpr));
        }
      }
      clock += dt * 1000;
      if (pointer && pointer !== trail) push();
      if (idleRipples && clock - lastMove > idleDelay && clock >= nextDrop) {
        drop();
        nextDrop = clock + (DROP[0] + rng() * (DROP[1] - DROP[0])) * 1000;
      }
      acc = Math.min(acc + dt * rate, 4);
      let energy = 1;
      while (acc >= 1) {
        energy = step();
        acc -= 1;
      }
      draw();
      if (energy < 0.02 && !idleRipples && pointer === trail) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const wake = () => {
      if (raf || still || !onScreen || document.hidden) return;
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
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = Math.min(sharp, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      layout();
      prewarm();
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) {
        pointer = null;
        trail = null;
        return;
      }
      pointer = { x, y };
      lastMove = clock;
      nextDrop = Math.max(nextDrop, clock + idleDelay);
      wake();
    };
    const onLeave = () => {
      pointer = null;
      trail = null;
    };

    readColors();
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
      draw();
    });
    if (!still) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    resize();
    nextDrop = clock + idleDelay;

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [
    variant,
    cellSize,
    gap,
    amplitude,
    damping,
    speed,
    idleRipples,
    idleDelay,
    topColor,
    leftColor,
    rightColor,
    glow,
    glowColor,
    reduce,
  ]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 block size-full"
      />
      {children}
    </div>
  );
}
