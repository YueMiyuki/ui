"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface DriftingIceProps extends ComponentProps<"div"> {
  count?: number;
  speed?: number;
  seed?: number | string;
  coverage?: number;
  interactive?: boolean;
}

const NIGHT = "--miyuki-drifting-ice-night";
const CLEAR = "[data-ice-clear]";
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const STEP = 1 / 60;
const RESTITUTION = 0.12;
const FRICTION = 0.45;
const SLOP = 0.25;
const CORRECT = 0.5;
const DRAG = 0.5;
const SPIN_DRAG = 0.7;
const DRIFT = 8;
const SWIRL = 2.6;
const REACH = 70;
const PUSH = 2.6;
const PUSH_CAP = 220;
const KELVIN = Math.asin(1 / 3);
const CLEAR_PAD = 18;
const CLEAR_K = 0.9;
const CLEAR_MAX = 40;
const SHADOW_X = 5;
const SHADOW_Y = 9;
const WALL_X = 1.6;
const WALL_Y = 3;
const LIT_X = 0.7;
const LIT_Y = 1;
const MIN_CRACK = 1400;
const MIN_PIECE = 380;
const GLOW = 1.2;
const MELT = 6;
const SHEEN_CELL = 12;
const LOW = 0.5;
const BLUR_PAD = 18;
const MAX_RINGS = 160;
const MAX_CHIPS = 72;

type Vec3 = [number, number, number];

interface Look {
  night: boolean;
  ice: string;
  snow: string;
  rim: string;
  ridge: string;
  fresh: string;
  wall: string;
  lit: string;
  shadow: string;
  skirt: string;
  sheen: Vec3;
  sheenMax: number;
  crest: string;
  crestAlpha: number;
  trough: string;
  troughAlpha: number;
  crack: string;
  halo: string;
}

interface Floe {
  n: number;
  lx: Float64Array;
  ly: Float64Array;
  lnx: Float64Array;
  lny: Float64Array;
  corner: Float64Array;
  cut: Int32Array;
  wx: Float64Array;
  wy: Float64Array;
  wnx: Float64Array;
  wny: Float64Array;
  minx: number;
  maxx: number;
  miny: number;
  maxy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  w: number;
  area: number;
  inv: number;
  invI: number;
  radius: number;
  windage: number;
  tex: Float64Array;
  ridges: Float64Array[];
  ox: number;
  oy: number;
  body: HTMLCanvasElement | null;
  shade: HTMLCanvasElement | null;
  skirt: HTMLCanvasElement | null;
  bodyHalf: number;
  blurHalf: number;
  glowId: number;
  glowAt: number;
  gx: number;
  gy: number;
  melt: number;
  melting: boolean;
}

interface Ring {
  x: number;
  y: number;
  born: number;
  strength: number;
  r0: number;
  speed: number;
  life: number;
  dir: number;
  arm: number;
}

interface Chip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  w: number;
  size: number;
  born: number;
  life: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function readLook(el: Element): Look {
  const night = cssVar(NIGHT, el) === "1";
  const c = (v: string, a = 1) => rgba(v, a, el);
  const rgb = (v: string): Vec3 => {
    const [r, g, b] = toRgba(v, el);
    return [r * 255, g * 255, b * 255];
  };
  if (night) {
    return {
      night,
      ice: c("color-mix(in oklab, color-mix(in oklab, var(--foreground) 68%, var(--brand)) 68%, var(--background))"),
      snow: c("color-mix(in oklab, color-mix(in oklab, var(--foreground) 80%, var(--brand)) 80%, var(--background))"),
      rim: c("color-mix(in oklab, color-mix(in oklab, var(--foreground) 85%, var(--brand)) 86%, var(--background))"),
      ridge: c("color-mix(in oklab, var(--brand) 40%, var(--background))", 0.2),
      fresh: c("color-mix(in oklab, var(--brand) 55%, var(--background))", 0.45),
      wall: c("color-mix(in oklab, var(--brand) 26%, var(--background))"),
      lit: c("color-mix(in oklab, var(--foreground) 90%, var(--brand))", 0.85),
      shadow: c("black", 0.6),
      skirt: c("color-mix(in oklab, var(--brand) 45%, var(--background))", 0.3),
      sheen: rgb("color-mix(in oklab, var(--brand) 45%, var(--foreground))"),
      sheenMax: 0.075,
      crest: c("color-mix(in oklab, var(--brand) 45%, var(--foreground))"),
      crestAlpha: 0.42,
      trough: c("black"),
      troughAlpha: 0.3,
      crack: c("color-mix(in oklab, var(--brand) 30%, var(--foreground))"),
      halo: c("var(--brand)"),
    };
  }
  return {
    night,
    ice: c("color-mix(in oklab, var(--card) 88%, var(--brand))"),
    snow: c("var(--card)"),
    rim: c("var(--card)"),
    ridge: c("color-mix(in oklab, var(--brand) 38%, var(--card))", 0.22),
    fresh: c("color-mix(in oklab, var(--brand) 50%, var(--card))", 0.35),
    wall: c("color-mix(in oklab, var(--brand) 52%, var(--card))"),
    lit: c("var(--card)"),
    shadow: c("color-mix(in oklab, var(--brand) 45%, var(--foreground))", 0.42),
    skirt: c("color-mix(in oklab, var(--chart-2) 45%, var(--card))", 0.42),
    sheen: rgb("var(--card)"),
    sheenMax: 0.2,
    crest: c("var(--card)"),
    crestAlpha: 0.72,
    trough: c("color-mix(in oklab, var(--brand) 50%, var(--foreground))"),
    troughAlpha: 0.2,
    crack: c("var(--brand)"),
    halo: c("var(--brand)"),
  };
}

function hull(points: number[]) {
  const idx = Array.from({ length: points.length / 2 }, (_, i) => i).sort(
    (a, b) => points[a * 2] - points[b * 2] || points[a * 2 + 1] - points[b * 2 + 1],
  );
  const cross = (o: number, a: number, b: number) =>
    (points[a * 2] - points[o * 2]) * (points[b * 2 + 1] - points[o * 2 + 1]) -
    (points[a * 2 + 1] - points[o * 2 + 1]) * (points[b * 2] - points[o * 2]);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop();
    upper.push(i);
  }
  const order = lower.slice(0, -1).concat(upper.slice(0, -1));
  return { xs: order.map((i) => points[i * 2]), ys: order.map((i) => points[i * 2 + 1]) };
}

function signedArea(xs: ArrayLike<number>, ys: ArrayLike<number>) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    const j = (i + 1) % xs.length;
    s += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return s / 2;
}

interface Poly {
  xs: number[];
  ys: number[];
  cut: number[];
}

function split(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  cut: ArrayLike<number>,
  px: number,
  py: number,
  nx: number,
  ny: number,
  id: number,
) {
  const n = xs.length;
  const sides: [Poly, Poly] = [
    { xs: [], ys: [], cut: [] },
    { xs: [], ys: [], cut: [] },
  ];
  for (let pass = 0; pass < 2; pass++) {
    const sign = pass === 0 ? 1 : -1;
    const out = sides[pass];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const si = ((xs[i] - px) * nx + (ys[i] - py) * ny) * sign;
      const sj = ((xs[j] - px) * nx + (ys[j] - py) * ny) * sign;
      if (si >= 0) {
        out.xs.push(xs[i]);
        out.ys.push(ys[i]);
        out.cut.push(cut[i]);
      }
      if (si >= 0 !== sj >= 0) {
        const t = si / (si - sj);
        out.xs.push(xs[i] + (xs[j] - xs[i]) * t);
        out.ys.push(ys[i] + (ys[j] - ys[i]) * t);
        out.cut.push(si >= 0 ? id : cut[i]);
      }
    }
  }
  for (const poly of sides) {
    for (let i = poly.xs.length - 1; i >= 0 && poly.xs.length > 2; i--) {
      const j = (i + 1) % poly.xs.length;
      if (Math.hypot(poly.xs[i] - poly.xs[j], poly.ys[i] - poly.ys[j]) < 0.6) {
        const flag = poly.cut[j];
        poly.xs.splice(j, 1);
        poly.ys.splice(j, 1);
        poly.cut.splice(j, 1);
        poly.cut[j < i ? i - 1 : i] = flag;
      }
    }
  }
  if (sides[0].xs.length < 3 || sides[1].xs.length < 3) return null;
  return sides;
}

function roundPath(g: CanvasRenderingContext2D, f: Floe) {
  const { lx, ly, corner, n } = f;
  g.beginPath();
  g.moveTo((lx[n - 1] + lx[0]) / 2, (ly[n - 1] + ly[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    g.arcTo(lx[i], ly[i], lx[j], ly[j], corner[i]);
  }
  g.closePath();
}

function valueNoise(rng: Rng) {
  const table = new Float32Array(256);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) {
    table[i] = rng();
    perm[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const a = table[perm[X + perm[Y]]];
    const b = table[perm[X + 1 + perm[Y]]];
    const c = table[perm[X + perm[Y + 1]]];
    const d = table[perm[X + 1 + perm[Y + 1]]];
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function makeFloe(
  xs: number[],
  ys: number[],
  cut: number[],
  tex: Float64Array,
  ridges: Float64Array[],
  ox: number,
  oy: number,
  windage: number,
) {
  const n = xs.length;
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cr = xs[i] * ys[j] - xs[j] * ys[i];
    a2 += cr;
    cx += (xs[i] + xs[j]) * cr;
    cy += (ys[i] + ys[j]) * cr;
  }
  const area = a2 / 2;
  cx /= 3 * a2;
  cy /= 3 * a2;
  const lx = new Float64Array(n);
  const ly = new Float64Array(n);
  let radius = 0;
  for (let i = 0; i < n; i++) {
    lx[i] = xs[i] - cx;
    ly[i] = ys[i] - cy;
    radius = Math.max(radius, Math.hypot(lx[i], ly[i]));
  }
  let inertia = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cr = lx[i] * ly[j] - lx[j] * ly[i];
    inertia += cr * (lx[i] * lx[i] + lx[i] * lx[j] + lx[j] * lx[j] + ly[i] * ly[i] + ly[i] * ly[j] + ly[j] * ly[j]);
  }
  inertia = Math.abs(inertia) / 12;
  const lnx = new Float64Array(n);
  const lny = new Float64Array(n);
  const corner = new Float64Array(n);
  const rc = clamp(radius * 0.13, 3, 10);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = lx[j] - lx[i];
    const ey = ly[j] - ly[i];
    const len = Math.hypot(ex, ey) || 1;
    lnx[i] = ey / len;
    lny[i] = -ex / len;
  }
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n;
    const j = (i + 1) % n;
    const ax = lx[p] - lx[i];
    const ay = ly[p] - ly[i];
    const bx = lx[j] - lx[i];
    const by = ly[j] - ly[i];
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    const angle = Math.acos(clamp((ax * bx + ay * by) / (la * lb), -1, 1));
    corner[i] = Math.max(0, Math.min(rc, 0.42 * Math.min(la, lb) * Math.tan(angle / 2)));
  }
  const floe: Floe = {
    n,
    lx,
    ly,
    lnx,
    lny,
    corner,
    cut: Int32Array.from(cut),
    wx: new Float64Array(n),
    wy: new Float64Array(n),
    wnx: new Float64Array(n),
    wny: new Float64Array(n),
    minx: 0,
    maxx: 0,
    miny: 0,
    maxy: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    a: 0,
    w: 0,
    area,
    inv: 1 / area,
    invI: 1 / inertia,
    radius,
    windage,
    tex,
    ridges,
    ox: ox + cx,
    oy: oy + cy,
    body: null,
    shade: null,
    skirt: null,
    bodyHalf: 0,
    blurHalf: 0,
    glowId: 0,
    glowAt: 0,
    gx: 0,
    gy: 0,
    melt: 1,
    melting: false,
  };
  return { floe, cx, cy };
}

function world(f: Floe) {
  const c = Math.cos(f.a);
  const s = Math.sin(f.a);
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (let i = 0; i < f.n; i++) {
    const x = f.x + c * f.lx[i] - s * f.ly[i];
    const y = f.y + s * f.lx[i] + c * f.ly[i];
    f.wx[i] = x;
    f.wy[i] = y;
    f.wnx[i] = c * f.lnx[i] - s * f.lny[i];
    f.wny[i] = s * f.lnx[i] + c * f.lny[i];
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  f.minx = minx;
  f.maxx = maxx;
  f.miny = miny;
  f.maxy = maxy;
}

function inside(f: Floe, px: number, py: number) {
  for (let i = 0; i < f.n; i++) {
    if ((px - f.wx[i]) * f.wnx[i] + (py - f.wy[i]) * f.wny[i] > 0) return false;
  }
  return true;
}

const contact = { depth: 0, nx: 0, ny: 0, px: 0, py: 0 };

function overlap(A: Floe, B: Floe, ox: number, oy: number) {
  let best = Infinity;
  let bnx = 0;
  let bny = 0;
  let ref = 0;
  for (let pass = 0; pass < 2; pass++) {
    const P = pass === 0 ? A : B;
    for (let k = 0; k < P.n; k++) {
      const nx = P.wnx[k];
      const ny = P.wny[k];
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (let i = 0; i < A.n; i++) {
        const d = A.wx[i] * nx + A.wy[i] * ny;
        if (d < minA) minA = d;
        if (d > maxA) maxA = d;
      }
      for (let i = 0; i < B.n; i++) {
        const d = (B.wx[i] + ox) * nx + (B.wy[i] + oy) * ny;
        if (d < minB) minB = d;
        if (d > maxB) maxB = d;
      }
      const o = Math.min(maxA - minB, maxB - minA);
      if (o <= 0) return false;
      if (o < best) {
        best = o;
        bnx = nx;
        bny = ny;
        ref = pass;
      }
    }
  }
  if ((B.x + ox - A.x) * bnx + (B.y + oy - A.y) * bny < 0) {
    bnx = -bnx;
    bny = -bny;
  }
  let d1 = Infinity;
  let d2 = Infinity;
  let i1 = 0;
  let i2 = 0;
  const P = ref === 0 ? B : A;
  const sx = ref === 0 ? ox : 0;
  const sy = ref === 0 ? oy : 0;
  const sign = ref === 0 ? 1 : -1;
  for (let i = 0; i < P.n; i++) {
    const d = ((P.wx[i] + sx) * bnx + (P.wy[i] + sy) * bny) * sign;
    if (d < d1) {
      d2 = d1;
      i2 = i1;
      d1 = d;
      i1 = i;
    } else if (d < d2) {
      d2 = d;
      i2 = i;
    }
  }
  if (d2 - d1 < 0.8) {
    contact.px = (P.wx[i1] + P.wx[i2]) / 2 + sx;
    contact.py = (P.wy[i1] + P.wy[i2]) / 2 + sy;
  } else {
    contact.px = P.wx[i1] + sx;
    contact.py = P.wy[i1] + sy;
  }
  contact.depth = best;
  contact.nx = bnx;
  contact.ny = bny;
  return true;
}

function resolve(A: Floe, B: Floe, ox: number, oy: number) {
  const { nx, ny, px, py, depth } = contact;
  const rax = px - A.x;
  const ray = py - A.y;
  const rbx = px - (B.x + ox);
  const rby = py - (B.y + oy);
  let rvx = B.vx - B.w * rby - (A.vx - A.w * ray);
  let rvy = B.vy + B.w * rbx - (A.vy + A.w * rax);
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const ran = rax * ny - ray * nx;
    const rbn = rbx * ny - rby * nx;
    const j = (-(1 + RESTITUTION) * vn) / (A.inv + B.inv + ran * ran * A.invI + rbn * rbn * B.invI);
    A.vx -= j * nx * A.inv;
    A.vy -= j * ny * A.inv;
    A.w -= ran * j * A.invI;
    B.vx += j * nx * B.inv;
    B.vy += j * ny * B.inv;
    B.w += rbn * j * B.invI;
    rvx = B.vx - B.w * rby - (A.vx - A.w * ray);
    rvy = B.vy + B.w * rbx - (A.vy + A.w * rax);
    const vt = rvx * -ny + rvy * nx;
    const rat = rax * nx + ray * ny;
    const rbt = rbx * nx + rby * ny;
    const jt = clamp(-vt / (A.inv + B.inv + rat * rat * A.invI + rbt * rbt * B.invI), -FRICTION * j, FRICTION * j);
    const tx = -ny * jt;
    const ty = nx * jt;
    A.vx -= tx * A.inv;
    A.vy -= ty * A.inv;
    A.w -= (rax * ty - ray * tx) * A.invI;
    B.vx += tx * B.inv;
    B.vy += ty * B.inv;
    B.w += (rbx * ty - rby * tx) * B.invI;
  }
  const push = (Math.max(0, depth - SLOP) * CORRECT) / (A.inv + B.inv);
  A.x -= nx * push * A.inv;
  A.y -= ny * push * A.inv;
  B.x += nx * push * B.inv;
  B.y += ny * push * B.inv;
}

export function DriftingIce({
  count = 12,
  speed = 1,
  seed = "drifting-ice",
  coverage = 0.4,
  interactive = true,
  className,
  children,
  ...props
}: DriftingIceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const target = clamp(Math.round(count), 1, 60);
    const cover = clamp(coverage, 0.05, 0.7);

    const probe = document.createElement("canvas").getContext("2d");
    let canFilter = false;
    if (probe && "filter" in probe) {
      probe.filter = "blur(2px)";
      canFilter = probe.filter === "blur(2px)";
    }
    const scratch = document.createElement("canvas");
    const sg = scratch.getContext("2d");
    const sheenCanvas = document.createElement("canvas");
    const shg = sheenCanvas.getContext("2d");
    let sheenImage: ImageData | null = null;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let margin = 0;
    let domainW = 0;
    let domainH = 0;
    let refArea = 1;
    let cap = 0;
    let look = readLook(canvas);
    let floes: Floe[] = [];
    const rings: Ring[] = [];
    const chips: Chip[] = [];
    let clears: { l: number; t: number; r: number; b: number }[] = [];

    const field = createRng(`drifting-ice:${seed}:field`);
    const noise = valueNoise(field);
    const heading = field.range(-0.22, 0.12);
    const modes = Array.from({ length: 4 }, () => ({
      dir: field() * Math.PI * 2,
      len: field.range(380, 820),
      phase: field() * Math.PI * 2,
      rate: field.range(0.025, 0.06) * (field() < 0.5 ? -1 : 1),
      amp: field.range(0.7, 1.15),
    }));

    let time = 0;
    let acc = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let serial = 0;
    let frameCount = 0;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0, at: -10, has: false, travel: 0 };
    const current = { u: 0, v: 0, z: 0 };

    const water = (x: number, y: number) => {
      let u = 0;
      let v = 0;
      let z = 0;
      const t = time * pace;
      for (const m of modes) {
        const k = (Math.PI * 2) / m.len;
        const cd = Math.cos(m.dir);
        const sd = Math.sin(m.dir);
        const arg = k * (x * cd + y * sd) + m.phase + m.rate * t;
        const speedAmp = SWIRL * m.amp * pace;
        const cs = Math.cos(arg);
        u += speedAmp * sd * cs;
        v -= speedAmp * cd * cs;
        z += speedAmp * k * Math.sin(arg);
      }
      current.u = u;
      current.v = v;
      current.z = z;
    };

    const paintSprites = (f: Floe) => {
      if (!sg) return;
      const half = f.radius + 3;
      const size = Math.max(2, Math.ceil(half * 2 * dpr));
      const body = f.body ?? document.createElement("canvas");
      body.width = size;
      body.height = size;
      const g = body.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, size / 2, size / 2);
      g.save();
      roundPath(g, f);
      g.fillStyle = look.ice;
      g.fill();
      g.clip();
      for (let k = 0; k < f.tex.length; k += 4) {
        const bx = f.tex[k] - f.ox;
        const by = f.tex[k + 1] - f.oy;
        const br = f.tex[k + 2];
        if (Math.hypot(bx, by) > f.radius + br) continue;
        const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, look.snow);
        grad.addColorStop(1, look.snow.replace(/[\d.]+\)$/, "0)"));
        g.globalAlpha = f.tex[k + 3];
        g.fillStyle = grad;
        g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      g.globalAlpha = 1;
      g.strokeStyle = look.ridge;
      g.lineWidth = 1;
      g.lineJoin = "round";
      g.beginPath();
      for (const line of f.ridges) {
        g.moveTo(line[0] - f.ox, line[1] - f.oy);
        for (let k = 2; k < line.length; k += 2) g.lineTo(line[k] - f.ox, line[k + 1] - f.oy);
      }
      g.stroke();
      g.strokeStyle = look.fresh;
      g.lineCap = "round";
      for (const width of [9, 4]) {
        g.lineWidth = width;
        g.beginPath();
        for (let i = 0; i < f.n; i++) {
          if (f.cut[i] === 0) continue;
          const j = (i + 1) % f.n;
          g.moveTo(f.lx[i], f.ly[i]);
          g.lineTo(f.lx[j], f.ly[j]);
        }
        g.stroke();
      }
      g.restore();

      scratch.width = size;
      scratch.height = size;
      sg.setTransform(dpr, 0, 0, dpr, size / 2, size / 2);
      sg.save();
      roundPath(sg, f);
      sg.clip();
      sg.strokeStyle = look.rim;
      sg.lineJoin = "round";
      sg.globalAlpha = 0.35;
      sg.lineWidth = Math.min(8, f.radius * 0.16);
      sg.stroke();
      sg.globalAlpha = 0.9;
      sg.lineWidth = Math.min(3, f.radius * 0.07);
      sg.stroke();
      sg.restore();
      sg.globalCompositeOperation = "destination-out";
      sg.lineCap = "round";
      for (const [width, alpha] of [
        [22, 0.5],
        [14, 1],
      ]) {
        sg.globalAlpha = alpha;
        sg.lineWidth = width;
        sg.beginPath();
        for (let i = 0; i < f.n; i++) {
          if (f.cut[i] === 0) continue;
          const j = (i + 1) % f.n;
          sg.moveTo(f.lx[i], f.ly[i]);
          sg.lineTo(f.lx[j], f.ly[j]);
        }
        sg.stroke();
      }
      sg.globalAlpha = 1;
      sg.globalCompositeOperation = "source-over";
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(scratch, 0, 0);
      f.body = body;
      f.bodyHalf = size / dpr / 2;

      const bsize = Math.max(2, Math.ceil((f.radius + BLUR_PAD) * 2 * LOW));
      f.blurHalf = bsize / LOW / 2;
      const silhouette = (canvas: HTMLCanvasElement | null, color: string, blur: number, grow: number) => {
        const c = canvas ?? document.createElement("canvas");
        c.width = bsize;
        c.height = bsize;
        const b = c.getContext("2d");
        if (!b) return c;
        b.setTransform(LOW, 0, 0, LOW, bsize / 2, bsize / 2);
        b.fillStyle = color;
        b.strokeStyle = color;
        b.lineJoin = "round";
        if (canFilter) {
          b.filter = `blur(${blur * LOW}px)`;
          roundPath(b, f);
          b.fill();
          if (grow > 0) {
            b.lineWidth = grow * 2;
            b.stroke();
          }
          b.filter = "none";
        } else {
          const far = 4000;
          b.shadowColor = color;
          b.shadowBlur = blur * 2 * LOW;
          b.shadowOffsetX = far * LOW;
          b.translate(-far, 0);
          roundPath(b, f);
          b.fill();
          if (grow > 0) {
            b.lineWidth = grow * 2;
            b.stroke();
          }
        }
        return c;
      };
      f.shade = silhouette(f.shade, look.shadow, 6, 0);
      f.skirt = silhouette(f.skirt, look.skirt, 3, 3);
    };

    const shape = (rng: Rng, area: number) => {
      const n = rng.int(7, 11);
      const stretch = rng.range(1, 1.5);
      const rot = rng() * Math.PI * 2;
      const pts: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = ((i + rng.range(-0.32, 0.32)) / n) * Math.PI * 2;
        const r = rng.range(0.72, 1.1);
        const x = Math.cos(a) * r * stretch;
        const y = (Math.sin(a) * r) / stretch;
        pts.push(x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot));
      }
      let { xs, ys } = hull(pts);
      for (let chop = 0; chop < 2; chop++) {
        if (rng() > 0.5) continue;
        const a = rng() * Math.PI * 2;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        const d = rng.range(0.42, 0.68);
        const parts = split(xs, ys, new Array(xs.length).fill(0), nx * d, ny * d, nx, ny, 0);
        if (!parts) continue;
        const keep = parts[1];
        if (signedArea(keep.xs, keep.ys) > 0.7 * signedArea(xs, ys)) {
          xs = keep.xs;
          ys = keep.ys;
        }
      }
      const k = Math.sqrt(area / signedArea(xs, ys));
      return { xs: xs.map((v) => v * k), ys: ys.map((v) => v * k) };
    };

    const texture = (rng: Rng, radius: number) => {
      const blots = rng.int(4, 7);
      const tex = new Float64Array(blots * 4);
      for (let i = 0; i < blots; i++) {
        const a = rng() * Math.PI * 2;
        const r = rng() ** 0.7 * radius * 0.7;
        tex[i * 4] = Math.cos(a) * r;
        tex[i * 4 + 1] = Math.sin(a) * r;
        tex[i * 4 + 2] = radius * rng.range(0.22, 0.55);
        tex[i * 4 + 3] = rng.range(0.35, 0.75);
      }
      const ridges: Float64Array[] = [];
      const lines = rng.int(0, 2);
      for (let l = 0; l < lines; l++) {
        const segs = rng.int(4, 7);
        const line = new Float64Array((segs + 1) * 2);
        let x = rng.range(-0.5, 0.5) * radius;
        let y = rng.range(-0.5, 0.5) * radius;
        let a = rng() * Math.PI * 2;
        const step = (radius * rng.range(0.5, 1.1)) / segs;
        for (let s = 0; s <= segs; s++) {
          line[s * 2] = x;
          line[s * 2 + 1] = y;
          a += rng.range(-0.5, 0.5);
          x += Math.cos(a) * step;
          y += Math.sin(a) * step;
        }
        ridges.push(line);
      }
      return { tex, ridges };
    };

    const measure = () => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      clears = Array.from(root.querySelectorAll(CLEAR)).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          l: (r.left - box.left) * sx - CLEAR_PAD,
          t: (r.top - box.top) * sy - CLEAR_PAD,
          r: (r.right - box.left) * sx + CLEAR_PAD,
          b: (r.bottom - box.top) * sy + CLEAR_PAD,
        };
      });
    };

    const wrap = (f: Floe) => {
      if (f.x < -margin) f.x += domainW;
      else if (f.x > w + margin) f.x -= domainW;
      if (f.y < -margin) f.y += domainH;
      else if (f.y > h + margin) f.y -= domainH;
    };

    const near = (d: number, span: number) => (d > span / 2 ? d - span : d < -span / 2 ? d + span : d);

    const collide = () => {
      const n = floes.length;
      for (let i = 0; i < n; i++) {
        const A = floes[i];
        if (A.melting) continue;
        for (let j = i + 1; j < n; j++) {
          const B = floes[j];
          if (B.melting) continue;
          const dx = near(B.x - A.x, domainW);
          const dy = near(B.y - A.y, domainH);
          const rr = A.radius + B.radius;
          if (dx * dx + dy * dy >= rr * rr) continue;
          const ox = A.x + dx - B.x;
          const oy = A.y + dy - B.y;
          if (!overlap(A, B, ox, oy)) continue;
          resolve(A, B, ox, oy);
          world(A);
          world(B);
        }
      }
    };

    const step = (dt: number) => {
      time += dt;
      const drag = Math.exp(-DRAG * dt);
      const spinDrag = Math.exp(-SPIN_DRAG * dt);
      const hx = Math.cos(heading) * DRIFT * pace;
      const hy = Math.sin(heading) * DRIFT * pace;
      if (time - pointer.at > 0.05) {
        const k = Math.exp(-12 * dt);
        pointer.vx *= k;
        pointer.vy *= k;
      }
      const live = interactive && pointer.has ? clamp(1 - (time - pointer.at) / 0.25, 0, 1) : 0;
      const psp = Math.hypot(pointer.vx, pointer.vy);
      for (const f of floes) {
        if (f.melting) f.melt -= dt / MELT;
        water(f.x, f.y);
        const tu = current.u + hx * f.windage;
        const tv = current.v + hy * f.windage;
        f.vx = tu + (f.vx - tu) * drag;
        f.vy = tv + (f.vy - tv) * drag;
        const tw = current.z * 0.4;
        f.w = tw + (f.w - tw) * spinDrag;

        if (live > 0 && psp > 4 && !f.melting) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const reach = f.radius + REACH;
          if (dx * dx + dy * dy < reach * reach) {
            let best = Infinity;
            let qx = 0;
            let qy = 0;
            let within = true;
            for (let i = 0; i < f.n; i++) {
              const j = (i + 1) % f.n;
              const ax = f.wx[i];
              const ay = f.wy[i];
              if ((pointer.x - ax) * f.wnx[i] + (pointer.y - ay) * f.wny[i] > 0) within = false;
              const ex = f.wx[j] - ax;
              const ey = f.wy[j] - ay;
              const t = clamp(((pointer.x - ax) * ex + (pointer.y - ay) * ey) / (ex * ex + ey * ey || 1), 0, 1);
              const cx = ax + ex * t;
              const cy = ay + ey * t;
              const d2 = (cx - pointer.x) ** 2 + (cy - pointer.y) ** 2;
              if (d2 < best) {
                best = d2;
                qx = cx;
                qy = cy;
              }
            }
            const d = within ? 0 : Math.sqrt(best);
            if (d < REACH) {
              const fall = (1 - d / REACH) ** 2;
              let ux: number;
              let uy: number;
              if (within || d < 0.5) {
                ux = pointer.vx / psp;
                uy = pointer.vy / psp;
                qx = pointer.x;
                qy = pointer.y;
              } else {
                ux = (qx - pointer.x) / d;
                uy = (qy - pointer.y) / d;
              }
              const cap = Math.min(1, PUSH_CAP / psp);
              const along = Math.max(0, pointer.vx * ux + pointer.vy * uy) * cap;
              const wx = ux * along * 0.9 + pointer.vx * cap * 0.3;
              const wy = uy * along * 0.9 + pointer.vy * cap * 0.3;
              const rx = qx - f.x;
              const ry = qy - f.y;
              const dvx = wx - (f.vx - f.w * ry);
              const dvy = wy - (f.vy + f.w * rx);
              if (dvx * ux + dvy * uy > 0) {
                const heft = clamp((refArea / f.area) ** 0.35, 0.55, 1.6);
                const k = PUSH * fall * live * heft;
                const ax = dvx * k;
                const ay = dvy * k;
                f.vx += ax * dt;
                f.vy += ay * dt;
                f.w += (rx * ay - ry * ax) * f.area * f.invI * dt * 0.5;
              }
            }
          }
        }

        for (const c of clears) {
          if (f.maxx < c.l || f.minx > c.r || f.maxy < c.t || f.miny > c.b) continue;
          const into = Math.min(f.maxx - c.l, c.r - f.minx);
          const up = f.y < (c.t + c.b) / 2;
          const need = up ? f.maxy - c.t : c.b - f.miny;
          const a = Math.min(CLEAR_MAX, need * CLEAR_K) * clamp(into / 60, 0.15, 1);
          const dir = up ? -1 : 1;
          f.vy += dir * a * dt;
          if (f.vy * dir < 0) f.vy *= Math.exp(-2.5 * dt);
        }

        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.a += f.w * dt;
        wrap(f);
        world(f);
      }
      collide();
      collide();
      if (floes.some((f) => f.melt <= 0)) floes = floes.filter((f) => f.melt > 0);

      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        if (time - c.born > c.life) {
          chips.splice(i, 1);
          continue;
        }
        water(c.x, c.y);
        const k = Math.exp(-1.4 * dt);
        c.vx = current.u + hx + (c.vx - current.u - hx) * k;
        c.vy = current.v + hy + (c.vy - current.v - hy) * k;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.a += c.w * dt;
        c.w *= Math.exp(-0.8 * dt);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        if (time - rings[i].born > rings[i].life) rings.splice(i, 1);
      }
    };

    const ring = (
      x: number,
      y: number,
      strength: number,
      r0: number,
      speed: number,
      life: number,
      delay = 0,
      dir = NaN,
      arm = 0,
    ) => {
      if (rings.length >= MAX_RINGS) rings.shift();
      rings.push({ x, y, born: time + delay, strength, r0, speed, life, dir, arm });
    };

    const build = () => {
      const rng = createRng(`drifting-ice:${seed}:${target}`);
      const meanArea = (cover * w * h) / target;
      const meanR = Math.sqrt(meanArea / (0.86 * Math.PI));
      margin = Math.ceil(meanR * 2.1 + 10);
      domainW = w + margin * 2;
      domainH = h + margin * 2;
      refArea = meanArea;
      const total = Math.max(target, Math.round((target * domainW * domainH) / (w * h)));
      cap = Math.round(total * 2.5);
      const sizes = Array.from({ length: total }, () => 0.4 + 1.3 * rng() ** 1.5);
      const mean = sizes.reduce((s, v) => s + v, 0) / total;
      sizes.sort((a, b) => b - a);
      floes = [];
      for (const s of sizes) {
        const { xs, ys } = shape(rng, (meanArea * s) / mean);
        const { floe } = makeFloe(
          xs,
          ys,
          new Array(xs.length).fill(0),
          new Float64Array(0),
          [],
          0,
          0,
          rng.range(0.7, 1.3),
        );
        const { tex, ridges } = texture(rng, floe.radius);
        floe.tex = tex;
        floe.ridges = ridges;
        floe.ox = 0;
        floe.oy = 0;
        let placed = false;
        for (let attempt = 0; attempt < 420 && !placed; attempt++) {
          const x = -margin + rng() * domainW;
          const y = -margin + rng() * domainH;
          const loose = attempt > 300;
          const tight = attempt > 360 ? 0.7 : 0.88;
          let ok = true;
          for (const o of floes) {
            const dx = near(o.x - x, domainW);
            const dy = near(o.y - y, domainH);
            const rr = (o.radius + floe.radius) * tight;
            if (dx * dx + dy * dy < rr * rr) {
              ok = false;
              break;
            }
          }
          if (ok && !loose) {
            for (const c of clears) {
              const r = floe.radius * 0.8;
              if (x + r > c.l && x - r < c.r && y + r > c.t && y - r < c.b) {
                ok = false;
                break;
              }
            }
          }
          if (ok || attempt === 419) {
            floe.x = x;
            floe.y = y;
            placed = true;
          }
        }
        floe.a = rng() * Math.PI * 2;
        floe.w = rng.range(-0.03, 0.03);
        world(floe);
        floes.push(floe);
      }
      for (const f of floes) {
        water(f.x, f.y);
        f.vx = current.u + Math.cos(heading) * DRIFT * pace * f.windage;
        f.vy = current.v + Math.sin(heading) * DRIFT * pace * f.windage;
      }
      const saved = time;
      for (let s = 0; s < (still ? 420 : 240); s++) step(STEP);
      time = saved;
      rings.length = 0;
      chips.length = 0;
      for (const f of floes) paintSprites(f);
    };

    const crack = (f: Floe, px: number, py: number) => {
      const c = Math.cos(f.a);
      const s = Math.sin(f.a);
      const dx = px - f.x;
      const dy = py - f.y;
      let lx = c * dx + s * dy;
      let ly = -s * dx + c * dy;
      const id = ++serial;
      let pieces: [Poly, Poly] | null = null;
      let angle = Math.random() * Math.PI;
      for (let tries = 0; tries < 2 && !pieces; tries++) {
        for (let k = 0; k < 8; k++) {
          const a = angle + (k * Math.PI) / 8;
          const parts = split(f.lx, f.ly, f.cut, lx, ly, Math.cos(a), Math.sin(a), id);
          if (!parts) continue;
          const a0 = signedArea(parts[0].xs, parts[0].ys);
          const a1 = signedArea(parts[1].xs, parts[1].ys);
          if (Math.min(a0, a1) >= Math.max(MIN_PIECE, f.area * 0.16)) {
            pieces = parts;
            angle = a;
            break;
          }
        }
        if (!pieces) {
          lx *= 0.45;
          ly *= 0.45;
        }
      }
      if (!pieces) return false;
      let polys: Poly[] = [...pieces];
      if (f.area > MIN_CRACK * 2.6 && Math.random() < 0.6) {
        const big = signedArea(polys[0].xs, polys[0].ys) > signedArea(polys[1].xs, polys[1].ys) ? 0 : 1;
        const bigArea = signedArea(polys[big].xs, polys[big].ys);
        for (let k = 0; k < 4; k++) {
          const a2 = angle + (Math.random() < 0.5 ? 1 : -1) * (0.85 + Math.random() * 0.75);
          const parts = split(polys[big].xs, polys[big].ys, polys[big].cut, lx, ly, Math.cos(a2), Math.sin(a2), id);
          if (!parts) continue;
          const b0 = signedArea(parts[0].xs, parts[0].ys);
          const b1 = signedArea(parts[1].xs, parts[1].ys);
          if (Math.min(b0, b1) >= Math.max(MIN_PIECE, bigArea * 0.2)) {
            polys = [polys[1 - big], parts[0], parts[1]];
            break;
          }
        }
      }
      const made: Floe[] = [];
      for (const poly of polys) {
        const { floe: p, cx, cy } = makeFloe(poly.xs, poly.ys, poly.cut, f.tex, f.ridges, f.ox, f.oy, f.windage);
        p.x = f.x + c * cx - s * cy;
        p.y = f.y + s * cx + c * cy;
        p.a = f.a;
        const rx = p.x - f.x;
        const ry = p.y - f.y;
        p.vx = f.vx - f.w * ry;
        p.vy = f.vy + f.w * rx;
        let ax = p.x - px;
        let ay = p.y - py;
        const al = Math.hypot(ax, ay) || 1;
        ax /= al;
        ay /= al;
        if (still) {
          p.x += ax * 3.5;
          p.y += ay * 3.5;
        } else {
          const kick = 9 + Math.random() * 7;
          p.vx += ax * kick;
          p.vy += ay * kick;
          p.w = f.w + (Math.random() - 0.5) * 0.24;
          p.glowId = id;
          p.glowAt = time;
          p.gx = lx - cx;
          p.gy = ly - cy;
        }
        world(p);
        paintSprites(p);
        made.push(p);
      }
      const at = floes.indexOf(f);
      floes.splice(at, 1, ...made);
      if (!still) {
        ring(px, py, 0.9, 5, 52, 1.9);
        ring(px, py, 0.5, 3, 40, 1.6, 0.22);
        for (let k = 0; k < 9 && chips.length < MAX_CHIPS; k++) {
          const p = made[Math.floor(Math.random() * made.length)];
          const edges: number[] = [];
          for (let i = 0; i < p.n; i++) if (p.cut[i] === id) edges.push(i);
          if (edges.length === 0) continue;
          const e = edges[Math.floor(Math.random() * edges.length)];
          const e2 = (e + 1) % p.n;
          const t = Math.random();
          const cxw = p.wx[e] + (p.wx[e2] - p.wx[e]) * t;
          const cyw = p.wy[e] + (p.wy[e2] - p.wy[e]) * t;
          const a = Math.random() * Math.PI * 2;
          const v = 4 + Math.random() * 10;
          chips.push({
            x: cxw,
            y: cyw,
            vx: p.vx + Math.cos(a) * v,
            vy: p.vy + Math.sin(a) * v,
            a: Math.random() * Math.PI,
            w: (Math.random() - 0.5) * 3,
            size: 1.2 + Math.random() * 2.2,
            born: time,
            life: 3.5 + Math.random() * 3,
          });
        }
      }
      const solid = floes.filter((o) => !o.melting);
      if (solid.length > cap) {
        solid.sort((a, b) => a.area - b.area);
        for (let i = 0; i < solid.length - cap; i++) solid[i].melting = true;
      }
      return true;
    };

    const paintSheen = () => {
      if (!shg || !sheenImage) return;
      const data = sheenImage.data;
      const cols = sheenImage.width;
      const rows = sheenImage.height;
      const t = time * (0.35 + 0.65 * pace);
      const [r, g, b] = look.sheen;
      let o = 0;
      for (let y = 0; y < rows; y++) {
        const py = (y - 1) * SHEEN_CELL;
        for (let x = 0; x < cols; x++) {
          const px = (x - 1) * SHEEN_CELL;
          const n =
            noise(px / 210 + t * 0.045, py / 64 + t * 0.012) * 0.62 +
            noise(px / 90 - t * 0.03 + 17.3, py / 34 + t * 0.02 + 5.1) * 0.38;
          const m = clamp((n - 0.5) / 0.32, 0, 1);
          data[o] = r;
          data[o + 1] = g;
          data[o + 2] = b;
          data[o + 3] = m * m * (3 - 2 * m) * look.sheenMax * 255;
          o += 4;
        }
      }
      shg.putImageData(sheenImage, 0, 0);
    };

    const sprite = (img: HTMLCanvasElement | null, f: Floe, ox: number, oy: number, half: number, scale: number) => {
      if (!img) return;
      const c = Math.cos(f.a) * scale * dpr;
      const s = Math.sin(f.a) * scale * dpr;
      ctx.setTransform(c, s, -s, c, (f.x + ox) * dpr, (f.y + oy) * dpr);
      ctx.drawImage(img, -half, -half, half * 2, half * 2);
    };

    const visible = (f: Floe, pad: number) => f.maxx > -pad && f.minx < w + pad && f.maxy > -pad && f.miny < h + pad;

    const draw = () => {
      if (w === 0 || h === 0) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sheenImage) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(
          sheenCanvas,
          -SHEEN_CELL,
          -SHEEN_CELL,
          sheenImage.width * SHEEN_CELL,
          sheenImage.height * SHEEN_CELL,
        );
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const r of rings) {
        const age = time - r.born;
        if (age < 0) continue;
        const k = age / r.life;
        const radius = r.r0 + r.speed * age * (1 - 0.3 * k);
        const fade = r.strength * (1 - k) ** 1.6;
        const trace = (rr: number) => {
          ctx.beginPath();
          if (Number.isNaN(r.dir)) {
            ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
            return;
          }
          const span = 0.42 + 0.25 * k;
          for (const side of [1, -1]) {
            const mid = r.dir + side * r.arm;
            ctx.moveTo(r.x + Math.cos(mid - span) * rr, r.y + Math.sin(mid - span) * rr);
            ctx.arc(r.x, r.y, rr, mid - span, mid + span);
          }
        };
        ctx.lineCap = "round";
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = fade * look.crestAlpha;
        ctx.strokeStyle = look.crest;
        trace(radius);
        ctx.stroke();
        if (radius > 4) {
          ctx.globalAlpha = fade * look.troughAlpha;
          ctx.strokeStyle = look.trough;
          ctx.lineWidth = 1.6;
          trace(radius - 2.6);
          ctx.stroke();
        }
      }

      for (const f of floes) {
        if (!visible(f, BLUR_PAD + SHADOW_Y)) continue;
        const scale = f.melting ? 0.55 + 0.45 * Math.max(0, f.melt) : 1;
        ctx.globalAlpha = f.melting ? Math.max(0, f.melt) : 1;
        sprite(f.skirt, f, 0, 0, f.blurHalf, scale);
        sprite(f.shade, f, SHADOW_X, SHADOW_Y, f.blurHalf, scale);
      }

      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const c of chips) {
        const age = time - c.born;
        const fade = clamp((c.life - age) / 1.8, 0, 1) * clamp(age / 0.15, 0, 1);
        if (fade <= 0) continue;
        ctx.globalAlpha = fade;
        ctx.fillStyle = look.ice;
        const cs = Math.cos(c.a) * c.size;
        const sn = Math.sin(c.a) * c.size;
        ctx.beginPath();
        ctx.moveTo(c.x + cs, c.y + sn);
        ctx.lineTo(c.x - sn * 0.7, c.y + cs * 0.7);
        ctx.lineTo(c.x - cs * 0.8, c.y - sn * 0.8);
        ctx.lineTo(c.x + sn * 0.6, c.y - cs * 0.6);
        ctx.closePath();
        ctx.fill();
      }

      for (const f of floes) {
        if (!visible(f, 8)) continue;
        const scale = f.melting ? 0.55 + 0.45 * Math.max(0, f.melt) : 1;
        ctx.globalAlpha = f.melting ? Math.max(0, f.melt) : 1;
        const c = Math.cos(f.a) * scale;
        const s = Math.sin(f.a) * scale;
        ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, (f.x - LIT_X) * dpr, (f.y - LIT_Y) * dpr);
        roundPath(ctx, f);
        ctx.fillStyle = look.lit;
        ctx.fill();
        ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, (f.x + WALL_X) * dpr, (f.y + WALL_Y) * dpr);
        roundPath(ctx, f);
        ctx.fillStyle = look.wall;
        ctx.fill();
        sprite(f.body, f, 0, 0, f.bodyHalf, scale);

        if (f.glowId && time - f.glowAt < GLOW) {
          const age = time - f.glowAt;
          const grow = smooth(clamp(age / 0.16, 0, 1));
          const fade = 1 - smooth(clamp(age / GLOW, 0, 1));
          const reach = grow * 260;
          ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, f.x * dpr, f.y * dpr);
          ctx.beginPath();
          for (let i = 0; i < f.n; i++) {
            if (f.cut[i] !== f.glowId) continue;
            const j = (i + 1) % f.n;
            const ex = f.lx[j] - f.lx[i];
            const ey = f.ly[j] - f.ly[i];
            const len = Math.hypot(ex, ey) || 1;
            const t0 = ((f.gx - f.lx[i]) * ex + (f.gy - f.ly[i]) * ey) / (len * len);
            const t1 = clamp(t0 - reach / len, 0, 1);
            const t2 = clamp(t0 + reach / len, 0, 1);
            if (t2 <= t1) continue;
            ctx.moveTo(f.lx[i] + ex * t1, f.ly[i] + ey * t1);
            ctx.lineTo(f.lx[i] + ex * t2, f.ly[i] + ey * t2);
          }
          ctx.lineCap = "round";
          if (look.night) ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = look.halo;
          ctx.globalAlpha = 0.3 * fade;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.strokeStyle = look.crack;
          ctx.globalAlpha = 0.95 * fade;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : STEP;
      last = now;
      acc = Math.min(acc + dt, STEP * 4);
      while (acc >= STEP) {
        acc -= STEP;
        step(STEP);
      }
      if (++frameCount % 30 === 0) measure();
      paintSheen();
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
      const ow = w;
      const oh = h;
      const od = dpr;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w === 0 || h === 0) return;
      if (shg) {
        sheenCanvas.width = Math.ceil(w / SHEEN_CELL) + 3;
        sheenCanvas.height = Math.ceil(h / SHEEN_CELL) + 3;
        sheenImage = shg.createImageData(sheenCanvas.width, sheenCanvas.height);
      }
      measure();
      const change = ow > 0 && oh > 0 ? (w * h) / (ow * oh) : 0;
      if (floes.length === 0 || change < 0.8 || change > 1.25) {
        build();
      } else {
        const sx = w / ow;
        const sy = h / oh;
        domainW = w + margin * 2;
        domainH = h + margin * 2;
        for (const f of floes) {
          f.x = (f.x + margin) * sx - margin;
          f.y = (f.y + margin) * sy - margin;
          world(f);
        }
        if (od !== dpr) for (const f of floes) paintSprites(f);
      }
      paintSheen();
      draw();
    };

    const local = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      if (still) return;
      const [x, y] = local(event);
      const now = event.timeStamp;
      if (!pointer.has) {
        pointer.x = x;
        pointer.y = y;
        pointer.vx = 0;
        pointer.vy = 0;
        pointer.t = now;
        pointer.has = true;
        return;
      }
      const dtm = Math.max(0.004, (now - pointer.t) / 1000);
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx, dy);
      let vx = dx / dtm;
      let vy = dy / dtm;
      const sp = Math.hypot(vx, vy);
      if (sp > 650) {
        vx *= 650 / sp;
        vy *= 650 / sp;
      }
      pointer.vx += (vx - pointer.vx) * 0.6;
      pointer.vy += (vy - pointer.vy) * 0.6;
      const psp = Math.hypot(pointer.vx, pointer.vy);
      const strength = clamp(psp / 420, 0.25, 0.9);
      const dir = Math.atan2(pointer.vy, pointer.vx);
      const moving = psp > 40;
      const spread = clamp(psp * Math.sin(KELVIN), 16, 120);
      let travel = pointer.travel + dist;
      const gap = 11;
      while (travel >= gap) {
        travel -= gap;
        const t = dist > 0 ? 1 - travel / dist : 1;
        ring(
          pointer.x + dx * clamp(t, 0, 1),
          pointer.y + dy * clamp(t, 0, 1),
          strength,
          2,
          spread,
          1.7,
          0,
          moving ? dir : NaN,
          Math.PI / 2 - KELVIN,
        );
      }
      pointer.travel = travel;
      pointer.x = x;
      pointer.y = y;
      pointer.t = now;
      pointer.at = time;
    };

    const onLeave = () => {
      pointer.has = false;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(OWN_CLICKS)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) return;
      const [x, y] = local(event);
      const f = floes.find(
        (o) => !o.melting && x >= o.minx && x <= o.maxx && y >= o.miny && y <= o.maxy && inside(o, x, y),
      );
      if (!f) {
        if (!still) ring(x, y, 0.7, 3, 44, 1.6);
        return;
      }
      let done = false;
      if (f.area >= MIN_CRACK) done = crack(f, x, y);
      if (!done && !still) {
        ring(x, y, 0.5, 3, 40, 1.4);
        f.w += (Math.random() - 0.5) * 0.3;
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
      look = readLook(canvas);
      for (const f of floes) paintSprites(f);
      paintSheen();
      draw();
    });
    if (interactive) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointercancel", onLeave);
      root.addEventListener("click", onClick);
    }
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
      root.removeEventListener("click", onClick);
    };
  }, [count, speed, seed, coverage, interactive, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-drifting-ice-night:0] dark:[--miyuki-drifting-ice-night:1]",
        "[--miyuki-drifting-ice-top:color-mix(in_oklab,var(--brand)_13%,color-mix(in_oklab,var(--foreground)_11%,var(--background)))]",
        "[--miyuki-drifting-ice-bottom:color-mix(in_oklab,var(--brand)_19%,color-mix(in_oklab,var(--foreground)_17%,var(--background)))]",
        "dark:[--miyuki-drifting-ice-top:color-mix(in_oklab,var(--brand)_6%,color-mix(in_oklab,var(--background)_76%,black))]",
        "dark:[--miyuki-drifting-ice-bottom:color-mix(in_oklab,var(--brand)_4%,color-mix(in_oklab,var(--background)_56%,black))]",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(168deg, var(--miyuki-drifting-ice-top), var(--miyuki-drifting-ice-bottom))",
        }}
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>
      {children}
    </div>
  );
}
