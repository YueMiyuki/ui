"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface IciclesProps extends ComponentProps<"div"> {
  count?: number;
  maxLength?: number;
  drip?: boolean;
}

type Vec3 = [number, number, number];
type Pt = [number, number];

const NIGHT = "--miyuki-icicles-night";
const SAMPLES = 22;
const GRAVITY = 2200;
const SLOW = 0.22;
const REGROW = 3.2;
const LEDGE = 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r * 255, g * 255, b * 255];
}

function css([r, g, b]: Vec3, a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
}

interface Icicle {
  x: number;
  root: number;
  max: number;
  len: number;
  lean: number;
  ripple: number;
  period: number;
  phase: number;
  fast: number;
  drop: number;
  dropGrow: number;
}

interface Piece {
  pts: Pt[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  life: number;
  whole: boolean;
  rest: number;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  r: number;
}

interface Splash {
  x: number;
  y: number;
  age: number;
  bits: { vx: number; vy: number; x: number; y: number }[];
}

interface Glint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function Icicles({ count = 18, maxLength = 90, drip = true, className, children, ...props }: IciclesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = !!reduce;
    const longest = Math.max(12, maxLength);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let night = false;
    let icicles: Icicle[] = [];
    let ledge = new Float32Array(0);
    const pieces: Piece[] = [];
    const drops: Drop[] = [];
    const splashes: Splash[] = [];
    const glints: Glint[] = [];
    let layer: HTMLCanvasElement | null = null;
    let lctx: CanvasRenderingContext2D | null = null;
    let layerDirty = true;
    let drawnLens: number[] = [];

    let ice: Vec3 = [200, 220, 240];
    let core: Vec3 = [90, 130, 180];
    let rim: Vec3 = [60, 100, 160];
    let shine: Vec3 = [255, 255, 255];
    let snow: Vec3 = [255, 255, 255];
    let snowShade: Vec3 = [180, 200, 225];
    let shadow: Vec3 = [60, 90, 140];
    let water: Vec3 = [80, 120, 170];

    let last = 0;
    let raf = 0;
    let onScreen = false;
    let nextDrip = 1.6;
    const timers: number[] = [];
    const pointer = { x: 0, y: 0, vx: 0, has: false };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      if (night) {
        ice = rgb("color-mix(in oklab, var(--foreground) 55%, var(--brand))", canvas);
        core = rgb("color-mix(in oklab, var(--background) 55%, var(--brand))", canvas);
        rim = rgb("color-mix(in oklab, var(--foreground) 75%, var(--brand))", canvas);
        shine = rgb("color-mix(in oklab, var(--foreground) 92%, var(--brand))", canvas);
        snow = rgb("color-mix(in oklab, var(--foreground) 88%, var(--brand))", canvas);
        snowShade = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--foreground) 50%, var(--brand)) 70%, var(--background))",
          canvas,
        );
        shadow = rgb("color-mix(in oklab, var(--background) 60%, black)", canvas);
        water = rgb("color-mix(in oklab, var(--foreground) 60%, var(--brand))", canvas);
      } else {
        ice = rgb("color-mix(in oklab, var(--brand) 28%, var(--card))", canvas);
        core = rgb("color-mix(in oklab, var(--brand) 70%, var(--foreground))", canvas);
        rim = rgb("color-mix(in oklab, var(--brand) 75%, var(--foreground))", canvas);
        shine = rgb("var(--card)", canvas);
        snow = rgb("var(--card)", canvas);
        snowShade = rgb("color-mix(in oklab, var(--brand) 45%, var(--card))", canvas);
        shadow = rgb("color-mix(in oklab, var(--brand) 60%, var(--foreground))", canvas);
        water = rgb("color-mix(in oklab, var(--brand) 80%, var(--foreground))", canvas);
      }
      layerDirty = true;
    };

    const build = () => {
      const rng = createRng(`icicles:${count}:${longest}`);
      const n = Math.max(0, Math.round(count));
      const margin = Math.min(18, w * 0.05);
      const span = Math.max(1, w - margin * 2);
      let swell = rng();
      icicles = [];
      for (let i = 0; i < n; i++) {
        const kind = rng();
        const pick = kind < 0.26 ? rng.range(0.8, 1) : kind < 0.72 ? rng.range(0.4, 0.72) : rng.range(0.14, 0.34);
        swell = swell * 0.25 + pick * 0.75;
        const max = longest * clamp(swell, 0.14, 1);
        icicles.push({
          x: margin + ((i + 0.2 + rng() * 0.6) / n) * span,
          root: clamp(3.6 + max * 0.1 + rng() * 2.8, 3, 14),
          max,
          len: max * (0.9 + rng() * 0.08),
          lean: (rng() - 0.5) * Math.min(6, max * 0.07),
          ripple: 0.06 + rng() * 0.08,
          period: 5.5 + rng() * 3.5,
          phase: rng() * Math.PI * 2,
          fast: 0,
          drop: 0,
          dropGrow: 0,
        });
      }
      const lr = createRng(`icicles:ledge:${Math.round(w)}`);
      ledge = new Float32Array(Math.ceil(w / 3) + 2);
      let v = 0;
      for (let i = 0; i < ledge.length; i++) {
        v = v * 0.7 + (lr() - 0.5) * 2.2;
        ledge[i] = LEDGE + v + Math.sin(i * 0.4 + 1) * 0.6;
      }
      layerDirty = true;
    };

    const ledgeAt = (x: number) => {
      const f = clamp(x / 3, 0, ledge.length - 1.001);
      const i = Math.floor(f);
      return ledge[i] + (ledge[i + 1] - ledge[i]) * (f - i);
    };

    const widthAt = (c: Icicle, t: number, len: number) => {
      const taper = (1 - t) ** 1.05;
      const flare = t < 0.14 ? 1 + 0.4 * (1 - t / 0.14) ** 2 : 1;
      const y = t * len;
      const ripple =
        1 +
        c.ripple *
          (Math.sin((y / c.period) * Math.PI * 2 + c.phase) * 0.75 +
            Math.sin((y / c.period) * 4.7 + c.phase * 2.3) * 0.25) *
          (0.35 + 0.65 * t);
      return Math.max(0.9, c.root * taper * flare * ripple + 1.1 * t);
    };

    const outline = (c: Icicle, t0: number, t1: number, len: number, shift = 0, scale = 1): Pt[] => {
      const top = ledgeAt(c.x) - 2;
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let k = 0; k <= SAMPLES; k++) {
        const t = t0 + ((t1 - t0) * k) / SAMPLES;
        const y = top + t * len;
        const cx = c.x + c.lean * t * t;
        const half = (widthAt(c, t, len) / 2) * scale;
        const off = shift * widthAt(c, t, len) * 0.5;
        left.push([cx + off - half, y]);
        right.push([cx + off + half, y]);
      }
      return left.concat(right.reverse());
    };

    const tipOf = (c: Icicle): Pt => [c.x + c.lean, ledgeAt(c.x) - 2 + c.len];

    const path = (g: CanvasRenderingContext2D, pts: Pt[]) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
    };

    const paintIcicle = (g: CanvasRenderingContext2D, c: Icicle) => {
      const len = c.len;
      if (len < 1) return;
      const top = ledgeAt(c.x) - 2;
      const body = outline(c, 0, 1, len);
      if (!night) {
        g.save();
        g.translate(2.6, 3.4);
        path(g, body);
        const fade = g.createLinearGradient(0, top, 0, top + len);
        fade.addColorStop(0, css(shadow, 0.1));
        fade.addColorStop(1, css(shadow, 0.015));
        g.fillStyle = fade;
        g.fill();
        g.restore();
      }
      path(g, body);
      const fill = g.createLinearGradient(0, top, 0, top + len);
      fill.addColorStop(0, css(ice, night ? 0.58 : 0.82));
      fill.addColorStop(0.5, css(ice, night ? 0.36 : 0.58));
      fill.addColorStop(1, css(ice, night ? 0.24 : 0.42));
      g.fillStyle = fill;
      g.fill();
      g.save();
      path(g, body);
      g.clip();
      path(g, outline(c, 0.02, 0.94, len, 0.14, 0.42));
      const deep = g.createLinearGradient(0, top, 0, top + len);
      deep.addColorStop(0, css(core, night ? 0.5 : 0.34));
      deep.addColorStop(0.55, css(core, night ? 0.3 : 0.18));
      deep.addColorStop(1, css(core, night ? 0.08 : 0.05));
      g.fillStyle = deep;
      g.fill();
      if (len > 10) {
        const bands = g.createLinearGradient(0, top, 0, top + len);
        bands.addColorStop(0, css(shine, 0));
        let y = c.period * 0.6;
        let k = 0;
        while (y < len - 4) {
          const t = y / len;
          const fade = (1 - t * 0.75) * (k % 3 === 2 ? 0.45 : 1);
          const p = c.period * (0.75 + 0.5 * (0.5 + 0.5 * Math.sin(k * 2.39 + c.phase)));
          bands.addColorStop(clamp((y - p * 0.45) / len, 0, 1), css(shine, 0));
          bands.addColorStop(clamp(y / len, 0, 1), css(shine, (night ? 0.2 : 0.24) * fade));
          bands.addColorStop(clamp((y + p * 0.28) / len, 0, 1), css(core, (night ? 0.16 : 0.06) * fade));
          bands.addColorStop(clamp((y + p * 0.5) / len, 0, 1), css(shine, 0));
          y += p;
          k++;
        }
        g.fillStyle = bands;
        path(g, body);
        g.fill();
      }
      path(g, outline(c, 0.02, 0.9, len, -0.44, 0.17));
      const glow = g.createLinearGradient(0, top, 0, top + len * 0.92);
      glow.addColorStop(0, css(shine, 0.95));
      glow.addColorStop(0.45, css(shine, 0.72));
      glow.addColorStop(1, css(shine, 0));
      g.fillStyle = glow;
      g.fill();
      path(g, outline(c, 0.08, 0.7, len, 0.66, 0.09));
      g.fillStyle = css(shine, night ? 0.32 : 0.55);
      g.fill();
      g.restore();
      g.lineWidth = 0.7;
      g.lineJoin = "round";
      path(g, body);
      g.strokeStyle = css(rim, night ? 0.45 : 0.32);
      g.stroke();
      const [tx, ty] = tipOf(c);
      g.fillStyle = css(shine, 0.95);
      g.beginPath();
      g.arc(tx - 0.2, ty - 1.3, 0.75, 0, Math.PI * 2);
      g.fill();
    };

    const paintLedge = (g: CanvasRenderingContext2D) => {
      g.beginPath();
      g.moveTo(0, -2);
      for (let x = 0; x <= w + 3; x += 3) g.lineTo(x, ledgeAt(x));
      g.lineTo(w, -2);
      g.closePath();
      const band = g.createLinearGradient(0, 0, 0, LEDGE + 3);
      band.addColorStop(0, css(snow, night ? 0.9 : 1));
      band.addColorStop(0.55, css(snow, night ? 0.85 : 1));
      band.addColorStop(1, css(snowShade, 1));
      g.fillStyle = band;
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = css(shadow, night ? 0.6 : 0.22);
      g.beginPath();
      for (let x = 0; x <= w + 3; x += 3) {
        if (x === 0) g.moveTo(x, ledgeAt(x) + 0.5);
        else g.lineTo(x, ledgeAt(x) + 0.5);
      }
      g.stroke();
    };

    const paintLayer = () => {
      if (!lctx || !layer) return;
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.clearRect(0, 0, layer.width, layer.height);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const c of icicles) paintIcicle(lctx, c);
      paintLedge(lctx);
      drawnLens = icicles.map((c) => c.len);
      layerDirty = false;
    };

    const drawPiece = (p: Piece, alpha: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = alpha;
      path(ctx, p.pts);
      ctx.fillStyle = css(ice, night ? 0.55 : 0.85);
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = css(rim, 0.6);
      ctx.stroke();
      let minX = Infinity;
      for (const [x] of p.pts) minX = Math.min(minX, x);
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0] + 0.8, p.pts[0][1]);
      ctx.lineTo(p.pts[Math.floor(p.pts.length / 2)][0] * 0.4 + minX * 0.6, p.pts[Math.floor(p.pts.length / 2)][1]);
      ctx.strokeStyle = css(shine, 0.9);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (w === 0 || h === 0) return;
      if (layerDirty) paintLayer();
      if (layer) ctx.drawImage(layer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const c of icicles) {
        if (c.drop <= 0.02) continue;
        const [tx, ty] = tipOf(c);
        const r = 0.6 + c.drop * 1.9;
        ctx.fillStyle = css(ice, night ? 0.7 : 0.9);
        ctx.beginPath();
        ctx.ellipse(tx, ty + r * 0.7, r * 0.9, r * (1 + c.drop * 0.25), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = css(rim, 0.55);
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.fillStyle = css(shine, 0.95);
        ctx.beginPath();
        ctx.arc(tx - r * 0.3, ty + r * 0.4, Math.max(0.4, r * 0.28), 0, Math.PI * 2);
        ctx.fill();
      }

      for (const d of drops) {
        const stretch = 1 + Math.min(2.4, d.vy / 260);
        ctx.fillStyle = css(ice, night ? 0.75 : 0.95);
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * 0.85, d.r * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = css(rim, 0.6);
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.fillStyle = css(shine, 0.9);
        ctx.beginPath();
        ctx.arc(d.x - d.r * 0.3, d.y - d.r * stretch * 0.25, Math.max(0.35, d.r * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of splashes) {
        const k = s.age / 0.7;
        const rx = 2 + 13 * (1 - (1 - Math.min(1, k)) ** 2.4);
        ctx.strokeStyle = css(water, (1 - k) * (night ? 0.6 : 0.5));
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, rx * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = css(ice, (1 - k) * 0.9);
        for (const b of s.bits) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of pieces) drawPiece(p, p.whole ? 1 : clamp(p.life / 0.6, 0, 1));

      for (const g of glints) {
        ctx.globalAlpha = clamp(g.life / 0.4, 0, 1);
        ctx.fillStyle = css(shine);
        ctx.fillRect(g.x - 0.7, g.y - 0.7, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;
    };

    const shatter = (p: Piece) => {
      const len = p.pts.length / 2;
      const cuts = 2 + Math.floor(Math.random() * 3);
      const at = Array.from({ length: cuts }, (_, i) =>
        Math.round(((i + 0.3 + Math.random() * 0.4) / (cuts + 1)) * (len - 1)),
      );
      at.unshift(0);
      at.push(len - 1);
      const left = p.pts.slice(0, len);
      const right = p.pts.slice(len).reverse();
      const cos = Math.cos(p.a);
      const sin = Math.sin(p.a);
      for (let i = 0; i < at.length - 1; i++) {
        const a = at[i];
        const b = at[i + 1];
        if (b <= a) continue;
        const jag = (Math.random() - 0.5) * 2.4;
        const pts: Pt[] = [];
        for (let k = a; k <= b; k++) pts.push([left[k][0], left[k][1] + (k === b ? jag : 0)]);
        for (let k = b; k >= a; k--) pts.push([right[k][0], right[k][1] + (k === a ? -jag : 0)]);
        let cx = 0;
        let cy = 0;
        for (const [x, y] of pts) {
          cx += x;
          cy += y;
        }
        cx /= pts.length;
        cy /= pts.length;
        const local = pts.map(([x, y]) => [x - cx, y - cy] as Pt);
        const wx = p.x + cx * cos - cy * sin;
        const wy = p.y + cx * sin + cy * cos;
        pieces.push({
          pts: local,
          x: wx,
          y: wy,
          vx: p.vx * 0.3 + (Math.random() - 0.5) * 220,
          vy: -(90 + Math.random() * 200),
          a: p.a,
          va: (Math.random() - 0.5) * 22,
          life: 1.4 + Math.random() * 0.6,
          whole: false,
          rest: 0,
        });
      }
      for (let i = 0; i < 12; i++) {
        glints.push({
          x: p.x,
          y: h - 3,
          vx: (Math.random() - 0.5) * 260,
          vy: -(60 + Math.random() * 260),
          life: 0.4 + Math.random() * 0.5,
        });
      }
    };

    const snap = (c: Icicle, y: number) => {
      const top = ledgeAt(c.x) - 2;
      const t = clamp((y - top) / c.len, 0.18, 0.85);
      if (c.len * (1 - t) < 5) return;
      const pts = outline(c, t, 1, c.len);
      c.drop = 0;
      c.dropGrow = 0;
      const keep = c.len * t;
      c.len = keep;
      c.fast = 1;
      layerDirty = true;
      if (still) {
        draw();
        timers.push(
          window.setTimeout(() => {
            c.len = c.max;
            c.fast = 0;
            layerDirty = true;
            draw();
          }, 6000),
        );
        return;
      }
      let cx = 0;
      let cy = 0;
      for (const [x, py] of pts) {
        cx += x;
        cy += py;
      }
      cx /= pts.length;
      cy /= pts.length;
      pieces.push({
        pts: pts.map(([x, py]) => [x - cx, py - cy] as Pt),
        x: cx,
        y: cy,
        vx: clamp(pointer.vx * 0.25, -160, 160),
        vy: 0,
        a: 0,
        va: clamp(pointer.vx * 0.012, -3.5, 3.5) + (Math.random() - 0.5) * 1.2,
        life: 4,
        whole: true,
        rest: 0,
      });
      for (let i = 0; i < 5; i++) {
        glints.push({
          x: c.x + c.lean * t * t,
          y: top + keep,
          vx: (Math.random() - 0.5) * 90,
          vy: -Math.random() * 60,
          life: 0.3 + Math.random() * 0.3,
        });
      }
      wake();
    };

    const floor = () => h - 3;

    const step = (dt: number) => {
      for (const c of icicles) {
        if (c.len < c.max) {
          const rate = c.fast > 0 ? REGROW : SLOW;
          c.len = Math.min(c.max, c.len + rate * dt);
          if (c.len >= c.max * 0.92) c.fast = 0;
        }
        if (c.dropGrow > 0) {
          c.drop = Math.min(1, c.drop + dt / c.dropGrow);
          if (c.drop >= 1) {
            const [tx, ty] = tipOf(c);
            drops.push({ x: tx, y: ty + 2.4, vy: 20, r: 2.1 });
            c.drop = 0;
            c.dropGrow = 0;
          }
        }
      }
      if (icicles.some((c, i) => Math.abs(c.len - (drawnLens[i] ?? 0)) > 0.25)) layerDirty = true;

      if (drip && !still) {
        nextDrip -= dt;
        if (nextDrip <= 0) {
          nextDrip = 1.8 + Math.random() * 3.2;
          const pool = icicles.filter((c) => c.len > c.max * 0.6 && c.max > longest * 0.3 && c.dropGrow === 0);
          if (pool.length) {
            const total = pool.reduce((a, c) => a + c.len, 0);
            let pick = Math.random() * total;
            for (const c of pool) {
              pick -= c.len;
              if (pick <= 0) {
                c.dropGrow = 1.1 + Math.random() * 1.2;
                break;
              }
            }
          }
        }
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += GRAVITY * dt;
        d.y += d.vy * dt;
        if (d.y >= floor()) {
          drops.splice(i, 1);
          splashes.push({
            x: d.x,
            y: floor(),
            age: 0,
            bits: Array.from({ length: 3 }, () => ({
              x: d.x,
              y: floor(),
              vx: (Math.random() - 0.5) * 70,
              vy: -(50 + Math.random() * 70),
            })),
          });
        }
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age += dt;
        for (const b of s.bits) {
          b.vy += GRAVITY * 0.5 * dt;
          b.x += b.vx * dt;
          b.y = Math.min(floor(), b.y + b.vy * dt);
        }
        if (s.age > 0.7) splashes.splice(i, 1);
      }

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.va * dt;
        const cos = Math.cos(p.a);
        const sin = Math.sin(p.a);
        let low = -Infinity;
        for (const [x, y] of p.pts) low = Math.max(low, p.y + x * sin + y * cos);
        if (low >= floor()) {
          p.y -= low - floor();
          if (p.whole) {
            pieces.splice(i, 1);
            shatter(p);
            continue;
          }
          if (Math.abs(p.vy) > 60) {
            p.vy = -p.vy * 0.28;
            p.va *= 0.5;
          } else {
            p.vy = 0;
            p.va *= 0.02 ** dt;
          }
          p.vx *= 0.05 ** dt;
          p.rest += dt;
        }
        if (!p.whole) {
          p.life -= dt;
          if (p.life <= 0) pieces.splice(i, 1);
        }
        if (p.x < -40 || p.x > w + 40) pieces.splice(i, 1);
      }
      for (let i = glints.length - 1; i >= 0; i--) {
        const g = glints[i];
        g.vy += GRAVITY * 0.6 * dt;
        g.x += g.vx * dt;
        g.y = Math.min(floor(), g.y + g.vy * dt);
        g.life -= dt;
        if (g.life <= 0) glints.splice(i, 1);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      draw();
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
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const rebuild = nw !== w;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      layer = document.createElement("canvas");
      layer.width = canvas.width;
      layer.height = Math.max(1, Math.round(Math.min(h, longest + LEDGE + 16) * dpr));
      lctx = layer.getContext("2d");
      if (rebuild) build();
      layerDirty = true;
      draw();
    };

    const hit = (x: number, y: number) => {
      for (const c of icicles) {
        if (c.len < 6) continue;
        const top = ledgeAt(c.x) - 2;
        const t = (y - top) / c.len;
        if (t < 0.12 || t > 1.02) continue;
        const cx = c.x + c.lean * t * t;
        if (Math.abs(x - cx) <= widthAt(c, clamp(t, 0, 1), c.len) / 2 + 2.5) return c;
      }
      return null;
    };

    const local = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return [event.clientX - box.left, event.clientY - box.top] as const;
    };

    let lastMove = 0;
    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      const fromX = pointer.has ? pointer.x : x;
      const fromY = pointer.has ? pointer.y : y;
      if (pointer.has)
        pointer.vx =
          pointer.vx * 0.5 +
          ((x - pointer.x) / Math.max(1, event.timeStamp - (lastMove || event.timeStamp - 16))) * 1000 * 0.5;
      lastMove = event.timeStamp;
      pointer.x = x;
      pointer.y = y;
      pointer.has = true;
      const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, y - fromY) / 2));
      for (let k = 1; k <= steps; k++) {
        const sx = fromX + ((x - fromX) * k) / steps;
        const sy = fromY + ((y - fromY) * k) / steps;
        const c = hit(sx, sy);
        if (c) snap(c, sy);
      }
    };
    const onLeave = () => {
      pointer.has = false;
      pointer.vx = 0;
    };

    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
      if (onScreen) draw();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      timers.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [count, maxLength, drip, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-icicles-night:0] dark:[--miyuki-icicles-night:1]",
        className,
      )}
      {...props}
    >
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <canvas ref={canvasRef} className="block size-full" />
      </div>
    </div>
  );
}
