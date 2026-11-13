"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface KoiPondProps extends ComponentProps<"div"> {
  count?: number;
  speed?: number;
  curiosity?: number;
  seed?: number | string;
}

const NIGHT = "--miyuki-koi-pond-night";
const NODES = 16;
const TAU = Math.PI * 2;
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const WIDTH: [number, number][] = [
  [0, 0.062],
  [0.05, 0.108],
  [0.15, 0.142],
  [0.3, 0.152],
  [0.46, 0.132],
  [0.64, 0.092],
  [0.8, 0.054],
  [0.9, 0.033],
  [1, 0.026],
];

type Tone = "white" | "red" | "gold" | "goldLight" | "sumi" | "sumiFin" | "whiteFin" | "goldFin";

interface Patch {
  s: number;
  u: number;
  r: number;
  stretch: number;
  tone: Tone;
  lobes?: number[];
}

interface Pattern {
  base: Tone;
  fin: Tone;
  patches: Patch[];
}

interface Fish {
  len: number;
  nx: Float32Array;
  ny: Float32Array;
  heading: number;
  psi: number;
  v: number;
  turn: number;
  phase: number;
  amp: number;
  depth: number;
  depthTarget: number;
  nextRise: number;
  rising: boolean;
  cruise: number;
  hover: number;
  nextHover: number;
  curious: boolean;
  orbit: number;
  startle: number;
  startleAt: number;
  startlePower: number;
  fleeX: number;
  fleeY: number;
  calmUntil: number;
  finL: number;
  finR: number;
  brake: number;
  pattern: Pattern;
  wobble: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  life: number;
  strength: number;
}

interface Palette {
  night: boolean;
  tones: Record<Tone, string>;
  eye: string;
  shade: string;
  sheen: string;
  shadow: string;
  waterTop: string;
  waterBottom: string;
  tint: string;
  ringLight: string;
  ringDark: string;
  pebbleDark: string;
  pebbleLight: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  if (x < -Math.PI) x += TAU;
  return x;
};

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function halfWidth(s: number) {
  for (let i = 1; i < WIDTH.length; i++) {
    if (s <= WIDTH[i][0]) {
      const [s0, w0] = WIDTH[i - 1];
      const [s1, w1] = WIDTH[i];
      const t = (s - s0) / (s1 - s0);
      const k = t * t * (3 - 2 * t);
      return w0 + (w1 - w0) * k;
    }
  }
  return WIDTH[WIDTH.length - 1][1];
}

const KINDS = ["kohaku", "yamabuki", "karasu", "tancho", "showa"] as const;
type Kind = (typeof KINDS)[number];

function lobed(pattern: Pattern, rng: Rng): Pattern {
  for (const patch of pattern.patches) patch.lobes = Array.from({ length: 7 }, () => rng.range(0.72, 1.22));
  return pattern;
}

function makePattern(kind: Kind, rng: Rng): Pattern {
  const jitter = (v: number, d: number) => v + rng.range(-d, d);
  if (kind === "kohaku") {
    const patches: Patch[] = [
      { s: jitter(0.1, 0.02), u: jitter(0, 0.2), r: jitter(0.1, 0.015), stretch: 1.25, tone: "red" },
    ];
    let s = jitter(0.36, 0.04);
    while (s < 0.74) {
      patches.push({
        s,
        u: rng.range(-0.35, 0.35),
        r: rng.range(0.095, 0.125),
        stretch: rng.range(1.4, 2.1),
        tone: "red",
      });
      s += rng.range(0.22, 0.3);
    }
    return { base: "white", fin: "whiteFin", patches };
  }
  if (kind === "tancho") {
    return { base: "white", fin: "whiteFin", patches: [{ s: 0.085, u: 0, r: 0.06, stretch: 1, tone: "red" }] };
  }
  if (kind === "yamabuki") {
    return {
      base: "gold",
      fin: "goldFin",
      patches: [
        { s: 0.3, u: 0, r: 0.05, stretch: 4.5, tone: "goldLight" },
        { s: 0.6, u: 0, r: 0.035, stretch: 4, tone: "goldLight" },
      ],
    };
  }
  if (kind === "karasu") {
    return { base: "sumi", fin: "sumiFin", patches: [] };
  }
  return {
    base: "sumi",
    fin: "sumiFin",
    patches: [
      { s: jitter(0.12, 0.02), u: jitter(0.15, 0.2), r: 0.08, stretch: 1.4, tone: "red" },
      { s: jitter(0.38, 0.04), u: rng.range(-0.4, 0.4), r: 0.09, stretch: 1.8, tone: "white" },
      { s: jitter(0.52, 0.04), u: rng.range(-0.4, 0.4), r: 0.08, stretch: 1.6, tone: "red" },
      { s: jitter(0.7, 0.04), u: rng.range(-0.3, 0.3), r: 0.06, stretch: 1.5, tone: "white" },
    ],
  };
}

function readPalette(el: Element): Palette {
  const night = cssVar(NIGHT, el) === "1";
  const c = (value: string, alpha = 1) => rgba(value, alpha, el);
  const dim = (value: string) => (night ? `color-mix(in oklab, ${value} 66%, var(--background))` : value);
  const water = "color-mix(in oklab, var(--chart-2) 55%, var(--brand))";
  return {
    night,
    tones: {
      white: c(dim("color-mix(in oklab, oklch(0.985 0.006 85) 94%, var(--chart-4))")),
      whiteFin: c(dim("color-mix(in oklab, oklch(0.985 0.006 85) 90%, var(--chart-4))"), 0.62),
      red: c(dim("color-mix(in oklab, var(--chart-5) 88%, var(--destructive))")),
      gold: c(dim("color-mix(in oklab, var(--chart-4) 84%, var(--chart-5))")),
      goldLight: c(dim("color-mix(in oklab, var(--chart-4) 70%, oklch(0.985 0.006 85))")),
      goldFin: c(dim("color-mix(in oklab, var(--chart-4) 80%, oklch(0.985 0.006 85))"), 0.6),
      sumi: c(
        night
          ? "color-mix(in oklab, var(--background) 70%, black)"
          : "color-mix(in oklab, var(--brand) 10%, oklch(0.22 0.015 250))",
      ),
      sumiFin: c(
        night
          ? "color-mix(in oklab, var(--background) 60%, var(--foreground))"
          : "color-mix(in oklab, var(--brand) 14%, oklch(0.3 0.015 250))",
        0.62,
      ),
    },
    eye: c("oklch(0.18 0.02 250)", 0.75),
    shade: night ? c("black", 0.32) : c("color-mix(in oklab, var(--brand) 40%, oklch(0.25 0.03 250))", 0.2),
    sheen: c("white", night ? 0.05 : 0.16),
    shadow: night ? c("black", 0.55) : c(`color-mix(in oklab, ${water} 45%, var(--foreground))`, 0.2),
    waterTop: night
      ? c(`color-mix(in oklab, ${water} 13%, var(--background))`)
      : c(`color-mix(in oklab, ${water} 13%, var(--background))`),
    waterBottom: night
      ? c(`color-mix(in oklab, color-mix(in oklab, ${water} 8%, var(--background)) 80%, black)`)
      : c(`color-mix(in oklab, ${water} 24%, var(--background))`),
    tint: night
      ? c(`color-mix(in oklab, ${water} 12%, var(--background))`)
      : c(`color-mix(in oklab, ${water} 30%, var(--background))`),
    ringLight: night ? c("color-mix(in oklab, var(--foreground) 85%, var(--brand))", 0.55) : c("white", 0.95),
    ringDark: night ? c("black", 0.35) : c(`color-mix(in oklab, ${water} 60%, var(--foreground))`, 0.34),
    pebbleDark: night ? c("black", 0.16) : c(`color-mix(in oklab, ${water} 50%, var(--foreground))`, 0.06),
    pebbleLight: night ? c(`color-mix(in oklab, ${water} 30%, var(--background))`, 0.18) : c("white", 0.14),
  };
}

export function KoiPond({
  count = 5,
  speed = 1,
  curiosity = 0.6,
  seed = "koi",
  className,
  children,
  ...props
}: KoiPondProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const curious = clamp(curiosity, 0, 1);
    const total = clamp(Math.round(count), 0, 14);
    const floor = document.createElement("canvas");
    const fctx = floor.getContext("2d");
    const shadows = document.createElement("canvas");
    const sctx = shadows.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let palette = readPalette(canvas);
    let fishes: Fish[] = [];
    const rings: Ring[] = [];
    const pointer = { x: 0, y: 0, present: false, moved: -10, resting: false };

    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const spawn = () => {
      const rng = createRng(`koi-pond:${seed}`);
      const kinds = [...rng.shuffle(KINDS.slice(0, 3)), ...rng.shuffle(KINDS.slice(3))];
      const base = clamp(Math.min(w, h * 1.6) * 0.13, 52, 132);
      fishes = Array.from({ length: total }, (_, i) => {
        const len = base * rng.range(0.82, 1.16);
        const x = rng.range(0.15, 0.85) * w;
        const y = rng.range(0.2, 0.8) * h;
        const heading = rng.range(0, TAU);
        const seg = len / (NODES - 1);
        const nx = new Float32Array(NODES);
        const ny = new Float32Array(NODES);
        for (let k = 0; k < NODES; k++) {
          nx[k] = x - Math.cos(heading) * seg * k;
          ny[k] = y - Math.sin(heading) * seg * k;
        }
        return {
          len,
          nx,
          ny,
          heading,
          psi: heading,
          v: len * 0.3,
          turn: 0,
          phase: rng.range(0, TAU),
          amp: 0.05,
          depth: rng.range(0.35, 0.85),
          depthTarget: rng.range(0.4, 0.9),
          nextRise: rng.range(3, 8) + i * 5,
          rising: false,
          cruise: rng.range(0.34, 0.5),
          hover: 0,
          nextHover: rng.range(6, 20),
          curious: rng() < curious,
          orbit: rng() < 0.5 ? -1 : 1,
          startle: 0,
          startleAt: -1,
          startlePower: 0,
          fleeX: 0,
          fleeY: 0,
          calmUntil: 0,
          finL: 0.8,
          finR: 0.8,
          brake: 0,
          pattern: lobed(makePattern(kinds[i % kinds.length], rng), rng),
          wobble: rng.range(0, 100),
        };
      });
    };

    const paintFloor = () => {
      if (!fctx) return;
      floor.width = Math.max(1, Math.round(w * dpr));
      floor.height = Math.max(1, Math.round(h * dpr));
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = fctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, palette.waterTop);
      g.addColorStop(1, palette.waterBottom);
      fctx.fillStyle = g;
      fctx.fillRect(0, 0, w, h);
      const rng = createRng(`koi-pond:floor:${seed}`);
      const pebbles = Math.round((w * h) / 5200);
      for (let i = 0; i < pebbles; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = rng.range(2.5, 9) * (rng() < 0.06 ? 2.4 : 1);
        const dark = rng() < 0.7;
        fctx.save();
        fctx.translate(x, y);
        fctx.rotate(rng() * Math.PI);
        fctx.scale(1, rng.range(0.55, 0.9));
        const pg = fctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r);
        const tone = dark ? palette.pebbleDark : palette.pebbleLight;
        pg.addColorStop(0, tone);
        pg.addColorStop(0.45, tone);
        pg.addColorStop(1, "rgba(0,0,0,0)");
        fctx.globalAlpha = rng.range(0.35, 0.8);
        fctx.fillStyle = pg;
        fctx.beginPath();
        fctx.arc(0, 0, r, 0, TAU);
        fctx.fill();
        fctx.restore();
      }
      fctx.globalAlpha = 1;
      const veil = fctx.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.65);
      veil.addColorStop(0, palette.night ? "rgba(0,0,0,0)" : "rgba(255,255,255,0.18)");
      veil.addColorStop(1, palette.night ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0)");
      fctx.fillStyle = veil;
      fctx.fillRect(0, 0, w, h);
    };

    const startle = (x: number, y: number) => {
      const diag = Math.hypot(w, h);
      for (const f of fishes) {
        const dx = f.nx[0] - x;
        const dy = f.ny[0] - y;
        const d = Math.hypot(dx, dy);
        const power = clamp(1.25 - d / (0.55 * diag), 0.3, 1);
        f.startleAt = time + d / 900;
        f.startlePower = power;
        if (d < 4) {
          f.fleeX = -Math.sin(f.heading);
          f.fleeY = Math.cos(f.heading);
        } else {
          f.fleeX = dx / d;
          f.fleeY = dy / d;
        }
      }
    };

    const ring = (x: number, y: number, strength: number) => {
      if (rings.length > 24) rings.shift();
      rings.push({ x, y, age: 0, life: 3.4, strength });
    };

    const steer = (f: Fish, dt: number) => {
      const L = f.len;
      const hx = f.nx[0];
      const hy = f.ny[0];
      f.psi += Math.sin(time * 0.21 + f.wobble) * 0.55 * dt + Math.sin(time * 0.53 + f.wobble * 1.7) * 0.35 * dt;
      let ax = Math.cos(f.psi);
      let ay = Math.sin(f.psi);
      const margin = L * 1.2;
      if (hx < margin) ax += ((margin - hx) / margin) * 2.6;
      if (hx > w - margin) ax -= ((hx - (w - margin)) / margin) * 2.6;
      if (hy < margin) ay += ((margin - hy) / margin) * 2.6;
      if (hy > h - margin) ay -= ((hy - (h - margin)) / margin) * 2.6;
      for (const g of fishes) {
        if (g === f) continue;
        for (const k of [0, 6, 12]) {
          const dx = hx - g.nx[k];
          const dy = hy - g.ny[k];
          const d = Math.hypot(dx, dy);
          const reach = (L + g.len) * 0.6;
          if (d > 0.01 && d < reach) {
            const push = ((reach - d) / reach) * 2.6;
            ax += (dx / d) * push;
            ay += (dy / d) * push;
          }
        }
      }
      let target = L * f.cruise * (f.hover > 0 ? 0.28 : 1);
      if (pointer.resting && f.curious && time > f.calmUntil) {
        const tx = pointer.x - hx;
        const ty = pointer.y - hy;
        const d = Math.hypot(tx, ty) || 1;
        const R = L * 0.7 + 22;
        if (d > R * 1.4) {
          const pull = clamp(d / (R * 3), 0.6, 1.6);
          ax += (tx / d) * 2.2 * pull;
          ay += (ty / d) * 2.2 * pull;
          target = L * 0.55;
        } else {
          const radial = (d - R) / R;
          ax += (-ty / d) * f.orbit * 2.4 + (tx / d) * radial * 3;
          ay += (tx / d) * f.orbit * 2.4 + (ty / d) * radial * 3;
          target = L * 0.32;
        }
      }
      if (f.startleAt >= 0 && time >= f.startleAt) {
        f.startle = f.startlePower;
        f.startleAt = -1;
        f.calmUntil = time + 3.2 + Math.random() * 1.6;
        f.hover = 0;
      }
      if (f.startle > 0.02) {
        ax += f.fleeX * 7 * f.startle;
        ay += f.fleeY * 7 * f.startle;
        target = Math.max(target, L * (1 + 6.5 * f.startle));
        f.startle *= Math.exp(-dt / 0.55);
      } else f.startle = 0;
      const desired = Math.atan2(ay, ax);
      f.psi += wrap(desired - f.psi) * Math.min(1, dt * 0.8);
      const urgent = f.startle > 0.1;
      const maxTurn = urgent ? 6.5 : 1.15;
      const want = clamp(wrap(desired - f.heading) * (urgent ? 5 : 1.5), -maxTurn, maxTurn);
      f.turn += (want - f.turn) * (1 - Math.exp(-dt * (urgent ? 14 : 2.6)));
      target *= 1 - Math.min(0.45, Math.abs(f.turn) * 0.25);
      if (f.rising) target *= 0.6;
      const accel = target > f.v ? (urgent ? 9 : 1.4) : urgent ? 2 : 0.7;
      const before = f.v;
      f.v += (target - f.v) * (1 - Math.exp(-dt * accel));
      const thrust = clamp((target - before) / L, 0, 2);
      f.brake += ((before > target + L * 0.05 ? 1 : 0) - f.brake) * (1 - Math.exp(-dt * 3));
      const beat = 0.55 + (1.25 * f.v) / L + 2.4 * thrust;
      f.phase += TAU * beat * dt;
      const ampTarget =
        before > target + L * 0.04
          ? 0.028
          : 0.042 + 0.05 * Math.min(1, thrust * 1.5) + 0.02 * Math.min(1, Math.abs(f.turn));
      f.amp += (ampTarget - f.amp) * (1 - Math.exp(-dt * 3));
      f.heading = wrap(f.heading + f.turn * dt);
      const step = f.v * dt;
      f.nx[0] = hx + Math.cos(f.heading) * step;
      f.ny[0] = hy + Math.sin(f.heading) * step;
      const seg = L / (NODES - 1);
      for (let k = 1; k < NODES; k++) {
        const dx = f.nx[k] - f.nx[k - 1];
        const dy = f.ny[k] - f.ny[k - 1];
        const d = Math.hypot(dx, dy) || 1;
        f.nx[k] = f.nx[k - 1] + (dx / d) * seg;
        f.ny[k] = f.ny[k - 1] + (dy / d) * seg;
      }
      const turnSide = clamp(f.turn / 1.2, -1, 1);
      const flutter = f.v < L * 0.25 ? Math.sin(time * 4.2 + f.wobble) * 0.18 : 0;
      const spread = 0.7 + 0.55 * f.brake;
      const goalR = spread + Math.max(0, turnSide) * 0.75 - Math.max(0, -turnSide) * 0.35 + flutter;
      const goalL = spread + Math.max(0, -turnSide) * 0.75 - Math.max(0, turnSide) * 0.35 - flutter;
      const finEase = 1 - Math.exp(-dt * 6);
      f.finR += (clamp(goalR, 0.25, 1.55) - f.finR) * finEase;
      f.finL += (clamp(goalL, 0.25, 1.55) - f.finL) * finEase;

      if (time > f.nextHover && f.hover <= 0) {
        f.hover = 2 + Math.random() * 3;
        f.nextHover = time + 10 + Math.random() * 16;
      }
      if (f.hover > 0) f.hover -= dt;
      if (!f.rising && time > f.nextRise) {
        f.rising = true;
        f.depthTarget = 0.02;
      }
      if (f.rising && f.depth < 0.08) {
        f.rising = false;
        ring(f.nx[0] + Math.cos(f.heading) * L * 0.04, f.ny[0] + Math.sin(f.heading) * L * 0.04, 0.8);
        f.depthTarget = 0.45 + Math.random() * 0.45;
        f.nextRise = time + 14 + Math.random() * 22;
      }
      f.depth += (f.depthTarget - f.depth) * (1 - Math.exp(-dt * (f.rising ? 0.9 : 0.35)));
    };

    const px = new Float32Array(NODES);
    const py = new Float32Array(NODES);
    const tx = new Float32Array(NODES);
    const ty = new Float32Array(NODES);
    const hw = new Float32Array(NODES);
    for (let k = 0; k < NODES; k++) hw[k] = halfWidth(k / (NODES - 1));

    const pose = (f: Fish, scale: number) => {
      const L = f.len;
      for (let k = 0; k < NODES; k++) {
        const s = k / (NODES - 1);
        const a = k === 0 ? 0 : k === NODES - 1 ? NODES - 2 : k - 1;
        const b = k === 0 ? 1 : k === NODES - 1 ? NODES - 1 : k + 1;
        let dx = f.nx[a] - f.nx[b];
        let dy = f.ny[a] - f.ny[b];
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const lateral = f.amp * L * (0.1 + 0.9 * s ** 1.7) * Math.sin(f.phase - TAU * 0.85 * s);
        px[k] = f.nx[0] + (f.nx[k] - f.nx[0]) * scale - dy * lateral;
        py[k] = f.ny[0] + (f.ny[k] - f.ny[0]) * scale + dx * lateral;
      }
      for (let k = 0; k < NODES; k++) {
        const a = k === 0 ? 0 : k - 1;
        const b = k === NODES - 1 ? NODES - 1 : k + 1;
        let dx = px[a] - px[b];
        let dy = py[a] - py[b];
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        tx[k] = dx;
        ty[k] = dy;
      }
    };

    const smooth = (c: CanvasRenderingContext2D, xs: number[], ys: number[], move: boolean) => {
      if (move) c.moveTo(xs[0], ys[0]);
      else c.lineTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length - 1; i++) {
        c.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
      }
      c.lineTo(xs[xs.length - 1], ys[ys.length - 1]);
    };

    const bodyPath = (c: CanvasRenderingContext2D, L: number) => {
      const lx: number[] = [];
      const ly: number[] = [];
      const rx: number[] = [];
      const ry: number[] = [];
      for (let k = 0; k < NODES; k++) {
        const nx = -ty[k];
        const ny = tx[k];
        const r = hw[k] * L;
        lx.push(px[k] + nx * r);
        ly.push(py[k] + ny * r);
        rx.unshift(px[k] - nx * r);
        ry.unshift(py[k] - ny * r);
      }
      c.beginPath();
      smooth(c, lx, ly, true);
      smooth(c, rx, ry, false);
      const head = hw[0] * L;
      c.bezierCurveTo(
        rx[rx.length - 1] + tx[0] * head * 1.3,
        ry[ry.length - 1] + ty[0] * head * 1.3,
        lx[0] + tx[0] * head * 1.3,
        ly[0] + ty[0] * head * 1.3,
        lx[0],
        ly[0],
      );
      c.closePath();
    };

    const tailPath = (c: CanvasRenderingContext2D, f: Fish) => {
      const L = f.len;
      const k = NODES - 1;
      const flex = Math.sin(f.phase - TAU * 0.85 - 1.1) * f.amp * 7;
      const base = Math.atan2(ty[k], tx[k]) + Math.PI + flex;
      const bx = px[k];
      const by = py[k];
      const len = L * 0.34;
      const spread = 0.55 + 0.12 * f.brake;
      const nx = -Math.sin(base);
      const ny = Math.cos(base);
      const root = hw[k] * L * 1.2;
      const tip = (side: number) => [
        bx + Math.cos(base + side * spread) * len,
        by + Math.sin(base + side * spread) * len,
      ];
      const [ax, ay] = tip(1);
      const [cx, cy] = tip(-1);
      const notchX = bx + Math.cos(base) * len * 0.62;
      const notchY = by + Math.sin(base) * len * 0.62;
      c.beginPath();
      c.moveTo(bx + nx * root, by + ny * root);
      c.quadraticCurveTo(
        bx + Math.cos(base + spread * 1.5) * len * 0.55,
        by + Math.sin(base + spread * 1.5) * len * 0.55,
        ax,
        ay,
      );
      c.quadraticCurveTo(
        bx + Math.cos(base + spread * 0.45) * len * 0.8,
        by + Math.sin(base + spread * 0.45) * len * 0.8,
        notchX,
        notchY,
      );
      c.quadraticCurveTo(
        bx + Math.cos(base - spread * 0.45) * len * 0.8,
        by + Math.sin(base - spread * 0.45) * len * 0.8,
        cx,
        cy,
      );
      c.quadraticCurveTo(
        bx + Math.cos(base - spread * 1.5) * len * 0.55,
        by + Math.sin(base - spread * 1.5) * len * 0.55,
        bx - nx * root,
        by - ny * root,
      );
      c.closePath();
    };

    const finPath = (c: CanvasRenderingContext2D, f: Fish, side: 1 | -1, at: number, size: number, angle: number) => {
      const L = f.len;
      const k = Math.round(at * (NODES - 1));
      const nx = -ty[k] * side;
      const ny = tx[k] * side;
      const r = hw[k] * L * 0.85;
      const ox = px[k] + nx * r;
      const oy = py[k] + ny * r;
      const dirX = -tx[k] * Math.cos(angle) + nx * Math.sin(angle);
      const dirY = -ty[k] * Math.cos(angle) + ny * Math.sin(angle);
      const len = L * size;
      const wid = len * 0.42;
      const ex = ox + dirX * len;
      const ey = oy + dirY * len;
      const sx = -dirY;
      const sy = dirX;
      c.moveTo(ox - dirX * len * 0.05, oy - dirY * len * 0.05);
      c.quadraticCurveTo(ox + dirX * len * 0.45 + sx * wid, oy + dirY * len * 0.45 + sy * wid, ex, ey);
      c.quadraticCurveTo(ox + dirX * len * 0.5 - sx * wid * 0.55, oy + dirY * len * 0.5 - sy * wid * 0.55, ox, oy);
      c.closePath();
    };

    const finsPath = (c: CanvasRenderingContext2D, f: Fish) => {
      c.beginPath();
      finPath(c, f, 1, 0.2, 0.19, f.finR);
      finPath(c, f, -1, 0.2, 0.19, f.finL);
      finPath(c, f, 1, 0.5, 0.09, 0.55 + f.finR * 0.25);
      finPath(c, f, -1, 0.5, 0.09, 0.55 + f.finL * 0.25);
    };

    const pointAt = (s: number, u: number, L: number) => {
      const t = s * (NODES - 1);
      const k = Math.min(NODES - 2, Math.floor(t));
      const f = t - k;
      const x = px[k] + (px[k + 1] - px[k]) * f;
      const y = py[k] + (py[k + 1] - py[k]) * f;
      const dx = tx[k] + (tx[k + 1] - tx[k]) * f;
      const dy = ty[k] + (ty[k + 1] - ty[k]) * f;
      const r = halfWidth(s) * L * u;
      return [x - dy * r, y + dx * r, Math.atan2(dy, dx)] as const;
    };

    const drawFish = (f: Fish) => {
      const L = f.len;
      const tones = palette.tones;
      const fade = 1 - f.depth * 0.28;

      ctx.globalAlpha = fade;
      ctx.fillStyle = tones[f.pattern.fin];
      tailPath(ctx, f);
      ctx.fill();
      finsPath(ctx, f);
      ctx.fill();

      ctx.save();
      bodyPath(ctx, L);
      ctx.fillStyle = tones[f.pattern.base];
      ctx.fill();
      ctx.clip();
      for (const patch of f.pattern.patches) {
        const [x, y, a] = pointAt(patch.s, patch.u, L);
        const lobes = patch.lobes ?? [1];
        const rx = patch.r * L * patch.stretch;
        const ry = patch.r * L;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const xs: number[] = [];
        const ys: number[] = [];
        for (let j = 0; j <= 16; j++) {
          const t = (j % 16) / 16;
          const at = t * lobes.length;
          const i0 = Math.floor(at) % lobes.length;
          const i1 = (i0 + 1) % lobes.length;
          const m = at - Math.floor(at);
          const rr = lobes[i0] + (lobes[i1] - lobes[i0]) * (m * m * (3 - 2 * m));
          const ex = Math.cos(t * TAU) * rx * rr;
          const ey = Math.sin(t * TAU) * ry * rr;
          xs.push(x + ex * ca - ey * sa);
          ys.push(y + ex * sa + ey * ca);
        }
        ctx.fillStyle = tones[patch.tone];
        ctx.beginPath();
        ctx.moveTo((xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2);
        for (let j = 1; j < 16; j++)
          ctx.quadraticCurveTo(xs[j], ys[j], (xs[j] + xs[j + 1]) / 2, (ys[j] + ys[j + 1]) / 2);
        ctx.quadraticCurveTo(xs[16], ys[16], (xs[16] + xs[1]) / 2, (ys[16] + ys[1]) / 2);
        ctx.fill();
      }
      ctx.lineJoin = "round";
      ctx.strokeStyle = palette.shade;
      ctx.lineWidth = L * 0.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px[1], py[1]);
      for (let k = 2; k < NODES - 3; k++) ctx.lineTo(px[k], py[k]);
      ctx.strokeStyle = palette.sheen;
      ctx.lineWidth = L * 0.07;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = f.depth * 0.4;
      ctx.fillStyle = palette.tint;
      ctx.fillRect(Math.min(...px) - L, Math.min(...py) - L, L * 3, L * 3);
      ctx.restore();

      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = palette.eye;
      for (const side of [-1, 1]) {
        const [x, y] = pointAt(0.07, 0.78 * side, L);
        ctx.beginPath();
        ctx.arc(x, y, L * 0.014, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawShadows = () => {
      if (!sctx) return;
      const q = 0.25;
      shadows.width = Math.max(1, Math.round(w * q));
      shadows.height = Math.max(1, Math.round(h * q));
      sctx.setTransform(q, 0, 0, q, 0, 0);
      sctx.fillStyle = "#000";
      for (const f of fishes) {
        pose(f, 1);
        const lift = 1 - f.depth;
        const ox = (6 + 18 * lift) * 0.55;
        const oy = (6 + 18 * lift) * 0.85;
        sctx.save();
        sctx.translate(ox, oy);
        sctx.globalAlpha = 0.55 + 0.45 * f.depth;
        bodyPath(sctx, f.len);
        sctx.fill();
        tailPath(sctx, f);
        sctx.fill();
        finsPath(sctx, f);
        sctx.fill();
        sctx.restore();
      }
      sctx.globalCompositeOperation = "source-in";
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalAlpha = 1;
      sctx.fillStyle = palette.shadow;
      sctx.fillRect(0, 0, shadows.width, shadows.height);
      sctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(shadows, 0, 0, w, h);
    };

    const drawRings = (dt: number) => {
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += dt;
        if (r.age > r.life) rings.splice(i, 1);
      }
      ctx.lineWidth = 1.4;
      for (const r of rings) {
        const t = r.age / r.life;
        const fade = (1 - t) * (1 - t) * Math.min(1, r.age * 6) * r.strength;
        for (let n = 0; n < 3; n++) {
          const radius = 5 + r.age * 30 - n * 9;
          if (radius <= 1) continue;
          const a = fade * (1 - n * 0.32);
          ctx.globalAlpha = a;
          ctx.strokeStyle = palette.ringDark;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y + 1.2, radius, radius * 0.94, 0, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = palette.ringLight;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y - 0.6, radius, radius * 0.94, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const draw = (dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(floor, 0, 0, w, h);
      drawShadows();
      const order = [...fishes].sort((a, b) => b.depth - a.depth);
      for (const f of order) {
        pose(f, 1 + (1 - f.depth) * 0.06);
        drawFish(f);
      }
      drawRings(dt);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const step = dt * pace;
      time += step;
      pointer.resting = pointer.present && time - pointer.moved > 0.35;
      for (const f of fishes) steer(f, step);
      draw(step);
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
      const first = w === 0 || h === 0;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w === 0 || h === 0) return;
      if (first) {
        spawn();
        for (let i = 0; i < 90; i++) {
          time += 1 / 30;
          for (const f of fishes) steer(f, 1 / 30);
        }
      } else {
        for (const f of fishes) {
          for (let k = 0; k < NODES; k++) {
            f.nx[k] = clamp(f.nx[k], 0, w);
            f.ny[k] = clamp(f.ny[k], 0, h);
          }
        }
      }
      paintFloor();
      draw(0);
    };

    const local = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      if (!pointer.resting || Math.hypot(x - pointer.x, y - pointer.y) > 6) {
        if (pointer.resting) {
          const way = Math.random() < 0.5 ? -1 : 1;
          for (const f of fishes) {
            f.curious = Math.random() < curious;
            f.orbit = Math.random() < 0.8 ? way : -way;
          }
        }
        pointer.moved = time;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.present = true;
    };

    const onLeave = () => {
      pointer.present = false;
    };

    const onClick = (event: MouseEvent) => {
      if (still) return;
      const target = event.target as Element | null;
      if (target?.closest(OWN_CLICKS)) return;
      const [x, y] = local(event);
      ring(x, y, 1.15);
      startle(x, y);
      pointer.moved = time;
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
      palette = readPalette(canvas);
      paintFloor();
      draw(0);
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("click", onClick);
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
      root.removeEventListener("click", onClick);
    };
  }, [count, speed, curiosity, seed, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-koi-pond-night:0] dark:[--miyuki-koi-pond-night:1]",
        "bg-[color-mix(in_oklab,color-mix(in_oklab,var(--chart-2)_55%,var(--brand))_16%,var(--background))]",
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
