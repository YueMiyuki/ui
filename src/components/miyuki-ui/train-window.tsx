"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type TrainWindowMood = "dawn" | "day" | "dusk" | "night" | "snow" | "aurora";

export interface TrainWindowScene {
  mood: TrainWindowMood;
  seed: number | string;
}

export interface TrainWindowProps extends Omit<ComponentProps<"div">, "children"> {
  scenes: TrainWindowScene[];
  speed?: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  interval?: number;
  caption?: ReactNode;
  children?: ReactNode;
}

type Lch = [number, number, number];

interface Palette {
  sky: [number, Lch][];
  sun: Lch;
  disc: number;
  glow: Lch;
  glowAlpha: number;
  sunAt: [number, number];
  moon: boolean;
  stars: number;
  cloud: Lch | null;
  far: Lch;
  farSnow: Lch;
  shade: Lch;
  mid: Lch;
  midTop: Lch;
  forestBack: Lch;
  forest: Lch;
  fieldFar: Lch;
  field: Lch;
  mark: Lch;
  house: Lch;
  roof: Lch;
  lit: Lch | null;
  verge: Lch;
  twig: Lch;
  pole: Lch;
  haze: Lch;
  hazeAlpha: number;
  snowfall: number;
  aurora: boolean;
}

const NIGHT_SKY: [number, Lch][] = [
  [0, [0.14, 0.03, 262]],
  [0.6, [0.2, 0.045, 256]],
  [1, [0.3, 0.055, 246]],
];

const PALETTES: Record<TrainWindowMood, Palette> = {
  dawn: {
    sky: [
      [0, [0.66, 0.06, 265]],
      [0.4, [0.78, 0.055, 305]],
      [0.72, [0.88, 0.06, 20]],
      [1, [0.94, 0.07, 75]],
    ],
    sun: [0.98, 0.05, 85],
    disc: 1,
    glow: [0.93, 0.1, 60],
    glowAlpha: 0.7,
    sunAt: [0.74, 0.5],
    moon: false,
    stars: 0,
    cloud: [0.93, 0.045, 20],
    far: [0.7, 0.055, 295],
    farSnow: [0.95, 0.035, 35],
    shade: [0.58, 0.075, 290],
    mid: [0.56, 0.055, 288],
    midTop: [0.66, 0.05, 305],
    forestBack: [0.45, 0.05, 290],
    forest: [0.32, 0.05, 285],
    fieldFar: [0.84, 0.045, 330],
    field: [0.92, 0.03, 40],
    mark: [0.66, 0.06, 300],
    house: [0.36, 0.04, 285],
    roof: [0.92, 0.03, 30],
    lit: [0.86, 0.12, 75],
    verge: [0.82, 0.04, 330],
    twig: [0.3, 0.04, 285],
    pole: [0.24, 0.035, 285],
    haze: [0.88, 0.05, 345],
    hazeAlpha: 0.5,
    snowfall: 0,
    aurora: false,
  },
  day: {
    sky: [
      [0, [0.64, 0.11, 248]],
      [0.55, [0.79, 0.075, 240]],
      [1, [0.93, 0.03, 228]],
    ],
    sun: [0.995, 0.01, 95],
    disc: 1,
    glow: [0.98, 0.03, 95],
    glowAlpha: 0.5,
    sunAt: [0.2, 0.3],
    moon: false,
    stars: 0,
    cloud: [0.99, 0.004, 230],
    far: [0.66, 0.07, 250],
    farSnow: [0.98, 0.008, 235],
    shade: [0.68, 0.075, 255],
    mid: [0.52, 0.06, 232],
    midTop: [0.6, 0.06, 225],
    forestBack: [0.42, 0.05, 215],
    forest: [0.3, 0.045, 205],
    fieldFar: [0.9, 0.025, 240],
    field: [0.975, 0.006, 235],
    mark: [0.72, 0.05, 248],
    house: [0.45, 0.08, 30],
    roof: [0.98, 0.005, 235],
    lit: null,
    verge: [0.92, 0.015, 240],
    twig: [0.3, 0.035, 220],
    pole: [0.27, 0.03, 240],
    haze: [0.9, 0.03, 235],
    hazeAlpha: 0.55,
    snowfall: 0,
    aurora: false,
  },
  dusk: {
    sky: [
      [0, [0.3, 0.06, 275]],
      [0.45, [0.45, 0.08, 300]],
      [0.78, [0.64, 0.11, 340]],
      [0.92, [0.75, 0.12, 40]],
      [1, [0.82, 0.1, 65]],
    ],
    sun: [0.95, 0.07, 70],
    disc: 1,
    glow: [0.82, 0.13, 50],
    glowAlpha: 0.8,
    sunAt: [0.36, 0.56],
    moon: false,
    stars: 24,
    cloud: [0.7, 0.1, 25],
    far: [0.44, 0.07, 300],
    farSnow: [0.76, 0.08, 18],
    shade: [0.32, 0.07, 295],
    mid: [0.33, 0.06, 295],
    midTop: [0.4, 0.07, 312],
    forestBack: [0.27, 0.05, 290],
    forest: [0.2, 0.04, 285],
    fieldFar: [0.5, 0.07, 320],
    field: [0.6, 0.07, 335],
    mark: [0.4, 0.06, 300],
    house: [0.17, 0.035, 280],
    roof: [0.58, 0.06, 330],
    lit: [0.86, 0.14, 72],
    verge: [0.38, 0.05, 310],
    twig: [0.15, 0.03, 285],
    pole: [0.13, 0.025, 280],
    haze: [0.68, 0.1, 350],
    hazeAlpha: 0.5,
    snowfall: 0,
    aurora: false,
  },
  night: {
    sky: NIGHT_SKY,
    sun: [0.96, 0.02, 230],
    disc: 1,
    glow: [0.8, 0.05, 236],
    glowAlpha: 0.35,
    sunAt: [0.8, 0.3],
    moon: true,
    stars: 140,
    cloud: null,
    far: [0.27, 0.05, 256],
    farSnow: [0.6, 0.04, 245],
    shade: [0.2, 0.05, 258],
    mid: [0.2, 0.04, 258],
    midTop: [0.25, 0.045, 255],
    forestBack: [0.16, 0.035, 258],
    forest: [0.12, 0.025, 260],
    fieldFar: [0.32, 0.045, 252],
    field: [0.42, 0.045, 250],
    mark: [0.26, 0.04, 255],
    house: [0.12, 0.025, 262],
    roof: [0.5, 0.035, 248],
    lit: [0.86, 0.13, 78],
    verge: [0.3, 0.04, 252],
    twig: [0.1, 0.02, 262],
    pole: [0.09, 0.02, 262],
    haze: [0.34, 0.05, 250],
    hazeAlpha: 0.4,
    snowfall: 0,
    aurora: false,
  },
  snow: {
    sky: [
      [0, [0.77, 0.028, 250]],
      [1, [0.92, 0.014, 236]],
    ],
    sun: [0.97, 0.01, 90],
    disc: 0.4,
    glow: [0.96, 0.01, 90],
    glowAlpha: 0.3,
    sunAt: [0.62, 0.3],
    moon: false,
    stars: 0,
    cloud: [0.95, 0.008, 240],
    far: [0.72, 0.03, 252],
    farSnow: [0.95, 0.01, 240],
    shade: [0.74, 0.04, 255],
    mid: [0.62, 0.035, 250],
    midTop: [0.84, 0.018, 245],
    forestBack: [0.52, 0.035, 248],
    forest: [0.38, 0.035, 245],
    fieldFar: [0.88, 0.02, 245],
    field: [0.975, 0.005, 240],
    mark: [0.72, 0.03, 248],
    house: [0.4, 0.05, 35],
    roof: [0.985, 0.004, 240],
    lit: [0.85, 0.11, 80],
    verge: [0.94, 0.01, 240],
    twig: [0.32, 0.03, 245],
    pole: [0.34, 0.025, 245],
    haze: [0.92, 0.012, 240],
    hazeAlpha: 0.65,
    snowfall: 160,
    aurora: false,
  },
  aurora: {
    sky: [
      [0, [0.12, 0.025, 256]],
      [0.6, [0.18, 0.04, 236]],
      [1, [0.27, 0.05, 210]],
    ],
    sun: [0.95, 0.02, 220],
    disc: 1,
    glow: [0.8, 0.05, 220],
    glowAlpha: 0.2,
    sunAt: [0.14, 0.32],
    moon: true,
    stars: 110,
    cloud: null,
    far: [0.25, 0.045, 230],
    farSnow: [0.56, 0.05, 200],
    shade: [0.19, 0.045, 240],
    mid: [0.19, 0.035, 240],
    midTop: [0.23, 0.04, 230],
    forestBack: [0.15, 0.03, 242],
    forest: [0.11, 0.022, 248],
    fieldFar: [0.3, 0.045, 220],
    field: [0.38, 0.045, 215],
    mark: [0.25, 0.04, 225],
    house: [0.11, 0.02, 250],
    roof: [0.44, 0.04, 210],
    lit: [0.86, 0.13, 78],
    verge: [0.28, 0.04, 220],
    twig: [0.08, 0.02, 250],
    pole: [0.08, 0.02, 250],
    haze: [0.32, 0.05, 210],
    hazeAlpha: 0.4,
    snowfall: 0,
    aurora: true,
  },
};

const SPEEDS = {
  cloud: 4,
  far: 6,
  mid: 20,
  back: 44,
  forest: 62,
  field: 150,
  ground: 430,
  verge: 600,
  pole: 840,
};

const SHUTTER = 1 / 60;

function rgb([L, C, h]: Lch, alpha = 1) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [r, g, bl] = lin.map((v) => {
    const x = Math.min(1, Math.max(0, v));
    return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255);
  });
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

function noise(seed: string) {
  const rng = createRng(seed);
  const g = Array.from({ length: 256 }, () => rng() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const t = x - i;
    const a = g[i & 255] * t;
    const b = g[(i + 1) & 255] * (t - 1);
    const s = t * t * t * (t * (t * 6 - 15) + 10);
    return (a + (b - a) * s) * 2;
  };
}

function fbm(seed: string, octaves: number) {
  const layers = Array.from({ length: octaves }, (_, i) => noise(`${seed}:${i}`));
  return (x: number) => {
    let sum = 0;
    let amp = 1;
    let f = 1;
    let norm = 0;
    for (const n of layers) {
      sum += n(x * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.07;
    }
    return sum / norm;
  };
}

function hash(i: number, salt: number) {
  let h = Math.imul(i ^ salt, 0x45d9f3b) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x2c1b3c6d);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

interface Built {
  p: Palette;
  salt: number;
  far: (x: number) => number;
  peaks: (x: number) => number;
  mid: (x: number) => number;
  forest: (x: number) => number;
  sky: [number, string][];
  stars: Float32Array;
  c: Record<string, string>;
}

const built = new Map<string, Built>();

function build(scene: TrainWindowScene): Built {
  const key = `${scene.mood}|${scene.seed}`;
  const hit = built.get(key);
  if (hit) return hit;
  const p = PALETTES[scene.mood] ?? PALETTES.day;
  const seed = String(scene.seed);
  const rng = createRng(`${seed}:stars`);
  const stars = new Float32Array(p.stars * 3);
  for (let i = 0; i < p.stars; i++) {
    stars[i * 3] = rng();
    stars[i * 3 + 1] = 0.17 + rng() ** 1.4 * 0.4;
    stars[i * 3 + 2] = rng();
  }
  const made: Built = {
    p,
    salt: Math.floor(createRng(`${seed}:salt`)() * 1e9),
    far: fbm(`${seed}:far`, 4),
    peaks: fbm(`${seed}:peaks`, 3),
    mid: fbm(`${seed}:mid`, 3),
    forest: fbm(`${seed}:forest`, 3),
    sky: p.sky.map(([o, v]) => [o, rgb(v)]),
    stars,
    c: {
      sun: rgb(p.sun, p.disc),
      glow: rgb(p.glow, p.glowAlpha),
      glow0: rgb(p.glow, 0),
      cloud: p.cloud ? rgb(p.cloud, 0.5) : "",
      far: rgb(p.far),
      farSnow: rgb(p.farSnow),
      shade: rgb(p.shade),
      shade0: rgb(p.shade, 0),
      mid: rgb(p.mid),
      midTop: rgb(p.midTop),
      forestBack: rgb(p.forestBack),
      forest: rgb(p.forest),
      fieldFar: rgb(p.fieldFar),
      field: rgb(p.field),
      mark: rgb(p.mark),
      house: rgb(p.house),
      roof: rgb(p.roof),
      lit: p.lit ? rgb(p.lit) : "",
      litGlow: p.lit ? rgb(p.lit, 0.22) : "",
      verge: rgb(p.verge),
      twig: rgb(p.twig),
      pole: rgb(p.pole),
      pole0: rgb(p.pole, 0),
      haze: rgb(p.haze, p.hazeAlpha),
      haze0: rgb(p.haze, 0),
      star: rgb([0.96, 0.015, 230]),
    },
  };
  built.set(key, made);
  return made;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function TrainWindow({
  scenes,
  speed = 1,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  interval = 0,
  caption,
  className,
  children,
  ...props
}: TrainWindowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;
  const count = scenes.length;
  const [own, setOwn] = useState(defaultIndex);
  const index = count ? mod(indexProp ?? own, count) : 0;
  const speedRef = useRef(speed);
  const targetRef = useRef(index);
  const scenesRef = useRef(scenes);
  const advance = useRef<() => void>(() => {});

  useEffect(() => {
    speedRef.current = speed;
    targetRef.current = index;
    scenesRef.current = scenes;
    advance.current = () => {
      const next = (index + 1) % Math.max(1, count);
      if (indexProp === undefined) setOwn(next);
      onIndexChange?.(next);
    };
  });

  useEffect(() => {
    if (!interval || count < 2 || reduce) return;
    const timer = setInterval(() => advance.current(), Math.max(4000, interval));
    return () => clearInterval(timer);
  }, [interval, count, reduce]);

  const sceneKey = scenes.map((s) => `${s.mood}|${s.seed}`).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const source = scenesRef.current;
    if (!canvas || !ctx || source.length === 0) return;
    const list = source.map(build);
    const still = reduce;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let travel = 40;
    let shown = mod(targetRef.current, list.length);
    let onScreen = true;
    let jolt = 0;
    let nextJoint = 0;
    let tunnel: { start: number; length: number; swapped: boolean; to: number } | null = null;
    let fade = 0;
    let fadeDir = 0;
    let fadeTo = shown;
    let ys = new Float32Array(0);
    const flakes = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      flakes[i * 3] = Math.random();
      flakes[i * 3 + 1] = Math.random();
      flakes[i * 3 + 2] = 0.3 + Math.random() * 0.7;
    }

    const k = () => h / 300;
    const at = (layer: number) => travel * layer * k();
    const smear = (layer: number, v: number) => layer * v * k() * SHUTTER;

    const sky = (s: Built) => {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.66);
      for (const [o, col] of s.sky) g.addColorStop(o, col);
      ctx.fillStyle = g;
      ctx.fillRect(0, -4, w, h + 8);
      const off = at(SPEEDS.cloud);
      if (s.p.stars) {
        ctx.fillStyle = s.c.star;
        const n = s.stars.length / 3;
        for (let i = 0; i < n; i++) {
          const x = mod(s.stars[i * 3] * w * 1.3 - off * 0.3, w * 1.3) - w * 0.15;
          const b = s.stars[i * 3 + 2];
          ctx.globalAlpha = 0.2 + b * 0.6 * (0.8 + 0.2 * Math.sin(clock * 1.7 + i * 2.1));
          const r = b > 0.92 ? 1.4 : 0.9;
          ctx.fillRect(x, s.stars[i * 3 + 1] * h, r, r);
        }
        ctx.globalAlpha = 1;
      }
      if (s.p.aurora) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let b = 0; b < 2; b++) {
          const base = h * (0.44 + b * 0.05);
          const tall = h * (0.2 - b * 0.05);
          const hue: Lch = b ? [0.72, 0.12, 215] : [0.8, 0.13, 168];
          for (let x = -6; x < w + 6; x += 5) {
            const wx = x + off * 0.5;
            const wave =
              Math.sin(wx * 0.006 + clock * 0.12 + b) * h * 0.04 + Math.sin(wx * 0.017 - clock * 0.2) * h * 0.015;
            const strength = 0.45 + 0.55 * Math.sin(wx * 0.011 + clock * 0.25 + b * 2);
            const top = base + wave - tall * (0.55 + 0.45 * strength);
            const g2 = ctx.createLinearGradient(0, top, 0, base + wave + 4);
            g2.addColorStop(0, rgb(hue, 0));
            g2.addColorStop(0.75, rgb(hue, 0.1 * strength));
            g2.addColorStop(1, rgb(hue, 0.3 * strength));
            ctx.fillStyle = g2;
            ctx.fillRect(x, top, 5.5, base + wave + 4 - top);
          }
        }
        ctx.restore();
      }
      const cx = s.p.sunAt[0] * w - off * 0.1;
      const cy = s.p.sunAt[1] * h;
      const r = h * (s.p.moon ? 0.032 : 0.048);
      const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * (s.p.moon ? 6 : 10));
      halo.addColorStop(0, s.c.glow);
      halo.addColorStop(1, s.c.glow0);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = s.c.sun;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (s.p.cloud) {
        ctx.fillStyle = s.c.cloud;
        const cell = h * 1.4;
        for (let c = Math.floor((off - w) / cell); c < Math.ceil((off + 2 * w) / cell); c++) {
          if (hash(c, s.salt + 11) > 0.55) continue;
          const x = c * cell + hash(c, s.salt + 12) * h - off;
          const y = h * (0.24 + hash(c, s.salt + 13) * 0.14);
          const len = h * (0.3 + hash(c, s.salt + 14) * 0.45);
          ctx.beginPath();
          ctx.ellipse(x, y, len, h * 0.014, 0, 0, Math.PI * 2);
          ctx.ellipse(x + len * 0.35, y - h * 0.01, len * 0.45, h * 0.013, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const ridge = (y: (x: number) => number, step: number) => {
      const n = Math.ceil((w + 12) / step) + 1;
      if (ys.length < n) ys = new Float32Array(n);
      ctx.beginPath();
      ctx.moveTo(-6, h + 6);
      for (let i = 0; i < n; i++) {
        const x = -6 + i * step;
        ys[i] = y(x);
        ctx.lineTo(x, ys[i]);
      }
      ctx.lineTo(-6 + (n - 1) * step, h + 6);
      ctx.closePath();
      return n;
    };

    const lit = (s: Built, y: (x: number) => number, step: number, reach: number) => {
      const dir = s.p.sunAt[0] < 0.5 ? 1 : -1;
      return ridge((x) => y(x + dir * reach), step);
    };

    const far = (s: Built) => {
      const off = at(SPEEDS.far);
      const y = (x: number) => {
        const wx = (x + off) / h;
        const big = s.far(wx * 0.8) * 0.5 + 0.5;
        const pk = 1 - Math.abs(s.peaks(wx * 2.4));
        return h * 0.6 - h * (0.06 + 0.13 * big + 0.12 * pk * pk * big);
      };
      const body = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.6);
      body.addColorStop(0, s.c.farSnow);
      body.addColorStop(0.3, s.c.farSnow);
      body.addColorStop(0.62, s.c.far);
      body.addColorStop(1, s.c.far);
      ridge(y, 3);
      ctx.fillStyle = s.c.shade;
      ctx.fill();
      ctx.save();
      ctx.clip();
      lit(s, y, 3, h * 0.035);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.35;
      ridge(y, 3);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const haze = (s: Built, top: number, bottom: number, peak: number) => {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, s.c.haze0);
      g.addColorStop(peak, s.c.haze);
      g.addColorStop(1, s.c.haze0);
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, bottom - top);
    };

    const mid = (s: Built) => {
      const off = at(SPEEDS.mid);
      const y = (x: number) => {
        const wx = (x + off) / h;
        return h * 0.68 - h * (0.04 + 0.08 * (s.mid(wx * 1.3) * 0.5 + 0.5)) - Math.abs(s.peaks(wx * 8)) * h * 0.008;
      };
      const body = ctx.createLinearGradient(0, h * 0.52, 0, h * 0.7);
      body.addColorStop(0, s.c.midTop);
      body.addColorStop(1, s.c.mid);
      ridge(y, 3);
      ctx.fillStyle = s.c.mid;
      ctx.fill();
      ctx.save();
      ctx.clip();
      lit(s, y, 3, h * 0.05);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
    };

    const forestRow = (
      s: Built,
      layer: number,
      base: number,
      cell: number,
      tall: number,
      color: string,
      salt: number,
    ) => {
      const off = at(layer);
      const hill = (x: number) => h * base - h * (0.012 + 0.03 * (s.forest((x + off) / h + salt) * 0.5 + 0.5));
      ridge(hill, 4);
      ctx.fillStyle = color;
      ctx.fill();
      const c = h * cell;
      ctx.beginPath();
      for (let i = Math.floor((off - c * 2) / c); i <= Math.ceil((off + w + c * 2) / c); i++) {
        const dense = s.forest(i * 0.045 + salt) * 0.5 + 0.5;
        if (hash(i, s.salt + salt) > 0.2 + dense * 0.85) continue;
        const x = i * c + hash(i, s.salt + salt + 1) * c - off;
        const bottom = hill(x) + h * 0.006;
        const th = h * tall * (0.55 + hash(i, s.salt + salt + 2) * 0.6);
        const tw = th * 0.4;
        ctx.moveTo(x, bottom - th);
        ctx.lineTo(x - tw * 0.32, bottom - th * 0.45);
        ctx.lineTo(x - tw * 0.18, bottom - th * 0.45);
        ctx.lineTo(x - tw / 2, bottom);
        ctx.lineTo(x + tw / 2, bottom);
        ctx.lineTo(x + tw * 0.18, bottom - th * 0.45);
        ctx.lineTo(x + tw * 0.32, bottom - th * 0.45);
        ctx.closePath();
      }
      ctx.fill();
    };

    const field = (s: Built, v: number) => {
      const top = h * 0.735;
      const g = ctx.createLinearGradient(0, top, 0, h * 0.92);
      g.addColorStop(0, s.c.fieldFar);
      g.addColorStop(0.5, s.c.field);
      g.addColorStop(1, s.c.field);
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, h - top + 6);

      ctx.fillStyle = s.c.mark;
      for (let band = 0; band < 8; band++) {
        const t = (band + 0.5) / 8;
        const y = top + h * 0.02 + (h * 0.88 - top - h * 0.02) * t ** 1.2;
        const layer = SPEEDS.field + (SPEEDS.ground - SPEEDS.field) * t ** 1.5;
        const off = at(layer);
        const blur = smear(layer, v);
        const period = h * (0.05 + t * 0.08);
        const mark = h * (0.004 + t * 0.012);
        for (let i = Math.floor(off / period) - 1; i <= Math.ceil((off + w) / period) + 1; i++) {
          const roll = hash(i * 13 + band, s.salt + 51);
          if (roll > 0.42) continue;
          const x = i * period + roll * period - off;
          const len = mark * (0.6 + roll * 1.4) + blur;
          ctx.globalAlpha = (0.12 + t * 0.22) * Math.min(1, (mark * 1.5) / len + 0.35);
          ctx.fillRect(x, y + (hash(i, s.salt + 52) - 0.5) * h * 0.014, len, Math.max(0.8, h * (0.0015 + t * 0.0025)));
        }
      }
      ctx.globalAlpha = 1;

      const off = at(SPEEDS.field);
      const cell = h * 0.72;
      for (let i = Math.floor((off - cell) / cell); i <= Math.ceil((off + w + cell) / cell); i++) {
        const roll = hash(i, s.salt + 21);
        const x = i * cell + hash(i, s.salt + 22) * cell * 0.6 - off;
        const depth = hash(i, s.salt + 23);
        const scale = 0.75 + depth * 0.45;
        const ground = top + h * (0.012 + depth * 0.028);
        if (roll < 0.3) {
          const bw = h * 0.085 * scale;
          const bh = h * 0.038 * scale;
          ctx.fillStyle = s.c.house;
          ctx.fillRect(x, ground - bh, bw, bh);
          ctx.fillStyle = s.c.roof;
          ctx.beginPath();
          ctx.moveTo(x - bw * 0.08, ground - bh);
          ctx.lineTo(x + bw * 0.5, ground - bh - h * 0.028 * scale);
          ctx.lineTo(x + bw * 1.08, ground - bh);
          ctx.closePath();
          ctx.fill();
          if (s.c.lit) {
            for (let wi = 0; wi < 3; wi++) {
              if (hash(i * 7 + wi, s.salt + 24) < 0.4) continue;
              const wx = x + bw * (0.16 + wi * 0.27);
              const wy = ground - bh * 0.64;
              ctx.fillStyle = s.c.litGlow;
              ctx.fillRect(wx - 2, wy - 2, bw * 0.13 + 4, bh * 0.32 + 4);
              ctx.fillStyle = s.c.lit;
              ctx.fillRect(wx, wy, bw * 0.13, bh * 0.32);
            }
          }
        } else if (roll < 0.55) {
          ctx.fillStyle = s.c.house;
          const posts = 4 + Math.floor(hash(i, s.salt + 25) * 6);
          const gap = h * 0.05 * scale;
          const pw = Math.max(1, h * 0.004);
          for (let j = 0; j < posts; j++) ctx.fillRect(x + j * gap, ground - h * 0.02 * scale, pw, h * 0.02 * scale);
          ctx.fillRect(x, ground - h * 0.015 * scale, (posts - 1) * gap + pw, Math.max(0.75, h * 0.0025));
        } else if (roll < 0.75) {
          const th = h * (0.05 + hash(i, s.salt + 27) * 0.05) * scale;
          ctx.fillStyle = s.c.forest;
          ctx.beginPath();
          const n = 2 + Math.floor(hash(i, s.salt + 28) * 4);
          for (let t = 0; t < n; t++) {
            const tx = x + t * th * 0.3;
            const tt = th * (0.7 + hash(i * 5 + t, s.salt + 29) * 0.45);
            ctx.moveTo(tx, ground - tt);
            ctx.lineTo(tx - tt * 0.2, ground);
            ctx.lineTo(tx + tt * 0.2, ground);
            ctx.closePath();
          }
          ctx.fill();
        }
      }
    };

    const verge = (s: Built, v: number) => {
      const off = at(SPEEDS.verge);
      const blur = smear(SPEEDS.verge, v);
      const edge = (x: number) => {
        const wx = (x + off) / h;
        return h * 0.9 - h * (0.01 + 0.025 * (s.mid(wx * 3.3) * 0.5 + 0.5)) - Math.abs(s.peaks(wx * 21)) * h * 0.008;
      };
      const passes = blur > 1.5 ? 4 : 1;
      ctx.fillStyle = s.c.verge;
      for (let p = 0; p < passes; p++) {
        const dx = passes > 1 ? (p / (passes - 1) - 0.5) * blur : 0;
        ctx.globalAlpha = passes > 1 ? 0.4 : 1;
        ridge((x) => edge(x - dx), 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(0, h * 0.86, 0, h);
      g.addColorStop(0, rgb([0, 0, 0], 0));
      g.addColorStop(1, rgb(s.p.twig, 0.22));
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.86, w, h * 0.14 + 6);

      const tuft = ctx.createLinearGradient(0, h * 0.83, 0, h * 0.91);
      tuft.addColorStop(0, rgb(s.p.twig, 0));
      tuft.addColorStop(1, rgb(s.p.twig, 0.55));
      ctx.fillStyle = tuft;
      const step = h * 0.016;
      for (let i = Math.floor(off / step) - 1; i <= Math.ceil((off + w) / step) + 1; i++) {
        const roll = hash(i, s.salt + 61);
        if (roll > 0.6) continue;
        const x = i * step + roll * step - off;
        const tall = h * (0.015 + roll * roll * 0.07);
        const width = Math.max(1, h * 0.0035) + blur;
        ctx.globalAlpha = Math.min(1, (h * 0.006) / width + 0.25);
        ctx.fillRect(x, edge(x) - tall + h * 0.012, width, tall);
      }
      ctx.globalAlpha = 1;

      const cell = h * 1.7;
      ctx.fillStyle = s.c.twig;
      for (let i = Math.floor((off - cell) / cell); i <= Math.ceil((off + w + cell) / cell); i++) {
        if (hash(i, s.salt + 31) > 0.3) continue;
        const x = i * cell + hash(i, s.salt + 32) * cell * 0.5 - off;
        const th = h * (0.4 + hash(i, s.salt + 33) * 0.32);
        const tw = th * 0.38;
        const bottom = h * 0.93;
        const n = blur > 1.5 ? 7 : 1;
        ctx.globalAlpha = n > 1 ? 0.2 : 1;
        for (let p = 0; p < n; p++) {
          const dx = n > 1 ? (p / (n - 1) - 0.5) * blur * 1.2 : 0;
          ctx.beginPath();
          for (let t = 0; t < 4; t++) {
            const apex = bottom - th + (t * th * 0.55) / 4;
            const half = (tw / 2) * (0.4 + (0.6 * (t + 1)) / 4);
            ctx.moveTo(x + dx, apex);
            ctx.lineTo(x + dx - half, apex + th * 0.34);
            ctx.lineTo(x + dx + half, apex + th * 0.34);
            ctx.closePath();
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const poles = (s: Built, v: number) => {
      const off = at(SPEEDS.pole);
      const gap = h * 1.15;
      const blur = smear(SPEEDS.pole, v);
      const pw = h * 0.024;
      const xs: number[] = [];
      for (let i = Math.floor((off - gap) / gap); i <= Math.ceil((off + w + gap) / gap); i++) xs.push(i * gap - off);
      const arm = h * 0.215;
      ctx.strokeStyle = s.c.pole;
      ctx.lineWidth = Math.max(0.8, h * 0.0032);
      ctx.globalAlpha = 0.8;
      for (const lane of [0, 1, 2]) {
        const y0 = arm + h * 0.012 + lane * h * 0.024;
        const sag = h * (0.045 + lane * 0.01);
        ctx.beginPath();
        for (let i = 0; i < xs.length - 1; i++) {
          ctx.moveTo(xs[i], y0);
          ctx.quadraticCurveTo((xs[i] + xs[i + 1]) / 2, y0 + sag * 2, xs[i + 1], y0);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const width = pw + blur;
      const core = pw / width;
      for (const x of xs) {
        if (x < -width - h * 0.1 || x > w + width + h * 0.1) continue;
        const g = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
        g.addColorStop(0, s.c.pole0);
        g.addColorStop(Math.max(0, 0.5 - core * 0.5), s.c.pole);
        g.addColorStop(Math.min(1, 0.5 + core * 0.5), s.c.pole);
        g.addColorStop(1, s.c.pole0);
        ctx.globalAlpha = Math.min(1, core + 0.25);
        ctx.fillStyle = g;
        ctx.fillRect(x - width / 2, -6, width, h + 12);
        ctx.fillStyle = s.c.pole;
        ctx.fillRect(x - h * 0.085 - blur / 2, arm - h * 0.005, h * 0.17 + blur, h * 0.01);
        ctx.globalAlpha = 1;
      }
    };

    const snowfall = (s: Built, dt: number, v: number) => {
      if (!s.p.snowfall) return;
      const n = Math.min(flakes.length / 3, s.p.snowfall);
      const drift = SPEEDS.back * 1.4 * v * k();
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const near = flakes[i * 3 + 2];
        if (!still) {
          flakes[i * 3] = mod(flakes[i * 3] - (drift * (0.3 + near) * dt) / w, 1);
          flakes[i * 3 + 1] = mod(flakes[i * 3 + 1] + ((22 + 46 * near) * k() * dt) / h, 1);
        }
        const x = flakes[i * 3] * w;
        const y = flakes[i * 3 + 1] * h;
        const r = (0.5 + near * 1.3) * k();
        const streak = drift * (0.3 + near) * SHUTTER * 2;
        ctx.globalAlpha = 0.3 + near * 0.55;
        if (streak > r * 1.5) {
          ctx.lineWidth = r * 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + streak, y - streak * 0.15);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const scene = (s: Built, dt: number, v: number) => {
      sky(s);
      far(s);
      haze(s, h * 0.44, h * 0.64, 0.78);
      mid(s);
      haze(s, h * 0.58, h * 0.71, 0.82);
      forestRow(s, SPEEDS.back, 0.71, 0.017, 0.045, s.c.forestBack, 300);
      forestRow(s, SPEEDS.forest, 0.745, 0.022, 0.06, s.c.forest, 700);
      field(s, v);
      haze(s, h * 0.71, h * 0.79, 0.45);
      verge(s, v);
      poles(s, v);
      snowfall(s, dt, v);
    };

    const tunnelSlab = (left: number, right: number, v: number) => {
      const l = Math.max(-40, left);
      const r = Math.min(w + 40, right);
      if (r <= l) return;
      ctx.fillStyle = rgb([0.12, 0.014, 262]);
      ctx.fillRect(l, -6, r - l, h + 12);
      const off = at(SPEEDS.pole);
      const blur = smear(SPEEDS.pole, v);
      ctx.save();
      ctx.beginPath();
      ctx.rect(l, -6, r - l, h + 12);
      ctx.clip();
      ctx.fillStyle = rgb([0.16, 0.016, 262]);
      const rib = h * 0.38;
      ctx.globalAlpha = 0.7;
      for (let i = Math.floor((off + l) / rib) - 1; i <= Math.ceil((off + r) / rib) + 1; i++) {
        ctx.fillRect(i * rib - off, -6, h * 0.03 + blur, h + 12);
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = rgb([0.22, 0.02, 262]);
      ctx.fillRect(l, h * 0.58, r - l, Math.max(1, h * 0.004));
      ctx.fillRect(l, h * 0.61, r - l, Math.max(1, h * 0.003));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      const lamp = h * 1.6;
      for (let i = Math.floor((off + l) / lamp) - 1; i <= Math.ceil((off + r) / lamp) + 1; i++) {
        const x = i * lamp - off;
        const y = h * 0.36;
        const len = h * 0.04 + blur * 6;
        const tone: Lch = i % 4 === 0 ? [0.9, 0.06, 200] : [0.88, 0.12, 72];
        const g = ctx.createLinearGradient(x, 0, x + len, 0);
        g.addColorStop(0, rgb(tone, 0));
        g.addColorStop(0.2, rgb(tone, 0.95));
        g.addColorStop(0.8, rgb(tone, 0.95));
        g.addColorStop(1, rgb(tone, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, y - h * 0.005, len, h * 0.01);
        const halo = ctx.createRadialGradient(x + len / 2, y, 0, x + len / 2, y, h * 0.14 + len * 0.3);
        halo.addColorStop(0, rgb(tone, 0.2));
        halo.addColorStop(1, rgb(tone, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(x - h * 0.3, y - h * 0.32, len + h * 0.6, h * 0.64);
        ctx.fillStyle = rgb(tone, 0.07);
        ctx.fillRect(x - len * 0.1, h * 0.6, len * 1.2, h * 0.012);
      }
      ctx.restore();
      const face = h * 0.09;
      const portal = (x: number, dir: 1 | -1) => {
        if (x < -face * 3 || x > w + face * 3) return;
        ctx.fillStyle = rgb([0.52, 0.012, 250]);
        ctx.fillRect(dir === 1 ? x : x - face, -6, face, h + 12);
        ctx.fillStyle = rgb([0.62, 0.012, 250]);
        ctx.fillRect(dir === 1 ? x : x - 2, -6, 2, h + 12);
        const inner = dir === 1 ? x + face : x - face;
        const sh = ctx.createLinearGradient(inner, 0, inner + dir * face * 2, 0);
        sh.addColorStop(0, "rgba(8, 11, 20, 0.9)");
        sh.addColorStop(1, "rgba(8, 11, 20, 0)");
        ctx.fillStyle = sh;
        ctx.fillRect(Math.min(inner, inner + dir * face * 2), -6, face * 2, h + 12);
      };
      portal(left, 1);
      if (right < w + face * 3) {
        const spill = ctx.createLinearGradient(right, 0, right - h * 1.1, 0);
        spill.addColorStop(0, "rgba(230, 238, 255, 0.3)");
        spill.addColorStop(1, "rgba(230, 238, 255, 0)");
        ctx.fillStyle = spill;
        const a = Math.max(l, right - h * 1.1);
        ctx.fillRect(a, -6, Math.max(0, Math.min(right, w) - a), h + 12);
        portal(right, -1);
      }
    };

    const reflection = (dark: number) => {
      if (dark <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = dark;
      const top = ctx.createRadialGradient(w * 0.5, -h * 0.15, 0, w * 0.5, -h * 0.15, h);
      top.addColorStop(0, "rgba(255, 238, 210, 0.17)");
      top.addColorStop(1, "rgba(255, 238, 210, 0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, w, h);
      const pane = ctx.createLinearGradient(0, h * 0.2, 0, h);
      pane.addColorStop(0, "rgba(210, 222, 245, 0.05)");
      pane.addColorStop(1, "rgba(210, 222, 245, 0)");
      ctx.strokeStyle = pane;
      ctx.lineWidth = h * 0.06;
      ctx.beginPath();
      ctx.roundRect(w * 0.08, h * 0.26, w * 0.84, h * 0.9, h * 0.08);
      ctx.stroke();
      ctx.restore();
    };

    const render = (dt: number) => {
      if (!w || !h) return;
      const want = mod(targetRef.current, list.length);
      const v = still ? 0 : Math.max(0, speedRef.current);
      clock += dt;

      if (still) {
        if (want !== fadeTo && fadeDir === 0) {
          fadeTo = want;
          fadeDir = 1;
        }
        if (fadeDir !== 0) {
          fade += fadeDir * dt * 7;
          if (fade >= 1) {
            fade = 1;
            shown = fadeTo;
            fadeDir = -1;
          } else if (fade <= 0) {
            fade = 0;
            fadeDir = 0;
          }
        }
      } else if (!tunnel && want !== shown) {
        tunnel = {
          start: at(SPEEDS.pole) + w + h * 0.15,
          length: w + SPEEDS.pole * k() * 1.2,
          swapped: false,
          to: want,
        };
      }

      const pace = tunnel ? Math.max(v, 0.7) : v;
      travel += dt * pace;

      if (!still && pace > 0 && at(SPEEDS.pole) > nextJoint) {
        nextJoint = at(SPEEDS.pole) + h * (2.4 + Math.random() * 0.8);
        jolt = Math.min(1.5, 0.5 + pace * 0.5);
      }
      jolt *= Math.exp(-dt * 8);
      const sway = still ? 0 : Math.sin(clock * 2.3) * 0.45 * Math.min(1.4, pace) + Math.sin(clock * 15) * jolt * 0.7;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.translate(0, sway);
      scene(list[shown], dt, pace);
      let dark = 0;
      if (tunnel) {
        const left = tunnel.start - at(SPEEDS.pole);
        const right = left + tunnel.length;
        if (left <= 0 && right >= w) {
          if (!tunnel.swapped) tunnel.swapped = true;
          if (shown !== want) shown = want;
        }
        tunnelSlab(left, right, pace);
        dark = clamp((Math.min(w, right) - Math.max(0, left)) / w, 0, 1);
        if (right < -h * 0.5) tunnel = null;
      }
      ctx.restore();
      reflection(dark);
      if (fade > 0) {
        ctx.fillStyle = rgb([0.12, 0.014, 262], fade);
        ctx.fillRect(0, 0, w, h);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0;
      last = now;
      render(dt);
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const halt = () => {
      cancelAnimationFrame(raf);
      raf = 0;
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
      render(0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen) wake();
      else halt();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? halt() : wake());
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    wake();

    return () => {
      halt();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sceneKey, reduce]);

  return (
    <div
      {...props}
      className={cn(
        "relative isolate flex aspect-[16/10] w-full flex-col overflow-clip rounded-3xl px-[4.5%] pt-[4.5%] pb-[3%]",
        "bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_65%,var(--card)),var(--muted)_70%)] ring-1 ring-border ring-inset",
        className,
      )}
    >
      <div className="relative min-h-0 flex-1 rounded-[30px] bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--border-strong)_80%,var(--card)),var(--border-strong))] p-[6px] shadow-[inset_0_1px_0_oklch(1_0_0/0.4),0_1px_2px_oklch(0.3_0.05_250/0.12)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_1px_2px_oklch(0.05_0.02_250/0.5)]">
        <div className="relative size-full overflow-clip rounded-[24px] bg-[oklch(0.2_0.02_260)] shadow-[0_0_0_2px_oklch(0.22_0.02_255/0.85)]">
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,transparent_16%,oklch(1_0_0/0.07)_28%,transparent_40%,transparent_60%,oklch(1_0_0/0.045)_67%,transparent_74%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[24px] shadow-[inset_0_0_20px_oklch(0.15_0.03_255/0.45),inset_0_0_2px_oklch(0.15_0.03_255/0.6)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[17%]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,color-mix(in_oklab,var(--secondary)_92%,var(--foreground))_0,color-mix(in_oklab,var(--secondary)_92%,var(--foreground))_5px,color-mix(in_oklab,var(--secondary)_80%,var(--foreground))_5px,color-mix(in_oklab,var(--secondary)_80%,var(--foreground))_6px)] dark:bg-[repeating-linear-gradient(to_bottom,color-mix(in_oklab,var(--secondary)_90%,var(--background))_0,color-mix(in_oklab,var(--secondary)_90%,var(--background))_5px,color-mix(in_oklab,var(--secondary)_70%,var(--background))_5px,color-mix(in_oklab,var(--secondary)_70%,var(--background))_6px)]" />
            <div className="absolute inset-x-0 -bottom-3 h-3 bg-linear-to-b from-[oklch(0.15_0.03_255/0.35)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[7px] bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--border-strong)_70%,var(--card)),var(--border-strong))] shadow-[inset_0_1px_0_oklch(1_0_0/0.25)]" />
            <div className="absolute top-full left-1/2 h-[9px] w-7 -translate-x-1/2 rounded-b-md bg-(--border-strong) shadow-[0_1px_2px_oklch(0.2_0.04_250/0.3)]" />
          </div>
          {children ? <div className="absolute inset-0">{children}</div> : null}
        </div>
      </div>
      <div className="relative z-10 -mx-[2.5%] mt-[-2px] h-[11%] min-h-9 shrink-0">
        <div className="absolute inset-x-0 top-0 h-[32%] rounded-t-[6px] bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--card)_72%,var(--border-strong)),var(--card))] shadow-[inset_0_1px_0_oklch(1_0_0/0.5)] dark:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--card)_80%,var(--background)),color-mix(in_oklab,var(--card)_80%,var(--foreground)))] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]" />
        <div className="absolute inset-x-0 top-[32%] bottom-0 flex items-center rounded-b-[5px] bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--card)_86%,var(--border-strong)),color-mix(in_oklab,var(--card)_74%,var(--border-strong)))] px-[3.5%] shadow-[0_8px_14px_-6px_oklch(0.25_0.05_250/0.35)] dark:bg-[linear-gradient(to_bottom,var(--card),color-mix(in_oklab,var(--card)_85%,var(--background)))] dark:shadow-[0_8px_14px_-6px_oklch(0.03_0.02_250/0.7)]">
          {caption ? (
            <div className="min-w-0 truncate text-xs font-medium text-muted-foreground tabular-nums">{caption}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
