"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface RiverLanternsProps extends ComponentProps<"div"> {
  count?: number;
  speed?: number;
  color?: string;
}

type Vec3 = [number, number, number];

const NIGHT = "--miyuki-river-lanterns-night";
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const HORIZON = 0.02;
const NEAREST = 0.95;
const FARTHEST = 0.42;
const ELEV = 0.42;
const CE = Math.cos(ELEV);
const SE = Math.sin(ELEV);
const BAND = 6;
const STILL = 40;
const SPRITE = 64;
const BOX = 2.8;
const WATERLINE = 0.66;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

interface Lantern {
  x: number;
  lane: number;
  wander: number;
  pace: number;
  yaw: number;
  spin: number;
  bob: number;
  bobRate: number;
  flick: number;
  warmth: number;
  paper: number;
  marks: number;
  born: number;
  gone: number;
}

interface Ring {
  x: number;
  y: number;
  s: number;
  born: number;
}

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r * 255, g * 255, b * 255];
}

function css([r, g, b]: Vec3, a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function scaled([r, g, b]: Vec3, k: number): Vec3 {
  return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
}

function sprite(w: number, h: number, paint?: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (g && paint) paint(g);
  return canvas;
}

function radial(color: Vec3, tight: number) {
  return sprite(SPRITE, SPRITE, (g) => {
    const c = SPRITE / 2;
    const gradient = g.createRadialGradient(c, c, 0, c, c, c);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      gradient.addColorStop(t, css(color, k === 8 ? 0 : Math.exp(-t * t * tight)));
    }
    g.fillStyle = gradient;
    g.fillRect(0, 0, SPRITE, SPRITE);
  });
}

function capsule(color: Vec3) {
  return sprite(SPRITE, 16, (g) => {
    const gradient = g.createLinearGradient(0, 0, SPRITE, 0);
    gradient.addColorStop(0, css(color, 0));
    gradient.addColorStop(0.2, css(color, 0.8));
    gradient.addColorStop(0.5, css(color, 1));
    gradient.addColorStop(0.8, css(color, 0.8));
    gradient.addColorStop(1, css(color, 0));
    g.fillStyle = gradient;
    g.beginPath();
    g.ellipse(SPRITE / 2, 8, SPRITE / 2, 5, 0, 0, Math.PI * 2);
    g.fill();
  });
}

function column(color: Vec3) {
  return sprite(16, SPRITE, (g) => {
    const v = g.createLinearGradient(0, 0, 0, SPRITE);
    v.addColorStop(0, css(color, 1));
    v.addColorStop(0.3, css(color, 0.5));
    v.addColorStop(1, css(color, 0));
    g.fillStyle = v;
    g.fillRect(0, 0, 16, SPRITE);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 16, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h;
    g.fillRect(0, 0, 16, SPRITE);
  });
}

const BOAT: Vec3[] = [
  [-0.48, -0.06, 0],
  [0.48, -0.06, 0],
  [0.9, 0.4, 0],
  [0, 0.4, 0.28],
  [-0.9, 0.4, 0],
  [0, 0.4, -0.28],
  [-0.42, 0.4, 0],
  [0.42, 0.4, 0],
  [0, 1.02, 0],
];

export function RiverLanterns({
  count = 14,
  speed = 1,
  color = "var(--warning)",
  className,
  children,
  ...props
}: RiverLanternsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let unit = 40;
    let target = 0;
    let night = true;
    let lanterns: Lantern[] = [];
    const rings: Ring[] = [];
    let sheen: HTMLCanvasElement | null = null;
    let water: CanvasGradient | null = null;
    let body: HTMLCanvasElement | null = null;
    let bctx: CanvasRenderingContext2D | null = null;
    let bodySize = 0;

    let warm: Vec3 = [255, 200, 90];
    let hot: Vec3 = [255, 240, 200];
    let ember: Vec3 = [240, 150, 70];
    let wood: Vec3 = [40, 30, 30];
    let brush: Vec3 = [30, 20, 20];
    let paper: Vec3 = [255, 255, 255];
    let paperShade: Vec3 = [200, 210, 225];
    let paperWarm: Vec3 = [255, 245, 230];
    let ink: Vec3 = [30, 40, 60];
    let ringTone: Vec3 = [200, 210, 230];
    let glow: HTMLCanvasElement | null = null;
    let pool: HTMLCanvasElement | null = null;
    let glint: HTMLCanvasElement | null = null;
    let glintDark: HTMLCanvasElement | null = null;
    let smear: HTMLCanvasElement | null = null;
    let shadow: HTMLCanvasElement | null = null;

    let time = still ? STILL : 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const scaleAt = (y: number) => clamp((y / h - HORIZON) / (NEAREST - HORIZON), 0.05, 1.2);

    const make = (rng: () => number, lane: number, x: number, born: number): Lantern => ({
      x,
      lane,
      wander: rng() * Math.PI * 2,
      pace: 0.74 + rng() * 0.52,
      yaw: rng() * Math.PI * 2,
      spin: (0.04 + rng() * 0.12) * (rng() < 0.5 ? -1 : 1),
      bob: rng() * Math.PI * 2,
      bobRate: 1.1 + rng() * 0.8,
      flick: rng() * 100,
      warmth: rng(),
      paper: rng(),
      marks: rng(),
      born,
      gone: 0,
    });

    const crowd = (lane: number, x: number, skip?: Lantern) => {
      let best = Infinity;
      const s = scaleAt(lane * h);
      for (const l of lanterns) {
        if (l === skip) continue;
        const u = unit * (s + scaleAt(l.lane * h)) * 0.5;
        const dx = (l.x - x) / (u * 2.2);
        const dy = ((l.lane - lane) * h) / (u * 0.9);
        best = Math.min(best, dx * dx + dy * dy);
      }
      return best;
    };

    const pickLane = (rng: () => number, x: number, tries: number) => {
      let lane = FARTHEST + (NEAREST - 0.03 - FARTHEST) * rng() ** 0.8;
      let score = crowd(lane, x);
      for (let t = 1; t < tries && score < 1.6; t++) {
        const next = FARTHEST + (NEAREST - 0.03 - FARTHEST) * rng() ** 0.8;
        const s = crowd(next, x);
        if (s > score) {
          lane = next;
          score = s;
        }
      }
      return lane;
    };

    const populate = () => {
      const rng = createRng(`river-lanterns:${count}:${Math.round(w / 40)}`);
      const area = clamp((w * h) / (960 * 480), 0.55, 1.6);
      target = Math.max(0, Math.round(Math.max(0, count) * area));
      lanterns = [];
      for (let i = 0; i < target; i++) {
        let best: [number, number] = [0, 0];
        let score = -1;
        for (let t = 0; t < 24; t++) {
          const k = rng();
          const lane = FARTHEST + (NEAREST - 0.04 - FARTHEST) * k ** 0.8;
          const x = rng() * (w + unit) - unit * 0.5;
          const s = crowd(lane, x);
          if (s > score) {
            score = s;
            best = [lane, x];
          }
        }
        lanterns.push(make(rng, best[0], best[1], -Infinity));
      }
    };

    const paintSheen = () => {
      if (w === 0 || h === 0) return;
      sheen = sprite(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)), (g) => {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const rng = createRng(`river-lanterns:sheen:${Math.round(w)}x${Math.round(h)}`);
        const lineTone = night
          ? rgb("color-mix(in oklab, var(--brand) 55%, var(--foreground))", canvas)
          : rgb("var(--card)", canvas);
        const darkTone = rgb("color-mix(in oklab, var(--brand) 45%, var(--foreground))", canvas);
        const n = Math.round((w * h) / (night ? 520 : 380));
        g.lineCap = "round";
        for (let i = 0; i < n; i++) {
          const y = rng() ** 0.85 * h;
          const s = scaleAt(y);
          const broad = rng() < 0.18;
          const len = (8 + rng() * 52) * s * (0.6 + 0.8 * rng()) * (broad ? 2.2 : 1);
          const x = rng() * w;
          const dark = !night && rng() < 0.42;
          const swell = 0.55 + 0.45 * Math.sin(y * 0.05 + Math.sin(x * 0.004) * 2);
          const a =
            (night ? 0.035 + rng() * 0.07 : dark ? 0.035 + rng() * 0.05 : 0.14 + rng() * 0.26) *
            (0.5 + 0.5 * s) *
            swell *
            (broad ? 0.45 : 1);
          g.strokeStyle = css(dark ? darkTone : lineTone, a);
          g.lineWidth = (0.5 + 0.9 * s) * (broad ? 2.6 : 1);
          for (const dx of [0, -w, w]) {
            if (x + dx + len < 0 || x + dx - len > w) continue;
            g.beginPath();
            g.moveTo(x + dx - len / 2, y);
            g.lineTo(x + dx + len / 2, y);
            g.stroke();
          }
        }
      });
    };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      warm = rgb(color, canvas);
      hot = mix(warm, [255, 252, 240], 0.62);
      ember = rgb(`color-mix(in oklab, ${color} 70%, var(--chart-5))`, canvas);
      wood = rgb(`color-mix(in oklab, color-mix(in oklab, var(--background) 78%, ${color}) 82%, black)`, canvas);
      brush = rgb(`color-mix(in oklab, color-mix(in oklab, ${color} 30%, var(--chart-5)) 30%, black)`, canvas);
      paper = rgb("var(--card)", canvas);
      paperShade = rgb(
        "color-mix(in oklab, var(--card) 72%, color-mix(in oklab, var(--brand) 70%, var(--foreground)))",
        canvas,
      );
      paperWarm = rgb(`color-mix(in oklab, var(--card) 86%, ${color})`, canvas);
      ink = rgb("color-mix(in oklab, var(--foreground) 80%, var(--brand))", canvas);
      ringTone = rgb("color-mix(in oklab, var(--brand) 55%, var(--foreground))", canvas);
      if (night) {
        glow = radial(warm, 3.4);
        pool = radial(mix(warm, ember, 0.35), 2.6);
        glint = capsule(mix(warm, hot, 0.3));
        glintDark = null;
        smear = column(mix(warm, ember, 0.2));
        shadow = null;
      } else {
        const pale = rgb("color-mix(in oklab, var(--card) 90%, var(--brand))", canvas);
        const deep = rgb("color-mix(in oklab, var(--brand) 55%, var(--foreground))", canvas);
        glow = null;
        pool = null;
        glint = capsule(pale);
        glintDark = capsule(deep);
        smear = column(pale);
        shadow = radial(deep, 2.2);
      }
      if (h > 0) {
        water = ctx.createLinearGradient(0, 0, 0, h);
        if (night) {
          water.addColorStop(0, css(rgb("color-mix(in oklab, var(--background) 80%, var(--brand))", canvas)));
          water.addColorStop(0.32, css(rgb("color-mix(in oklab, var(--background) 91%, var(--brand))", canvas)));
          water.addColorStop(1, css(rgb("color-mix(in oklab, var(--background) 80%, black)", canvas)));
        } else {
          const blue = "color-mix(in oklab, var(--brand) 55%, var(--foreground))";
          water.addColorStop(0, css(rgb(`color-mix(in oklab, var(--background) 90%, ${blue})`, canvas)));
          water.addColorStop(0.4, css(rgb(`color-mix(in oklab, var(--background) 84%, ${blue})`, canvas)));
          water.addColorStop(1, css(rgb(`color-mix(in oklab, var(--background) 71%, ${blue})`, canvas)));
        }
      }
      paintSheen();
    };

    const flow = () => unit * 0.6 * pace;

    const laneY = (l: Lantern) => h * (l.lane + 0.008 * Math.sin(time * 0.06 + l.wander));

    const drawSheen = () => {
      if (!sheen) return;
      const v = flow();
      for (let y = 0; y < h; y += BAND) {
        const bh = Math.min(BAND, h - y);
        const s = scaleAt(y + bh / 2);
        const off = (((time * v * s * 0.85) % w) + w) % w;
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 0.7 * pace + y * 0.09);
        const sy = y * dpr;
        const sh = bh * dpr;
        const cut = (w - off) * dpr;
        if (cut > 0.5) ctx.drawImage(sheen, 0, sy, cut, sh, off, y, w - off, bh);
        if (off > 0.5) ctx.drawImage(sheen, cut, sy, off * dpr, sh, 0, y, off, bh);
      }
      ctx.globalAlpha = 1;
    };

    const cx = new Float32Array(4);
    const cz = new Float32Array(4);

    const drawLantern = (g: CanvasRenderingContext2D, l: Lantern, u: number, flame: number) => {
      const a = u * 0.5;
      const ta = a * 1.18;
      const trayH = u * 0.16 * CE;
      const wallH = u * 1.02 * CE;
      const bottom = -trayH * 0.5;
      const top = bottom - wallH;
      for (let k = 0; k < 4; k++) {
        const ang = l.yaw + Math.PI / 4 + (k * Math.PI) / 2;
        cx[k] = Math.cos(ang) * Math.SQRT2;
        cz[k] = Math.sin(ang) * Math.SQRT2 * SE;
      }
      const lw = Math.max(0.6, u * 0.05);

      for (let k = 0; k < 4; k++) {
        const facing = Math.sin(l.yaw + Math.PI / 2 + (k * Math.PI) / 2);
        if (facing <= 0) continue;
        const k2 = (k + 1) % 4;
        g.beginPath();
        g.moveTo(cx[k] * ta, cz[k] * ta + trayH * 0.5);
        g.lineTo(cx[k2] * ta, cz[k2] * ta + trayH * 0.5);
        g.lineTo(cx[k2] * ta, cz[k2] * ta - trayH * 0.5);
        g.lineTo(cx[k] * ta, cz[k] * ta - trayH * 0.5);
        g.closePath();
        g.fillStyle = css(mix(wood, ember, 0.22 * flame * (0.4 + 0.6 * facing)));
        g.fill();
      }
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const px = cx[k] * ta;
        const py = cz[k] * ta - trayH * 0.5;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillStyle = css(mix(wood, ember, 0.45 * flame));
      g.fill();

      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const px = cx[k] * a;
        const py = cz[k] * a + top;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      const inner = g.createRadialGradient(0, top + u * 0.02, 0, 0, top, a * 1.25);
      inner.addColorStop(0, css(scaled([255, 253, 246], flame)));
      inner.addColorStop(0.35, css(scaled(hot, flame)));
      inner.addColorStop(1, css(scaled(mix(warm, ember, 0.5), flame)));
      g.fillStyle = inner;
      g.fill();

      let front = -1;
      let frontFacing = 0;
      for (let k = 0; k < 4; k++) {
        const facing = Math.sin(l.yaw + Math.PI / 2 + (k * Math.PI) / 2);
        if (facing <= 0) continue;
        if (facing > frontFacing) {
          frontFacing = facing;
          front = k;
        }
        const k2 = (k + 1) % 4;
        const x0 = cx[k] * a;
        const x1 = cx[k2] * a;
        const z0 = cz[k] * a;
        const z1 = cz[k2] * a;
        const zm = (z0 + z1) / 2;
        const tone = (0.78 + 0.22 * facing) * flame;
        const vertical = g.createLinearGradient(0, bottom + zm, 0, top + zm);
        vertical.addColorStop(0, css(scaled(hot, tone)));
        vertical.addColorStop(0.42, css(scaled(mix(hot, warm, 0.55), tone)));
        vertical.addColorStop(0.86, css(scaled(mix(warm, ember, 0.4 - 0.2 * l.warmth), tone)));
        vertical.addColorStop(1, css(scaled(mix(warm, ember, 0.75), tone * 0.9)));
        g.beginPath();
        g.moveTo(x0, z0 + bottom);
        g.lineTo(x1, z1 + bottom);
        g.lineTo(x1, z1 + top);
        g.lineTo(x0, z0 + top);
        g.closePath();
        g.fillStyle = vertical;
        g.fill();
        if (Math.abs(x1 - x0) > 1.5) {
          const across = g.createLinearGradient(x0, 0, x1, 0);
          across.addColorStop(0, css(ember, 0.42));
          across.addColorStop(0.22, css(ember, 0));
          across.addColorStop(0.78, css(ember, 0));
          across.addColorStop(1, css(ember, 0.42));
          g.fillStyle = across;
          g.fill();
        }
      }

      if (front >= 0 && u > 20 && l.marks > 0.35) {
        const k2 = (front + 1) % 4;
        const xm = ((cx[front] + cx[k2]) / 2) * a;
        const zm = ((cz[front] + cz[k2]) / 2) * a;
        const span = Math.abs(cx[k2] - cx[front]) * a;
        const rng = createRng(`river-lanterns:mark:${Math.round(l.marks * 1000)}`);
        g.strokeStyle = css(brush, 0.42 * frontFacing);
        g.lineCap = "round";
        const cell = Math.min(span * 0.3, wallH * 0.2);
        const chars = rng() < 0.5 ? 2 : 3;
        const y0 = top + wallH * 0.3;
        for (let c = 0; c < chars; c++) {
          const cy = zm + y0 + c * cell * 1.25;
          const strokes = rng.int(3, 5);
          for (let k = 0; k < strokes; k++) {
            const dir = rng.pick([0, Math.PI / 2, Math.PI / 2, Math.PI / 4, -Math.PI / 4, 0.15]);
            const len = cell * rng.range(0.35, 0.95);
            const sx = xm + (rng() - 0.5) * cell * 0.6;
            const sy = cy + (rng() - 0.3) * cell * 0.7;
            g.lineWidth = Math.max(0.5, cell * rng.range(0.1, 0.18));
            g.beginPath();
            g.moveTo(sx - (Math.cos(dir) * len) / 2, sy - (Math.sin(dir) * len) / 2);
            g.lineTo(sx + (Math.cos(dir) * len) / 2, sy + (Math.sin(dir) * len) / 2);
            g.stroke();
          }
        }
      }

      g.strokeStyle = css(wood, 0.92);
      g.lineWidth = lw;
      g.lineCap = "round";
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const facing = Math.sin(l.yaw + Math.PI / 2 + (k * Math.PI) / 2);
        if (facing <= 0) continue;
        const k2 = (k + 1) % 4;
        const x0 = cx[k] * a;
        const x1 = cx[k2] * a;
        const z0 = cz[k] * a;
        const z1 = cz[k2] * a;
        g.moveTo(x0, z0 + bottom);
        g.lineTo(x0, z0 + top);
        g.moveTo(x1, z1 + bottom);
        g.lineTo(x1, z1 + top);
        const band = top + wallH * 0.13;
        g.moveTo(x0, z0 + band);
        g.lineTo(x1, z1 + band);
      }
      g.stroke();
      g.lineWidth = lw * 1.25;
      g.beginPath();
      for (let k = 0; k <= 4; k++) {
        const i = k % 4;
        const px = cx[i] * a;
        const py = cz[i] * a + top;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    };

    const pts: [number, number, number][] = BOAT.map(() => [0, 0, 0]);
    let currentYaw = 0;

    const poly = (g: CanvasRenderingContext2D, ids: number[]) => {
      g.beginPath();
      ids.forEach((id, i) => {
        const [px, py] = pts[id];
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      });
      g.closePath();
    };

    const shadeFor = (ids: number[], base: Vec3) => {
      const [ax, ay, az] = BOAT[ids[0]];
      const [bx, by, bz] = BOAT[ids[1]];
      const [qx, qy, qz] = BOAT[ids[2]];
      const ux = bx - ax;
      const uy = by - ay;
      const uz = bz - az;
      const vx = qx - ax;
      const vy = qy - ay;
      const vz = qz - az;
      const nx0 = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz0 = ux * vy - uy * vx;
      const c = Math.cos(currentYaw);
      const s = Math.sin(currentYaw);
      const nx = nx0 * c - nz0 * s;
      const nz = nx0 * s + nz0 * c;
      const len = Math.hypot(nx, ny, nz) || 1;
      const flip = nz < 0 ? -1 : 1;
      const lit = clamp(((-0.55 * nx + 0.7 * ny + 0.45 * nz) / len) * flip, 0, 1);
      return css(mix(paperShade, base, 0.2 + 0.8 * lit));
    };

    const drawBoat = (g: CanvasRenderingContext2D, l: Lantern, u: number) => {
      currentYaw = l.yaw;
      const cos = Math.cos(l.yaw);
      const sin = Math.sin(l.yaw);
      for (let i = 0; i < BOAT.length; i++) {
        const [x, y, z] = BOAT[i];
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        pts[i] = [rx * u, (rz * SE - y * CE) * u, rz];
      }
      const base = l.paper < 0.34 ? paperWarm : paper;
      const nearPort = pts[3][2] > pts[5][2];
      const far = nearPort ? [0, 1, 2, 5, 4] : [0, 1, 2, 3, 4];
      const near = nearPort ? [0, 1, 2, 3, 4] : [0, 1, 2, 5, 4];
      const edge = css(ink, 0.34);
      g.lineJoin = "round";
      g.lineWidth = Math.max(0.55, u * 0.022);
      poly(g, [4, 3, 2, 5]);
      g.fillStyle = css(mix(paperShade, base, 0.1));
      g.fill();
      poly(g, far);
      g.fillStyle = shadeFor(far, base);
      g.fill();
      g.strokeStyle = edge;
      g.stroke();
      poly(g, [6, 7, 8]);
      g.fillStyle = shadeFor([6, 7, 8], base);
      g.fill();
      g.stroke();
      poly(g, near);
      g.fillStyle = shadeFor(near, base);
      g.fill();
      g.stroke();
      const mid = nearPort ? 3 : 5;
      g.strokeStyle = css(ink, 0.16);
      g.beginPath();
      g.moveTo(pts[mid][0], pts[mid][1]);
      g.lineTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      g.stroke();
    };

    const drawRings = () => {
      for (const r of rings) {
        const age = time - r.born;
        if (age < 0) continue;
        const k = age / 1.8;
        const u = unit * r.s;
        const rad = u * (0.35 + 1.9 * (1 - (1 - k) ** 2.2));
        const flat = 0.16 + 0.14 * r.s;
        ctx.globalAlpha = (1 - k) ** 1.6 * (night ? 0.5 : 0.45);
        ctx.strokeStyle = css(ringTone);
        ctx.lineWidth = 0.6 + 0.7 * r.s;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad, rad * flat, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= night ? 0.5 : 0.9;
        ctx.strokeStyle = css(night ? warm : paper);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + 1, rad * 0.97, rad * flat, 0, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (w === 0 || h === 0 || !bctx || !body) return;
      ctx.fillStyle = water ?? "transparent";
      ctx.fillRect(0, 0, w, h);
      if (night) ctx.globalCompositeOperation = "lighter";
      drawSheen();
      ctx.globalCompositeOperation = "source-over";
      drawRings();

      const order = lanterns.slice().sort((p, q) => p.lane - q.lane);
      for (const l of order) {
        const born = time - l.born;
        const enter = l.born === -Infinity || still ? 1 : smooth(clamp(born / 0.9, 0, 1));
        const visible = enter * (1 - l.gone);
        if (visible <= 0.01) continue;
        const yb0 = laneY(l);
        const s = scaleAt(yb0);
        const u = unit * s * (night ? 1 : 1.32);
        if (l.x < -u * 2.5 || l.x > w + u * 2.5) continue;
        const bob =
          Math.sin(time * l.bobRate + l.bob) * u * 0.03 + Math.sin(time * l.bobRate * 1.7 + l.wander) * u * 0.012;
        const drop = (1 - enter) * u * 0.35;
        const yb = yb0 + bob - drop;
        const roll = Math.sin(time * l.bobRate * 0.8 + l.bob + 1.3) * 0.04;
        const depth = clamp((s - 0.2) / 0.8, 0, 1);
        const kindle = l.born === -Infinity || still ? 1 : smooth(clamp((born - 0.25) / 1.4, 0, 1));
        const flicker = 0.94 + 0.035 * Math.sin(time * 9.1 + l.flick) + 0.025 * Math.sin(time * 14.3 + l.flick * 1.7);
        const flame = (0.3 + 0.7 * kindle) * flicker;
        const light = night ? (0.38 + 0.62 * depth) * visible : (0.7 + 0.3 * depth) * visible;

        const box = Math.min(bodySize, Math.ceil(u * BOX * dpr));
        const ox = box / 2;
        const oy = box * WATERLINE;
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, box + 2, box + 2);
        bctx.setTransform(dpr, 0, 0, dpr, ox, oy);
        bctx.rotate(roll);
        if (night) drawLantern(bctx, l, u, flame);
        else drawBoat(bctx, l, u);

        const bw = box / dpr;
        const left = l.x - bw / 2;
        const glow0 = night ? light * kindle * flicker : light;

        const rows = Math.max(2, Math.round(u * 0.12));
        const slices = Math.ceil((oy - box * 0.08) / (rows * dpr));
        const stretch = night ? 1.45 : 1.2;
        for (let i = 0; i < slices; i++) {
          const sy0 = oy - (i + 1) * rows * dpr;
          if (sy0 < 0) break;
          const f = i / slices;
          const yy = yb0 + (i + 0.5) * rows * stretch;
          const xo =
            Math.sin(yy * (0.42 / s) - time * 2.1 * pace + l.wander) * u * (0.025 + 0.06 * f) +
            Math.sin(yy * (0.13 / s) + time * 1.1 * pace + l.flick) * u * 0.05 * f;
          const ripple = 0.5 + 0.5 * Math.sin(yy * (0.6 / s) + time * 2.7 * pace + l.bob);
          ctx.globalAlpha = (night ? 0.58 : 0.5) * glow0 * (1 - 0.6 * f) * (0.45 + 0.55 * ripple);
          ctx.save();
          ctx.translate(left + xo, yb0 + u * 0.02 + i * rows * stretch);
          ctx.scale(1, -stretch);
          ctx.drawImage(body, 0, sy0, box, rows * dpr, 0, -rows, bw, rows);
          ctx.restore();
        }
        ctx.globalAlpha = 1;

        const tailTop = yb0 + slices * rows * stretch * 0.8;
        if (night) {
          if (pool) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.36 * glow0;
            ctx.drawImage(pool, l.x - u * 1.8, yb0 - u * 0.38, u * 3.6, u * 0.95);
            ctx.globalCompositeOperation = "source-over";
          }
          tail(l, l.x, yb0, tailTop, s, u, glow0);
        } else {
          if (shadow) {
            ctx.globalAlpha = 0.26 * light;
            ctx.drawImage(shadow, l.x - u * 1.0, yb0 - u * 0.12, u * 2.0, u * 0.34);
          }
          tail(l, l.x, yb0, tailTop, s, u, light);
        }
        const lap = 0.5 + 0.5 * Math.sin(time * l.bobRate + l.bob + 0.9);
        const rx = u * (night ? 0.95 : 1.05) * (1 + 0.12 * lap);
        const ry = rx * (0.16 + 0.12 * s);
        ctx.lineWidth = 0.5 + 0.6 * s;
        ctx.globalAlpha = (night ? 0.3 * glow0 : 0.4 * light) * (1 - 0.6 * lap);
        ctx.strokeStyle = css(night ? mix(warm, ember, 0.3) : paper);
        ctx.beginPath();
        ctx.ellipse(l.x, yb0 + u * 0.02, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.stroke();
        if (!night) {
          ctx.globalAlpha = 0.22 * light * (1 - 0.6 * lap);
          ctx.strokeStyle = css(ringTone);
          ctx.beginPath();
          ctx.ellipse(l.x, yb0 + u * 0.02 + 1, rx * 1.02, ry, 0, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
        ctx.globalAlpha = visible;
        ctx.drawImage(body, 0, 0, box, box, left, yb - oy / dpr, bw, bw);
        ctx.globalAlpha = 1;

        if (night && glow) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.28 * glow0;
          const g = u * 4.6;
          ctx.drawImage(glow, l.x - g / 2, yb - u * 0.6 - g / 2, g, g);
          ctx.globalAlpha = 0.16 * glow0;
          const c = u * 1.6;
          ctx.drawImage(glow, l.x - c / 2, yb - u * 0.62 - c / 2, c, c);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
    };

    const tail = (l: Lantern, x: number, yb: number, from: number, s: number, u: number, light: number) => {
      if (!glint || !smear) return;
      const len = Math.min(h - yb + 4, u * (night ? 6.4 : 3.6));
      if (len <= 2) return;
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      ctx.globalAlpha = (night ? 0.24 : 0.22) * light;
      ctx.drawImage(smear, x - u * 0.6, yb, u * 1.2, len * 0.9);
      const spacing = 1.5 + 2.2 * s;
      const start = from - yb;
      const n = Math.max(3, Math.floor((len - start) / spacing));
      for (let j = 0; j < n; j++) {
        const f = (start + (j + 0.5) * spacing) / len;
        if (f >= 1) break;
        const yy = yb + f * len;
        const k1 = Math.sin(yy * (0.34 / s) - time * 2 * pace + l.wander);
        const k2 = Math.sin(yy * (0.1 / s) + time * 0.8 * pace + l.flick);
        const xo = (k1 * 0.08 * (0.3 + f) + k2 * 0.2 * f) * u;
        const breathe = 0.5 + 0.5 * Math.sin(yy * (0.47 / s) + time * 2.4 * pace + l.bob);
        const width = u * (0.95 - 0.45 * f) * (0.5 + 0.5 * breathe);
        const thick = (1.1 + 1.7 * s) * (1 - 0.3 * f);
        const flicker = 0.5 + 0.5 * Math.sin(j * 2.1 + time * (2.6 + (j % 3)) * pace + l.flick);
        const a = (night ? 1.25 : 0.9) * light * (1 - f) ** 1.1 * (0.3 + 0.7 * flicker);
        if (a < 0.02) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(glint, x + xo - width / 2, yy - thick, width, thick * 2);
        if (glintDark && j % 2 === 1) {
          ctx.globalAlpha = Math.min(1, a * 0.3);
          ctx.drawImage(glintDark, x - xo * 1.2 - width * 0.4, yy + thick, width * 0.8, thick * 1.6);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const step = (dt: number) => {
      const v = flow();
      const rng = Math.random;
      for (let i = lanterns.length - 1; i >= 0; i--) {
        const l = lanterns[i];
        const s = scaleAt(laneY(l));
        const u = unit * s;
        l.x += v * l.pace * s * dt;
        l.yaw += l.spin * dt * pace;
        if (l.gone > 0) {
          l.gone = Math.min(1, l.gone + dt * 1.6);
          if (l.gone >= 1) lanterns.splice(i, 1);
          continue;
        }
        if (l.x > w + u * 2.5) {
          if (lanterns.filter((p) => p.gone === 0).length > target) {
            lanterns.splice(i, 1);
            continue;
          }
          const x = -unit * 2 - rng() * w * 0.2;
          const lane = pickLane(rng, x, 12);
          lanterns[i] = make(rng, lane, x - unit * scaleAt(lane * h) * 0.5, -Infinity);
        }
      }
      for (let i = 0; i < lanterns.length; i++) {
        const p = lanterns[i];
        for (let j = i + 1; j < lanterns.length; j++) {
          const q = lanterns[j];
          const dl = (q.lane - p.lane) * h;
          const u = unit * scaleAt(((p.lane + q.lane) / 2) * h);
          if (Math.abs(dl) > u * 1.1) continue;
          const dx = q.x - p.x;
          if (Math.abs(dx) > u * 2) continue;
          const near = 1 - Math.abs(dx) / (u * 2);
          const push = (near * near * 0.05 * dt * (dl >= 0 ? 1 : -1) * u) / h;
          p.lane = clamp(p.lane - push, FARTHEST * 0.85, NEAREST);
          q.lane = clamp(q.lane + push, FARTHEST * 0.85, NEAREST);
          const slow = near * 0.25 * dt * u;
          if (dx > 0) p.x -= slow;
          else q.x -= slow;
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        if (time - rings[i].born > 1.8) rings.splice(i, 1);
        else rings[i].x += v * scaleAt(rings[i].y) * dt;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
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
      const first = w === 0;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      unit = clamp(Math.min(w * 0.072, h * 0.085), 20, 50);
      bodySize = Math.ceil(unit * 1.35 * BOX * dpr) + 2;
      body = sprite(bodySize, bodySize);
      bctx = body.getContext("2d");
      if (first || lanterns.length === 0) populate();
      readColors();
      draw();
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const el = event.target as Element | null;
      if (el?.closest(OWN_CLICKS)) return;
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > w || y > h) return;
      const lane = clamp(y / h, FARTHEST * 0.85, NEAREST);
      const l = make(Math.random, lane, x, time);
      lanterns.push(l);
      const s = scaleAt(lane * h);
      if (!still) {
        rings.push({ x, y: lane * h + unit * s * 0.03, s, born: time + 0.34 });
        rings.push({ x, y: lane * h + unit * s * 0.03, s: s * 0.65, born: time + 0.6 });
      }
      const live = lanterns.filter((p) => p.gone === 0);
      if (live.length > target + 12) {
        const far = live.reduce((p, q) => (p.x > q.x ? p : q));
        far.gone = 0.001;
      }
      if (still) draw();
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
      readColors();
      draw();
    });
    root.addEventListener("pointerdown", onDown);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointerdown", onDown);
    };
  }, [count, speed, color, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-river-lanterns-night:0] dark:[--miyuki-river-lanterns-night:1]",
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
