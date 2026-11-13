"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface InkWashProps extends ComponentProps<"div"> {
  colors?: string[];
  spread?: number;
  fade?: number;
  auto?: boolean;
}

const NIGHT = "--miyuki-ink-wash-night";
const INK = "var(--miyuki-ink-wash-ink)";
const MAX_CELLS = 140000;
const WASH = 4;
const VCELL = 12;
const MAX_BLOOMS = 8;
const MAXP = 60000;
const OWN_PRESS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";

interface Vortex {
  angle: number;
  sign: number;
  power: number;
  ring: number;
}

interface Bloom {
  x: number;
  y: number;
  age: number;
  reach: number;
  tau: number;
  core: number;
  channel: number;
  front: number;
  vortices: Vortex[];
  spin: number;
  left: number;
  weight: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function makeNoise2(seed: string) {
  const rng = createRng(seed);
  const perm = new Uint8Array(512);
  const p = rng.shuffle(Array.from({ length: 256 }, (_, i) => i));
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const a = perm[X + perm[Y]];
    const b = perm[X + 1 + perm[Y]];
    const c = perm[X + perm[Y + 1]];
    const d = perm[X + 1 + perm[Y + 1]];
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const n0 = gx[a] * xf + gy[a] * yf;
    const n1 = gx[b] * (xf - 1) + gy[b] * yf;
    const n2 = gx[c] * xf + gy[c] * (yf - 1);
    const n3 = gx[d] * (xf - 1) + gy[d] * (yf - 1);
    const top = n0 + (n1 - n0) * u;
    return top + (n2 + (n3 - n2) * u - top) * v;
  };
}

export function InkWash({ colors, spread = 1, fade = 20, auto = true, className, children, ...props }: InkWashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const palette = colors && colors.length > 0 ? colors.slice(0, 3) : [INK];
  const paletteKey = palette.join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d");
    if (!sctx) return;

    const still = !!reduce;
    const tints = paletteKey.split("|");
    const channels = tints.length;
    const reachScale = clamp(spread, 0.2, 3);
    const life = Math.max(2, fade);
    const decay = 1.1 / life;
    const rng = createRng(`ink-wash:${channels}`);
    const noise = makeNoise2("ink-wash:swirl");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let CELL = 2;
    let cols = 0;
    let rows = 0;
    let vcols = 0;
    let vrows = 0;
    let dye: Float32Array[] = [];
    let wash: Float32Array[] = [];
    let inked = new Uint8Array(0);
    let wcols = 0;
    let wrows = 0;
    let blur = new Float32Array(0);
    const pxs = new Float32Array(MAXP);
    const pys = new Float32Array(MAXP);
    const pw = new Float32Array(MAXP);
    const pch = new Uint8Array(MAXP);
    const pb = new Float32Array(MAXP);
    let head = 0;
    let used = 0;
    let particles = 0;
    let vu = new Float32Array(0);
    let vv = new Float32Array(0);
    let psi = new Float32Array(0);
    let image: ImageData | null = null;
    let night = false;
    let inks: [number, number, number][] = [];
    let strength = 1;

    const blooms: Bloom[] = [];
    let totalBlooms = 0;
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let started = false;
    let visible = 0;
    const queue: { at: number; x: number; y: number; size: number }[] = [];
    const drag = { on: false, x: 0, y: 0 };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      inks = tints.map((t) => {
        const [r, g, b] = toRgba(t, canvas);
        return [r * 255, g * 255, b * 255];
      });
      strength = night ? 0.92 : 0.94;
    };

    const layout = () => {
      CELL = Math.max(2, Math.sqrt((w * h) / MAX_CELLS));
      cols = Math.max(8, Math.ceil(w / CELL));
      rows = Math.max(8, Math.ceil(h / CELL));
      vcols = Math.ceil(w / VCELL) + 3;
      vrows = Math.ceil(h / VCELL) + 3;
      dye = Array.from({ length: channels }, () => new Float32Array(cols * rows));
      wcols = Math.ceil(cols / WASH) + 1;
      wrows = Math.ceil(rows / WASH) + 1;
      wash = Array.from({ length: channels }, () => new Float32Array(wcols * wrows));
      inked = new Uint8Array(wcols * wrows);
      blur = new Float32Array(cols * rows);
      head = 0;
      used = 0;
      vu = new Float32Array(vcols * vrows);
      vv = new Float32Array(vcols * vrows);
      psi = new Float32Array(vcols * vrows);
      small.width = cols;
      small.height = rows;
      image = sctx.createImageData(cols, rows);
    };

    const emit = (x: number, y: number, weight: number, channel: number) => {
      pxs[head] = x;
      pys[head] = y;
      pw[head] = weight;
      pch[head] = channel;
      pb[head] = time;
      head = (head + 1) % MAXP;
      if (used < MAXP) used++;
    };

    const addBloom = (x: number, y: number, size: number) => {
      if (blooms.length >= MAX_BLOOMS) blooms.shift();
      const fit = clamp(Math.min(w, h * 1.4) / 560, 0.5, 1.15);
      const reach = (95 + 70 * rng()) * reachScale * size * fit;
      const tau = 0.9 + 0.5 * rng();
      const pairs = 4 + Math.floor(rng() * 4);
      const vortices: Vortex[] = [];
      let angle = rng() * Math.PI * 2;
      const gap = (Math.PI * 2) / (pairs * 2);
      for (let k = 0; k < pairs * 2; k++) {
        vortices.push({
          angle,
          sign: k % 2 === 0 ? 1 : rng() < 0.18 ? 1 : -1,
          power: rng.range(0.35, 1.5),
          ring: rng.range(0.72, 1.06),
        });
        angle += gap * rng.range(0.55, 1.45);
      }
      const core = (11 + 5 * rng()) * Math.sqrt(reachScale * size * fit);
      const count = Math.round(8000 * Math.min(1.5, size * Math.sqrt(reachScale * fit)));
      const mass = (0.26 * Math.PI * reach * reach) / (CELL * CELL);
      const bloom: Bloom = {
        x,
        y,
        age: 0,
        reach,
        tau,
        core,
        channel: totalBlooms++ % channels,
        front: core,
        vortices,
        spin: rng.range(-1, 1),
        left: Math.round(count * 0.5),
        weight: mass / count,
      };
      blooms.push(bloom);
      const r0 = core * 1.5;
      const wob = rng() * 100;
      const burst = count - bloom.left;
      for (let n = 0; n < burst; n++) {
        const a = Math.random() * Math.PI * 2;
        const edge = r0 * (1 + 0.3 * noise(Math.cos(a) * 1.3 + wob, Math.sin(a) * 1.3 + wob));
        const r = edge * Math.random() ** 0.65;
        emit(x + Math.cos(a) * r, y + Math.sin(a) * r, bloom.weight, bloom.channel);
      }
    };

    const front = (b: Bloom) => {
      const q = (b.reach * b.reach - b.core * b.core) * (1 - Math.exp(-b.age / b.tau));
      return Math.sqrt(b.core * b.core + q);
    };

    const buildVelocity = () => {
      const L = 190;
      const t = time;
      for (let j = 0; j < vrows; j++) {
        const y = (j - 1) * VCELL;
        for (let i = 0; i < vcols; i++) {
          const x = (i - 1) * VCELL;
          psi[j * vcols + i] =
            1800 * noise(x / L + t * 0.022, y / L - t * 0.016) +
            700 * noise(x / (L * 0.42) - t * 0.035 + 9.1, y / (L * 0.42) + 3.7);
        }
      }
      for (let j = 0; j < vrows; j++) {
        for (let i = 0; i < vcols; i++) {
          const k = j * vcols + i;
          const up = psi[Math.max(0, j - 1) * vcols + i];
          const dn = psi[Math.min(vrows - 1, j + 1) * vcols + i];
          const lf = psi[j * vcols + Math.max(0, i - 1)];
          const rt = psi[j * vcols + Math.min(vcols - 1, i + 1)];
          vu[k] = (dn - up) / (2 * VCELL);
          vv[k] = -(rt - lf) / (2 * VCELL);
        }
      }
      for (const b of blooms) {
        const q = ((b.reach * b.reach - b.core * b.core) / b.tau) * Math.exp(-b.age / b.tau) * 0.5;
        const rf = b.front;
        const speedFront = q / Math.max(rf, 1);
        const ramp = clamp(b.age / 0.35, 0, 1);
        const swirl = (0.6 * speedFront + 30 * reachScale * Math.exp(-b.age / 6)) * ramp;
        const n = b.vortices.length;
        const ringR = rf * 0.92 + 4 * b.age * reachScale;
        const delta = Math.max(6, (Math.PI * 2 * ringR) / n) * 0.42;
        const d2 = delta * delta;
        const reach = rf * 1.9 + 40;
        const i0 = Math.max(0, Math.floor((b.x - reach) / VCELL) + 1);
        const i1 = Math.min(vcols - 1, Math.ceil((b.x + reach) / VCELL) + 1);
        const j0 = Math.max(0, Math.floor((b.y - reach) / VCELL) + 1);
        const j1 = Math.min(vrows - 1, Math.ceil((b.y + reach) / VCELL) + 1);
        const vx = new Float32Array(n);
        const vy = new Float32Array(n);
        const turn = b.spin * 0.12 * b.age;
        for (let k = 0; k < n; k++) {
          const a = b.vortices[k].angle + turn;
          vx[k] = b.x + Math.cos(a) * ringR * b.vortices[k].ring;
          vy[k] = b.y + Math.sin(a) * ringR * b.vortices[k].ring;
        }
        const c2 = b.core * b.core;
        for (let j = j0; j <= j1; j++) {
          const y = (j - 1) * VCELL;
          for (let i = i0; i <= i1; i++) {
            const x = (i - 1) * VCELL;
            const dx = x - b.x;
            const dy = y - b.y;
            const r2 = dx * dx + dy * dy;
            const radial = q / Math.max(r2, c2);
            let u = dx * radial;
            let v = dy * radial;
            for (let k = 0; k < n; k++) {
              const ex = x - vx[k];
              const ey = y - vy[k];
              const f = (b.vortices[k].sign * b.vortices[k].power * swirl * 2 * delta) / (ex * ex + ey * ey + d2);
              u -= ey * f;
              v += ex * f;
            }
            const k = j * vcols + i;
            vu[k] += u;
            vv[k] += v;
          }
        }
      }
    };

    const velAt = (x: number, y: number, out: Float32Array) => {
      const fx = clamp(x / VCELL + 1, 0, vcols - 1.001);
      const fy = clamp(y / VCELL + 1, 0, vrows - 1.001);
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const tx = fx - i;
      const ty = fy - j;
      const k = j * vcols + i;
      const a = vu[k] + (vu[k + 1] - vu[k]) * tx;
      const b = vu[k + vcols] + (vu[k + vcols + 1] - vu[k + vcols]) * tx;
      const c = vv[k] + (vv[k + 1] - vv[k]) * tx;
      const d = vv[k + vcols] + (vv[k + vcols + 1] - vv[k + vcols]) * tx;
      out[0] = a + (b - a) * ty;
      out[1] = c + (d - c) * ty;
    };

    const vel = new Float32Array(2);
    const advect = (dt: number) => {
      const jitter = Math.sqrt(2 * 4 * dt);
      const xmax = w + 30;
      const ymax = h + 30;
      for (let i = 0; i < used; i++) {
        if (pw[i] <= 0) continue;
        const x = pxs[i];
        const y = pys[i];
        velAt(x, y, vel);
        const mx = x + vel[0] * dt * 0.5;
        const my = y + vel[1] * dt * 0.5;
        velAt(mx, my, vel);
        const nx = x + vel[0] * dt + (Math.random() - 0.5) * jitter;
        const ny = y + vel[1] * dt + (Math.random() - 0.5) * jitter;
        pxs[i] = nx;
        pys[i] = ny;
        if (nx < -30 || ny < -30 || nx > xmax || ny > ymax) pw[i] = 0;
      }
    };

    const feedCores = (dt: number) => {
      for (const b of blooms) {
        if (b.left <= 0) continue;
        const pump = Math.exp(-b.age / b.tau);
        const n = Math.min(b.left, Math.round(b.left * (1 - Math.exp(-dt * 2.6)) + 1));
        b.left -= n;
        const r0 = b.core * (0.7 + 0.3 * pump);
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = r0 * Math.random() ** 0.8;
          emit(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, b.weight, b.channel);
        }
      }
    };

    const splat = () => {
      for (const d of dye) d.fill(0);
      const lastCol = cols - 1;
      const lastRow = rows - 1;
      const taper = life * 0.65;
      let alive = 0;
      for (let i = 0; i < used; i++) {
        if (pw[i] <= 0) continue;
        const age = time - pb[i];
        if (age >= life) {
          pw[i] = 0;
          continue;
        }
        alive++;
        const t = age > taper ? (age - taper) / (life - taper) : 0;
        const m = pw[i] * Math.exp(-age * decay) * (1 - t * t * (3 - 2 * t));
        const fx = pxs[i] / CELL - 0.5;
        const fy = pys[i] / CELL - 0.5;
        if (fx < 0 || fy < 0 || fx >= lastCol || fy >= lastRow) continue;
        const ci = fx | 0;
        const cj = fy | 0;
        const tx = fx - ci;
        const ty = fy - cj;
        const d = dye[pch[i]];
        const k = cj * cols + ci;
        d[k] += m * (1 - tx) * (1 - ty);
        d[k + 1] += m * tx * (1 - ty);
        d[k + cols] += m * (1 - tx) * ty;
        d[k + cols + 1] += m * tx * ty;
      }
      particles = alive;
      for (let c = 0; c < channels; c++) {
        const d = dye[c];
        smooth(d, cols, rows);
        smooth(d, cols, rows);
        const wd = wash[c];
        wd.fill(0);
        for (let j = 0; j < rows; j++) {
          const o = j * cols;
          const wo = ((j / WASH) | 0) * wcols;
          for (let i = 0; i < cols; i++) wd[wo + ((i / WASH) | 0)] += d[o + i];
        }
        const norm = 1 / (WASH * WASH);
        for (let k = 0; k < wd.length; k++) wd[k] *= norm;
        smooth(wd, wcols, wrows);
        smooth(wd, wcols, wrows);
      }
      const last = wcols * wrows - wcols - 1;
      for (let k = 0; k < last; k++) {
        let any = 0;
        for (let c = 0; c < channels; c++) {
          const wd = wash[c];
          any += wd[k] + wd[k + 1] + wd[k + wcols] + wd[k + wcols + 1];
        }
        inked[k] = any > 0.0005 ? 1 : 0;
      }
    };

    const smooth = (d: Float32Array, cols: number, rows: number) => {
      for (let j = 0; j < rows; j++) {
        const o = j * cols;
        blur[o] = d[o];
        blur[o + cols - 1] = d[o + cols - 1];
        for (let i = 1; i < cols - 1; i++) blur[o + i] = (d[o + i - 1] + 2 * d[o + i] + d[o + i + 1]) * 0.25;
      }
      for (let i = 0; i < cols; i++) {
        d[i] = blur[i];
        d[(rows - 1) * cols + i] = blur[(rows - 1) * cols + i];
      }
      for (let j = 1; j < rows - 1; j++) {
        const o = j * cols;
        for (let i = 0; i < cols; i++) d[o + i] = (blur[o + i - cols] + 2 * blur[o + i] + blur[o + i + cols]) * 0.25;
      }
    };

    const softs = new Float32Array(channels);

    const render = () => {
      if (!image) return;
      const data = image.data;
      const deep = night ? 1.3 : 1.5;
      let seen = 0;
      for (let j = 0; j < rows; j++) {
        const wy = (j + 0.5) / WASH - 0.5;
        const wj = Math.max(0, Math.min(wrows - 2, wy | 0));
        const ty = clamp(wy - wj, 0, 1);
        for (let i = 0; i < cols; i++) {
          const o = j * cols + i;
          let total = 0;
          let r = 0;
          let g = 0;
          let b = 0;
          const wx = (i + 0.5) / WASH - 0.5;
          const wi = Math.max(0, Math.min(wcols - 2, wx | 0));
          const tx = clamp(wx - wi, 0, 1);
          const w00 = wj * wcols + wi;
          if (!inked[w00]) {
            data[o * 4 + 3] = 0;
            continue;
          }
          let pooled = 0;
          for (let c = 0; c < channels; c++) {
            const wd = wash[c];
            const soft =
              (wd[w00] * (1 - tx) + wd[w00 + 1] * tx) * (1 - ty) +
              (wd[w00 + wcols] * (1 - tx) + wd[w00 + wcols + 1] * tx) * ty;
            softs[c] = soft;
            pooled += soft;
          }
          const dense = clamp((pooled - 0.03) / 0.22, 0, 1);
          for (let c = 0; c < channels; c++) {
            const v = softs[c] * (1.05 - 0.45 * dense) + dye[c][o] * 0.55 * dense;
            if (v <= 0) continue;
            total += v;
            r += inks[c][0] * v;
            g += inks[c][1] * v;
            b += inks[c][2] * v;
          }
          const p = o * 4;
          if (total < 0.004) {
            data[p + 3] = 0;
            continue;
          }
          let grad = 0;
          if (i > 0 && j > 0 && i < cols - 1 && j < rows - 1) {
            let l = 0;
            let rr = 0;
            let u = 0;
            let dn = 0;
            for (let c = 0; c < channels; c++) {
              const d = dye[c];
              l += d[o - 1];
              rr += d[o + 1];
              u += d[o - cols];
              dn += d[o + cols];
            }
            grad = Math.sqrt((rr - l) * (rr - l) + (dn - u) * (dn - u)) * 0.5;
          }
          const base = 1 - Math.exp(-deep * total);
          const a = base * Math.min(1, base * 9) + grad * 0.18 * dense;
          const alpha = clamp(a * strength, 0, 0.96);
          if (alpha > seen) seen = alpha;
          data[p] = r / total;
          data[p + 1] = g / total;
          data[p + 2] = b / total;
          data[p + 3] = alpha * 255;
        }
      }
      visible = seen;
      sctx.putImageData(image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, cols, rows, 0, 0, cols * CELL * dpr, rows * CELL * dpr);
    };

    const step = (dt: number) => {
      time += dt;
      for (let q = queue.length - 1; q >= 0; q--) {
        if (queue[q].at <= time) {
          addBloom(queue[q].x, queue[q].y, queue[q].size);
          queue.splice(q, 1);
        }
      }
      for (const b of blooms) {
        b.age += dt;
        b.front = front(b);
      }
      for (let k = blooms.length - 1; k >= 0; k--) if (blooms[k].age > 16) blooms.splice(k, 1);
      buildVelocity();
      feedCores(dt);
      advect(dt);
      splat();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      render();
      if (blooms.length === 0 && queue.length === 0 && (visible < 0.004 || particles === 0)) {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const d of dye) d.fill(0);
        pw.fill(0);
        used = 0;
        head = 0;
      }
    };

    const wake = () => {
      if (still || raf || !onScreen || document.hidden || w === 0) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (onScreen && !document.hidden) {
        if (!started && auto && w > 0) {
          started = true;
          release(w * 0.34, h * 0.44, 1.05, 0.15);
          release(w * 0.62, h * 0.58, 0.85, 1.1);
        }
        wake();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const settle = (seconds: number) => {
      const n = Math.round(seconds * 24);
      for (let s = 0; s < n; s++) step(1 / 24);
      render();
    };

    const release = (x: number, y: number, size: number, delay = 0) => {
      queue.push({ at: time + delay, x, y, size });
      if (still) settle(3 + delay);
      else wake();
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
      if (w === 0 || h === 0) return;
      if (inks.length === 0) readColors();
      layout();
      blooms.length = 0;
      if (still && auto) {
        started = true;
        queue.push({ at: 0, x: w * 0.34, y: h * 0.44, size: 1.05 }, { at: 0.9, x: w * 0.62, y: h * 0.58, size: 0.85 });
        settle(4.5);
      }
      sync();
    };

    const local = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return [event.clientX - box.left, event.clientY - box.top] as const;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if ((event.target as Element | null)?.closest(OWN_PRESS)) return;
      const [x, y] = local(event);
      drag.on = true;
      drag.x = x;
      drag.y = y;
      release(x, y, 1);
    };
    const onMove = (event: PointerEvent) => {
      if (!drag.on || still) return;
      const [x, y] = local(event);
      if (Math.hypot(x - drag.x, y - drag.y) < 70 * reachScale) return;
      drag.x = x;
      drag.y = y;
      release(x, y, 0.45);
    };
    const onUp = () => {
      drag.on = false;
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
      render();
    });
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [paletteKey, spread, fade, auto, reduce]);

  return (
    <div
      className={cn(
        "relative isolate touch-pan-y overflow-hidden select-none",
        "[--miyuki-ink-wash-night:0] [--miyuki-ink-wash-ink:color-mix(in_oklab,var(--foreground)_70%,var(--brand-strong))]",
        "dark:[--miyuki-ink-wash-night:1] dark:[--miyuki-ink-wash-ink:color-mix(in_oklab,var(--brand)_66%,white)]",
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
