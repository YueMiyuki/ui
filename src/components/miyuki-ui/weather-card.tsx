"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";

export interface WeatherCardProps extends ComponentProps<"div"> {
  condition?: WeatherCondition;
  night?: boolean;
  seed?: number | string;
}

const KEYS = ["cover", "heavy", "sun", "rain", "snow", "fog", "storm", "white"] as const;
type Key = (typeof KEYS)[number];
type Params = Record<Key, number>;

const SCENES: Record<WeatherCondition, Params> = {
  clear: { cover: 0.12, heavy: 0, sun: 1, rain: 0, snow: 0, fog: 0, storm: 0, white: 0.25 },
  cloudy: { cover: 0.9, heavy: 0.1, sun: 0.2, rain: 0, snow: 0, fog: 0.06, storm: 0, white: 0.25 },
  rain: { cover: 1, heavy: 0.2, sun: 0, rain: 0.78, snow: 0, fog: 0.2, storm: 0, white: 0 },
  snow: { cover: 0.95, heavy: 0.06, sun: 0, rain: 0, snow: 0.85, fog: 0.24, storm: 0, white: 1 },
  fog: { cover: 0.32, heavy: 0, sun: 0.12, rain: 0, snow: 0, fog: 1, storm: 0, white: 0.3 },
  storm: { cover: 1, heavy: 1, sun: 0, rain: 1, snow: 0, fog: 0.06, storm: 1, white: 0 },
};

const WINDOWS: Record<Key, [up: [number, number], down: [number, number]]> = {
  cover: [
    [0, 0.5],
    [0.4, 1],
  ],
  heavy: [
    [0.05, 0.55],
    [0.3, 0.9],
  ],
  fog: [
    [0.1, 0.65],
    [0.15, 0.8],
  ],
  sun: [
    [0.55, 1],
    [0, 0.42],
  ],
  rain: [
    [0.38, 0.95],
    [0, 0.55],
  ],
  snow: [
    [0.38, 0.95],
    [0, 0.55],
  ],
  storm: [
    [0.6, 1],
    [0, 0.3],
  ],
  white: [
    [0.45, 1],
    [0.35, 1],
  ],
};

const DURATION = 2.8;
const NIGHT_DURATION = 1.8;
const COL = 3;
const MAX_DEPTH = 28;

type Lab = [number, number, number];

const lch = (l: number, c: number, h: number): Lab => [
  l,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
];
const mix = (a: Lab, b: Lab, t: number): Lab => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function srgb(x: number) {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(0, x) ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(v) * 255);
}

function toRgb([L, a, b]: Lab, dim: number): [number, number, number] {
  const l0 = L - dim * 0.12 * L ** 3;
  const l_ = l0 + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l0 - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l0 - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function css(lab: Lab, alpha = 1, dim = 0) {
  const [r, g, b] = toRgb(lab, dim);
  return `rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`;
}

const PAL = {
  sky: {
    clear: [lch(0.74, 0.1, 242), lch(0.93, 0.032, 222)],
    clearNight: [lch(0.19, 0.045, 264), lch(0.33, 0.06, 250)],
    grey: [lch(0.8, 0.018, 246), lch(0.9, 0.012, 238)],
    greyNight: [lch(0.23, 0.02, 256), lch(0.3, 0.026, 250)],
    storm: [lch(0.34, 0.032, 258), lch(0.48, 0.03, 250)],
    stormNight: [lch(0.15, 0.02, 262), lch(0.22, 0.026, 256)],
    fog: [lch(0.84, 0.012, 242), lch(0.9, 0.01, 238)],
    fogNight: [lch(0.3, 0.018, 252), lch(0.37, 0.02, 248)],
  },
  cloud: {
    body: lch(0.975, 0.006, 240),
    shade: lch(0.85, 0.024, 248),
    heavyBody: lch(0.42, 0.024, 256),
    heavyShade: lch(0.32, 0.03, 258),
    bodyNight: lch(0.36, 0.03, 256),
    shadeNight: lch(0.25, 0.03, 258),
    heavyBodyNight: lch(0.22, 0.02, 258),
    heavyShadeNight: lch(0.14, 0.02, 262),
  },
  far: lch(0.77, 0.04, 248),
  farLit: lch(0.86, 0.025, 240),
  farSnow: lch(0.95, 0.01, 238),
  farNight: lch(0.3, 0.04, 256),
  farSnowNight: lch(0.46, 0.035, 246),
  near: lch(0.5, 0.035, 214),
  nearSnow: lch(0.88, 0.016, 240),
  nearNight: lch(0.18, 0.026, 254),
  nearSnowNight: lch(0.38, 0.03, 248),
  stormGround: lch(0.27, 0.025, 256),
  fog: lch(0.975, 0.006, 236),
  fogNight: lch(0.5, 0.025, 248),
  rain: lch(0.44, 0.05, 248),
  rainLight: lch(0.86, 0.02, 245),
  rainNight: lch(0.84, 0.03, 238),
  flakeRim: lch(0.62, 0.035, 248),
  flake: lch(0.995, 0.004, 240),
  driftTop: lch(0.995, 0.004, 236),
  driftBody: lch(0.9, 0.03, 244),
  driftLine: lch(0.66, 0.07, 250),
  driftTopNight: lch(0.82, 0.025, 238),
  driftBodyNight: lch(0.55, 0.035, 248),
  driftLineNight: lch(0.4, 0.04, 252),
  sun: lch(0.995, 0.03, 92),
  sunHalo: lch(0.95, 0.09, 84),
  moon: lch(0.95, 0.02, 228),
  moonHalo: lch(0.78, 0.05, 238),
  star: lch(0.97, 0.015, 230),
  flash: lch(0.93, 0.03, 252),
};

function noise1(rng: Rng, n = 96) {
  const v = Array.from({ length: n }, () => rng());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

interface Cloud {
  x: number;
  y: number;
  t: number;
  band: number;
  w: number;
  puffs: { dx: number; dy: number; r: number }[];
}

interface Drop {
  x: number;
  y: number;
  v: number;
  layer: number;
  age: number;
  floor: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  v: number;
  ph: number;
  sway: number;
  layer: number;
  age: number;
}

interface Geometry {
  W: number;
  H: number;
  far: Path2D;
  back: Path2D;
  near: Path2D;
  pines: Path2D;
  nearY: Float32Array;
  clouds: Cloud[];
  period: number;
  fogs: { x: number; y: number; rx: number; ry: number; band: number }[];
  stars: { x: number; y: number; r: number; ph: number; f: number }[];
  bolts: Path2D[];
  boltX: number[];
  restDrift: Float32Array;
  driftCap: Float32Array;
}

function buildGeometry(seed: number | string, W: number, H: number): Geometry {
  const rng = createRng(`${seed}:weather`);
  const n1 = noise1(rng);
  const n2 = noise1(rng);
  const n3 = noise1(rng);
  const n4 = noise1(rng);
  const step = 3;
  const cols = Math.ceil(W / step) + 2;

  const farBase = H * 0.86;
  const farAmp = Math.min(H * 0.3, 92);
  const farY = new Float32Array(cols);
  for (let i = 0; i < cols; i++) {
    const x = i * step;
    const ridged = 1 - Math.abs(2 * n1(x / 70) - 1);
    const h = 0.55 * ridged ** 1.6 + 0.3 * n2(x / 34) + 0.15 * n3(x / 12) + 0.25 * n4(x / 160);
    farY[i] = farBase - farAmp * h;
  }
  const far = new Path2D();
  far.moveTo(-2, H);
  for (let i = 0; i < cols; i++) far.lineTo(i * step, farY[i]);
  far.lineTo(W + 2, H);
  far.closePath();

  const backBase = H * 0.8;
  const backAmp = Math.min(H * 0.34, 104);
  const back = new Path2D();
  back.moveTo(-2, H);
  for (let i = 0; i < cols; i++) {
    const x = i * step;
    const ridged = 1 - Math.abs(2 * n3(x / 38 + 31) - 1);
    const h = 0.42 * n4(x / 64 + 11) + 0.36 * ridged ** 1.3 + 0.14 * n1(x / 13 + 5) + 0.08 * n2(x / 6 + 2);
    back.lineTo(x, backBase - backAmp * h);
  }
  back.lineTo(W + 2, H);
  back.closePath();

  const nearBase = H * 1.0;
  const nearAmp = Math.min(H * 0.14, 44);
  const nearY = new Float32Array(cols);
  for (let i = 0; i < cols; i++) {
    const x = i * step;
    nearY[i] = nearBase - nearAmp * (0.55 * n2(x / 90 + 40) + 0.3 * n3(x / 40 + 9) + 0.15 * n1(x / 18 + 3));
  }
  const near = new Path2D();
  near.moveTo(-2, H + 2);
  for (let i = 0; i < cols; i++) near.lineTo(i * step, nearY[i]);
  near.lineTo(W + 2, H + 2);
  near.closePath();

  const pines = new Path2D();
  for (let x = 2; x < W; x += rng.range(4, 8)) {
    if (n4(x / 26 + 17) < 0.42) continue;
    const i = Math.min(cols - 1, Math.round(x / step));
    const h = rng.range(6, 13) * (0.7 + 0.5 * n3(x / 20));
    const w = h * rng.range(0.32, 0.42);
    const y = nearY[i] + 2;
    pines.moveTo(x, y - h);
    pines.lineTo(x + w * 0.55, y - h * 0.45);
    pines.lineTo(x + w * 0.3, y - h * 0.45);
    pines.lineTo(x + w, y);
    pines.lineTo(x - w, y);
    pines.lineTo(x - w * 0.3, y - h * 0.45);
    pines.lineTo(x - w * 0.55, y - h * 0.45);
    pines.closePath();
  }

  const period = W + 320;
  const clouds: Cloud[] = [];
  const unit = Math.min(Math.max(W, 280), 460) / 384;
  const bands = [
    { y: 0.12, w: [80, 130] },
    { y: 0.25, w: [84, 140] },
    { y: 0.37, w: [110, 180] },
  ];
  bands.forEach((band, b) => {
    let x = rng.range(0, 60);
    while (x < period) {
      const w = rng.range(band.w[0], band.w[1]) * unit;
      const count = Math.max(4, Math.round(w / (b === 0 ? 13 : 17)));
      const puffs: Cloud["puffs"] = [];
      for (let j = 0; j < count; j++) {
        const u = clamp01((j + rng.range(-0.3, 0.3)) / (count - 1));
        const dome = Math.sin(Math.PI * Math.min(0.97, Math.max(0.03, u)));
        const r = w * 0.15 * (0.5 + 0.8 * dome) * rng.range(0.8, 1.15);
        puffs.push({ dx: (u - 0.5) * w, dy: -r * 0.45 - dome * w * 0.05, r });
      }
      clouds.push({
        x,
        y: H * band.y + rng.range(-0.03, 0.03) * H,
        t:
          b === 1 && clouds.filter((c) => c.t < 0.1).length < 2 && rng() < 0.4
            ? rng.range(0, 0.06)
            : rng.range(0.12, 0.9),
        band: b,
        w,
        puffs,
      });
      x += w * rng.range(0.5, 1.05);
    }
  });

  const fogs: Geometry["fogs"] = [];
  [0.56, 0.72, 0.86, 0.96].forEach((y, band) => {
    for (let x = 0; x < period; x += rng.range(80, 130)) {
      fogs.push({
        x,
        y: H * (y + rng.range(-0.02, 0.02)),
        rx: rng.range(110, 170),
        ry: H * rng.range(0.035, 0.06),
        band,
      });
    }
  });

  const stars: Geometry["stars"] = [];
  const starCount = Math.round((W * H) / 2200);
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: rng() * W,
      y: H * 0.72 * rng() ** 1.4,
      r: rng() < 0.85 ? rng.range(0.45, 0.85) : rng.range(0.9, 1.3),
      ph: rng() * Math.PI * 2,
      f: rng.range(0.6, 1.6),
    });
  }

  const bolts: Path2D[] = [];
  const boltX: number[] = [];
  for (let k = 0; k < 4; k++) {
    const p = new Path2D();
    let x = W * rng.range(0.55, 0.9);
    boltX.push(x);
    let y = H * 0.36;
    const end = H * 0.74;
    p.moveTo(x, y);
    const branchAt = rng.int(2, 4);
    let seg = 0;
    while (y < end) {
      x += rng.range(-9, 9);
      y += rng.range(7, 14);
      p.lineTo(x, Math.min(y, end));
      if (++seg === branchAt) {
        let bx = x;
        let by = y;
        const dir = rng() < 0.5 ? -1 : 1;
        for (let s = 0; s < 3; s++) {
          bx += dir * rng.range(4, 10);
          by += rng.range(5, 10);
          p.lineTo(bx, by);
        }
        p.moveTo(x, y);
      }
    }
    bolts.push(p);
  }

  const dcols = Math.ceil(W / COL) + 1;
  const restDrift = new Float32Array(dcols);
  const driftCap = new Float32Array(dcols);
  for (let i = 0; i < dcols; i++) {
    const x = i * COL;
    driftCap[i] = MAX_DEPTH * (0.26 + 0.64 * n3(x / 86 + 21) ** 1.4 + 0.1 * n1(x / 27 + 4));
    restDrift[i] = driftCap[i] * (0.7 + 0.15 * n2(x / 30 + 7));
  }

  return { W, H, far, back, near, pines, nearY, clouds, period, fogs, stars, bolts, boltX, restDrift, driftCap };
}

interface Tween {
  from: Params;
  to: Params;
  t0: number;
  dur: number;
}

function sample(tw: Tween, now: number): Params {
  const p = clamp01((now - tw.t0) / tw.dur);
  const out = {} as Params;
  for (const k of KEYS) {
    const a = tw.from[k];
    const b = tw.to[k];
    const [lo, hi] = WINDOWS[k][b >= a ? 0 : 1];
    const u = tw.dur <= 0.5 ? p : clamp01((p - lo) / (hi - lo));
    out[k] = a + (b - a) * ease(u);
  }
  return out;
}

export function WeatherCard({
  condition = "clear",
  night = false,
  seed = "hakuba",
  className,
  style,
  children,
  ...props
}: WeatherCardProps) {
  const reduced = useReducedMotion() ?? false;
  const wantDark = night || condition === "storm";
  const [dark, setDark] = useState(wantDark);
  const lastNight = useRef(night);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    tween: null as Tween | null,
    night: { from: night ? 1 : 0, to: night ? 1 : 0, t0: 0 },
    target: SCENES[condition],
    reduced,
    wake: () => {},
    started: false,
  });

  useEffect(() => {
    const L = live.current;
    const now = performance.now() / 1000;
    const dur = L.reduced ? 0.35 : DURATION;
    if (!L.started) {
      L.tween = { from: SCENES[condition], to: SCENES[condition], t0: now - dur, dur };
      L.night = { from: night ? 1 : 0, to: night ? 1 : 0, t0: now - NIGHT_DURATION };
      L.started = true;
    } else {
      const current = L.tween ? sample(L.tween, now) : SCENES[condition];
      L.tween = { from: current, to: SCENES[condition], t0: now, dur };
      const nd = L.reduced ? 0.35 : NIGHT_DURATION;
      const np = clamp01((now - L.night.t0) / nd);
      const nv = L.night.from + (L.night.to - L.night.from) * ease(np);
      const target = night ? 1 : 0;
      if (target !== L.night.to) L.night = { from: nv, to: target, t0: now };
    }
    L.target = SCENES[condition];
    L.wake();
  }, [condition, night]);

  useEffect(() => {
    live.current.reduced = reduced;
    live.current.wake();
  }, [reduced]);

  useEffect(() => {
    const nightChanged = lastNight.current !== night;
    lastNight.current = night;
    if (wantDark === dark) return;
    const delay = reduced ? 0 : wantDark ? 800 : nightChanged ? 900 : 1700;
    const id = setTimeout(() => setDark(wantDark), delay);
    return () => clearTimeout(id);
  }, [wantDark, dark, night, reduced]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const L = live.current;
    const rng = createRng(`${seed}:weather-live`);
    let geo: Geometry | null = null;
    let dpr = 1;
    let drift = new Float32Array(0);
    let drops: Drop[] = [];
    let flakes: Flake[] = [];
    let splashes: { x: number; y: number; age: number }[] = [];
    let dropAcc = 0;
    let flakeAcc = 0;
    let dim = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let primed = false;
    const flash = { next: 0, pulses: [] as { t0: number; amp: number }[], bolt: -1 };
    const cloudCanvas = document.createElement("canvas");
    const cloudCtx = cloudCanvas.getContext("2d")!;
    // Safari has no canvas filter; it blurs by shrinking and stretching, and with offset shadows
    const canFilter = "filter" in CanvasRenderingContext2D.prototype;
    const softCanvas = document.createElement("canvas");
    const softCtx = softCanvas.getContext("2d")!;
    const sprite = (lab: Lab) => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, css(lab, 1));
      grad.addColorStop(0.34, css(lab, 1));
      grad.addColorStop(0.62, css(lab, 0.42));
      grad.addColorStop(1, css(lab, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
      return c;
    };
    const flakeSprite = sprite(PAL.flake);
    const shadeSprite = sprite(PAL.flakeRim);

    const readTheme = () => {
      const [r, g, b] = toRgba("var(--background)", root);
      dim = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4 ? 1 : 0;
    };

    const spawnDrop = (W: number, H: number, y?: number, g: Rng = rng): Drop => {
      const layer = g() < 0.35 ? 0 : g() < 0.55 ? 1 : 2;
      const v = [430, 610, 820][layer] * g.range(0.9, 1.1);
      return {
        x: g() * (W + 60) - 20,
        y: y ?? g.range(-30, H * 0.22),
        v,
        layer,
        age: y === undefined ? 0 : 1,
        floor: layer === 2 ? H : H * g.range(0.62, 0.98),
      };
    };

    const spawnFlake = (W: number, H: number, y?: number, g: Rng = rng): Flake => {
      const roll = g();
      const layer = roll < 0.4 ? 0 : roll < 0.78 ? 1 : 2;
      const size = [g.range(0.8, 1.2), g.range(1.3, 1.9), g.range(2.1, 2.9)][layer];
      return {
        x: g() * (W + 40) - 20,
        y: y ?? g.range(-8, H * 0.4),
        r: size,
        v: [24, 36, 52][layer] * g.range(0.85, 1.15),
        ph: g() * Math.PI * 2,
        sway: g.range(6, 16),
        layer,
        age: y === undefined ? 0 : 1,
      };
    };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const W = Math.max(1, Math.round(rect.width));
      const H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cloudCanvas.width = canvas.width;
      cloudCanvas.height = canvas.height;
      if (!canFilter) {
        softCanvas.width = Math.ceil(canvas.width / 2) + 2;
        softCanvas.height = Math.ceil(canvas.height / 2) + 2;
      }
      const prev = geo;
      geo = buildGeometry(seed, W, H);
      const old = drift;
      drift = new Float32Array(geo.restDrift.length);
      if (prev && old.length) {
        for (let i = 0; i < drift.length; i++)
          drift[i] = old[Math.min(old.length - 1, Math.round((i / drift.length) * old.length))];
      }
      if (!prev) primed = false;
      draw(performance.now() / 1000, 0);
    };

    const prime = (p: Params) => {
      if (!geo) return;
      const { W, H } = geo;
      const fixed = createRng(`${seed}:weather-prime`);
      drops = [];
      flakes = [];
      const nd = Math.round(p.rain * ((W * H) / 600));
      for (let i = 0; i < nd; i++) drops.push(spawnDrop(W, H, fixed() * H, fixed));
      const nf = Math.round(p.snow * ((W * H) / 560));
      for (let i = 0; i < nf; i++) flakes.push(spawnFlake(W, H, fixed() * H, fixed));
      const level = smoothstep(0.2, 0.8, p.snow) * 0.75 + p.white * 0.15;
      for (let i = 0; i < drift.length; i++) drift[i] = geo.restDrift[i] * level;
      primed = true;
    };

    const nightValue = (now: number) => {
      const d = L.reduced ? 0.35 : NIGHT_DURATION;
      const p = clamp01((now - L.night.t0) / d);
      return L.night.from + (L.night.to - L.night.from) * ease(p);
    };

    const settled = (now: number) => {
      const tw = L.tween;
      const done = !tw || now - tw.t0 >= tw.dur;
      const nightDone = now - L.night.t0 >= (L.reduced ? 0.35 : NIGHT_DURATION);
      return done && nightDone;
    };

    const draw = (now: number, dt: number) => {
      if (!geo) return;
      const { W, H } = geo;
      const p = L.tween ? sample(L.tween, now) : L.target;
      if (!primed || L.reduced) prime(p);
      const n = nightValue(now);
      const still = L.reduced;
      const t = still ? 0 : now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      const pick = (day: Lab, nightLab: Lab) => mix(day, nightLab, n);
      const S = PAL.sky;
      let top = pick(S.clear[0], S.clearNight[0]);
      let bottom = pick(S.clear[1], S.clearNight[1]);
      top = mix(top, pick(S.grey[0], S.greyNight[0]), p.cover);
      bottom = mix(bottom, pick(S.grey[1], S.greyNight[1]), p.cover);
      const gloom = p.heavy * p.cover;
      top = mix(top, pick(S.storm[0], S.stormNight[0]), gloom);
      bottom = mix(bottom, pick(S.storm[1], S.stormNight[1]), gloom);
      top = mix(top, pick(S.fog[0], S.fogNight[0]), p.fog * 0.85);
      bottom = mix(bottom, pick(S.fog[1], S.fogNight[1]), p.fog * 0.85);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, css(top, 1, dim));
      sky.addColorStop(1, css(bottom, 1, dim));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const starAlpha = n * (1 - p.cover) ** 2 * (1 - p.fog);
      if (starAlpha > 0.01) {
        ctx.fillStyle = css(PAL.star, 1, dim);
        for (const s of geo.stars) {
          const tw = still ? 0.8 : 0.62 + 0.38 * Math.sin(t * s.f + s.ph);
          ctx.globalAlpha = starAlpha * tw * (s.r > 0.9 ? 0.95 : 0.7);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const discR = Math.max(11, Math.min(W, H) * 0.052);
      const sunX = W * 0.8;
      const sunY = H * 0.24 + n * H * 0.08;
      const moonY = H * 0.22 + (1 - n) * H * 0.06;
      const sunA = p.sun * (1 - n);
      const moonA = p.sun * n;
      if (sunA > 0.01) {
        const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, discR * 7);
        halo.addColorStop(0, css(PAL.sunHalo, 0.55 * sunA, dim));
        halo.addColorStop(0.18, css(PAL.sunHalo, 0.24 * sunA, dim));
        halo.addColorStop(0.5, css(PAL.sunHalo, 0.06 * sunA, dim));
        halo.addColorStop(1, css(PAL.sunHalo, 0, dim));
        ctx.fillStyle = halo;
        ctx.fillRect(sunX - discR * 7, sunY - discR * 7, discR * 14, discR * 14);
        const rays = 12;
        const rot = t * ((Math.PI * 2) / 140);
        const rg = ctx.createRadialGradient(sunX, sunY, discR * 1.05, sunX, sunY, discR * 3.9);
        rg.addColorStop(0, css(PAL.sunHalo, 0.85 * sunA, dim));
        rg.addColorStop(1, css(PAL.sunHalo, 0, dim));
        ctx.fillStyle = rg;
        for (let i = 0; i < rays; i++) {
          const a = rot + (i / rays) * Math.PI * 2;
          const pulse = still ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.9 - i * 0.85);
          const len = discR * (2.6 + 1.1 * pulse);
          const w = 0.085 - (i % 2) * 0.03;
          ctx.globalAlpha = 0.35 + 0.65 * pulse;
          ctx.beginPath();
          ctx.moveTo(sunX + Math.cos(a - w) * discR * 1.15, sunY + Math.sin(a - w) * discR * 1.15);
          ctx.lineTo(sunX + Math.cos(a) * len, sunY + Math.sin(a) * len);
          ctx.lineTo(sunX + Math.cos(a + w) * discR * 1.15, sunY + Math.sin(a + w) * discR * 1.15);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = sunA;
        const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, discR);
        disc.addColorStop(0, css(PAL.sun, 1, dim));
        disc.addColorStop(0.78, css(PAL.sun, 1, dim));
        disc.addColorStop(1, css(PAL.sunHalo, 0.85, dim));
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(sunX, sunY, discR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (moonA > 0.01) {
        const mr = discR * 0.86;
        const halo = ctx.createRadialGradient(sunX, moonY, 0, sunX, moonY, mr * 6);
        halo.addColorStop(0, css(PAL.moonHalo, 0.32 * moonA, dim));
        halo.addColorStop(0.3, css(PAL.moonHalo, 0.1 * moonA, dim));
        halo.addColorStop(1, css(PAL.moonHalo, 0, dim));
        ctx.fillStyle = halo;
        ctx.fillRect(sunX - mr * 6, moonY - mr * 6, mr * 12, mr * 12);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, moonY, mr, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.rect(sunX - mr * 2, moonY - mr * 2, mr * 4, mr * 4);
        ctx.arc(sunX + mr * 0.52, moonY - mr * 0.3, mr * 0.92, 0, Math.PI * 2);
        ctx.globalAlpha = moonA;
        ctx.fillStyle = css(PAL.moon, 1, dim);
        ctx.fill("evenodd");
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      const C = PAL.cloud;
      const body = mix(pick(C.body, C.bodyNight), pick(C.heavyBody, C.heavyBodyNight), p.heavy);
      const shade = mix(pick(C.shade, C.shadeNight), pick(C.heavyShade, C.heavyShadeNight), p.heavy);
      const windMul = 1 + p.heavy * 1.6 + p.rain * 0.4;

      const cl = cloudCtx;
      cl.setTransform(1, 0, 0, 1, 0, 0);
      cl.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
      cl.setTransform(dpr, 0, 0, dpr, 0, 0);
      const deckA = smoothstep(0.35, 1, p.cover);
      if (deckA > 0.01) {
        const deck = cl.createLinearGradient(0, 0, 0, H * 0.46);
        deck.addColorStop(0, css(shade, 0.9 * deckA, dim));
        deck.addColorStop(0.5, css(mix(shade, body, 0.55), 0.5 * deckA, dim));
        deck.addColorStop(1, css(body, 0, dim));
        cl.fillStyle = deck;
        cl.fillRect(0, 0, W, H * 0.46);
      }
      const lit = mix(body, lch(1, 0, 0), 0.5 * (1 - p.heavy) * (1 - n));
      for (let band = 0; band < 3; band++) {
        const haze = band === 0 ? 0.55 : band === 1 ? 0.15 : 0;
        const bShade = css(mix(shade, top, haze), 1, dim);
        const bBody = css(mix(body, top, haze), 1, dim);
        const bLit = css(mix(lit, top, haze), 1, dim);
        const speed = [3, 5.5, 9][band] * windMul;
        for (const c of geo.clouds) {
          if (c.band !== band) continue;
          const a = smoothstep(c.t, c.t + 0.2, p.cover * 1.08);
          if (a < 0.01) continue;
          const x = ((((c.x + speed * t) % geo.period) + geo.period) % geo.period) - 160;
          if (x < -c.w || x > W + c.w) continue;
          const grow = (0.45 + 0.55 * a) * (1 + p.heavy * 0.2);
          const y = c.y + p.heavy * H * 0.035 * (band + 1);
          cl.globalAlpha = Math.min(1, a * 2.2);
          cl.fillStyle = bShade;
          cl.beginPath();
          cl.ellipse(x, y, c.w * 0.5 * grow, c.w * 0.07 * grow + 2, 0, 0, Math.PI * 2);
          for (const f of c.puffs) {
            cl.moveTo(x + f.dx * grow + f.r * grow, y + f.dy * grow + f.r * 0.22 * grow);
            cl.arc(x + f.dx * grow, y + f.dy * grow + f.r * 0.22 * grow, f.r * grow, 0, Math.PI * 2);
          }
          cl.fill();
          cl.fillStyle = bBody;
          cl.beginPath();
          for (const f of c.puffs) {
            const r = f.r * 0.86 * grow;
            const cx = x + f.dx * grow - f.r * 0.06 * grow;
            const cy = y + f.dy * grow - f.r * 0.14 * grow;
            cl.moveTo(cx + r, cy);
            cl.arc(cx, cy, r, 0, Math.PI * 2);
          }
          cl.fill();
          cl.fillStyle = bLit;
          cl.beginPath();
          for (const f of c.puffs) {
            const r = f.r * 0.5 * grow;
            const cx = x + f.dx * grow + f.r * 0.16 * grow;
            const cy = y + f.dy * grow - f.r * 0.36 * grow;
            cl.moveTo(cx + r, cy);
            cl.arc(cx, cy, r, 0, Math.PI * 2);
          }
          cl.globalAlpha = Math.min(1, a * 2.2) * 0.75;
          cl.fill();
        }
      }
      cl.globalAlpha = 1;

      let flashAmp = 0;
      if (!still) {
        for (const pulse of flash.pulses) {
          if (now >= pulse.t0) flashAmp += pulse.amp * Math.exp(-(now - pulse.t0) / 0.075);
        }
        flash.pulses = flash.pulses.filter((pulse) => now - pulse.t0 < 0.6);
        if (p.storm > 0.6 && now > flash.next) {
          if (flash.next > 0) {
            const a = rng.range(0.7, 1);
            flash.pulses.push({ t0: now, amp: a }, { t0: now + rng.range(0.07, 0.11), amp: a * rng.range(0.25, 0.45) });
            if (rng() < 0.6) flash.pulses.push({ t0: now + rng.range(0.16, 0.24), amp: a * rng.range(0.5, 0.85) });
            flash.bolt = rng() < 0.6 ? rng.int(0, geo.bolts.length - 1) : -1;
          }
          flash.next = now + rng.range(3.5, 8.5);
        }
        flashAmp = Math.min(1.2, flashAmp) * p.storm;
      }

      if (flashAmp > 0.02 && flash.bolt >= 0) {
        ctx.save();
        ctx.strokeStyle = css(PAL.flash, Math.min(1, flashAmp * 1.3), dim);
        ctx.lineWidth = 1.4;
        ctx.lineJoin = "round";
        ctx.shadowColor = css(PAL.flash, Math.min(1, flashAmp), dim);
        ctx.shadowBlur = 10;
        ctx.stroke(geo.bolts[flash.bolt]);
        ctx.restore();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const cloudBlur = (1.6 + p.heavy * 1.4 + p.fog * 1.5) * dpr;
      if (canFilter) {
        ctx.filter = `blur(${cloudBlur}px)`;
        ctx.drawImage(cloudCanvas, 0, 0);
        ctx.filter = "none";
      } else {
        const k = Math.max(2, cloudBlur * 1.6);
        const sw = cloudCanvas.width / k;
        const sh = cloudCanvas.height / k;
        softCtx.clearRect(0, 0, softCanvas.width, softCanvas.height);
        softCtx.imageSmoothingQuality = "medium";
        softCtx.drawImage(cloudCanvas, 0, 0, cloudCanvas.width, cloudCanvas.height, 1, 1, sw, sh);
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(softCanvas, 1, 1, sw, sh, 0, 0, cloudCanvas.width, cloudCanvas.height);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (flashAmp > 0.02) {
        const fx = flash.bolt >= 0 ? geo.boltX[flash.bolt] : W * 0.7;
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(fx, H * 0.28, 0, fx, H * 0.28, W * 0.75);
        g.addColorStop(0, css(PAL.flash, 0.42 * flashAmp, 0));
        g.addColorStop(1, css(PAL.flash, 0.06 * flashAmp, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }

      const fogC = pick(PAL.fog, PAL.fogNight);
      const atm = mix(bottom, fogC, p.fog);
      let farC = mix(pick(PAL.far, PAL.farNight), pick(PAL.farSnow, PAL.farSnowNight), p.white);
      farC = mix(farC, mix(PAL.stormGround, pick(PAL.far, PAL.farNight), 0.4), gloom * 0.7);
      farC = mix(farC, atm, 0.2 + p.fog * 0.5);
      const farLit = mix(farC, pick(PAL.farLit, PAL.farSnow), 0.55 * (1 - p.fog) * (1 - gloom));
      const backC = mix(farLit, atm, 0.45 + p.fog * 0.4);
      const bg = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.85);
      bg.addColorStop(0, css(mix(backC, pick(PAL.farSnow, PAL.farSnowNight), 0.35 * (1 - p.fog)), 1, dim));
      bg.addColorStop(1, css(mix(backC, atm, 0.4), 1, dim));
      ctx.fillStyle = bg;
      ctx.fill(geo.back);
      const fg = ctx.createLinearGradient(0, H * 0.55, 0, H);
      fg.addColorStop(0, css(farLit, 1, dim));
      fg.addColorStop(1, css(farC, 1, dim));
      ctx.fillStyle = fg;
      ctx.fill(geo.far);
      const drawFog = (bands: number[], strength: number) => {
        if (p.fog < 0.02) return;
        for (const f of geo!.fogs) {
          if (!bands.includes(f.band)) continue;
          const dir = f.band % 2 ? -1 : 1;
          const x = ((((f.x + dir * (4 + f.band * 2.5) * t) % geo!.period) + geo!.period) % geo!.period) - 130;
          ctx.save();
          ctx.translate(x, f.y);
          ctx.scale(f.rx / f.ry, 1);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.ry);
          g.addColorStop(0, css(fogC, 0.75 * p.fog * strength, dim));
          g.addColorStop(0.55, css(fogC, 0.38 * p.fog * strength, dim));
          g.addColorStop(1, css(fogC, 0, dim));
          ctx.fillStyle = g;
          ctx.fillRect(-f.ry, -f.ry, f.ry * 2, f.ry * 2);
          ctx.restore();
        }
      };
      drawFog([0, 1], 1);

      let nearC = mix(pick(PAL.near, PAL.nearNight), pick(PAL.nearSnow, PAL.nearSnowNight), p.white);
      nearC = mix(nearC, PAL.stormGround, gloom * 0.55 * (1 - n));
      nearC = mix(nearC, atm, p.fog * 0.3);
      ctx.fillStyle = css(nearC, 1, dim);
      ctx.fill(geo.near);
      const pineC = mix(mix(nearC, lch(0.2, 0.03, 240), 0.55 - p.white * 0.15), atm, p.fog * 0.35);
      ctx.fillStyle = css(pineC, 1, dim);
      ctx.fill(geo.pines);

      ctx.fillStyle = css(fogC, 0.22 * p.fog, dim);
      ctx.fillRect(0, 0, W, H);

      const dropCap = (W * H) / 600;
      const flakeCap = (W * H) / 560;
      if (!still) {
        dropAcc += dt * ((p.rain * dropCap) / (H / 620));
        while (dropAcc >= 1) {
          drops.push(spawnDrop(W, H));
          dropAcc -= 1;
        }
        flakeAcc += dt * ((p.snow * flakeCap) / (H / 36));
        while (flakeAcc >= 1) {
          flakes.push(spawnFlake(W, H));
          flakeAcc -= 1;
        }
      }

      const slant = 0.16 + 0.2 * p.storm;
      const sx = Math.sin(slant);
      const sy = Math.cos(slant);
      const rainC = mix(mix(PAL.rain, PAL.rainLight, smoothstep(0.3, 0.9, gloom)), PAL.rainNight, n);
      const rainA = [0.22, 0.34, 0.5];
      const rainW = [0.8, 1, 1.3];
      ctx.lineCap = "round";
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.strokeStyle = css(rainC, rainA[layer], dim);
        ctx.lineWidth = rainW[layer];
        for (const d of drops) {
          if (d.layer !== layer) continue;
          const len = d.v * 0.028;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - sx * len, d.y - sy * len);
        }
        ctx.stroke();
      }

      if (splashes.length) {
        ctx.strokeStyle = css(rainC, 0.45, dim);
        ctx.lineWidth = 0.8;
        for (const s of splashes) {
          const k = s.age / 0.28;
          ctx.globalAlpha = 1 - k;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, 1 + k * 4, 0.5 + k * 1.3, 0, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      const shadeA = (1 - n) * 0.55;
      for (const f of flakes) {
        const fade = Math.min(1, f.age / 0.6) * (f.layer === 0 ? 1 - smoothstep(H * 0.7, H * 0.85, f.y) : 1);
        const alpha = [0.55, 0.8, 0.95][f.layer] * fade;
        if (alpha < 0.02) continue;
        const s = f.r * 2.6;
        if (shadeA > 0.02) {
          ctx.globalAlpha = alpha * shadeA;
          ctx.drawImage(shadeSprite, f.x - s * 0.62, f.y - s * 0.5, s * 1.24, s * 1.24);
        }
        ctx.globalAlpha = alpha;
        ctx.drawImage(flakeSprite, f.x - s / 2, f.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      drawFog([2, 3], 0.8);

      let deepest = 0;
      for (let i = 0; i < drift.length; i++) deepest = Math.max(deepest, drift[i]);
      if (deepest > 0.3) {
        const top = pick(PAL.driftTop, PAL.driftTopNight);
        const bodyC = pick(PAL.driftBody, PAL.driftBodyNight);
        const line = pick(PAL.driftLine, PAL.driftLineNight);
        const path = new Path2D();
        path.moveTo(-2, H + 1);
        path.lineTo(-2, H - drift[0]);
        for (let i = 1; i < drift.length; i++) {
          const x0 = (i - 1) * COL;
          const x1 = i * COL;
          path.quadraticCurveTo(x0, H - drift[i - 1], (x0 + x1) / 2, H - (drift[i - 1] + drift[i]) / 2);
        }
        path.lineTo(W + 2, H - drift[drift.length - 1]);
        path.lineTo(W + 2, H + 1);
        path.closePath();
        const g = ctx.createLinearGradient(0, H - deepest, 0, H);
        g.addColorStop(0, css(bodyC, 1, dim));
        g.addColorStop(1, css(mix(bodyC, line, 0.45), 1, dim));
        ctx.fillStyle = g;
        ctx.fill(path);
        ctx.save();
        ctx.clip(path);
        ctx.save();
        if (canFilter) ctx.filter = `blur(${2 * dpr}px)`;
        else {
          ctx.shadowColor = css(top, 1, dim);
          ctx.shadowBlur = 4 * dpr;
          ctx.shadowOffsetX = 4000 * dpr;
          ctx.translate(-4000, 0);
        }
        ctx.translate(0, 4.5);
        ctx.strokeStyle = css(top, 0.95, dim);
        ctx.lineWidth = 9;
        ctx.stroke(path);
        ctx.restore();
        ctx.translate(0, 0.6);
        ctx.strokeStyle = css(top, 1, dim);
        ctx.lineWidth = 1.4;
        ctx.stroke(path);
        ctx.restore();
      }

      if (flashAmp > 0.02) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = css(PAL.flash, 0.08 * flashAmp, 0);
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }

      if (still || dt <= 0) return;

      for (const d of drops) {
        d.age += dt;
        d.x += sx * d.v * dt;
        d.y += sy * d.v * dt;
      }
      drops = drops.filter((d) => {
        const ground = d.layer === 2 ? H - 1 - (drift[Math.round(d.x / COL)] ?? 0) : d.floor;
        if (d.y < ground) return d.x < W + 40;
        if (d.layer === 2 && splashes.length < 40) splashes.push({ x: d.x, y: ground, age: 0 });
        return false;
      });
      for (const s of splashes) s.age += dt;
      splashes = splashes.filter((s) => s.age < 0.28);

      const wind = 6 + p.heavy * 10;
      for (const f of flakes) {
        f.age += dt;
        f.y += f.v * dt;
        f.x += (wind + Math.sin(now * 0.8 + f.ph) * f.sway) * dt;
        if (f.x > W + 20) f.x -= W + 40;
      }
      flakes = flakes.filter((f) => {
        if (f.layer === 0) return f.y < H * 0.86;
        const i = Math.round(f.x / COL);
        const ground = H - (drift[i] ?? 0);
        if (f.y + f.r < ground) return true;
        if (i >= 0 && i < drift.length) {
          const amount = f.r * f.r * 0.62;
          for (let k = -2; k <= 2; k++) {
            const j = i + k;
            if (j < 0 || j >= drift.length) continue;
            const w = [0.12, 0.22, 0.32, 0.22, 0.12][k + 2];
            drift[j] = Math.min(geo!.driftCap[j], drift[j] + amount * w);
          }
        }
        return false;
      });

      const melt = (p.snow < 0.05 ? 0.5 : 0) + p.rain * 2.2 + p.sun * (1 - n) * 0.6;
      const next = new Float32Array(drift.length);
      for (let i = 0; i < drift.length; i++) {
        const l = drift[Math.max(0, i - 1)];
        const r = drift[Math.min(drift.length - 1, i + 1)];
        let h = drift[i] + (l + r - 2 * drift[i]) * Math.min(0.3, dt * 2.2);
        if (melt > 0) h -= melt * dt * (0.7 + (0.6 * ((i * 7919) % 13)) / 13);
        next[i] = Math.max(0, h);
      }
      drift = next;
    };

    const frame = (ms: number) => {
      raf = 0;
      const now = ms / 1000;
      const dt = last ? Math.min(0.05, now - last) : 0;
      last = now;
      draw(now, dt);
      if (!visible) return;
      if (!L.reduced || !settled(now)) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    L.wake = () => {
      if (L.reduced) draw(performance.now() / 1000, 0);
      start();
    };

    readTheme();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
      if (visible) start();
    });
    io.observe(root);
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readTheme();
      draw(performance.now() / 1000, 0);
    });
    start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
      L.wake = () => {};
    };
  }, [seed]);

  const sky = SCENES[condition];
  const S = PAL.sky;
  let top = night ? S.clearNight[0] : S.clear[0];
  let bottom = night ? S.clearNight[1] : S.clear[1];
  top = mix(top, night ? S.greyNight[0] : S.grey[0], sky.cover);
  bottom = mix(bottom, night ? S.greyNight[1] : S.grey[1], sky.cover);
  top = mix(top, night ? S.stormNight[0] : S.storm[0], sky.heavy * sky.cover);
  bottom = mix(bottom, night ? S.stormNight[1] : S.storm[1], sky.heavy * sky.cover);
  top = mix(top, night ? S.fogNight[0] : S.fog[0], sky.fog * 0.85);
  bottom = mix(bottom, night ? S.fogNight[1] : S.fog[1], sky.fog * 0.85);

  return (
    <div
      {...props}
      ref={rootRef}
      data-condition={condition}
      data-night={night || undefined}
      className={cn(
        "relative isolate min-h-[17rem] overflow-clip rounded-2xl border border-foreground/10 shadow-sm",
        className,
      )}
      style={{ background: `linear-gradient(${css(top)}, ${css(bottom)})`, ...style }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" />
      <div className={cn(dark ? "dark" : "light", "relative p-6 text-foreground")}>{children}</div>
    </div>
  );
}
