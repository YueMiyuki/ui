interface Rng {
  (): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

function seedHash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function createRng(seed: number | string = 1): Rng {
  let state = typeof seed === "string" ? seedHash(seed) : Math.floor(seed * 1000003) >>> 0;

  const next = (() => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;

  next.range = (min, max) => min + next() * (max - min);
  next.int = (min, max) => {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(next() * (hi - lo + 1));
  };
  next.pick = (items) => {
    if (items.length === 0) throw new Error("createRng().pick: empty array");
    return items[Math.floor(next() * items.length)];
  };
  next.shuffle = (items) => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return next;
}

export type Mood = "dawn" | "day" | "dusk" | "night" | "aurora" | "snow";

export const moods: readonly Mood[] = ["dawn", "day", "dusk", "night", "aurora", "snow"];

type Pt = [number, number];
type Lab = readonly [number, number, number];

const cache = new Map<string, string>();
const CACHE_LIMIT = 400;

function memo(key: string, make: () => string): string {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = make();
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

const seedKey = (seed: number | string) => `${typeof seed === "number" ? "n" : "s"}${seed}`;
const sub = (seed: number | string, tag: string) => createRng(`${seed}:${tag}`);
const dim = (value: number | undefined, fallback: number) =>
  Math.max(8, Math.round(Number.isFinite(value) ? (value as number) : fallback));

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function n1(v: number): string {
  return String(Math.round(v * 10) / 10).replace(/^(-?)0\./, "$1.");
}
function n2(v: number): string {
  return String(Math.round(v * 100) / 100).replace(/^(-?)0\./, "$1.");
}

function join10(values: number[]): string {
  let out = "";
  for (const v of values) {
    const s = String(v / 10).replace(/^(-?)0\./, "$1.");
    out += out && s[0] !== "-" ? ` ${s}` : s;
  }
  return out;
}

function polyline(points: Pt[], close = false): string {
  if (points.length === 0) return "";
  let px = Math.round(points[0][0] * 10);
  let py = Math.round(points[0][1] * 10);
  const rel: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const x = Math.round(points[i][0] * 10);
    const y = Math.round(points[i][1] * 10);
    if (x === px && y === py) continue;
    rel.push(x - px, y - py);
    px = x;
    py = y;
  }
  return `M${join10([Math.round(points[0][0] * 10), Math.round(points[0][1] * 10)])}${
    rel.length ? `l${join10(rel)}` : ""
  }${close ? "z" : ""}`;
}

function simplify(points: Pt[], eps: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const px = points[i][0] - ax;
      const py = points[i][1] - ay;
      const dist = len > 1e-6 ? Math.abs(px * dy - py * dx) / len : Math.hypot(px, py);
      if (dist > worst) {
        worst = dist;
        at = i;
      }
    }
    if (at > 0 && worst > eps) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function smoothPath(points: Pt[]): string {
  const closed =
    points.length > 3 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1];
  const pts = closed ? points.slice(0, -1) : points;
  const n = pts.length;
  if (n < 3) return polyline(points);
  const T = (v: number) => Math.round(v * 10);
  const mid = (i: number): [number, number] => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [T((a[0] + b[0]) / 2), T((a[1] + b[1]) / 2)];
  };
  let [cx, cy] = closed ? mid(0) : [T(pts[0][0]), T(pts[0][1])];
  let d = `M${join10([cx, cy])}q`;
  const nums: number[] = [];
  const last = closed ? n : n - 1;
  for (let i = 1; i <= last; i++) {
    const c = pts[i % n];
    const [ex, ey] = !closed && i === n - 1 ? [T(c[0]), T(c[1])] : mid(i);
    const qx = T(c[0]);
    const qy = T(c[1]);
    if (!closed && i === n - 1) {
      nums.push(qx - cx, qy - cy, qx - cx, qy - cy);
    } else {
      nums.push(qx - cx, qy - cy, ex - cx, ey - cy);
    }
    cx = closed || i < n - 1 ? ex : qx;
    cy = closed || i < n - 1 ? ey : qy;
  }
  d += join10(nums);
  return closed ? `${d}z` : d;
}

function dots(points: Pt[]): string {
  return points.map(([x, y]) => `M${join10([Math.round(x * 10), Math.round(y * 10)])}h0`).join("");
}

function lch(l: number, c: number, h: number): Lab {
  const r = (h * Math.PI) / 180;
  return [l, c * Math.cos(r), c * Math.sin(r)];
}

function mix(a: Lab, b: Lab, t: number): Lab {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function shade(c: Lab, dl: number): Lab {
  return [clamp(c[0] + dl), c[1], c[2]];
}

function hex(c: Lab): string {
  const [L, A, B] = c;
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  let out = "#";
  for (const v of linear) {
    const x = clamp(v);
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    out += Math.round(g * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function stop(offset: number, color: Lab, opacity = 1): string {
  return `<stop offset='${n2(offset)}' stop-color='${hex(color)}'${
    opacity < 1 ? ` stop-opacity='${n2(opacity)}'` : ""
  }/>`;
}

function vGradient(id: string, y1: number, y2: number, stops: string): string {
  return `<linearGradient id='${id}' gradientUnits='userSpaceOnUse' x1='0' y1='${n1(y1)}' x2='0' y2='${n1(
    y2,
  )}'>${stops}</linearGradient>`;
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function smoothStops(body: Lab, top: Lab, topAmt: number, topEnd: number, bottom: Lab, bottomAmt: number): string {
  let out = "";
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const up = topAmt * (1 - smoothstep(0, topEnd, t));
    const down = bottomAmt * smoothstep(topEnd * 0.5, 1, t);
    out += stop(t, mix(mix(body, top, up), bottom, down));
  }
  return out;
}

function blurFilter(id: string, std: string, pad = 20): string {
  return `<filter id='${id}' x='-${pad}%' y='-${pad}%' width='${100 + 2 * pad}%' height='${
    100 + 2 * pad
  }%'><feGaussianBlur stdDeviation='${std}'/></filter>`;
}

function svgOpen(w: number, h: number): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}' preserveAspectRatio='xMidYMid slice'>`;
}

function hash64(text: string): string {
  let a = 0xdeadbeef ^ text.length;
  let b = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

function toDataUri(svg: string, area: number): string {
  const uri = `data:image/svg+xml,${svg.replace(
    /[\r\n%#<>"]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  )}`;
  if (area < 40_000 || !svg.includes("<filter")) return uri;
  const hash = hash64(uri);
  const seen = (globalThis as { __miyukiArt?: unknown }).__miyukiArt;
  if (seen instanceof Map) {
    seen.set(hash, uri);
    return uri;
  }
  const files = (globalThis as { __miyukiArtFiles?: unknown }).__miyukiArtFiles;
  return files instanceof Set && files.has(hash) ? `/art/${hash}.webp` : uri;
}

function noise1(rng: Rng): (x: number) => number {
  const size = 256;
  const g = Array.from({ length: size }, () => rng() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const t = x - i;
    const a = g[i & 255] * t;
    const b = g[(i + 1) & 255] * (t - 1);
    return (a + (b - a) * smooth(t)) * 2;
  };
}

function fbm1(rng: Rng, octaves: number, gain = 0.5): (x: number) => number {
  const layers = Array.from({ length: octaves }, () => ({ n: noise1(rng), o: rng() * 97 }));
  let norm = 0;
  for (let i = 0, a = 1; i < octaves; i++, a *= gain) norm += a;
  return (x) => {
    let sum = 0;
    let amp = 1;
    let f = 1;
    for (const layer of layers) {
      sum += layer.n(x * f + layer.o) * amp;
      amp *= gain;
      f *= 2.03;
    }
    return sum / norm;
  };
}

function ridged1(rng: Rng, octaves: number): (x: number) => number {
  const layers = Array.from({ length: octaves }, () => ({ n: noise1(rng), o: rng() * 97 }));
  return (x) => {
    let sum = 0;
    let norm = 0;
    let amp = 1;
    let f = 1;
    for (const layer of layers) {
      const v = 1 - Math.abs(layer.n(x * f + layer.o));
      sum += v * v * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.1;
    }
    return sum / norm;
  };
}

function noise2(rng: Rng): (x: number, y: number) => number {
  const perm = rng.shuffle(Array.from({ length: 256 }, (_, i) => i));
  const p = perm.concat(perm);
  const gx: number[] = [];
  const gy: number[] = [];
  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    gx.push(Math.cos(a));
    gy.push(Math.sin(a));
  }
  const grad = (ix: number, iy: number, dx: number, dy: number) => {
    const h = p[p[ix] + iy];
    return gx[h] * dx + gy[h] * dy;
  };
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const u = smooth(xf);
    const v = smooth(yf);
    const a = lerp(grad(X, Y, xf, yf), grad(X + 1, Y, xf - 1, yf), u);
    const b = lerp(grad(X, Y + 1, xf, yf - 1), grad(X + 1, Y + 1, xf - 1, yf - 1), u);
    return lerp(a, b, v) * 1.45;
  };
}

interface Palette {
  sky: [number, Lab][];
  haze: Lab;
  near: Lab;
  snow: Lab;
  shadow: Lab;
  disc: Lab;
  halo: Lab;
  haloAlpha: number;
  discAlpha: number;
  glow?: Lab;
  cloud?: Lab;
  faceAlpha: number;
  water: Lab;
  low: boolean;
  moon: boolean;
}

const PALETTES: Record<Mood, Palette> = {
  dawn: {
    sky: [
      [0, lch(0.76, 0.055, 248)],
      [0.42, lch(0.84, 0.04, 292)],
      [0.74, lch(0.89, 0.05, 12)],
      [1, lch(0.94, 0.065, 82)],
    ],
    haze: lch(0.8, 0.04, 292),
    near: lch(0.36, 0.06, 268),
    snow: lch(0.95, 0.035, 25),
    shadow: lch(0.66, 0.06, 280),
    disc: lch(0.985, 0.04, 88),
    halo: lch(0.93, 0.08, 72),
    haloAlpha: 0.7,
    discAlpha: 0.95,
    glow: lch(0.93, 0.07, 70),
    cloud: lch(0.95, 0.035, 18),
    faceAlpha: 0.5,
    water: lch(0.66, 0.06, 262),
    low: true,
    moon: false,
  },
  day: {
    sky: [
      [0, lch(0.71, 0.1, 242)],
      [0.55, lch(0.84, 0.055, 234)],
      [1, lch(0.95, 0.02, 222)],
    ],
    haze: lch(0.85, 0.035, 236),
    near: lch(0.37, 0.07, 250),
    snow: lch(0.985, 0.008, 230),
    shadow: lch(0.72, 0.06, 246),
    disc: lch(0.995, 0.01, 95),
    halo: lch(0.97, 0.03, 95),
    cloud: lch(0.985, 0.006, 230),
    haloAlpha: 0.55,
    discAlpha: 0.95,
    faceAlpha: 0.5,
    water: lch(0.56, 0.1, 242),
    low: false,
    moon: false,
  },
  dusk: {
    sky: [
      [0, lch(0.33, 0.06, 272)],
      [0.45, lch(0.47, 0.08, 292)],
      [0.78, lch(0.64, 0.08, 328)],
      [0.92, lch(0.75, 0.09, 40)],
      [1, lch(0.82, 0.09, 68)],
    ],
    haze: lch(0.55, 0.06, 296),
    near: lch(0.23, 0.04, 270),
    snow: lch(0.84, 0.06, 28),
    shadow: lch(0.42, 0.06, 285),
    disc: lch(0.95, 0.06, 78),
    halo: lch(0.82, 0.12, 52),
    haloAlpha: 0.7,
    discAlpha: 0.95,
    glow: lch(0.8, 0.11, 55),
    cloud: lch(0.76, 0.08, 35),
    faceAlpha: 0.5,
    water: lch(0.36, 0.07, 272),
    low: true,
    moon: false,
  },
  night: {
    sky: [
      [0, lch(0.16, 0.03, 260)],
      [0.6, lch(0.22, 0.045, 255)],
      [1, lch(0.33, 0.055, 246)],
    ],
    haze: lch(0.34, 0.05, 250),
    near: lch(0.16, 0.03, 256),
    snow: lch(0.7, 0.04, 240),
    shadow: lch(0.25, 0.04, 256),
    disc: lch(0.96, 0.02, 230),
    halo: lch(0.8, 0.05, 236),
    haloAlpha: 0.35,
    discAlpha: 0.95,
    faceAlpha: 0.55,
    water: lch(0.18, 0.04, 250),
    low: false,
    moon: true,
  },
  aurora: {
    sky: [
      [0, lch(0.13, 0.025, 256)],
      [0.55, lch(0.19, 0.04, 236)],
      [1, lch(0.29, 0.05, 206)],
    ],
    haze: lch(0.3, 0.045, 226),
    near: lch(0.14, 0.025, 250),
    snow: lch(0.62, 0.05, 200),
    shadow: lch(0.22, 0.04, 246),
    disc: lch(0.95, 0.02, 220),
    halo: lch(0.8, 0.05, 220),
    haloAlpha: 0.25,
    discAlpha: 0.9,
    faceAlpha: 0.55,
    water: lch(0.16, 0.035, 240),
    low: false,
    moon: true,
  },
  snow: {
    sky: [
      [0, lch(0.84, 0.024, 246)],
      [1, lch(0.93, 0.016, 236)],
    ],
    haze: lch(0.88, 0.02, 242),
    near: lch(0.54, 0.045, 250),
    snow: lch(0.975, 0.005, 240),
    shadow: lch(0.8, 0.03, 250),
    disc: lch(0.97, 0.01, 90),
    halo: lch(0.96, 0.01, 90),
    haloAlpha: 0.3,
    discAlpha: 0.35,
    faceAlpha: 0.3,
    water: lch(0.72, 0.04, 244),
    low: false,
    moon: false,
  },
};

interface Ridge {
  pts: Pt[];
  top: number;
  mid: number;
  base: number;
  depth: number;
}

function makeRidge(rng: Rng, W: number, H: number, base: number, amp: number, depth: number, step: number): Ridge {
  const spacing = H * lerp(0.42, 0.75, depth) * rng.range(0.85, 1.2);
  const sharp = lerp(1.15, 1.9, depth);
  const peaks: { c: number; h: number; wl: number; wr: number }[] = [];
  let x = -spacing * rng.range(0.2, 0.8);
  let hero = rng.int(0, Math.max(0, Math.floor(W / spacing)));
  while (x < W + spacing) {
    const h = hero-- === 0 ? 1 : rng.range(0.4, 0.9);
    peaks.push({
      c: x,
      h,
      wl: spacing * rng.range(0.35, 0.75),
      wr: spacing * rng.range(0.35, 0.75),
    });
    x += spacing * rng.range(0.7, 1.3);
  }
  const crags = ridged1(rng, 4);
  const fine = fbm1(rng, 4, 0.55);
  const swell = fbm1(rng, 2);
  const cragScale = 1 / (H * lerp(0.07, 0.16, depth));
  const cragAmp = lerp(0.26, 0.09, depth) * rng.range(0.8, 1.2);
  const fineScale = 1 / (H * 0.035);
  const fineAmp = lerp(0.045, 0.02, depth);
  const k = 0.07;
  const floor = rng.range(0.14, 0.28);
  const saddle = fbm1(rng, 3);
  const pts: Pt[] = [];
  let top = Infinity;
  for (let px = -step * 3; px <= W + step * 3; px += step) {
    let sum = Math.exp((floor + saddle(px / (H * 0.45)) * 0.4) / k);
    for (const p of peaks) {
      const d = px - p.c;
      const w = d < 0 ? p.wl : p.wr;
      const v = p.h * Math.exp(-((Math.abs(d) / w) ** sharp));
      sum += Math.exp(v / k);
    }
    const shape = k * Math.log(sum);
    const s = clamp(shape);
    const crest = (crags(px * cragScale) - 0.55) * cragAmp * (0.35 + 0.65 * s);
    const lift = shape + crest + fine(px * fineScale) * fineAmp * (0.4 + 0.6 * s) + swell(px / (H * 1.3)) * 0.14;
    const y = base - amp * lift;
    top = Math.min(top, y);
    pts.push([px, y]);
  }
  const sorted = pts.map((p) => p[1]).sort((a, b) => a - b);
  return { pts, top, mid: sorted[Math.floor(sorted.length / 2)], base, depth };
}

function ridgeAt(r: Ridge, x: number): number {
  const { pts } = r;
  const step = pts[1][0] - pts[0][0];
  const i = clamp(Math.floor((x - pts[0][0]) / step), 0, pts.length - 2);
  const t = clamp((x - pts[i][0]) / step);
  return lerp(pts[i][1], pts[i + 1][1], t);
}

function peakFaces(r: Ridge, lightX: number, rng: Rng, H: number): string[] {
  const { pts } = r;
  const step = pts[1][0] - pts[0][0];
  const win = Math.max(3, Math.round((H * 0.08) / step));
  const maxWalk = Math.round((H * 0.32) / step);
  const faces: string[] = [];
  for (let i = win; i < pts.length - win; i++) {
    const y = pts[i][1];
    let isPeak = true;
    for (let j = i - win; j <= i + win; j++) {
      if (pts[j][1] < y) {
        isPeak = false;
        break;
      }
    }
    if (!isPeak) continue;
    const [xs, ys] = pts[i];
    const dir = xs >= lightX ? 1 : -1;
    let col = i;
    for (let j = i + dir, n = 0; j >= 0 && j < pts.length && n < maxWalk; j += dir, n++) {
      if (pts[j][1] > pts[col][1]) col = j;
      else if (pts[col][1] - pts[j][1] > H * 0.025) break;
    }
    const drop = pts[col][1] - y;
    if (drop < H * 0.035) continue;
    const [xc, yc] = pts[col];
    const len = Math.min(drop * rng.range(1.4, 1.9), (r.base - ys) * 0.9);
    const bx = xs + (xc - xs) * rng.range(0.3, 0.55);
    const by = ys + Math.max(len, drop * 1.1);
    const arete = fbm1(rng, 4, 0.6);
    const gully = fbm1(rng, 3, 0.55);
    const poly: Pt[] = [];
    for (let j = i; j !== col + dir; j += dir) poly.push(pts[j]);
    const segs = 14;
    for (let s = 1; s < segs; s++) {
      const t = s / segs;
      poly.push([lerp(xc, bx, t) + gully(t * 3) * drop * 0.25 * Math.sin(t * Math.PI), lerp(yc, by, t)]);
    }
    for (let s = segs; s >= 1; s--) {
      const t = s / segs;
      const wobble = arete(t * 4) * drop * 0.22 * Math.sin(t * Math.PI);
      poly.push([lerp(xs, bx, t ** 1.4) + wobble, lerp(ys, by, t)]);
    }
    faces.push(polyline(poly, true));
  }
  return faces;
}

function pineTrees(trees: { x: number; y: number; h: number }[], rng: Rng): string {
  let d = "";
  for (const t of trees) {
    const tiers = t.h > 30 ? 4 : 3;
    const w = t.h * rng.range(0.34, 0.44);
    const tierH = (t.h / tiers) * 1.45;
    for (let j = 0; j < tiers; j++) {
      const apex = t.y - t.h + (j * (t.h - tierH)) / Math.max(1, tiers - 1);
      const half = (w / 2) * (0.45 + (0.55 * (j + 1)) / tiers);
      d += polyline(
        [
          [t.x, apex],
          [t.x - half, apex + tierH],
          [t.x + half, apex + tierH],
        ],
        true,
      );
    }
  }
  return d;
}

function buildLandscape(seed: number | string, W: number, H: number, mood: Mood): string {
  const P = PALETTES[mood];
  const layout = sub(seed, "layout");
  const hasLake = layout() < 0.45;
  const hasPines = layout() < 0.6;
  const count = layout.int(3, 5);
  const yh = H * layout.range(0.5, 0.58);
  const yw = hasLake ? H * layout.range(0.68, 0.75) : H;
  const horizon = P.sky[P.sky.length - 1][1];

  const defs: string[] = [];
  const scene: string[] = [];
  const after: string[] = [];

  defs.push(vGradient("s", 0, yh, P.sky.map(([o, c]) => stop(o, c)).join("")));
  scene.push(`<rect width='${W}' height='${H}' fill='url(#s)'/>`);

  if (mood === "night" || mood === "aurora") {
    const starRng = sub(seed, "stars");
    const n = Math.round(Math.min(220, (W * H) / 3600) * (mood === "aurora" ? 0.75 : 1));
    const groups: Pt[][] = [[], [], []];
    for (let i = 0; i < n; i++) {
      const x = starRng() * W;
      const y = yh * 0.98 * starRng() ** 1.7;
      const g = starRng();
      groups[g < 0.62 ? 0 : g < 0.92 ? 1 : 2].push([x, y]);
    }
    const sizes = [1, 1.5, 2.2];
    const alphas = [".45", ".65", ".85"];
    const starColor = hex(lch(0.97, 0.015, 230));
    groups.forEach((g, i) => {
      if (g.length)
        scene.push(
          `<path d='${dots(g)}' stroke='${starColor}' stroke-width='${sizes[i]}' stroke-linecap='round' opacity='${alphas[i]}'/>`,
        );
    });
  }

  const ridges: Ridge[] = [];
  const step = Math.max(3, Math.round(W / 170));
  for (let i = 0; i < count; i++) {
    const depth = count === 1 ? 1 : i / (count - 1);
    const r = sub(seed, `ridge:${i}`);
    let base: number;
    let amp: number;
    if (hasLake) {
      base = lerp(yh, yw + 2, depth ** 1.1);
      amp = H * lerp(0.3, 0.07, depth) * r.range(0.85, 1.1);
    } else {
      base = lerp(yh, H * 1.04, depth ** 1.15);
      amp = H * lerp(0.3, 0.16, depth) * r.range(0.85, 1.15);
    }
    ridges.push(makeRidge(r, W, H, base, amp, depth, step));
  }

  const discRng = sub(seed, "disc");
  const skyline = (x: number) => Math.min(...ridges.map((r) => ridgeAt(r, x)));
  let sunX = W * discRng.range(0.18, 0.82);
  if (P.low) {
    for (let i = 0; i < 6; i++) {
      const x = W * discRng.range(0.15, 0.85);
      if (skyline(x) > skyline(sunX)) sunX = x;
    }
  }
  const sunR = H * (P.moon ? discRng.range(0.028, 0.038) : discRng.range(0.04, 0.055));
  const sunY = P.low
    ? Math.min(yh - H * 0.02, skyline(sunX) - sunR * discRng.range(0.1, 0.9))
    : H * discRng.range(0.12, 0.3);
  if (P.glow) {
    defs.push(
      `<radialGradient id='gl'>${stop(0, P.glow, 0.7)}${stop(0.3, P.glow, 0.36)}${stop(0.65, P.glow, 0.1)}${stop(
        1,
        P.glow,
        0,
      )}</radialGradient>`,
    );
    scene.push(`<ellipse cx='${n1(sunX)}' cy='${n1(yh)}' rx='${n1(W * 0.95)}' ry='${n1(H * 0.24)}' fill='url(#gl)'/>`);
  }
  if (mood !== "aurora" || discRng() < 0.4) {
    const a = P.haloAlpha;
    defs.push(
      `<radialGradient id='h'>${stop(0, P.halo, a)}${stop(0.12, P.halo, a * 0.55)}${stop(0.3, P.halo, a * 0.2)}${stop(
        0.6,
        P.halo,
        a * 0.05,
      )}${stop(1, P.halo, 0)}</radialGradient>`,
    );
    defs.push(
      P.moon
        ? `<radialGradient id='d' cx='.44' cy='.42'>${stop(0, P.disc)}${stop(0.7, P.disc)}${stop(
            1,
            mix(P.disc, P.halo, 0.55),
          )}</radialGradient>`
        : `<radialGradient id='d'>${stop(0, P.disc)}${stop(0.8, P.disc)}${stop(1, P.disc, 0.6)}</radialGradient>`,
    );
    defs.push(blurFilter("db", n1(sunR * (P.moon ? 0.04 : 0.1)), 20));
    scene.push(
      `<circle cx='${n1(sunX)}' cy='${n1(sunY)}' r='${n1(sunR * 8)}' fill='url(#h)'/>`,
      `<circle cx='${n1(sunX)}' cy='${n1(sunY)}' r='${n1(sunR)}' fill='url(#d)' opacity='${n2(
        P.discAlpha,
      )}' filter='url(#db)'/>`,
    );
  }

  const cloudRng = sub(seed, "clouds");
  if (P.cloud && cloudRng() < 0.7) {
    const n = cloudRng.int(3, 6);
    const y0 = Math.min(yh - H * 0.14, H * cloudRng.range(0.14, 0.36));
    defs.push(blurFilter("cb", `${n1(H * 0.028)} ${n1(H * 0.009)}`, 40));
    let g = "";
    for (let i = 0; i < n; i++) {
      g += `<ellipse cx='${n1(W * cloudRng.range(-0.05, 1.05))}' cy='${n1(
        y0 + H * cloudRng.range(-0.07, 0.07),
      )}' rx='${n1(W * cloudRng.range(0.08, 0.24))}' ry='${n1(H * cloudRng.range(0.005, 0.016))}' opacity='${n2(
        cloudRng.range(0.25, 0.55),
      )}'/>`;
    }
    scene.push(`<g fill='${hex(P.cloud)}' filter='url(#cb)'>${g}</g>`);
  }

  if (mood === "aurora") {
    const aRng = sub(seed, "aurora");
    const bands = aRng.int(1, 3);
    const hues = [lch(0.82, 0.12, 170), lch(0.74, 0.12, 222), lch(0.7, 0.13, 300)];
    defs.push(blurFilter("ag", n1(H * 0.022), 30), blurFilter("ar", `${n1(H * 0.0035)} ${n1(H * 0.02)}`, 20));
    let glow = "";
    let rays = "";
    for (let b = 0; b < bands; b++) {
      const color = b === 0 ? hues[0] : aRng() < 0.6 ? hues[1] : hues[2];
      const strength = b === 0 ? 1 : aRng.range(0.45, 0.75);
      defs.push(
        `<linearGradient id='a${b}' x1='0' y1='0' x2='0' y2='1'>${stop(0, color, 0)}${stop(
          0.55,
          color,
          0.3 * strength,
        )}${stop(0.9, color, 0.75 * strength)}${stop(1, color, 0.9 * strength)}</linearGradient>`,
      );
      const curve = fbm1(aRng, 3);
      const tall = fbm1(aRng, 3);
      const flicker = fbm1(aRng, 3, 0.6);
      const y0 = H * (b === 0 ? aRng.range(0.24, 0.36) : aRng.range(0.12, 0.3));
      const slope = aRng.range(-0.18, 0.18);
      const bandH = H * aRng.range(0.16, 0.28) * (b === 0 ? 1 : 0.75);
      const lower: Pt[] = [];
      const upper: Pt[] = [];
      const yb = (x: number) => y0 + slope * (x - W / 2) + curve(x / (W * 0.4)) * H * 0.08;
      const yt = (x: number) => yb(x) - bandH * (0.5 + 0.5 * tall(x / (W * 0.18)));
      for (let x = -W * 0.1; x <= W * 1.1; x += W / 40) {
        lower.push([x, yb(x)]);
        upper.push([x, yt(x)]);
      }
      glow += `<path d='${polyline(upper.concat(lower.reverse()), true)}' fill='url(#a${b})'/>`;
      const d = ["", ""];
      for (let x = -W * 0.04; x <= W * 1.04; x += (W / 76) * aRng.range(0.4, 1.6)) {
        const f = clamp(0.55 + flicker(x / (W * 0.035)) * 1.2) * aRng.range(0.7, 1);
        if (f < 0.2) continue;
        const y1 = yb(x) + H * 0.01;
        const y2 = lerp(yb(x), yt(x), f);
        d[aRng() < 0.6 ? 0 : 1] += `M${join10([Math.round(x * 10), Math.round(y1 * 10)])}v${join10([
          Math.round((y2 - y1) * 10),
        ])}`;
      }
      rays +=
        `<path d='${d[0]}' stroke='url(#a${b})' stroke-width='${n1(W / 400 + 0.5)}'/>` +
        `<path d='${d[1]}' stroke='url(#a${b})' stroke-width='${n1(W / 160 + 0.8)}' opacity='.6'/>`;
    }
    scene.push(
      `<g style='mix-blend-mode:screen'><g filter='url(#ag)'>${glow}</g><g filter='url(#ar)' opacity='.75'>${rays}</g></g>`,
    );
  }

  const mist = mix(P.haze, horizon, 0.45);
  defs.push(blurFilter("b0", n1(H * 0.0025), 5), blurFilter("b1", n1(H * 0.0012), 5));
  defs.push(
    `<linearGradient id='fs' x1='0' y1='0' x2='0' y2='1'>${stop(0, P.shadow, P.faceAlpha)}${stop(
      0.55,
      P.shadow,
      P.faceAlpha * 0.45,
    )}${stop(1, P.shadow, 0)}</linearGradient>`,
  );
  ridges.forEach((r, i) => {
    const t = 0.06 + 0.94 * r.depth ** 1.3;
    const body = mix(P.haze, P.near, t);
    const alpine = r.depth < 0.6;
    const nearest = i === ridges.length - 1;
    const foot = Math.min(H, r.base + H * 0.04);
    const snowLine = clamp(((r.mid - r.top) / (foot - r.top)) * 0.95, 0.15, 0.6);
    const stops = alpine
      ? smoothStops(body, P.snow, lerp(0.75, 0.45, r.depth), snowLine, mist, 0.35)
      : nearest
        ? smoothStops(body, P.snow, 0.12, 0.35, shade(body, -0.02), 1)
        : smoothStops(body, P.snow, 0.1, 0.4, mist, 0.3);
    defs.push(vGradient(`r${i}`, r.top, foot, stops));
    const outline: Pt[] = [[r.pts[0][0], H + 10], ...r.pts, [r.pts[r.pts.length - 1][0], H + 10]];
    const filter = i === 0 ? " filter='url(#b0)'" : r.depth < 0.5 ? " filter='url(#b1)'" : "";
    let g = `<path d='${polyline(outline, true)}' fill='url(#r${i})'${filter}/>`;
    if (alpine) {
      const faces = peakFaces(r, sunX, sub(seed, `faces:${i}`), H);
      if (faces.length) g += `<g fill='url(#fs)'${filter}>${faces.map((d) => `<path d='${d}'/>`).join("")}</g>`;
    }
    scene.push(g);
    if (i === 0) {
      defs.push(
        vGradient("hz", yh - H * 0.2, yh + H * 0.12, stop(0, P.haze, 0) + stop(0.65, mist, 0.5) + stop(1, mist, 0)),
      );
      scene.push(`<rect y='${n1(yh - H * 0.2)}' width='${W}' height='${n1(H * 0.32)}' fill='url(#hz)'/>`);
    }
  });

  if (hasPines) {
    const pr = sub(seed, "pines");
    const ridge = ridges[ridges.length - 1];
    const trees: { x: number; y: number; h: number }[] = [];
    const clusters = pr.int(1, 3);
    const big = hasLake ? H * 0.035 : H * 0.075;
    for (let c = 0; c < clusters; c++) {
      const cx = pr.range(-0.05, 1.05) * W;
      const spread = W * pr.range(0.06, 0.18);
      const n = pr.int(4, 12);
      for (let k = 0; k < n; k++) {
        const x = cx + (pr() + pr() + pr() - 1.5) * spread;
        const h = big * pr.range(0.45, 1);
        trees.push({ x, y: ridgeAt(ridge, x) + h * pr.range(0.05, 0.6), h });
      }
    }
    trees.sort((a, b) => a.y - b.y);
    const ink: Lab = [Math.max(0.15, P.near[0] - 0.03), P.near[1], P.near[2]];
    scene.push(`<path d='${pineTrees(trees, pr)}' fill='${hex(ink)}'/>`);
  }

  if (hasLake) {
    const lr = sub(seed, "lake");
    const k = lr.range(0.75, 0.9);
    defs.push(`<clipPath id='lk'><rect y='${n1(yw)}' width='${W}' height='${n1(H - yw)}'/></clipPath>`);
    defs.push(`<filter id='rf' x='0' y='0' width='1' height='1'><feGaussianBlur stdDeviation='.6 2'/></filter>`);
    defs.push(
      vGradient(
        "lw",
        yw,
        H,
        stop(0, mix(horizon, P.haze, 0.5), 0.3) + stop(0.35, P.water, 0.2) + stop(1, P.water, 0.6),
      ),
    );
    const rippleColor = mix(horizon, lch(1, 0, 0), 0.35);
    defs.push(
      `<linearGradient id='rp'>${stop(0, rippleColor, 0)}${stop(0.5, rippleColor)}${stop(
        1,
        rippleColor,
        0,
      )}</linearGradient>`,
    );
    let ripples = "";
    const n = lr.int(5, 9);
    for (let i = 0; i < n; i++) {
      const t = (i + lr.range(0.2, 0.8)) / n;
      const y = yw + (H - yw) * t ** 1.4;
      const len = W * lr.range(0.06, 0.22) * (0.6 + t);
      const x = lr.range(-0.05, 0.95) * W;
      ripples += `<rect x='${n1(x)}' y='${n1(y)}' width='${n1(len)}' height='${n2(0.7 + t * 0.9)}' opacity='${n2(
        lr.range(0.18, 0.4),
      )}'/>`;
    }
    after.push(
      `<g clip-path='url(#lk)'><rect y='${n1(yw)}' width='${W}' height='${n1(H - yw)}' fill='${hex(P.water)}'/>` +
        `<use href='#sc' transform='matrix(1 0 0 -${n2(k)} 0 ${n1(yw * (1 + k))})' opacity='.85' filter='url(#rf)'/>` +
        `<rect y='${n1(yw)}' width='${W}' height='${n1(H - yw)}' fill='url(#lw)'/>` +
        `<g fill='url(#rp)'>${ripples}</g></g>`,
      `<rect y='${n1(yw - 0.6)}' width='${W}' height='1.2' fill='${hex(mix(horizon, lch(1, 0, 0), 0.3))}' opacity='.5'/>`,
    );
  }

  if (mood === "snow") {
    const fr = sub(seed, "flakes");
    const n = Math.round(Math.min(320, (W * H) / 2600));
    const groups: Pt[][] = [[], [], []];
    for (let i = 0; i < n; i++) {
      const g = fr();
      groups[g < 0.6 ? 0 : g < 0.9 ? 1 : 2].push([fr() * W, fr() * H]);
    }
    const flake = hex(lch(0.99, 0.004, 236));
    const sizes = [n1(H * 0.003 + 0.6), n1(H * 0.0055 + 0.8), n1(H * 0.011 + 1)];
    const alphas = [".75", ".65", ".5"];
    defs.push(blurFilter("fb", n1(H * 0.0018), 5));
    groups.forEach((g, i) => {
      after.push(
        `<path d='${dots(g)}' stroke='${flake}' stroke-width='${sizes[i]}' stroke-linecap='round' opacity='${
          alphas[i]
        }'${i === 2 ? " filter='url(#fb)'" : ""}/>`,
      );
    });
  }

  return `${svgOpen(W, H)}<defs>${defs.join("")}</defs><g id='sc'>${scene.join("")}</g>${after.join("")}</svg>`;
}

export function landscape(
  seed: number | string,
  options: { width?: number; height?: number; mood?: Mood } = {},
): string {
  const W = dim(options.width, 800);
  const H = dim(options.height, 600);
  const mood = options.mood && moods.includes(options.mood) ? options.mood : sub(seed, "mood").pick(moods);
  return memo(`l|${seedKey(seed)}|${W}|${H}|${mood}`, () => toDataUri(buildLandscape(seed, W, H, mood), W * H));
}

function blobPath(rng: Rng, cx: number, cy: number, rx: number, ry: number, rot: number, wobble = 1): string {
  const n = noise1(rng);
  const off = rng() * 50;
  const pts: Pt[] = [];
  const steps = 28;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + wobble * (0.22 * n(off + Math.cos(a) * 1.6) + 0.12 * n(off + 20 + Math.sin(a) * 2.4));
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return polyline(pts, true);
}

function buildAbstract(seed: number | string, W: number, H: number): string {
  const rng = sub(seed, "abstract");
  const deep = rng() < 0.35;
  const base = deep ? lch(0.22, 0.04, rng.range(245, 262)) : lch(0.975, 0.008, rng.range(225, 245));
  const hues: Lab[] = deep
    ? [lch(0.62, 0.13, 236), lch(0.7, 0.11, 178), lch(0.58, 0.13, 296), lch(0.5, 0.09, 250)]
    : [lch(0.66, 0.12, 240), lch(0.78, 0.09, 180), lch(0.7, 0.11, 296), lch(0.9, 0.035, 230)];
  const accents: Lab[] = deep ? [lch(0.66, 0.17, 16), lch(0.82, 0.13, 84)] : [lch(0.7, 0.15, 16), lch(0.86, 0.12, 86)];
  const S = Math.min(W, H);
  const count = rng.int(3, 5);
  const glazes = rng.int(1, 2);
  const turb = (id: string, freq: number, scale: number, rest: string) =>
    `<filter id='${id}' x='-30%' y='-30%' width='160%' height='160%'><feTurbulence type='fractalNoise' baseFrequency='${(
      freq / S
    ).toFixed(4)}' numOctaves='3' seed='${rng.int(1, 999)}'/><feDisplacementMap in='SourceGraphic' scale='${n1(
      S * scale,
    )}' xChannelSelector='R' yChannelSelector='G'/>${rest}</filter>`;
  const g = rng.range(0.3, 0.42);
  const defs = [
    turb("w", 1.4, 0.16, `<feGaussianBlur stdDeviation='${n1(S * 0.05)}'/>`),
    turb(
      "g",
      2.2,
      0.1,
      `<feGaussianBlur stdDeviation='${n1(S * (deep ? 0.018 : 0.006))}'/>${`<feComponentTransfer><feFuncA type='table' tableValues='${
        deep ? `0 ${n2(g * 1.2)}` : `0 ${n2(g * 1.4)} ${n2(g * 1.1)} ${n2(g)}`
      }'/></feComponentTransfer>`}`,
    ),
  ];
  let washes = "";
  let glaze = "";
  const order = rng.shuffle(hues);
  const slots = rng.shuffle([
    [0.2, 0.25],
    [0.75, 0.2],
    [0.3, 0.8],
    [0.8, 0.75],
    [0.5, 0.5],
  ]);
  for (let i = 0; i < count; i++) {
    const [sx, sy] = slots[i];
    const color = order[i % order.length];
    const cx = W * (sx + rng.range(-0.15, 0.15));
    const cy = H * (sy + rng.range(-0.15, 0.15));
    const d = blobPath(rng, cx, cy, S * rng.range(0.3, 0.55), S * rng.range(0.22, 0.4), rng() * Math.PI);
    washes += `<path d='${d}' fill='${hex(color)}' opacity='${n2(rng.range(deep ? 0.45 : 0.35, deep ? 0.8 : 0.6))}'/>`;
  }
  for (let i = 0; i < glazes; i++) {
    const color = deep ? order[(i + 1) % order.length] : mix(order[(i + 1) % order.length], base, 0.25);
    const r = S * rng.range(0.14, 0.22);
    const d = blobPath(
      rng,
      W * rng.range(0.2, 0.8),
      H * rng.range(0.25, 0.75),
      r * rng.range(1.5, 2.4),
      r,
      rng.range(-0.5, 0.5),
      1.6,
    );
    glaze += `<path d='${d}' fill='${hex(color)}'/>`;
  }
  if (rng() < 0.25) {
    const r = S * rng.range(0.09, 0.13);
    const d = blobPath(rng, W * rng.range(0.15, 0.85), H * rng.range(0.2, 0.8), r * 1.3, r, rng() * Math.PI);
    washes += `<path d='${d}' fill='${hex(rng.pick(accents))}' opacity='${n2(rng.range(0.28, 0.4))}'/>`;
  }
  const blend = deep ? "screen" : "multiply";
  return `${svgOpen(W, H)}<defs>${defs.join("")}</defs><rect width='${W}' height='${H}' fill='${hex(
    base,
  )}'/><g filter='url(#w)' style='mix-blend-mode:${blend}'>${washes}</g><g filter='url(#g)' style='mix-blend-mode:${blend}'>${glaze}</g></svg>`;
}

export function abstract(seed: number | string, options: { width?: number; height?: number } = {}): string {
  const W = dim(options.width, 800);
  const H = dim(options.height, 600);
  return memo(`a|${seedKey(seed)}|${W}|${H}`, () => toDataUri(buildAbstract(seed, W, H), W * H));
}

const SKIN: readonly Lab[] = [
  lch(0.9, 0.04, 66),
  lch(0.83, 0.06, 60),
  lch(0.75, 0.075, 62),
  lch(0.65, 0.085, 56),
  lch(0.53, 0.08, 50),
  lch(0.42, 0.065, 45),
];

const HAIR: readonly (readonly [Lab, number])[] = [
  [lch(0.25, 0.02, 270), 3],
  [lch(0.33, 0.045, 48), 3],
  [lch(0.46, 0.07, 58), 2.2],
  [lch(0.52, 0.12, 42), 1.3],
  [lch(0.82, 0.09, 88), 1.6],
  [lch(0.66, 0.012, 250), 1],
  [lch(0.93, 0.008, 240), 0.8],
];

const GROUNDS: readonly number[] = [236, 182, 296, 345, 92, 160];

const CLOTHES: readonly Lab[] = [
  lch(0.52, 0.1, 245),
  lch(0.33, 0.055, 262),
  lch(0.7, 0.075, 182),
  lch(0.45, 0.065, 165),
  lch(0.6, 0.085, 296),
  lch(0.42, 0.085, 345),
  lch(0.84, 0.11, 90),
  lch(0.95, 0.012, 80),
  lch(0.6, 0.13, 22),
];

const HAIRCUTS = [
  "crop",
  "side",
  "bob",
  "long",
  "wavy",
  "curls",
  "afro",
  "bun",
  "pony",
  "fringe",
  "shaved",
  "bald",
] as const;
type Haircut = (typeof HAIRCUTS)[number];

function weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  let r = rng() * items.reduce((sum, [, w]) => sum + w, 0);
  for (const [item, w] of items) if ((r -= w) < 0) return item;
  return items[items.length - 1][0];
}

const hueOf = (c: Lab) => ((Math.atan2(c[2], c[1]) * 180) / Math.PI + 360) % 360;
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const labGap = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function compactPath(d: string, map: (x: number, y: number) => Pt = (x, y) => [x, y]): string {
  let out = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const [, cmd, args] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    if (cmd === "Z") {
      out += "z";
      cx = sx;
      cy = sy;
      continue;
    }
    const nums = args.trim().split(/\s+/).map(Number);
    const rel: number[] = [];
    let ex = cx;
    let ey = cy;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const [x, y] = map(nums[i], nums[i + 1]);
      ex = Math.round(x * 10);
      ey = Math.round(y * 10);
      rel.push(ex - cx, ey - cy);
    }
    out += (out ? cmd.toLowerCase() : "M") + join10(rel);
    if (cmd === "M") {
      sx = ex;
      sy = ey;
    }
    cx = ex;
    cy = ey;
  }
  return out;
}

function cloud(rng: Rng, cu: number, cv: number, ru: number, rv: number, n: number, bump: number): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < 2 * n; k++) {
    const a = Math.PI / 2 + (k / (2 * n)) * Math.PI * 2;
    const r = k % 2 ? 1 + bump * rng.range(0.7, 1.3) : 1 - bump * 0.25;
    pts.push([cu + Math.cos(a) * ru * r, cv + Math.sin(a) * rv * r]);
  }
  return pts;
}

const mirrored = (pts: Pt[]) => pts.map(([u, v]): Pt => [-u, v]).reverse();

interface Hair {
  back: string;
  front: string;
  shine: string;
  ears: boolean;
}

function cutHair(cut: Haircut, rng: Rng, P: (d: string) => string, S: (pts: Pt[]) => string): Hair {
  const crown = P("M -0.66 -0.82 C -0.42 -1.04 0 -1.1 0.32 -1.04 C 0 -0.99 -0.36 -0.95 -0.66 -0.82 Z");
  const hair = (back: string, front: string, ears: boolean, shine = crown): Hair => ({ back, front, shine, ears });
  switch (cut) {
    case "crop":
      return hair(
        "",
        P(
          "M -1.04 0.02 C -1.1 -0.62 -0.72 -1.12 -0.1 -1.16 C 0.1 -1.25 0.3 -1.21 0.42 -1.14 C 0.84 -1.06 1.12 -0.62 1.04 0.02 L 0.94 0.02 C 0.92 -0.3 0.82 -0.46 0.62 -0.52 C 0.4 -0.56 0.2 -0.66 0.1 -0.76 C -0.04 -0.6 -0.3 -0.6 -0.56 -0.53 C -0.8 -0.46 -0.92 -0.3 -0.94 0.02 Z",
        ),
        true,
      );
    case "side":
      return hair(
        "",
        P(
          "M -1.04 0.02 C -1.12 -0.7 -0.74 -1.28 0.02 -1.3 C 0.78 -1.3 1.16 -0.78 1.04 0.02 L 0.95 0.02 C 0.93 -0.28 0.86 -0.4 0.72 -0.44 C 0.36 -0.5 -0.06 -0.62 -0.38 -0.86 C -0.56 -0.62 -0.82 -0.5 -0.92 -0.32 L -0.95 0.02 Z",
        ),
        true,
        P("M -0.3 -1.12 C 0.05 -1.22 0.5 -1.14 0.78 -0.86 C 0.46 -1 0.04 -1.06 -0.3 -1.12 Z"),
      );
    case "bob":
      return hair(
        P("M -1.2 0.84 L -1.22 -0.3 L 1.22 -0.3 L 1.2 0.84 Z"),
        P(
          `M -1.24 0.84 C -1.4 -0.3 -1.02 -1.22 0 -1.22 C 1.02 -1.22 1.4 -0.3 1.24 0.84 C 1.08 0.9 0.9 0.9 0.8 0.84 ${
            rng() < 0.55
              ? "C 0.86 0.4 0.88 -0.06 0.8 -0.3 C 0.4 -0.22 -0.4 -0.22 -0.8 -0.3 C -0.88 -0.06 -0.86 0.4 -0.8 0.84"
              : "C 0.86 0.4 0.9 -0.1 0.82 -0.4 C 0.7 -0.78 0.2 -0.9 -0.3 -0.84 C -0.66 -0.74 -0.88 -0.3 -0.8 0.84"
          } C -0.9 0.9 -1.08 0.9 -1.24 0.84 Z`,
        ),
        false,
      );
    case "long":
      return hair(
        P(
          "M -1.18 -0.4 C -1.3 -1.1 -0.6 -1.24 0 -1.24 C 0.6 -1.24 1.3 -1.1 1.18 -0.4 L 1.36 2 C 0.8 2.12 -0.8 2.12 -1.36 2 Z",
        ),
        P(
          `M -1.2 2.8 C -1.36 1.4 -1.34 -1.2 0 -1.22 C 1.34 -1.2 1.36 1.4 1.2 2.8 L 0.74 2.8 C 0.8 2.1 0.9 1.1 0.88 0.3 ${
            rng() < 0.4
              ? "C 0.86 -0.3 0.7 -0.5 0.5 -0.46 C 0.1 -0.4 -0.4 -0.3 -0.8 -0.1 C -0.84 -0.4 -0.7 -0.8 -0.88 -0.2"
              : "C 0.86 -0.36 0.54 -0.78 0.03 -0.86 C -0.54 -0.78 -0.86 -0.36 -0.88 0.3"
          } C -0.9 1.1 -0.8 2.1 -0.74 2.8 Z`,
        ),
        false,
      );
    case "wavy": {
      const side: Pt[] = [
        [0.85, -1.22],
        [1.32, -0.72],
        [1.4, 0.1],
        [1.22, 0.7],
        [1.5, 1.3],
        [1.28, 1.9],
        [1.5, 2.5],
        [1.3, 3.05],
        [1.3, 3.05],
        [0.78, 3.05],
        [0.78, 3.05],
        [0.98, 2.45],
        [0.78, 1.85],
        [0.96, 1.2],
        [0.84, 0.5],
        [0.9, -0.3],
        [0.5, -0.8],
      ];
      return hair(
        S([
          [1.2, -1.1],
          [1.5, -0.2],
          [1.4, 0.8],
          [1.55, 1.6],
          [1.3, 2.1],
          ...mirrored([
            [1.3, 2.1],
            [1.55, 1.6],
            [1.4, 0.8],
            [1.5, -0.2],
            [1.2, -1.1],
          ]),
        ]),
        S([[0, -1.3], ...side, [0, -0.88], [0, -0.88], ...mirrored(side)]),
        false,
      );
    }
    case "curls": {
      const ring = cloud(rng, 0, -0.32, 1.32, 1.1, 10, 0.11);
      const line: Pt[] = [
        [1.02, -0.2],
        [0.86, -0.56],
        [0.62, -0.4],
        [0.42, -0.64],
        [0.2, -0.46],
        [-0.04, -0.66],
        [-0.28, -0.46],
        [-0.5, -0.64],
        [-0.72, -0.42],
        [-0.9, -0.58],
        [-1.02, -0.2],
      ];
      return hair(S(ring), S([...ring.filter(([, v]) => v < -0.25), ...line]), true);
    }
    case "afro": {
      const ring = cloud(rng, 0, -0.38, 1.5, 1.28, 13, 0.06);
      const line: Pt[] = [
        [1.04, 0.55],
        [0.98, 0.05],
        [1.02, -0.36],
        [0.8, -0.52],
        [0.74, -0.76],
        [0.46, -0.7],
        [0.3, -0.9],
        [0.04, -0.78],
        [-0.16, -0.92],
        [-0.4, -0.74],
        [-0.58, -0.86],
        [-0.78, -0.6],
        [-1.0, -0.5],
        [-0.98, 0.05],
        [-1.04, 0.55],
      ];
      return hair(
        S(ring),
        S([...ring.filter(([, v]) => v < 0.55), ...line]),
        false,
        P("M -0.92 -1.14 C -0.68 -1.46 -0.2 -1.6 0.22 -1.55 C -0.15 -1.48 -0.58 -1.34 -0.92 -1.14 Z"),
      );
    }
    case "bun": {
      const knot = rng() < 0.5;
      const y = knot ? -1.32 : -1.18;
      const r = knot ? 0.28 : 0.4;
      const k = r * 1.25;
      return hair(
        P(
          `M 0 ${y - k} C ${r * 1.4} ${y - k} ${r * 1.4} ${y + k} 0 ${y + k} C ${-r * 1.4} ${y + k} ${-r * 1.4} ${y - k} 0 ${y - k} Z`,
        ),
        P(
          "M -1.03 -0.02 C -1.08 -0.66 -0.64 -1.1 0 -1.1 C 0.64 -1.1 1.08 -0.66 1.03 -0.02 L 0.95 -0.02 C 0.9 -0.36 0.74 -0.56 0.4 -0.6 C 0.15 -0.63 -0.15 -0.63 -0.4 -0.6 C -0.74 -0.56 -0.9 -0.36 -0.95 -0.02 Z",
        ),
        true,
      );
    }
    case "pony":
      return hair(
        S([
          [0.4, -1.0],
          [1.15, -0.85],
          [1.5, -0.1],
          [1.42, 0.7],
          [1.12, 1.55],
          [1.12, 1.55],
          [1.12, 0.7],
          [0.92, 0],
        ]),
        P(
          "M -1.03 -0.02 C -1.08 -0.66 -0.64 -1.12 0 -1.12 C 0.64 -1.12 1.08 -0.66 1.03 -0.02 L 0.95 -0.02 C 0.9 -0.36 0.74 -0.56 0.4 -0.6 C 0.1 -0.64 -0.3 -0.6 -0.6 -0.48 C -0.82 -0.4 -0.92 -0.3 -0.95 -0.02 Z",
        ),
        true,
      );
    case "fringe":
      return hair(
        P("M -1.14 0.42 L -1.16 -0.2 L 1.16 -0.2 L 1.14 0.42 C 0.6 0.5 -0.6 0.5 -1.14 0.42 Z"),
        P(
          "M -1.12 0.38 C -1.24 -0.5 -0.8 -1.2 0 -1.2 C 0.8 -1.2 1.24 -0.5 1.12 0.38 L 0.94 0.36 C 0.94 0.1 0.92 -0.02 0.84 -0.1 L 0.68 -0.3 L 0.5 -0.12 L 0.3 -0.3 L 0.1 -0.1 L -0.12 -0.3 L -0.32 -0.12 L -0.52 -0.3 L -0.7 -0.12 L -0.84 -0.28 C -0.92 -0.1 -0.94 0.1 -0.94 0.36 Z",
        ),
        false,
      );
    case "shaved":
      return hair(
        "",
        P(
          "M -1.02 -0.04 C -1.06 -0.64 -0.6 -1.06 0 -1.06 C 0.6 -1.06 1.06 -0.64 1.02 -0.04 L 0.96 -0.04 C 0.94 -0.36 0.8 -0.56 0.5 -0.62 C 0.2 -0.68 -0.2 -0.68 -0.5 -0.62 C -0.8 -0.56 -0.94 -0.36 -0.96 -0.04 Z",
        ),
        true,
        "",
      );
    case "bald":
      return hair(
        rng() < 0.6
          ? P("M -1.07 0.32 C -1.13 -0.08 -1.09 -0.4 -0.95 -0.6 L 0.95 -0.6 C 1.09 -0.4 1.13 -0.08 1.07 0.32 Z")
          : "",
        "",
        true,
        P("M -0.6 -0.74 C -0.4 -0.92 0 -0.98 0.26 -0.93 C -0.04 -0.88 -0.34 -0.84 -0.6 -0.74 Z"),
      );
  }
}

function buildAvatar(seed: number | string, S: number): string {
  const look = sub(seed, "look");
  const hairRng = sub(seed, "hair");
  const wear = sub(seed, "wear");
  const extra = sub(seed, "extra");
  const groundRng = sub(seed, "ground");

  const skin = sub(seed, "skin").pick(SKIN);
  const cut = hairRng.pick(HAIRCUTS);
  let hair = weighted(hairRng, HAIR);
  if (hair[0] > 0.6 && Math.abs(hair[0] - skin[0]) < 0.1) hair = HAIR[5][0];
  const lightHair = hair[0] > 0.6;
  const gh = groundRng.pick(GROUNDS) + groundRng.range(-6, 6);
  const gl = lightHair ? groundRng.range(0.74, 0.78) : groundRng.range(0.86, 0.9);
  const gc = (lightHair ? 0.055 : 0.045) * (gh > 80 && gh < 100 ? 1.3 : 1);
  const clothes = CLOTHES.filter((c) => (hueGap(hueOf(c), gh) > 35 || c[0] > 0.9) && labGap(c, hair) > 0.15);
  const cloth = wear.pick(clothes);
  const accent = wear.pick(clothes.filter((c) => c !== cloth));

  const w = extra();
  const hat = w < 0.11 ? "beanie" : w < 0.15 ? "muffs" : w < 0.18 ? "band" : w < 0.25 ? "hood" : "";
  const glasses = extra() < 0.15;
  const collar = hat === "hood" ? "hood" : wear.pick(["crew", "crew", "turtle", "scarf", "zip", "hood"] as const);
  const swap: Partial<Record<Haircut, Haircut>> =
    hat === "hood"
      ? { afro: "curls", bun: "crop", long: "bob", wavy: "bob" }
      : hat
        ? { afro: "crop", bun: "crop" }
        : {};
  const cutUsed = swap[cut] ?? cut;

  const rx = look.range(16.2, 17.4);
  const ry = rx * look.range(1.15, 1.22);
  const bx = 50 + look.range(-1.2, 1.2);
  const hx = bx + look.range(-1, 1);
  const hy = 45.5 + look.range(-0.8, 0.8);
  const tilt = (look.range(-6, 6) * Math.PI) / 180;
  const jaw = look.range(0.48, 0.7);
  const f = hairRng() < 0.5 ? 1 : -1;
  const py = hy + ry * 1.05;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const at = (u: number, v: number): Pt => {
    const x = hx + f * u * rx - bx;
    const y = hy + v * ry - py;
    return [bx + x * cos - y * sin, py + x * sin + y * cos];
  };
  const P = (d: string) => compactPath(d, at);
  const Q = (d: string) => compactPath(d);
  const Sm = (pts: Pt[]) => {
    const m = pts.map(([u, v]) => at(u, v));
    m.push(m[0]);
    return smoothPath(m);
  };
  const circle = (u: number, v: number, r: number, fill: string) => {
    const [x, y] = at(u, v);
    return `<circle cx='${n1(x)}' cy='${n1(y)}' r='${n1(r * rx)}' fill='${fill}'/>`;
  };
  const fill = (d: string, color: string, more = "") => (d ? `<path d='${d}' fill='${color}'${more}/>` : "");
  const line = (d: string, color: string, width: number) =>
    `<path d='${d}' fill='none' stroke='${color}' stroke-width='${width}'/>`;

  const h = cutHair(cutUsed, hairRng, P, Sm);
  const beard =
    ["crop", "side", "shaved", "bald", "curls"].includes(cutUsed) &&
    hair[0] < 0.7 &&
    (!hat || hat === "beanie") &&
    hairRng() < 0.3
      ? P(
          "M -1 -0.02 L -0.98 0.3 C -0.9 0.9 -0.46 1.2 0 1.22 C 0.46 1.2 0.9 0.9 0.98 0.3 L 1 -0.02 L 0.93 -0.02 C 0.9 0.32 0.72 0.56 0.36 0.6 C 0.16 0.62 -0.16 0.62 -0.36 0.6 C -0.72 0.56 -0.9 0.32 -0.93 -0.02 Z",
        )
      : "";

  const C = {
    skin: hex(skin),
    ear: hex(shade(skin, -0.06)),
    chin: hex(shade(skin, -0.11)),
    hair: hex(cutUsed === "shaved" ? mix(hair, skin, 0.45) : hair),
    hairBack: hex(shade(hair, -0.07)),
    shine: hex(
      cutUsed === "bald"
        ? mix(skin, lch(0.98, 0.02, 85), 0.2)
        : mix(hair, lch(0.98, 0.02, 85), hair[0] > 0.6 ? 0.5 : 0.22),
    ),
    cloth: hex(cloth),
    clothDark: hex(shade(cloth, -0.08)),
    clothLight: hex(shade(cloth, 0.06)),
    accent: hex(accent),
    accentDark: hex(shade(accent, -0.08)),
    fluff: hex(mix(accent, lch(0.97, 0.01, 240), 0.5)),
  };

  const W = look.range(38, 45);
  const dl = look.range(-1.5, 3);
  const dr = look.range(-1.5, 3);
  const ys = 77.5 + look.range(0, 2);
  const nw = rx * 0.38;
  const L = bx - W;
  const R = bx + W;
  const nl = bx - nw - 2;
  const nr = bx + nw + 2;
  const dip = collar === "crew" ? 9 : collar === "hood" ? 13 : 0;
  const neckline = `M ${nl} ${ys - 0.5} Q ${bx} ${ys + dip} ${nr} ${ys - 0.5}`;
  const body = Q(
    `M ${L - 8} 101 C ${L - 7} ${ys + 14} ${L - 2} ${ys + 6 + dl} ${L + 9} ${ys + 3 + dl} C ${bx - W * 0.4} ${ys + 1.5} ${
      nl - 4
    } ${ys} ${nl} ${ys - 0.5} Q ${bx} ${ys + dip} ${nr} ${ys - 0.5} C ${nr + 4} ${ys} ${bx + W * 0.4} ${ys + 1.5} ${R - 9} ${
      ys + 3 + dr
    } C ${R + 2} ${ys + 6 + dr} ${R + 7} ${ys + 14} ${R + 8} 101 Z`,
  );
  const chinY = hy + ry;
  const neck = Q(
    `M ${bx - nw} ${hy + ry * 0.3} L ${bx - nw} ${ys - 2} Q ${bx - nw} ${ys + 2} ${bx - nw - 5} ${ys + 4} L ${bx + nw + 5} ${
      ys + 4
    } Q ${bx + nw} ${ys + 2} ${bx + nw} ${ys - 2} L ${bx + nw} ${hy + ry * 0.3} Z`,
  );
  const chin = Q(
    `M ${bx - nw} ${chinY - 6} L ${bx + nw} ${chinY - 6} L ${bx + nw} ${chinY + 2.5} Q ${bx} ${chinY + 5.5} ${bx - nw} ${chinY + 2.5} Z`,
  );

  let under = "";
  let over = "";
  if (collar === "crew") {
    over = line(Q(neckline), C.clothDark, 2.4);
  } else if (collar === "turtle") {
    over =
      fill(Q(`M ${nl} ${ys + 1} L ${nl + 0.8} ${chinY - 3} L ${nr - 0.8} ${chinY - 3} L ${nr} ${ys + 1} Z`), C.cloth) +
      line(
        Q(
          `M ${nl + 0.5} ${ys - 4} Q ${bx} ${ys - 1.5} ${nr - 0.5} ${ys - 4} M ${nl + 0.8} ${chinY + 1.5} Q ${bx} ${chinY + 4} ${
            nr - 0.8
          } ${chinY + 1.5}`,
        ),
        C.clothDark,
        1.2,
      );
  } else if (collar === "scarf") {
    const s = f;
    over =
      fill(
        Q(`M ${bx + s * 4} ${ys + 1} L ${bx + s * 13} ${ys + 1} L ${bx + s * 17} 101 L ${bx + s * 7} 101 Z`),
        C.accentDark,
      ) +
      fill(
        Q(
          `M ${nl - 6} ${ys + 3} C ${nl - 7} ${ys - 5} ${nl} ${ys - 8.5} ${bx} ${ys - 8.5} C ${nr} ${ys - 8.5} ${nr + 7} ${ys - 5} ${
            nr + 6
          } ${ys + 3} C ${nr + 2} ${ys + 7} ${nl - 2} ${ys + 7} ${nl - 6} ${ys + 3} Z`,
        ),
        C.accent,
      ) +
      line(Q(`M ${nl - 5} ${ys} Q ${bx} ${ys + 4} ${nr + 5} ${ys - 1}`), C.accentDark, 1.2);
  } else if (collar === "zip") {
    under = fill(
      Q(
        `M ${nl - 1.5} ${ys + 1} L ${nl - 0.5} ${ys - 9} Q ${bx} ${ys - 11} ${nr + 0.5} ${ys - 9} L ${nr + 1.5} ${ys + 1} Z`,
      ),
      C.clothDark,
    );
    for (const s of [-1, 1])
      over += fill(
        Q(
          `M ${bx + s * (nw + 6)} ${ys + 2} L ${bx + s * (nw + 3)} ${ys - 8.5} Q ${bx + s * (nw - 1)} ${ys - 6.5} ${bx + s} ${
            ys - 4.5
          } L ${bx} ${ys + 6} Z`,
        ),
        C.clothLight,
      );
    over += line(
      Q(`M ${bx} ${ys - 3} L ${bx} 101 M ${L} ${ys + 14} Q ${bx} ${ys + 18} ${R} ${ys + 14}`),
      C.clothDark,
      0.9,
    );
  } else {
    if (hat !== "hood")
      under = fill(
        Q(
          `M ${bx - 17} ${ys + 4} C ${bx - 19} ${ys - 8} ${bx - 10} ${ys - 11} ${bx} ${ys - 11} C ${bx + 10} ${ys - 11} ${
            bx + 19
          } ${ys - 8} ${bx + 17} ${ys + 4} Z`,
        ),
        C.clothDark,
      );
    over =
      line(Q(neckline), C.clothLight, 3) +
      `<path d='${Q(`M ${bx - 3.5} ${ys + 6} L ${bx - 4.1} ${ys + 15} M ${bx + 3.5} ${ys + 6} L ${bx + 4.1} ${ys + 15}`)}' stroke='${
        C.clothLight
      }' stroke-linecap='round'/>`;
  }

  const head = P(
    `M 0 -1 C 0.55 -1 1 -0.6 1 -0.05 C 1 0.45 ${jaw} 1 0 1 C ${-jaw} 1 -1 0.45 -1 -0.05 C -1 -0.6 -0.55 -1 0 -1 Z`,
  );
  const ears =
    h.ears && hat !== "hood" && hat !== "muffs" && hat !== "band"
      ? fill(P("M -0.9 -0.14 C -1.2 -0.2 -1.24 0.32 -0.92 0.3 Z M 0.9 -0.14 C 1.2 -0.2 1.24 0.32 0.92 0.3 Z"), C.ear)
      : "";

  let behind = "";
  let top = "";
  if (hat === "beanie") {
    top =
      fill(P("M -1.13 -0.32 C -1.2 -1.2 -0.62 -1.56 0 -1.56 C 0.62 -1.56 1.2 -1.2 1.13 -0.32 Z"), C.accent) +
      fill(
        P(
          "M -1.2 -0.12 C -1.24 -0.4 -1.2 -0.64 -1.12 -0.66 C -0.4 -0.82 0.4 -0.82 1.12 -0.66 C 1.2 -0.64 1.24 -0.4 1.2 -0.12 C 0.4 -0.3 -0.4 -0.3 -1.2 -0.12 Z",
        ),
        C.accentDark,
      );
    if (extra() < 0.6) top += circle(0, -1.55, 0.26, C.fluff);
  } else if (hat === "muffs") {
    top =
      line(P("M -1.02 0 C -1.1 -1.5 1.1 -1.5 1.02 0"), C.accentDark, 1.8) +
      circle(-1.04, 0.06, 0.34, C.fluff) +
      circle(1.04, 0.06, 0.34, C.fluff);
  } else if (hat === "band") {
    top = fill(
      P(
        "M -1.12 0.24 C -1.2 -0.3 -1.1 -0.72 -0.78 -0.82 C -0.3 -0.95 0.3 -0.95 0.78 -0.82 C 1.1 -0.72 1.2 -0.3 1.12 0.24 C 1.08 0.38 0.92 0.38 0.88 0.24 C 0.86 -0.1 0.82 -0.38 0.64 -0.52 C 0.3 -0.64 -0.3 -0.64 -0.64 -0.52 C -0.82 -0.38 -0.86 -0.1 -0.88 0.24 C -0.92 0.38 -1.08 0.38 -1.12 0.24 Z",
      ),
      C.accent,
    );
  } else if (hat === "hood") {
    behind = fill(P("M -1.5 2.1 C -1.78 0.5 -1.55 -1.5 0 -1.56 C 1.55 -1.5 1.78 0.5 1.5 2.1 Z"), C.clothDark);
    top = fill(
      P(
        "M 0 -1.42 C 0.9 -1.42 1.42 -0.8 1.4 0.2 C 1.38 1 0.9 1.62 0 1.62 C -0.9 1.62 -1.38 1 -1.4 0.2 C -1.42 -0.8 -0.9 -1.42 0 -1.42 Z M 0 -1.16 C 0.74 -1.16 1.12 -0.7 1.12 0.1 C 1.12 0.8 0.72 1.32 0 1.32 C -0.72 1.32 -1.12 0.8 -1.12 0.1 C -1.12 -0.7 -0.74 -1.16 0 -1.16 Z",
      ),
      C.cloth,
      " fill-rule='evenodd'",
    );
  }
  if (glasses) {
    const [ax, ay] = at(-0.4, 0.1);
    const [cx, cy] = at(0.4, 0.1);
    const r = n1(rx * 0.27);
    top += `<g fill='none' stroke='${skin[0] < 0.55 ? "#d9dde3" : "#24303f"}'><circle cx='${n1(ax)}' cy='${n1(
      ay,
    )}' r='${r}'/><circle cx='${n1(cx)}' cy='${n1(cy)}' r='${r}'/><path d='${P(
      "M -0.13 0.08 Q 0 -0.02 0.13 0.08 M -0.67 0.04 L -0.98 -0.02 M 0.67 0.04 L 0.98 -0.02",
    )}'/></g>`;
  }

  const ga = look.range(0, Math.PI * 2);
  const gx = Math.cos(ga) / 2;
  const gy = Math.sin(ga) / 2;
  const sheet = " filter='url(#s)'";

  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='${S}' height='${S}'><defs>` +
    `<linearGradient id='g' x1='${n2(0.5 - gx)}' y1='${n2(0.5 - gy)}' x2='${n2(0.5 + gx)}' y2='${n2(0.5 + gy)}'>` +
    `<stop stop-color='${hex(lch(gl, gc, gh))}'/><stop offset='1' stop-color='${hex(lch(gl - 0.06, gc * 1.15, gh + 14))}'/>` +
    `</linearGradient><filter id='s'><feDropShadow dx='0' dy='.7' stdDeviation='.8' flood-color='#0e234038'/></filter></defs>` +
    `<rect width='100' height='100' fill='url(#g)'/>${behind || fill(h.back, C.hairBack, sheet)}${under}` +
    `${fill(neck, C.skin)}${fill(chin, C.chin)}<g${sheet}>${fill(body, C.cloth)}${over}</g>` +
    `<g${sheet}>${ears}${fill(head, C.skin)}</g>${fill(beard, C.hair)}${fill(h.front, C.hair, sheet)}${fill(h.shine, C.shine)}` +
    `${top ? `<g${sheet}>${top}</g>` : ""}</svg>`
  );
}

export function avatar(seed: number | string, size = 96): string {
  const S = dim(size, 96);
  return memo(`v|${seedKey(seed)}|${S}`, () => toDataUri(buildAvatar(seed, S), S * S));
}

function buildTopo(seed: number | string, W: number, H: number, color: string): string {
  const rng = sub(seed, "topo");
  const n = noise2(rng);
  const warp = noise2(rng);
  const cols = 60;
  const rows = Math.max(8, Math.round((cols * H) / W));
  const cw = W / cols;
  const ch = H / rows;
  const freq = rng.range(2.2, 3.2) / cols;
  const ox = rng() * 100;
  const oy = rng() * 100;
  const field: number[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = i * freq * (W / cols / cw) + ox;
      const y = j * freq * (ch / cw) + oy;
      const wx = x + 0.45 * warp(x * 0.6, y * 0.6);
      const wy = y + 0.45 * warp(x * 0.6 + 31, y * 0.6 + 17);
      const v = n(wx, wy) + 0.5 * n(wx * 2.1 + 5, wy * 2.1) + 0.25 * n(wx * 4.3, wy * 4.3 + 9);
      field.push(v);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const at = (i: number, j: number) => field[j * (cols + 1) + i];
  const levels = rng.int(10, 13);
  let thin = "";
  let bold = "";
  for (let l = 1; l <= levels; l++) {
    const t = lo + ((hi - lo) * l) / (levels + 1);
    const points = new Map<number, Pt>();
    const adj = new Map<number, number[]>();
    const edgePoint = (id: number, x: number, y: number) => {
      if (!points.has(id)) points.set(id, [x, y]);
      return id;
    };
    const hEdge = (i: number, j: number) => {
      const a = at(i, j);
      const b = at(i + 1, j);
      return edgePoint((j * (cols + 1) + i) * 2, (i + (t - a) / (b - a)) * cw, j * ch);
    };
    const vEdge = (i: number, j: number) => {
      const a = at(i, j);
      const b = at(i, j + 1);
      return edgePoint((j * (cols + 1) + i) * 2 + 1, i * cw, (j + (t - a) / (b - a)) * ch);
    };
    const link = (a: number, b: number) => {
      const la = adj.get(a);
      if (la) la.push(b);
      else adj.set(a, [b]);
      const lb = adj.get(b);
      if (lb) lb.push(a);
      else adj.set(b, [a]);
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v0 = at(i, j);
        const v1 = at(i + 1, j);
        const v2 = at(i + 1, j + 1);
        const v3 = at(i, j + 1);
        const c = (v0 > t ? 1 : 0) | (v1 > t ? 2 : 0) | (v2 > t ? 4 : 0) | (v3 > t ? 8 : 0);
        if (c === 0 || c === 15) continue;
        const top = () => hEdge(i, j);
        const bottom = () => hEdge(i, j + 1);
        const left = () => vEdge(i, j);
        const right = () => vEdge(i + 1, j);
        const centre = (v0 + v1 + v2 + v3) / 4 > t;
        switch (c) {
          case 1:
          case 14:
            link(left(), top());
            break;
          case 2:
          case 13:
            link(top(), right());
            break;
          case 3:
          case 12:
            link(left(), right());
            break;
          case 4:
          case 11:
            link(right(), bottom());
            break;
          case 6:
          case 9:
            link(top(), bottom());
            break;
          case 7:
          case 8:
            link(left(), bottom());
            break;
          case 5:
            if (centre) {
              link(top(), right());
              link(bottom(), left());
            } else {
              link(left(), top());
              link(right(), bottom());
            }
            break;
          case 10:
            if (centre) {
              link(left(), top());
              link(right(), bottom());
            } else {
              link(top(), right());
              link(bottom(), left());
            }
            break;
        }
      }
    }
    const seen = new Set<number>();
    const chains: Pt[][] = [];
    const walk = (start: number) => {
      const chain: Pt[] = [];
      let prev = -1;
      let cur = start;
      for (;;) {
        seen.add(cur);
        chain.push(points.get(cur) as Pt);
        const next = (adj.get(cur) ?? []).find((v) => v !== prev && !seen.has(v));
        if (next === undefined) {
          const first = (adj.get(cur) ?? []).includes(start) && chain.length > 2;
          if (first) chain.push(points.get(start) as Pt);
          break;
        }
        prev = cur;
        cur = next;
      }
      if (chain.length > 2) chains.push(chain);
    };
    for (const [id, list] of adj) if (list.length === 1 && !seen.has(id)) walk(id);
    for (const id of adj.keys()) if (!seen.has(id)) walk(id);
    const d = chains.map((c) => smoothPath(simplify(c, Math.min(cw, ch) * 0.07))).join("");
    if (l % 5 === 0) bold += d;
    else thin += d;
  }
  return `${svgOpen(W, H)}<g fill='none' stroke='${color}' stroke-linejoin='round' stroke-linecap='round'><path d='${thin}' stroke-width='1' opacity='.55'/>${
    bold ? `<path d='${bold}' stroke-width='1.5' opacity='.8'/>` : ""
  }</g></svg>`;
}

export function topo(seed: number | string, options: { width?: number; height?: number; color?: string } = {}): string {
  const W = dim(options.width, 800);
  const H = dim(options.height, 600);
  const color = (options.color ?? "#7d97b0").replace(/['"<>]/g, "");
  return memo(`t|${seedKey(seed)}|${W}|${H}|${color}`, () => toDataUri(buildTopo(seed, W, H, color), W * H));
}
