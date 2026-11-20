"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface MoonJelliesProps extends ComponentProps<"div"> {
  count?: number;
  colors?: string[];
  speed?: number;
  interactive?: boolean;
  seed?: number | string;
}

type Vec3 = [number, number, number];

interface Chain {
  n: number;
  seg: number;
  x: Float32Array;
  y: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  ck: Float32Array;
  sk: Float32Array;
  az: number;
  stiff: number;
  drag: number;
  phase: number;
}

interface Tones {
  body: Vec3;
  rim: Vec3;
  ring: Vec3;
  line: Vec3;
  arm: Vec3;
  edge: Vec3;
  glow: HTMLCanvasElement | null;
}

interface Jelly {
  z: number;
  R: number;
  tempo: number;
  fade: number;
  x: number;
  y: number;
  px: number;
  py: number;
  v: number;
  psi: number;
  ppsi: number;
  omega: number;
  c: number;
  cv: number;
  pc: number;
  rim: number;
  rimv: number;
  prim: number;
  spin: number;
  pspin: number;
  spinRate: number;
  muscle: number;
  next: number;
  calm: number;
  avoid: number;
  away: number;
  wander: number;
  hue: [number, number, number];
  tones: Tones | null;
  tentacles: Chain[];
  arms: Chain[];
  hairAz: Float32Array;
  hairLen: Float32Array;
}

interface Mote {
  x: number;
  y: number;
  z: number;
  r: number;
  fall: number;
  phase: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
}

const NIGHT = "--miyuki-moon-jellies-night";
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const DEFAULT_COLORS = ["var(--brand)", "var(--chart-3)", "var(--chart-2)"];
const TAU = Math.PI * 2;
const STEP = 1 / 120;
const BACKLOG = 4;
const SIN_E = 0.4;
const COS_E = Math.sqrt(1 - SIN_E * SIN_E);
const DOME = 16;
const LIP = 4;
const PROFILE = DOME + LIP + 1;
const SIL = 30;
const REACH = 140;
const RING_LIFE = 2.6;
const RING_SPEED = 230;
const THRUST = 1.8;
const SLACK = 0.5;
const DRAG = 1;
const TIERS = [2, 0, 1, 1, 0, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2];
const DEPTHS = [0.1, 0.5, 0.92];
const WHITE: Vec3 = [255, 255, 255];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

function glowSprite(color: Vec3) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const c = size / 2;
  const gradient = g.createRadialGradient(c, c, 0, c, c, c);
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    gradient.addColorStop(t, css(color, k === 10 ? 0 : Math.exp(-t * t * 3.6)));
  }
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return canvas;
}

export function MoonJellies({
  count = 7,
  colors = DEFAULT_COLORS,
  speed = 1,
  interactive = true,
  seed = "tide",
  className,
  children,
  ...props
}: MoonJelliesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const colorKey = (colors.length > 0 ? colors : DEFAULT_COLORS).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const total = clamp(Math.round(count), 0, 16);
    const paints = colorKey.split("|");
    const rng = createRng(`moon-jellies:${seed}`);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let unit = 0;
    let jellies: Jelly[] = [];
    let motes: Mote[] = [];
    const rings: Ring[] = [];
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0, present: false };

    let night = false;
    let cols: Vec3[] = [];
    let fg: Vec3 = [30, 40, 60];
    let moteTone: Vec3 = [120, 150, 190];
    let ringTone: Vec3 = [120, 150, 190];

    let time = 0;
    let acc = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let shown = false;

    const pr = new Float32Array(PROFILE);
    const pz = new Float32Array(PROFILE);
    let W = 0;
    let H = 0;
    let EA = 2;
    let EB = 0.6;
    let WM = 0;
    let ZM = 0;
    let BETA = 0;

    const shape = (R: number, c: number, rim: number) => {
      const k = clamp(c, -0.15, 1.15);
      const kk = clamp(c, 0, 1);
      W = R * (1 - 0.22 * k);
      H = R * (0.42 + 0.4 * k);
      EA = 2.2 - 0.3 * kk;
      EB = 0.66 + 0.24 * kk;
      for (let i = 0; i <= DOME; i++) {
        const u = Math.sin((i / DOME) * Math.PI * 0.5);
        pr[i] = W * u;
        pz[i] = H * (1 - u ** EA) ** EB;
      }
      BETA = 0.45 - 1.25 * clamp(rim, -0.4, 1.3);
      const m = R * 0.15;
      let r = W;
      let zz = 0;
      for (let q = 1; q <= LIP; q++) {
        const ang = BETA * ((q - 0.5) / LIP);
        r += (m / LIP) * Math.sin(ang);
        zz -= (m / LIP) * Math.cos(ang);
        pr[DOME + q] = r;
        pz[DOME + q] = zz;
      }
      WM = r;
      ZM = zz;
    };

    const domeZ = (rho: number) => (rho >= W ? 0 : H * (1 - (rho / W) ** EA) ** EB);

    const sx = new Float32Array(SIL);
    const st = new Float32Array(SIL);
    const sb = new Float32Array(SIL);
    let xm = 0;
    let topMin = 0;
    let botMax = 0;

    const silhouette = () => {
      xm = 0;
      for (let i = 0; i < PROFILE; i++) if (pr[i] > xm) xm = pr[i];
      topMin = Infinity;
      botMax = -Infinity;
      for (let j = 0; j < SIL; j++) {
        const x = -xm * Math.cos((j / (SIL - 1)) * Math.PI);
        const ax = Math.abs(x);
        let top = Infinity;
        let bot = -Infinity;
        for (let i = 0; i < PROFILE; i++) {
          const r = pr[i];
          if (r < ax) continue;
          const q = Math.sqrt(Math.max(0, r * r - x * x)) * SIN_E;
          const cy = -pz[i] * COS_E;
          if (cy - q < top) top = cy - q;
          if (cy + q > bot) bot = cy + q;
        }
        if (top === Infinity) {
          top = 0;
          bot = 0;
        }
        sx[j] = x;
        st[j] = top;
        sb[j] = bot;
        if (top < topMin) topMin = top;
        if (bot > botMax) botMax = bot;
      }
    };

    const ox = new Float32Array(SIL * 2);
    const oy = new Float32Array(SIL * 2);

    const outline = () => {
      let n = 0;
      for (let j = 0; j < SIL; j++) {
        ox[n] = sx[j];
        oy[n] = st[j];
        n++;
      }
      for (let j = SIL - 2; j > 0; j--) {
        ox[n] = sx[j];
        oy[n] = sb[j];
        n++;
      }
      ctx.beginPath();
      ctx.moveTo((ox[n - 1] + ox[0]) / 2, (oy[n - 1] + oy[0]) / 2);
      for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        ctx.quadraticCurveTo(ox[i], oy[i], (ox[i] + ox[k]) / 2, (oy[i] + oy[k]) / 2);
      }
      ctx.closePath();
    };

    const crown = () => {
      ctx.beginPath();
      ctx.moveTo(sx[1], st[1]);
      for (let j = 2; j < SIL - 2; j++) {
        ctx.quadraticCurveTo(sx[j], st[j], (sx[j] + sx[j + 1]) / 2, (st[j] + st[j + 1]) / 2);
      }
      ctx.lineTo(sx[SIL - 2], st[SIL - 2]);
    };

    const qx = new Float32Array(24);
    const qy = new Float32Array(24);
    const cx = new Float32Array(128);
    const cy = new Float32Array(128);
    const lx = new Float32Array(128);
    const ly = new Float32Array(128);
    const rx = new Float32Array(128);
    const ry = new Float32Array(128);

    const centre = (ch: Chain, a: number, sub: number) => {
      const n = ch.n;
      for (let i = 0; i < n; i++) {
        qx[i] = ch.ox[i] + (ch.x[i] - ch.ox[i]) * a;
        qy[i] = ch.oy[i] + (ch.y[i] - ch.oy[i]) * a;
      }
      let m = 0;
      for (let i = 0; i < n - 1; i++) {
        const x0 = i > 0 ? qx[i - 1] : 2 * qx[0] - qx[1];
        const y0 = i > 0 ? qy[i - 1] : 2 * qy[0] - qy[1];
        const x1 = qx[i];
        const y1 = qy[i];
        const x2 = qx[i + 1];
        const y2 = qy[i + 1];
        const x3 = i + 2 < n ? qx[i + 2] : 2 * qx[n - 1] - qx[n - 2];
        const y3 = i + 2 < n ? qy[i + 2] : 2 * qy[n - 1] - qy[n - 2];
        for (let s = 0; s < sub; s++) {
          const t = s / sub;
          const t2 = t * t;
          const t3 = t2 * t;
          cx[m] =
            0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3);
          cy[m] =
            0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3);
          m++;
        }
      }
      cx[m] = qx[n - 1];
      cy[m] = qy[n - 1];
      return m + 1;
    };

    const ribbon = (m: number, w0: number, frill: number, phase: number) => {
      for (let j = 0; j < m; j++) {
        const jp = j > 0 ? j - 1 : 0;
        const jn = j < m - 1 ? j + 1 : m - 1;
        let tx = cx[jn] - cx[jp];
        let ty = cy[jn] - cy[jp];
        const d = Math.hypot(tx, ty) || 1;
        tx /= d;
        ty /= d;
        const s = j / (m - 1);
        let wl: number;
        let wr: number;
        if (frill > 0) {
          const base = w0 * (1 - s) ** 0.6 * (0.6 + 0.4 * (1 - s));
          wl = base * (1 + frill * Math.sin(s * 23 + phase));
          wr = base * (1 + frill * Math.sin(s * 23 + phase + 2.3));
        } else {
          wl = w0 * (1 - s);
          wr = wl;
        }
        lx[j] = cx[j] - ty * wl;
        ly[j] = cy[j] + tx * wl;
        rx[j] = cx[j] + ty * wr;
        ry[j] = cy[j] - tx * wr;
      }
      ctx.moveTo(lx[0], ly[0]);
      for (let j = 1; j < m - 1; j++) {
        ctx.quadraticCurveTo(lx[j], ly[j], (lx[j] + lx[j + 1]) / 2, (ly[j] + ly[j + 1]) / 2);
      }
      ctx.lineTo(lx[m - 1], ly[m - 1]);
      for (let j = m - 2; j > 0; j--) {
        ctx.quadraticCurveTo(rx[j], ry[j], (rx[j] + rx[j - 1]) / 2, (ry[j] + ry[j - 1]) / 2);
      }
      ctx.lineTo(rx[0], ry[0]);
      ctx.closePath();
    };

    const current = (y: number) => 2.2 * Math.cos(time * 0.45 + y * 0.004 + 0.7);

    let dvx = 0;
    let dvy = 0;
    const stirred = () => rings.length > 0 || Math.abs(pointer.vx) + Math.abs(pointer.vy) > 4;

    const disturb = (x: number, y: number) => {
      dvx = 0;
      dvy = 0;
      if (pointer.present) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 52000) {
          const f = Math.exp(-d2 / 9000) * 0.11;
          dvx += pointer.vx * f;
          dvy += pointer.vy * f;
        }
      }
      for (const r of rings) {
        const dx = x - r.x;
        const dy = y - r.y;
        const d = Math.hypot(dx, dy) || 1;
        const off = (d - RING_SPEED * r.age) / 34;
        if (off < -3 || off > 3) continue;
        const k = 1 - r.age / RING_LIFE;
        const p = 54 * k * k * Math.exp(-off * off);
        dvx += (dx / d) * p;
        dvy += (dy / d) * p;
      }
    };

    const makeChain = (n: number, length: number, az: number, curl: number, stiff: number, drag: number): Chain => {
      const ck = new Float32Array(n);
      const sk = new Float32Array(n);
      for (let i = 1; i < n; i++) {
        const s = i / (n - 1);
        const k = curl * (0.25 + 0.95 * s * s);
        ck[i] = Math.cos(k);
        sk[i] = Math.sin(k);
      }
      return {
        n,
        seg: length / (n - 1),
        x: new Float32Array(n),
        y: new Float32Array(n),
        ox: new Float32Array(n),
        oy: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        ck,
        sk,
        az,
        stiff,
        drag,
        phase: rng.range(0, TAU),
      };
    };

    let ancX = 0;
    let ancY = 0;
    let dirX = 0;
    let dirY = 1;

    const tentacleAnchor = (j: Jelly, ch: Chain, cos: number, sin: number) => {
      const az = ch.az + j.spin;
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      const lxp = WM * ca;
      const lyp = -ZM * COS_E + WM * sa * SIN_E;
      const b = 0.15 + BETA * 0.35;
      let dx = Math.sin(b) * ca;
      let dy = Math.cos(b) * COS_E + Math.sin(b) * sa * SIN_E;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      ancX = j.x + lxp * cos - lyp * sin;
      ancY = j.y + lxp * sin + lyp * cos;
      dirX = dx * cos - dy * sin;
      dirY = dx * sin + dy * cos;
    };

    const armAnchor = (j: Jelly, ch: Chain, cos: number, sin: number) => {
      const az = ch.az + j.spin;
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      const rho = W * 0.1;
      const lxp = rho * ca;
      const lyp = -H * 0.22 * COS_E + rho * sa * SIN_E;
      let dx = 0.2 * ca;
      let dy = 1;
      const d = Math.hypot(dx, dy);
      dx /= d;
      dy /= d;
      ancX = j.x + lxp * cos - lyp * sin;
      ancY = j.y + lxp * sin + lyp * cos;
      dirX = dx * cos - dy * sin;
      dirY = dx * sin + dy * cos;
    };

    const lay = (ch: Chain) => {
      ch.x[0] = ancX;
      ch.y[0] = ancY;
      ch.ox[0] = ancX;
      ch.oy[0] = ancY;
      let ux = dirX;
      let uy = dirY;
      for (let i = 1; i < ch.n; i++) {
        const nx = ux * ch.ck[i] - uy * ch.sk[i];
        const ny = ux * ch.sk[i] + uy * ch.ck[i];
        ux = nx;
        uy = ny;
        ch.x[i] = ch.x[i - 1] + ux * ch.seg;
        ch.y[i] = ch.y[i - 1] + uy * ch.seg;
        ch.ox[i] = ch.x[i];
        ch.oy[i] = ch.y[i];
      }
    };

    const stepChain = (ch: Chain, dt: number, g: number, flow: number, stir: boolean) => {
      const n = ch.n;
      for (let i = 0; i < n; i++) {
        ch.ox[i] = ch.x[i];
        ch.oy[i] = ch.y[i];
      }
      ch.x[0] = ancX;
      ch.y[0] = ancY;
      const keep = Math.exp(-ch.drag * dt);
      for (let i = 1; i < n; i++) {
        let wx = flow;
        let wy = 0;
        if (stir) {
          disturb(ch.x[i], ch.y[i]);
          wx += dvx;
          wy += dvy;
        }
        ch.vx[i] = wx + (ch.vx[i] - wx) * keep;
        ch.vy[i] = wy + (ch.vy[i] - wy) * keep + g * dt;
        ch.x[i] += ch.vx[i] * dt;
        ch.y[i] += ch.vy[i] * dt;
      }
      let px = ancX;
      let py = ancY;
      let ux = dirX;
      let uy = dirY;
      const give = SLACK / dt;
      for (let i = 1; i < n; i++) {
        const s = i / (n - 1);
        const tx = px + (ux * ch.ck[i] - uy * ch.sk[i]) * ch.seg;
        const ty = py + (ux * ch.sk[i] + uy * ch.ck[i]) * ch.seg;
        const k = ch.stiff * (1 - 0.6 * s);
        let ex = ch.x[i] + (tx - ch.x[i]) * k - px;
        let ey = ch.y[i] + (ty - ch.y[i]) * k - py;
        const d = Math.hypot(ex, ey) || 1;
        ex /= d;
        ey /= d;
        const nx = px + ex * ch.seg;
        const ny = py + ey * ch.seg;
        ch.vx[i] += (nx - ch.x[i]) * give;
        ch.vy[i] += (ny - ch.y[i]) * give;
        ch.x[i] = nx;
        ch.y[i] = ny;
        px = nx;
        py = ny;
        ux = ex;
        uy = ey;
      }
    };

    const pulse = (j: Jelly) => {
      j.muscle = 0.42;
      j.next = 1.85 + rng.range(0.15, 1.05);
    };

    const tint = (j: Jelly) => {
      const n = cols.length;
      const base = mix(cols[j.hue[0] % n], cols[j.hue[1] % n], j.hue[2]);
      const alt = cols[(j.hue[0] + 1) % n];
      if (night) {
        j.tones = {
          body: base,
          rim: mix(base, WHITE, 0.5),
          ring: mix(mix(base, alt, 0.3), WHITE, 0.62),
          line: mix(base, WHITE, 0.3),
          arm: mix(base, WHITE, 0.18),
          edge: mix(base, WHITE, 0.35),
          glow: glowSprite(base),
        };
      } else {
        j.tones = {
          body: base,
          rim: mix(base, fg, 0.36),
          ring: mix(base, alt, 0.55),
          line: mix(base, fg, 0.42),
          arm: mix(base, alt, 0.22),
          edge: mix(base, fg, 0.28),
          glow: glowSprite(mix(base, WHITE, 0.4)),
        };
      }
    };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      cols = paints.map((p) => rgb(p, canvas));
      if (cols.length === 0) cols = [rgb("var(--brand)", canvas)];
      fg = rgb("var(--foreground)", canvas);
      moteTone = night ? mix(cols[0], WHITE, 0.6) : mix(cols[0], fg, 0.55);
      ringTone = night ? mix(cols[0], WHITE, 0.55) : mix(cols[0], fg, 0.4);
      for (const j of jellies) tint(j);
    };

    const spawnMotes = () => {
      const mr = createRng(`moon-jellies:motes:${seed}`);
      const n = clamp(Math.round((w * h) / 6800), 14, 140);
      motes = Array.from({ length: n }, () => {
        const z = mr();
        return {
          x: mr() * w,
          y: mr() * h,
          z,
          r: 0.45 + 1.15 * z * z,
          fall: 2 + 5.5 * z,
          phase: mr.range(0, TAU),
        };
      });
    };

    const place = (j: Jelly) => {
      shape(j.R, j.c, j.rim);
      const cos = Math.cos(j.psi);
      const sin = Math.sin(j.psi);
      for (const ch of j.tentacles) {
        tentacleAnchor(j, ch, cos, sin);
        lay(ch);
      }
      for (const ch of j.arms) {
        armAnchor(j, ch, cos, sin);
        lay(ch);
      }
    };

    const spawn = () => {
      const sr = createRng(`moon-jellies:spawn:${seed}`);
      const n = total;
      const columns = sr.shuffle(Array.from({ length: n }, (_, i) => i));
      const rows = sr.shuffle(Array.from({ length: n }, (_, i) => i));
      const weights = cols.map((_, i) => cols.length - i);
      const sum = weights.reduce((p, q) => p + q, 0);
      jellies = Array.from({ length: n }, (_, i) => {
        const tier = TIERS[i % TIERS.length];
        const z = clamp(DEPTHS[tier] + sr.range(-0.07, 0.07), 0, 1);
        const R = unit * (0.42 + 0.58 * z) * sr.range(0.9, 1.1);
        let pick = sr() * sum;
        let a = 0;
        while (a < weights.length - 1 && pick > weights[a]) {
          pick -= weights[a];
          a++;
        }
        const x = w * (0.1 + (0.8 * (columns[i] + sr.range(0.2, 0.8))) / n);
        const y = h * (-0.05 + (1.15 * (rows[i] + sr.range(0.2, 0.8))) / n) + R * 0.6;
        const psi = sr.range(-0.35, 0.35);
        const nt = Math.round(12 + 4 * z);
        const tentacles = Array.from({ length: nt }, (_, k) =>
          makeChain(
            12,
            R * sr.range(1.2, 2.3),
            (TAU * (k + sr.range(-0.25, 0.25))) / nt,
            (sr() < 0.5 ? -1 : 1) * sr.range(0.06, 0.17),
            0.05,
            3.2,
          ),
        );
        const arms = Array.from({ length: 4 }, (_, k) =>
          makeChain(
            10,
            R * sr.range(1, 1.4),
            Math.PI / 4 + (k * Math.PI) / 2 + sr.range(-0.2, 0.2),
            (sr() < 0.5 ? -1 : 1) * sr.range(0.03, 0.09),
            0.07,
            2.4,
          ),
        );
        const nh = Math.round(30 + 42 * z);
        const hairAz = new Float32Array(nh);
        const hairLen = new Float32Array(nh);
        for (let k = 0; k < nh; k++) {
          hairAz[k] = (TAU * (k + sr.range(-0.35, 0.35))) / nh;
          hairLen[k] = sr.range(0.7, 1.3);
        }
        const j: Jelly = {
          z,
          R,
          tempo: 0.72 + 0.28 * z,
          fade: 0,
          x,
          y,
          px: x,
          py: y,
          v: R * sr.range(0.1, 0.5),
          psi,
          ppsi: psi,
          omega: 0,
          c: 0,
          cv: 0,
          pc: 0,
          rim: 0,
          rimv: 0,
          prim: 0,
          spin: sr.range(0, TAU),
          pspin: 0,
          spinRate: (sr() < 0.5 ? -1 : 1) * sr.range(0.03, 0.08),
          muscle: 0,
          next: sr.range(0, 2.8),
          calm: 0,
          avoid: 0,
          away: 0,
          wander: sr.range(0, TAU),
          hue: [a, (a + 1) % cols.length, sr.range(0, 0.4)],
          tones: null,
          tentacles,
          arms,
          hairAz,
          hairLen,
        };
        j.pspin = j.spin;
        place(j);
        tint(j);
        return j;
      });
      jellies.sort((p, q) => p.z - q.z);
    };

    const shift = (j: Jelly, dx: number, dy: number) => {
      j.x += dx;
      j.y += dy;
      j.px += dx;
      j.py += dy;
      for (const ch of [...j.tentacles, ...j.arms]) {
        for (let i = 0; i < ch.n; i++) {
          ch.x[i] += dx;
          ch.y[i] += dy;
          ch.ox[i] += dx;
          ch.oy[i] += dy;
        }
      }
    };

    const respawn = (j: Jelly) => {
      let best = w * 0.5;
      let score = -1;
      for (let k = 0; k < 8; k++) {
        const x = w * rng.range(0.1, 0.9);
        let s = 99;
        for (const o of jellies) {
          if (o === j || o.y < h * 0.4) continue;
          s = Math.min(s, Math.abs(o.x - x) / (o.R + j.R));
        }
        if (s > score) {
          score = s;
          best = x;
        }
      }
      shift(j, best - j.x, h + j.R * rng.range(1.9, 3.4) - j.y);
    };

    const stepJelly = (j: Jelly, dt: number, stir: boolean) => {
      j.px = j.x;
      j.py = j.y;
      j.ppsi = j.psi;
      j.pc = j.c;
      j.prim = j.rim;
      j.pspin = j.spin;
      const tt = dt * j.tempo;
      if (j.muscle > 0) j.muscle -= tt;
      else {
        j.next -= tt;
        if (j.next <= 0) pulse(j);
      }
      if (j.calm > 0) j.calm -= dt;
      const on = j.muscle > 0;
      const wn = on ? 9.5 : 2.6;
      const zeta = on ? 0.9 : 1;
      j.cv += (wn * wn * ((on ? 1 : 0) - j.c) - 2 * zeta * wn * j.cv) * tt;
      j.c += j.cv * tt;
      j.rimv += (30 * (j.c - j.rim) - 4.6 * j.rimv) * tt;
      j.rim += j.rimv * tt;
      const push = j.cv > 0 ? j.cv : j.cv * 0.12;
      j.v += (push * THRUST * j.R - DRAG * j.v) * tt;

      const bx = j.x + Math.sin(j.psi) * j.R * 0.35;
      const by = j.y - Math.cos(j.psi) * j.R * 0.35;
      if (pointer.present && interactive && !still) {
        const dx = bx - pointer.x;
        const dy = by - pointer.y;
        const d = Math.hypot(dx, dy);
        const want = d < REACH ? 1 - (d / REACH) ** 2 : 0;
        if (want > 0) {
          j.away = clamp(Math.atan2(dx, -dy), -1.15, 1.15);
          if (want > 0.2 && j.calm <= 0 && j.muscle <= 0 && j.c < 0.6) {
            pulse(j);
            j.calm = 3;
          }
        }
        j.avoid += (want - j.avoid) * (1 - Math.exp(-dt * 3));
      } else j.avoid *= Math.exp(-dt * 1.5);

      let target = 0.36 * Math.sin(time * 0.16 + j.wander) + 0.2 * Math.sin(time * 0.27 + j.wander * 1.9);
      const ex = j.x / Math.max(1, w);
      if (ex < 0.14) target += ((0.14 - ex) / 0.14) * 0.9;
      else if (ex > 0.86) target -= ((ex - 0.86) / 0.14) * 0.9;
      for (const o of jellies) {
        if (o === j || Math.abs(o.z - j.z) > 0.3) continue;
        const dx = j.x - o.x;
        const dy = j.y - o.y;
        const reach = (j.R + o.R) * 1.5;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach * reach) target += (dx >= 0 ? 1 : -1) * (1 - Math.sqrt(d2) / reach) * 0.8;
      }
      target = clamp(target * (1 - j.avoid) + j.away * j.avoid, -1.1, 1.1);
      const k = 0.8 + 3 * j.avoid;
      j.omega += (k * (target - j.psi) - 2 * Math.sqrt(k) * j.omega) * dt;
      j.psi += j.omega * dt;

      let fx = current(j.y) * (0.5 + 0.5 * j.z);
      let fy = 0;
      if (stir) {
        disturb(bx, by);
        fx += dvx * 0.3;
        fy += dvy * 0.3;
      }
      j.x += (Math.sin(j.psi) * j.v + fx) * dt;
      j.y += (-Math.cos(j.psi) * j.v + fy) * dt;
      j.spin += j.spinRate * dt;

      shape(j.R, j.c, j.rim);
      const cos = Math.cos(j.psi);
      const sin = Math.sin(j.psi);
      const flow = current(j.y) * (0.5 + 0.5 * j.z);
      const g = 9 * (j.R / 40);
      let low = j.y + j.R;
      for (const ch of j.tentacles) {
        tentacleAnchor(j, ch, cos, sin);
        stepChain(ch, dt, g, flow, stir);
        for (let i = 0; i < ch.n; i++) if (ch.y[i] > low) low = ch.y[i];
      }
      for (const ch of j.arms) {
        armAnchor(j, ch, cos, sin);
        stepChain(ch, dt, g * 1.2, flow, stir);
        for (let i = 0; i < ch.n; i++) if (ch.y[i] > low) low = ch.y[i];
      }
      if (low < -10) respawn(j);
    };

    const step = (dt: number) => {
      time += dt;
      const decay = Math.exp(-dt * 6);
      pointer.vx *= decay;
      pointer.vy *= decay;
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].age += dt;
        if (rings[i].age > RING_LIFE) rings.splice(i, 1);
      }
      const stir = stirred();
      for (const j of jellies) stepJelly(j, dt, stir);
      for (const m of motes) {
        let vx = current(m.y) * (0.4 + 0.6 * m.z) + 1.4 * Math.cos(time * 0.5 + m.phase);
        let vy = m.fall;
        if (stir) {
          disturb(m.x, m.y);
          vx += dvx;
          vy += dvy;
        }
        m.x += vx * dt;
        m.y += vy * dt;
        if (m.y > h + 4) {
          m.y -= h + 8;
          m.x = rng() * w;
        } else if (m.y < -4) m.y += h + 8;
        if (m.x < -4) m.x += w + 8;
        else if (m.x > w + 4) m.x -= w + 8;
      }
    };

    const drawMotes = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let bin = 0; bin < 3; bin++) {
        ctx.beginPath();
        for (const m of motes) {
          if (Math.min(2, Math.floor(m.z * 3)) !== bin) continue;
          ctx.moveTo(m.x + m.r, m.y);
          ctx.arc(m.x, m.y, m.r, 0, TAU);
        }
        const zc = (bin + 0.5) / 3;
        ctx.fillStyle = css(moteTone, night ? 0.16 + 0.42 * zc : 0.12 + 0.3 * zc);
        ctx.fill();
      }
    };

    const drawRings = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1.1;
      for (const r of rings) {
        const k = r.age / RING_LIFE;
        const rad = 6 + RING_SPEED * r.age;
        const a = (1 - k) * (1 - k) * Math.min(1, r.age * 8) * (night ? 0.24 : 0.2);
        ctx.strokeStyle = css(ringTone, a);
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, TAU);
        ctx.stroke();
        if (rad > 22) {
          ctx.strokeStyle = css(ringTone, a * 0.45);
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad - 16, 0, TAU);
          ctx.stroke();
        }
      }
    };

    const drawJelly = (j: Jelly, a: number) => {
      const t = j.tones;
      if (!t) return;
      const X = j.px + (j.x - j.px) * a;
      const Y = j.py + (j.y - j.py) * a;
      const psi = j.ppsi + (j.psi - j.ppsi) * a;
      const c = j.pc + (j.c - j.pc) * a;
      const rim = j.prim + (j.rim - j.prim) * a;
      const spin = j.pspin + (j.spin - j.pspin) * a;
      const R = j.R;
      if (X < -R * 4 || X > w + R * 4 || Y < -R * 5 || Y > h + R * 2.2) return;
      const f = night ? 0.34 + 0.66 * j.z : 0.62 + 0.38 * j.z;
      const lw = Math.max(0.5, R / 44);
      const cos = Math.cos(psi);
      const sin = Math.sin(psi);
      shape(R, c, rim);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (t.glow) {
        const gx = X + sin * H * 0.4;
        const gy = Y - cos * H * 0.4;
        const s = W * (night ? 3.6 : 2.7);
        ctx.globalAlpha = (night ? 0.26 : 0.1) * f * (0.85 + 0.25 * clamp(c, 0, 1));
        ctx.drawImage(t.glow, gx - s / 2, gy - s / 2, s, s);
        ctx.globalAlpha = 1;
      }

      const rimY = -ZM * COS_E;
      const lip = WM * SIN_E;
      const along = (y0: number, y1: number) =>
        ctx.createLinearGradient(X - y0 * sin, Y + y0 * cos, X - y1 * sin, Y + y1 * cos);
      const strong = (night ? 0.62 : 0.7) * f;
      const reach = R * 2.3;
      for (let pass = 0; pass < 2; pass++) {
        const back = pass === 0;
        ctx.beginPath();
        for (const ch of j.tentacles) {
          if (Math.sin(ch.az + spin) < -0.25 !== back) continue;
          ribbon(centre(ch, a, 2), Math.max(0.6, lw * 0.62), 0, 0);
        }
        const y0 = back ? rimY - lip : rimY;
        const y1 = rimY + lip + reach;
        const tg = along(y0, y1);
        const hidden = back ? (2 * lip) / (y1 - y0) : 0;
        if (back) tg.addColorStop(0, css(t.line, strong * 0.16));
        tg.addColorStop(hidden, css(t.line, strong));
        tg.addColorStop(hidden + (1 - hidden) * 0.5, css(t.line, strong * 0.5));
        tg.addColorStop(1, css(t.line, 0.04 * f));
        ctx.fillStyle = tg;
        ctx.fill();
      }

      const armW = R * 0.1;
      const ripple = time * 0.9;
      const armTop = -H * 0.22 * COS_E;
      const armEnd = rimY + lip + R * 1.4;
      const shown = (2 * lip + rimY - armTop) / (armEnd - armTop);
      const af = along(armTop, armEnd);
      const ae = along(armTop, armEnd);
      const fillA = (night ? 0.16 : 0.17) * f;
      const edgeA = (night ? 0.26 : 0.28) * f;
      af.addColorStop(0, css(t.arm, fillA * 0.3));
      af.addColorStop(shown, css(t.arm, fillA));
      af.addColorStop(1, css(t.arm, fillA * 0.7));
      ae.addColorStop(0, css(t.edge, edgeA * 0.2));
      ae.addColorStop(shown, css(t.edge, edgeA));
      ae.addColorStop(1, css(t.edge, edgeA * 0.6));
      for (const ch of j.arms) {
        const m = centre(ch, a, 4);
        ctx.beginPath();
        ribbon(m, armW, 0.5, ch.phase - ripple);
        ctx.fillStyle = af;
        ctx.fill();
        ctx.lineWidth = lw * 0.5;
        ctx.strokeStyle = ae;
        ctx.stroke();
      }

      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * X, dpr * Y);
      silhouette();
      outline();
      const midY = (topMin + botMax) / 2;
      const ry2 = Math.max(1, (botMax - topMin) / 2);
      const k = ry2 / Math.max(1, xm);
      ctx.save();
      ctx.scale(1, k);
      const bg = ctx.createRadialGradient(0, midY / k, 0, 0, midY / k, xm * 1.02);
      if (night) {
        bg.addColorStop(0, css(t.body, 0.05 * f));
        bg.addColorStop(0.5, css(t.body, 0.08 * f));
        bg.addColorStop(0.76, css(t.body, 0.17 * f));
        bg.addColorStop(0.9, css(t.edge, 0.32 * f));
        bg.addColorStop(1, css(t.rim, 0.5 * f));
      } else {
        bg.addColorStop(0, css(t.body, 0.11 * f));
        bg.addColorStop(0.5, css(t.body, 0.15 * f));
        bg.addColorStop(0.76, css(t.body, 0.25 * f));
        bg.addColorStop(0.9, css(t.body, 0.4 * f));
        bg.addColorStop(1, css(t.edge, 0.55 * f));
      }
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.clip();
      ctx.lineWidth = W * 0.2;
      ctx.strokeStyle = css(t.edge, (night ? 0.12 : 0.13) * f);
      ctx.stroke();

      if (R > 24) {
        ctx.beginPath();
        for (let q = 0; q < 16; q++) {
          const az = (TAU * (q + 0.5)) / 16 + spin;
          const ca = Math.cos(az);
          const sa = Math.sin(az);
          for (let p = 0; p <= 3; p++) {
            const rho = W * (0.48 + 0.44 * (p / 3));
            const px = rho * ca;
            const py = -domeZ(rho) * COS_E + rho * sa * SIN_E;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.lineWidth = lw * 0.45;
        ctx.strokeStyle = css(t.edge, 0.05 * f);
        ctx.stroke();
      }

      const ringR = W * 0.135;
      const ringC = W * 0.3;
      const gap = 0.6;
      ctx.lineCap = "round";
      for (let q = 0; q < 4; q++) {
        const az = Math.PI / 4 + (q * Math.PI) / 2 + spin;
        const ccx = ringC * Math.cos(az);
        const ccd = ringC * Math.sin(az);
        ctx.beginPath();
        let prevX = 0;
        let prevY = 0;
        for (let p = 0; p <= 12; p++) {
          const phi = -Math.PI + gap + ((TAU - 2 * gap) * p) / 12;
          const px = ccx + ringR * Math.cos(az + phi);
          const pd = ccd + ringR * Math.sin(az + phi);
          const rho = Math.hypot(px, pd);
          const yy = -(domeZ(rho) + R * 0.01) * COS_E + pd * SIN_E;
          if (p === 0) ctx.moveTo(px, yy);
          else if (p === 12) ctx.quadraticCurveTo(prevX, prevY, px, yy);
          else if (p > 1) ctx.quadraticCurveTo(prevX, prevY, (prevX + px) / 2, (prevY + yy) / 2);
          prevX = px;
          prevY = yy;
        }
        const back = Math.sin(az) < 0 ? 0.8 : 1;
        ctx.lineWidth = W * 0.13;
        ctx.strokeStyle = css(t.ring, (night ? 0.15 : 0.14) * f * back);
        ctx.stroke();
        ctx.lineWidth = Math.max(0.7, W * 0.045);
        ctx.strokeStyle = css(t.ring, (night ? 0.42 : 0.48) * f * back);
        ctx.stroke();
      }
      ctx.restore();
      ctx.lineCap = "round";

      crown();
      ctx.lineWidth = lw * 0.9;
      ctx.strokeStyle = css(t.rim, (night ? 0.36 : 0.6) * f);
      ctx.stroke();

      ctx.lineWidth = lw * 0.8;
      ctx.strokeStyle = css(t.rim, (night ? 0.28 : 0.26) * f);
      ctx.beginPath();
      ctx.ellipse(0, rimY, WM, WM * SIN_E, 0, Math.PI, TAU);
      ctx.stroke();

      const sweep = clamp(j.v / (1.4 * R), 0, 1);
      const b2 = BETA * 1.2 - 0.3 * sweep;
      const s2 = Math.sin(b2);
      const c2 = Math.cos(b2);
      const hl = R * 0.11;
      ctx.beginPath();
      for (let q = 0; q < j.hairAz.length; q++) {
        const az = j.hairAz[q] + spin;
        const ca = Math.cos(az);
        const sa = Math.sin(az);
        const hx = WM * ca;
        const hy = rimY + WM * sa * SIN_E;
        const dx = s2 * ca;
        const dy = c2 * COS_E + s2 * sa * SIN_E;
        const L = hl * j.hairLen[q];
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(
          hx + dx * L * 0.5,
          hy + dy * L * 0.5,
          hx + dx * L * (1 - 0.4 * sweep),
          hy + dy * L * (1 - 0.2 * sweep) + L * 0.5 * sweep,
        );
      }
      ctx.lineWidth = lw * 0.42;
      ctx.strokeStyle = css(t.line, (night ? 0.34 : 0.3) * f);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, rimY, WM, WM * SIN_E, 0, 0, Math.PI);
      if (night) {
        ctx.lineWidth = lw * 2.6;
        ctx.strokeStyle = css(t.rim, 0.14 * f);
        ctx.stroke();
      }
      ctx.lineWidth = lw * 1.05;
      ctx.strokeStyle = css(t.rim, (night ? 0.7 : 0.7) * f);
      ctx.stroke();
      ctx.lineCap = "butt";
    };

    const draw = (a: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (w === 0 || h === 0) return;
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      drawMotes();
      for (const j of jellies) drawJelly(j, a);
      drawRings();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const real = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0;
      last = now;
      acc += real * pace;
      if (acc > STEP * BACKLOG) acc = STEP * BACKLOG;
      while (acc >= STEP) {
        step(STEP);
        acc -= STEP;
      }
      draw(acc / STEP);
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

    const settle = (seconds: number) => {
      const n = Math.round(seconds / STEP);
      for (let i = 0; i < n; i++) step(STEP);
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
      const next = clamp(Math.sqrt(w * h) * 0.076, 18, 60);
      const sizeChanged = unit === 0 || Math.abs(next - unit) / unit > 0.2;
      if (sizeChanged || jellies.length !== total) {
        unit = next;
        spawnMotes();
        spawn();
        settle(still ? 5 : 3);
      } else {
        for (const j of jellies) {
          if (j.x > w + j.R) shift(j, w * rng.range(0.2, 0.8) - j.x, 0);
        }
      }
      draw(1);
    };

    const local = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const kx = box.width > 0 ? w / box.width : 1;
      const ky = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * kx, (event.clientY - box.top) * ky] as const;
    };

    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      if (pointer.present) {
        const dt = (event.timeStamp - pointer.t) / 1000;
        if (dt > 0.004) {
          const ivx = (x - pointer.x) / dt;
          const ivy = (y - pointer.y) / dt;
          const sp = Math.hypot(ivx, ivy);
          const cap = sp > 700 ? 700 / sp : 1;
          pointer.vx = pointer.vx * 0.5 + ivx * cap * 0.5;
          pointer.vy = pointer.vy * 0.5 + ivy * cap * 0.5;
        }
      }
      pointer.t = event.timeStamp;
      pointer.x = x;
      pointer.y = y;
      pointer.present = true;
    };

    const onLeave = () => {
      pointer.present = false;
    };

    const onDown = (event: PointerEvent) => {
      if (still || event.button !== 0) return;
      const target = event.target as Element | null;
      if (target?.closest(OWN_CLICKS)) return;
      const [x, y] = local(event);
      if (x < 0 || y < 0 || x > w || y > h) return;
      if (rings.length > 5) rings.shift();
      rings.push({ x, y, age: 0 });
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
      draw(1);
    }, canvas);
    if (interactive) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointerdown", onDown);
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
      root.removeEventListener("pointerdown", onDown);
    };
  }, [count, colorKey, speed, interactive, seed, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-moon-jellies-night:0] dark:[--miyuki-moon-jellies-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas
          ref={canvasRef}
          className="block size-full opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
        />
      </div>
      {children}
    </div>
  );
}
