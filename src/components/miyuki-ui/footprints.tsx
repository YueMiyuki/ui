"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type FootprintsMode = "boot" | "ski" | "paw";

export interface FootprintsProps extends ComponentProps<"div"> {
  mode?: FootprintsMode;
  fill?: number;
  intro?: boolean;
}

type Vec3 = [number, number, number];

const NIGHT = "--miyuki-footprints-night";
const TILE = 32;
const LIGHT: Vec3 = (() => {
  const v: Vec3 = [-0.5, -0.68, 0.54];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const FLAKES = 70;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r * 255, g * 255, b * 255];
}

function css([r, g, b]: Vec3, a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
}

function sdEllipse(x: number, y: number, a: number, b: number) {
  const k = Math.hypot(x / a, y / b);
  return (k - 1) * Math.min(a, b);
}

function smin(a: number, b: number, k: number) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

function sdCapsule(x: number, y: number, ax: number, ay: number, bx: number, by: number, r: number) {
  const px = x - ax;
  const py = y - ay;
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp((px * dx + py * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - dx * t, py - dy * t) - r;
}

interface Shape {
  sdf: (x: number, y: number) => number;
  tread?: (x: number, y: number) => number;
  press?: (x: number, y: number) => number;
  reach: number;
  depth: number;
  rim: number;
  soft: number;
}

function bootShape(scale: number): Shape {
  const s = scale;
  const fore = (x: number, y: number) =>
    smin(
      sdEllipse(x - 0.2 * s, y + 4.2 * s, 5.4 * s, 7.6 * s),
      sdEllipse(x + 1.7 * s, y + 9.4 * s, 3.3 * s, 3.4 * s),
      2 * s,
    );
  const heel = (x: number, y: number) => {
    const qx = Math.abs(x + 0.3 * s) - 3.4 * s;
    const qy = Math.abs(y - 9.4 * s) - 3.3 * s;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 1.3 * s;
  };
  const arch = (x: number, y: number) => sdEllipse(x - 1.3 * s, y - 3.6 * s, 3.1 * s, 4.6 * s);
  return {
    sdf: (x, y) => Math.min(fore(x, y), heel(x, y), smin(arch(x, y), Math.min(fore(x, y), heel(x, y)), 1.5 * s)),
    press: (x, y) => {
      const f = Math.min(fore(x, y), heel(x, y));
      return f < -0.6 * s ? 1 : f < 0.8 * s ? 0.55 + 0.45 * clamp(-f / (1.4 * s), 0, 1) : 0.55;
    },
    tread: (x, y) => {
      if (heel(x, y) < -0.8 * s) return (0.5 + 0.5 * Math.cos((x / (2.6 * s)) * Math.PI * 2)) ** 2;
      if (fore(x, y) < -0.8 * s) return (0.5 + 0.5 * Math.cos(((y + x * 0.25) / (3.2 * s)) * Math.PI * 2)) ** 2;
      return 0;
    },
    reach: 15 * scale,
    depth: 3.6 * scale,
    rim: 0.7 * scale,
    soft: 1.25 * scale,
  };
}

function pawShape(scale: number): Shape {
  const s = scale * 1.3;
  return {
    sdf: (x, y) => {
      const pad = Math.max(sdEllipse(x, y - 2.6 * s, 2.7 * s, 2.1 * s), -(y - 1.1 * s) - Math.abs(x) * 0.55);
      let d = pad;
      d = Math.min(d, sdEllipse(x + 1.25 * s, y + 3 * s, 1.05 * s, 1.45 * s));
      d = Math.min(d, sdEllipse(x - 1.25 * s, y + 3 * s, 1.05 * s, 1.45 * s));
      d = Math.min(d, sdEllipse(x + 3 * s, y + 0.5 * s, 0.95 * s, 1.25 * s));
      d = Math.min(d, sdEllipse(x - 3 * s, y + 0.5 * s, 0.95 * s, 1.25 * s));
      return d;
    },
    reach: 7.5 * s,
    depth: 2.4 * scale,
    rim: 0.45 * scale,
    soft: 0.9 * s,
  };
}

type Walker = {
  has: boolean;
  x: number;
  y: number;
  sx: number;
  sy: number;
  carry: number;
  foot: number;
  pole: number;
  poleSide: number;
};

const walker = (): Walker => ({ has: false, x: 0, y: 0, sx: 0, sy: 0, carry: 0, foot: 1, pole: 0, poleSide: 1 });

export function Footprints({ mode = "boot", fill = 14, intro = true, className, children, ...props }: FootprintsProps) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLCanvasElement>(null);
  const snowRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const baseCanvas = baseRef.current;
    const track = trackRef.current;
    const snow = snowRef.current;
    const root = track?.parentElement?.parentElement;
    const bctx = baseCanvas?.getContext("2d");
    const tctx = track?.getContext("2d");
    const sctx = snow?.getContext("2d");
    if (!root || !baseCanvas || !track || !snow || !bctx || !tctx || !sctx) return;

    const still = !!reduce;
    const life = Math.max(1, fill);
    const tau = life / 3.4;
    const kappa = 0.22;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let scale = 1;
    let height = new Float32Array(0);
    let image: ImageData | null = null;
    let pixels = new Uint32Array(0);
    let tx = 0;
    let ty = 0;
    let active = new Uint8Array(0);
    let night = false;
    let shade: Vec3 = [90, 110, 150];
    let lit: Vec3 = [255, 255, 255];
    let flakeTone: Vec3 = [200, 210, 230];
    const flakes = Array.from({ length: FLAKES }, () => ({ x: 0, y: 0, r: 1, v: 10, sway: 0, phase: 0, a: 0.5 }));
    let flake: HTMLCanvasElement | null = null;

    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let since = 0;
    let turn = 0;
    const user = walker();
    const auto = walker();
    let autoAt = -1;

    const readColors = () => {
      night = cssVar(NIGHT, track) === "1";
      if (night) {
        shade = rgb("color-mix(in oklab, var(--background) 70%, black)", track);
        lit = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--foreground) 70%, var(--brand)) 80%, var(--background))",
          track,
        );
        flakeTone = rgb("color-mix(in oklab, var(--foreground) 85%, var(--brand))", track);
      } else {
        shade = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--brand) 62%, var(--foreground)) 70%, var(--background))",
          track,
        );
        lit = rgb("var(--card)", track);
        flakeTone = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--brand) 55%, var(--foreground)) 38%, var(--background))",
          track,
        );
      }
      flake = document.createElement("canvas");
      flake.width = flake.height = 32;
      const f = flake.getContext("2d");
      if (f) {
        const g = f.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, css(flakeTone, 1));
        g.addColorStop(0.35, css(flakeTone, 0.85));
        g.addColorStop(1, css(flakeTone, 0));
        f.fillStyle = g;
        f.fillRect(0, 0, 32, 32);
      }
    };

    const paintBase = () => {
      baseCanvas.width = Math.max(1, Math.round(w * dpr));
      baseCanvas.height = Math.max(1, Math.round(h * dpr));
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rng = createRng(`footprints:base:${Math.round(w)}x${Math.round(h)}`);
      const ground = bctx.createLinearGradient(0, 0, 0, h);
      if (night) {
        ground.addColorStop(
          0,
          css(
            rgb(
              "color-mix(in oklab, color-mix(in oklab, var(--background) 92%, var(--foreground)) 90%, var(--brand))",
              track,
            ),
          ),
        );
        ground.addColorStop(
          1,
          css(
            rgb(
              "color-mix(in oklab, color-mix(in oklab, var(--background) 80%, var(--foreground)) 88%, var(--brand))",
              track,
            ),
          ),
        );
      } else {
        ground.addColorStop(0, css(rgb("color-mix(in oklab, var(--background) 92%, var(--brand))", track)));
        ground.addColorStop(1, css(rgb("color-mix(in oklab, var(--background) 40%, var(--card))", track)));
      }
      bctx.fillStyle = ground;
      bctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        const x = rng() * w;
        const y = h * (0.25 + rng() * 0.85);
        const rx = w * (0.25 + rng() * 0.35);
        const ry = rx * (0.12 + rng() * 0.1);
        const drift = bctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        const lift = rng() < 0.5;
        const tone = lift ? lit : shade;
        drift.addColorStop(0, css(tone, night ? 0.05 : lift ? 0.45 : 0.045));
        drift.addColorStop(1, css(tone, 0));
        bctx.save();
        bctx.translate(x, y);
        bctx.scale(rx, ry);
        bctx.fillStyle = drift;
        bctx.beginPath();
        bctx.arc(0, 0, 1, 0, Math.PI * 2);
        bctx.fill();
        bctx.restore();
      }
      const grains = Math.round((w * h) / (night ? 900 : 260));
      for (let i = 0; i < grains; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const bright = night || rng() < 0.55;
        bctx.fillStyle = css(bright ? lit : shade, bright ? (night ? 0.28 : 0.9) * rng() : 0.035 * rng());
        const r = night ? 0.3 + rng() * 0.3 : 0.35 + rng() * 0.45;
        bctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    const layout = () => {
      track.width = Math.max(1, w);
      track.height = Math.max(1, h);
      height = new Float32Array(w * h);
      image = tctx.createImageData(Math.max(1, w), Math.max(1, h));
      pixels = new Uint32Array(image.data.buffer);
      tx = Math.ceil(w / TILE);
      ty = Math.ceil(h / TILE);
      active = new Uint8Array(tx * ty);
      snow.width = Math.max(1, Math.round(w * dpr));
      snow.height = Math.max(1, Math.round(h * dpr));
      scale = clamp(Math.min(w, h * 1.6) / 690, 0.9, 1.35);
      const rng = createRng("footprints:flakes");
      for (const f of flakes) {
        f.x = rng() * w;
        f.y = rng() * h;
        f.r = 0.5 + rng() ** 2 * 1.5;
        f.v = 9 + f.r * 9;
        f.sway = 4 + rng() * 10;
        f.phase = rng() * Math.PI * 2;
        f.a = 0.3 + rng() * 0.5;
      }
    };

    const markTiles = (x0: number, y0: number, x1: number, y1: number) => {
      const a = clamp(Math.floor(x0 / TILE), 0, tx - 1);
      const b = clamp(Math.floor(x1 / TILE), 0, tx - 1);
      const c = clamp(Math.floor(y0 / TILE), 0, ty - 1);
      const d = clamp(Math.floor(y1 / TILE), 0, ty - 1);
      for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) active[j * tx + i] = 1;
    };

    const stamp = (cx: number, cy: number, angle: number, shape: Shape, mirror: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const r = shape.reach + shape.soft * 3;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(w - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(h - 1, Math.ceil(cy + r));
      const rimW = shape.soft * 1.6;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          const lx = (dx * cos + dy * sin) * mirror;
          const ly = -dx * sin + dy * cos;
          const d = shape.sdf(lx, ly);
          const i = y * w + x;
          if (d < 0) {
            const wall = clamp(-d / shape.soft, 0, 1);
            const press = shape.press ? shape.press(lx, ly) : 1;
            let floor = -shape.depth * press * wall * wall * (3 - 2 * wall);
            if (shape.tread) floor += shape.depth * 0.26 * shape.tread(lx, ly) * wall;
            height[i] = Math.min(height[i], floor);
          } else if (d < rimW * 2.5) {
            const k = (d - rimW * 0.6) / rimW;
            height[i] += shape.rim * Math.exp(-k * k) * (1 - Math.max(0, height[i]) / (shape.rim * 1.6));
          }
        }
      }
      markTiles(x0, y0, x1, y1);
    };

    const groove = (ax: number, ay: number, bx: number, by: number, half: number, depth: number) => {
      const soft = 1.2 * scale;
      const r = half + soft * 3;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r));
      const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + r));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r));
      const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = sdCapsule(x + 0.5, y + 0.5, ax, ay, bx, by, half);
          const i = y * w + x;
          if (d < 0) {
            const wall = clamp(-d / soft, 0, 1);
            height[i] = Math.min(height[i], -depth * wall * wall * (3 - 2 * wall));
          } else if (d < soft * 2.4 && height[i] > -0.05) {
            const k = (d - soft * 0.6) / soft;
            height[i] = Math.max(height[i], 0.2 * depth * Math.exp(-k * k));
          }
        }
      }
      markTiles(x0, y0, x1, y1);
    };

    const pole = (cx: number, cy: number, angle: number) => {
      const hole: Shape = {
        sdf: (x, y) =>
          Math.min(
            Math.hypot(x, y) - 1.5 * scale,
            Math.max(Math.abs(Math.hypot(x, y + 0.6 * scale) - 4.2 * scale) - 0.55 * scale, -(y + 0.4 * scale)),
            sdCapsule(x, y, 0, 0, 0, 5 * scale, 0.6 * scale),
          ),
        press: (x, y) => (Math.hypot(x, y) < 2 * scale ? 1 : 0.45),
        reach: 6.5 * scale,
        depth: 2.2 * scale,
        rim: 0.3 * scale,
        soft: 0.8 * scale,
      };
      stamp(cx, cy, angle, hole, 1);
    };

    const lead = (mode === "ski" ? 22 : mode === "paw" ? 8 : 10) * scale;

    const step = (walk: Walker, x: number, y: number) => {
      if (!walk.has) {
        walk.has = true;
        walk.x = walk.sx = x;
        walk.y = walk.sy = y;
        return;
      }
      const mx = x - walk.sx;
      const my = y - walk.sy;
      const dist = Math.hypot(mx, my);
      if (dist < 0.5) return;
      const n = Math.max(1, Math.ceil(dist / 2));
      for (let k = 1; k <= n; k++) {
        const qx = walk.sx + (mx * k) / n;
        const qy = walk.sy + (my * k) / n;
        const tx0 = qx - walk.x;
        const ty0 = qy - walk.y;
        const pull = Math.hypot(tx0, ty0);
        if (pull <= lead) continue;
        const ux = tx0 / pull;
        const uy = ty0 / pull;
        const px = qx - ux * lead;
        const py = qy - uy * lead;
        const seg = Math.hypot(px - walk.x, py - walk.y);
        const nx = -uy;
        const ny = ux;
        const heading = Math.atan2(uy, ux) + Math.PI / 2;
        if (mode === "ski") {
          const sep = 8.5 * scale;
          groove(walk.x + nx * sep, walk.y + ny * sep, px + nx * sep, py + ny * sep, 3.3 * scale, 2.6 * scale);
          groove(walk.x - nx * sep, walk.y - ny * sep, px - nx * sep, py - ny * sep, 3.3 * scale, 2.6 * scale);
          walk.pole += seg;
          if (walk.pole > 52 * scale) {
            walk.pole = 0;
            walk.poleSide *= -1;
            const off = 22 * scale * walk.poleSide;
            pole(px + nx * off - ux * 8 * scale, py + ny * off - uy * 8 * scale, heading);
          }
        } else {
          walk.carry += seg;
          const stride = (mode === "paw" ? 24 : 36) * scale;
          if (walk.carry >= stride) {
            walk.carry -= stride;
            walk.foot *= -1;
            const side = walk.foot * (mode === "paw" ? 2.4 : 6.5) * scale;
            const toe = mode === "paw" ? walk.foot * 0.06 : walk.foot * 0.13;
            const shape = mode === "paw" ? pawShape(scale) : bootShape(scale);
            stamp(px + nx * side, py + ny * side, heading - toe, shape, walk.foot);
          }
        }
        walk.x = px;
        walk.y = py;
      }
      walk.sx = x;
      walk.sy = y;
      shadeActive();
      wake();
    };

    const settle = (dt: number, part: number) => {
      const decay = Math.exp(-dt / tau);
      const diff = Math.min(0.24, kappa * dt);
      let any = false;
      for (let j = 0; j < ty; j++) {
        for (let i = 0; i < tx; i++) {
          if (!active[j * tx + i]) continue;
          if ((i + j) % 3 !== part) {
            any = true;
            continue;
          }
          const x0 = i * TILE;
          const y0 = j * TILE;
          const x1 = Math.min(w, x0 + TILE);
          const y1 = Math.min(h, y0 + TILE);
          let peak = 0;
          for (let y = y0; y < y1; y++) {
            const row = y * w;
            const up = y > 0 ? row - w : row;
            const dn = y < h - 1 ? row + w : row;
            for (let x = x0; x < x1; x++) {
              const k = row + x;
              const c = height[k];
              const lap =
                height[x > 0 ? k - 1 : k] + height[x < w - 1 ? k + 1 : k] + height[up + x] + height[dn + x] - 4 * c;
              const v = (c + lap * diff) * decay;
              height[k] = v;
              const a = v < 0 ? -v : v;
              if (a > peak) peak = a;
            }
          }
          if (peak < 0.04) {
            for (let y = y0; y < y1; y++) height.fill(0, y * w + x0, y * w + x1);
            active[j * tx + i] = 2;
          } else any = true;
        }
      }
      return any;
    };

    const shadeActive = (part = -1) => {
      if (!image) return;
      let bx0 = Infinity;
      let by0 = Infinity;
      let bx1 = -Infinity;
      let by1 = -Infinity;
      const [lx, ly, lz] = LIGHT;
      const flat = Math.hypot(lx, ly);
      const sx = lx / flat;
      const sy = ly / flat;
      const rise = lz / flat;
      const deep = 3.6 * scale;
      const kS = night ? 1.5 : 1.3;
      const kL = night ? 1.3 : 1.7;
      for (let j = 0; j < ty; j++) {
        for (let i = 0; i < tx; i++) {
          const state = active[j * tx + i];
          if (!state) continue;
          if (part >= 0 && (i + j) % 3 !== part) continue;
          const x0 = i * TILE;
          const y0 = j * TILE;
          const x1 = Math.min(w, x0 + TILE);
          const y1 = Math.min(h, y0 + TILE);
          bx0 = Math.min(bx0, x0);
          by0 = Math.min(by0, y0);
          bx1 = Math.max(bx1, x1);
          by1 = Math.max(by1, y1);
          if (state === 2) {
            for (let y = y0; y < y1; y++) pixels.fill(0, y * w + x0, y * w + x1);
            active[j * tx + i] = 0;
            continue;
          }
          for (let y = y0; y < y1; y++) {
            const row = y * w;
            const up = y > 0 ? row - w : row;
            const dn = y < h - 1 ? row + w : row;
            for (let x = x0; x < x1; x++) {
              const k = row + x;
              const c = height[k];
              const hx = (height[x < w - 1 ? k + 1 : k] - height[x > 0 ? k - 1 : k]) * 0.5;
              const hy = (height[dn + x] - height[up + x]) * 0.5;
              if (c > -0.03 && c < 0.03 && hx * hx + hy * hy < 1e-4) {
                pixels[k] = 0;
                continue;
              }
              let occ = 0;
              if (c < -0.05) {
                for (let t = 1; t <= 8; t++) {
                  const qx = Math.round(x + sx * t);
                  const qy = Math.round(y + sy * t);
                  if (qx < 0 || qy < 0 || qx >= w || qy >= h) break;
                  const o = height[qy * w + qx] - c - t * rise;
                  if (o > occ) occ = o;
                }
              }
              const shadow = Math.min(1, occ / 0.9);
              const v = (-hx * lx - hy * ly + lz) / Math.sqrt(1 + hx * hx + hy * hy) - lz;
              const ao = c < 0 ? Math.min(0.3, (-c / deep) * 0.22) : 0;
              let sa = ao + (1 - ao) * shadow * (night ? 0.6 : 0.5);
              if (v < 0) sa = sa + (1 - sa) * Math.min(1, -v * kS);
              const la = v > 0 ? Math.min(1, v * kL) * (1 - shadow) : 0;
              const a = sa + la * (1 - sa);
              if (a < 0.004) {
                pixels[k] = 0;
                continue;
              }
              const ws = sa * (1 - la);
              const sum = ws + la || 1;
              const r = (shade[0] * ws + lit[0] * la) / sum;
              const g = (shade[1] * ws + lit[1] * la) / sum;
              const b = (shade[2] * ws + lit[2] * la) / sum;
              pixels[k] =
                ((Math.round(a * 255) << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
            }
          }
        }
      }
      if (bx1 > bx0) tctx.putImageData(image, 0, 0, bx0, by0, bx1 - bx0, by1 - by0);
    };

    const drawFlakes = (dt: number) => {
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, snow.width, snow.height);
      if (still) return;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!flake) return;
      for (const f of flakes) {
        f.y += f.v * dt;
        if (f.y > h + 4) {
          f.y = -4;
          f.x = Math.random() * w;
        }
        const x = f.x + Math.sin(time * 0.6 + f.phase) * f.sway;
        const r = f.r * 2.4;
        sctx.globalAlpha = f.a * (night ? 0.9 : 0.75);
        sctx.drawImage(flake, x - r, f.y - r, r * 2, r * 2);
      }
      sctx.globalAlpha = 1;
    };

    const pathAt = (t: number): [number, number] => [
      w * (-0.06 + 1.12 * t),
      h * (0.83 - 0.2 * t + 0.05 * Math.sin(t * Math.PI * 2.2 + 0.4)),
    ];

    const walkIntro = (dt: number) => {
      if (autoAt < 0 || autoAt >= 1) return;
      const pace = (mode === "ski" ? 300 : mode === "paw" ? 210 : 170) / Math.max(1, w * 1.15);
      autoAt = still ? 1 : Math.min(1, autoAt + dt * pace);
      const steps = still ? 160 : 1;
      for (let k = 0; k < steps; k++) {
        const t = still ? (k + 1) / steps : autoAt;
        const [x, y] = pathAt(t);
        step(auto, x, y);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt;
      walkIntro(dt);
      since += dt;
      let busy = true;
      if (since >= 1 / 60) {
        turn = (turn + 1) % 3;
        busy = settle(since * 3, turn);
        shadeActive(turn);
        since = 0;
      }
      if (still) {
        if (!busy) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        return;
      }
      drawFlakes(dt);
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (onScreen && !document.hidden && !still) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = Math.round(root.clientWidth);
      const nh = Math.round(root.clientHeight);
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      layout();
      paintBase();
      drawFlakes(0);
    };

    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const x = ((event.clientX - box.left) * w) / (box.width || 1);
      const y = ((event.clientY - box.top) * h) / (box.height || 1);
      if (x < 0 || y < 0 || x > w || y > h) {
        user.has = false;
        return;
      }
      step(user, x, y);
    };
    const onLeave = () => {
      user.has = false;
    };

    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen && intro && autoAt < 0 && w > 0) {
        autoAt = 0;
        const [x, y] = pathAt(0);
        step(auto, x, y);
        if (still) {
          walkIntro(0);
          wake();
        }
      }
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      paintBase();
      active.forEach((v, i) => {
        if (v) active[i] = 1;
      });
      shadeActive();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
    };
  }, [mode, fill, intro, reduce]);

  return (
    <div
      className={cn(
        "relative isolate touch-pan-y overflow-hidden",
        "[--miyuki-footprints-night:0] dark:[--miyuki-footprints-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={baseRef} className="absolute inset-0 block size-full" />
        <canvas ref={trackRef} className="absolute inset-0 block size-full" />
        <canvas ref={snowRef} className="absolute inset-0 block size-full" />
      </div>
      {children}
    </div>
  );
}
