"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useCallback, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface RibbonTrailProps extends ComponentProps<"div"> {
  color?: string;
  underside?: string;
  length?: number;
  width?: number;
  gravity?: number;
}

type Rgb = [number, number, number];

interface Band {
  lo: number;
  hi: number;
  fill: string;
  alpha: number;
  inner: boolean;
}

interface Face {
  bands: Band[];
  sheen: string;
  sheenAlpha: number;
}

interface Ribbon {
  x: Float32Array;
  y: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  lx: Float32Array;
  ly: Float32Array;
  twist: Float32Array;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  px: number;
  py: number;
  fx: number;
  fy: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  span: number;
  gap: number;
  last: number;
  id: number;
  held: boolean;
  age: number;
  fade: number;
  quiet: number;
  flap: Float32Array;
  phase: number;
}

const NIGHT = "--miyuki-ribbon-trail-night";
const POINTS = 40;
const SUB = 4;
const SAMPLES = (POINTS - 1) * SUB + 1;
const STEP = 1 / 120;
const BACKLOG = 4;
const FADE = 0.6;
const GROW = 0.45;
const CHUNK = 22;
const SPRING = 46;
const DAMPING = 0.78;
const LEAD = 0.45;
const FOLLOW = 1 - Math.exp(-STEP / 0.08);
const DRAG_ALONG = Math.exp(-1.6 * STEP);
const DRAG_ACROSS = 2;
const DRAG_RUSH = 0.022;
const PULL = 0.85;
const TWIST = 0.65;
const SETTLE = 1 - Math.exp(-0.9 * STEP);
const SPREAD = 0.2;
const GRIP = 1 - Math.exp(-5 * STEP);
const TAU = Math.PI * 2;
const FLUTTER = 0.35;
const EASE_FLAP = 1 - Math.exp(-STEP / 0.3);
const FLOOR = 0.06;
const SHEEN_AT = 0.45;
const SHEEN_CURL = 0.95;
const SHEEN_EDGE = 0.86;
const SHEEN: [number, number][] = [
  [0.3, 0.4],
  [0.13, 0.55],
];

const WHITE: Rgb = [1, 1, 1];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const css = (c: Rgb) => `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
const rgb = (value: string, el: Element): Rgb => {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
};
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const taper = (s: number) => (0.8 + 0.2 * smooth(0, 0.07, s)) * (1 - s ** 1.5);

function swell(
  bands: Band[],
  fill: Rgb,
  steps: number,
  peak: number,
  from: number,
  top: number,
  end: number,
  to: number,
) {
  for (let k = 0; k < steps; k++) {
    const level = (k + 0.5) / steps;
    bands.push({
      lo: from + (top - from) * level,
      hi: to + (end - to) * level,
      fill: css(fill),
      alpha: peak / steps / (1 - (peak * k) / steps),
      inner: true,
    });
  }
}

function face(base: Rgb, edge: Rgb, light: Rgb, sheen: Rgb, sheenAlpha: number): Face {
  const bands: Band[] = [{ lo: -1, hi: 1, fill: css(edge), alpha: 1, inner: false }];
  swell(bands, base, 5, 1, -1, -0.3, 0.93, 1);
  swell(bands, light, 4, 0.5, -0.25, 0.42, 0.84, 0.985);
  return { bands, sheen: css(sheen), sheenAlpha };
}

function createRibbon(x: number, y: number, dx: number, dy: number, rest: number, id: number): Ribbon {
  const r: Ribbon = {
    x: new Float32Array(POINTS),
    y: new Float32Array(POINTS),
    ox: new Float32Array(POINTS),
    oy: new Float32Array(POINTS),
    lx: new Float32Array(POINTS),
    ly: new Float32Array(POINTS),
    twist: new Float32Array(POINTS),
    vx: 0,
    vy: 0,
    tx: x,
    ty: y,
    px: x,
    py: y,
    fx: 0,
    fy: 0,
    fromX: x,
    fromY: y,
    toX: x,
    toY: y,
    start: 0,
    span: 1,
    gap: 1 / 60,
    last: -1,
    id,
    held: true,
    age: 0,
    fade: 0,
    quiet: 0,
    flap: new Float32Array(POINTS),
    phase: 0,
  };
  for (let i = 0; i < POINTS; i++) {
    const px = x + dx * rest * i;
    const py = y + dy * rest * i;
    r.x[i] = r.ox[i] = r.lx[i] = px;
    r.y[i] = r.oy[i] = r.ly[i] = py;
  }
  return r;
}

export function RibbonTrail({
  color = "var(--brand)",
  underside,
  length = 280,
  width = 14,
  gravity = 0.15,
  className,
  children,
  ref,
  ...props
}: RibbonTrailProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (reduce || !root || !canvas) return;
    const ctx = canvas.getContext("2d");
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    if (!ctx || !lctx) return;

    const rest = Math.max(40, length) / (POINTS - 1);
    const half = Math.max(1, width) / 2;
    const bend = Math.min(0.45, rest / (half * 3.4));
    const fall = Math.max(0, gravity) * 2400 * STEP * STEP;
    const ribbons: Ribbon[] = [];

    const cx = new Float32Array(POINTS);
    const cy = new Float32Array(POINTS);
    const turn = new Float32Array(POINTS);
    const rt = new Float32Array(POINTS);
    const qx = new Float32Array(POINTS);
    const qy = new Float32Array(POINTS);
    const sx = new Float32Array(SAMPLES + 1);
    const sy = new Float32Array(SAMPLES + 1);
    const stx = new Float32Array(SAMPLES + 1);
    const sty = new Float32Array(SAMPLES + 1);
    const sh = new Float32Array(SAMPLES + 1);
    const sc = new Float32Array(SAMPLES + 1);
    const sp = new Float32Array(SAMPLES + 1);
    const sk = new Float32Array(SAMPLES + 1);
    const raw = new Float32Array(SAMPLES + 1);
    const VERTS = SAMPLES * 2 + 64;
    const bx = new Float32Array(VERTS);
    const by = new Float32Array(VERTS);
    const bnx = new Float32Array(VERTS);
    const bny = new Float32Array(VERTS);
    const bh = new Float32Array(VERTS);
    const bw = new Float32Array(VERTS);
    const bm = new Float32Array(VERTS);
    const bu = new Float32Array(VERTS);
    const bk = new Float32Array(VERTS);
    const chunkFrom: number[] = [];
    const chunkTo: number[] = [];
    const chunkSide: number[] = [];
    const ex = new Float32Array(VERTS);
    const ey = new Float32Array(VERTS);
    const fx = new Float32Array(VERTS);
    const fy = new Float32Array(VERTS);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let night = false;
    let opacity = 1;
    let top: Face | null = null;
    let under: Face | null = null;
    let glow = "";
    let raf = 0;
    let last = 0;
    let acc = 0;
    let clock = 0;
    let onScreen = true;
    let count = 0;
    let verts = 0;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const base = rgb(color, canvas);
      const ink = rgb("var(--foreground)", canvas);
      const ground = rgb("var(--background)", canvas);
      const pale = underside ? rgb(underside, canvas) : mix(base, WHITE, night ? 0.5 : 0.56);
      if (night) {
        top = face(base, mix(base, ground, 0.42), mix(base, WHITE, 0.3), mix(base, WHITE, 0.85), 0.7);
        under = face(pale, mix(pale, base, 0.55), mix(pale, WHITE, 0.5), WHITE, 0.75);
        opacity = 0.97;
      } else {
        top = face(base, mix(base, ink, 0.22), mix(base, WHITE, 0.3), mix(base, WHITE, 0.82), 0.55);
        under = face(pale, mix(pale, base, 0.42), mix(pale, WHITE, 0.5), WHITE, 0.7);
        opacity = 0.95;
      }
      glow = css(base);
    };

    const advance = (r: Ribbon) => {
      const { x, y, ox, oy, lx, ly, twist } = r;
      lx.set(x);
      ly.set(y);
      r.age += STEP;
      if (r.held) r.fade = Math.max(0, r.fade - STEP * 3);
      else r.fade += STEP;

      const glide = Math.min(1, (clock - r.start) / r.span);
      r.tx = r.fromX + (r.toX - r.fromX) * glide;
      r.ty = r.fromY + (r.toY - r.fromY) * glide;
      r.fx += ((r.tx - r.px) / STEP - r.fx) * FOLLOW;
      r.fy += ((r.ty - r.py) / STEP - r.fy) * FOLLOW;
      r.px = r.tx;
      r.py = r.ty;
      if (r.held) {
        const k = SPRING * SPRING;
        const c = 2 * DAMPING * SPRING;
        r.vx += (k * (r.tx - x[0]) + c * (LEAD * r.fx - r.vx)) * STEP;
        r.vy += (k * (r.ty - y[0]) + c * (LEAD * r.fy - r.vy)) * STEP;
        ox[0] = x[0];
        oy[0] = y[0];
        x[0] += r.vx * STEP;
        y[0] += r.vy * STEP;
      } else {
        const speed = Math.hypot(x[0] - ox[0], y[0] - oy[0]) / STEP;
        const keep = Math.exp(-(DRAG_ACROSS + DRAG_RUSH * speed) * STEP);
        const vx = (x[0] - ox[0]) * keep;
        const vy = (y[0] - oy[0]) * keep;
        ox[0] = x[0];
        oy[0] = y[0];
        x[0] += vx;
        y[0] += vy + fall;
      }

      for (let i = 1; i < POINTS; i++) {
        let tx = x[i - 1] - x[i];
        let ty = y[i - 1] - y[i];
        const d = Math.hypot(tx, ty) || 1;
        tx /= d;
        ty /= d;
        const vx = x[i] - ox[i];
        const vy = y[i] - oy[i];
        const along = vx * tx + vy * ty;
        let nx = vx - along * tx;
        let ny = vy - along * ty;
        const keep = Math.exp(-(DRAG_ACROSS + (DRAG_RUSH * Math.hypot(nx, ny)) / STEP) * STEP);
        nx *= keep;
        ny *= keep;
        ox[i] = x[i];
        oy[i] = y[i];
        x[i] += along * tx * DRAG_ALONG + nx;
        y[i] += along * ty * DRAG_ALONG + ny + fall;
      }

      let px = 0;
      let py = 1;
      for (let i = 1; i < POINTS; i++) {
        let dx = x[i] - x[i - 1];
        let dy = y[i] - y[i - 1];
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) {
          dx = px;
          dy = py;
          d = 1;
        }
        dx /= d;
        dy /= d;
        if (i > 1) {
          const a = Math.atan2(px * dy - py * dx, px * dx + py * dy);
          const over = Math.abs(a) - bend;
          if (over > 0) {
            const lim = Math.sign(a) * (bend + over * 0.35);
            const ca = Math.cos(lim);
            const sa = Math.sin(lim);
            dx = px * ca - py * sa;
            dy = px * sa + py * ca;
          }
        }
        const nx = x[i - 1] + dx * rest;
        const ny = y[i - 1] + dy * rest;
        cx[i] = nx - x[i];
        cy[i] = ny - y[i];
        x[i] = nx;
        y[i] = ny;
        px = dx;
        py = dy;
      }
      for (let i = 1; i < POINTS - 1; i++) {
        ox[i] += PULL * cx[i + 1];
        oy[i] += PULL * cy[i + 1];
      }

      const rr = rest * rest;
      for (let i = 0; i < POINTS; i++) {
        const a = Math.min(POINTS - 2, Math.max(1, i));
        const e1x = x[a - 1] - x[a];
        const e1y = y[a - 1] - y[a];
        const e2x = x[a] - x[a + 1];
        const e2y = y[a] - y[a + 1];
        const curve = (e2x * e1y - e2y * e1x) / (rr * rest);
        const along = ((x[i] - lx[i]) * e1x + (y[i] - ly[i]) * e1y) / rest;
        turn[i] = TWIST * curve * along * smooth(0, 7, i);
      }
      let moved = 0;
      let twisted = 0;
      let prev = twist[0];
      for (let i = 0; i < POINTS; i++) {
        const here = twist[i];
        const next = i < POINTS - 1 ? twist[i + 1] : here;
        const before = i > 0 ? prev : here;
        prev = here;
        let t = here + turn[i] + SPREAD * (before + next - 2 * here);
        if (i === 0 && r.held) t += (Math.round(t / Math.PI) * Math.PI - t) * GRIP;
        else t += (Math.round(t / Math.PI) * Math.PI - t) * SETTLE;
        twisted = Math.max(twisted, Math.abs(t - here));
        twist[i] = t;
        const step = Math.abs(x[i] - lx[i]) + Math.abs(y[i] - ly[i]);
        moved = Math.max(moved, step);
        const wind = FLUTTER * smooth(0.6, 7, step) * smooth(0, 6, i);
        r.flap[i] += (wind - r.flap[i]) * EASE_FLAP;
        twisted = Math.max(twisted, r.flap[i] * 0.02);
      }
      r.phase += STEP * TAU * (1 + Math.min(1.6, Math.hypot(r.fx, r.fy) / 600));

      const resting =
        r.held &&
        r.age > GROW &&
        moved < 0.006 &&
        twisted < 5e-4 &&
        Math.abs(r.tx - x[0]) + Math.abs(r.ty - y[0]) < 0.02;
      r.quiet = resting ? r.quiet + 1 : 0;
    };

    const sample = (r: Ribbon, frac: number) => {
      for (let i = 0; i < POINTS; i++) {
        qx[i] = r.lx[i] + (r.x[i] - r.lx[i]) * frac;
        qy[i] = r.ly[i] + (r.y[i] - r.ly[i]) * frac;
        rt[i] = r.twist[i] + r.flap[i] * Math.sin(r.phase - i * 0.42);
      }
      const grown = Math.min(1, (r.age + frac * STEP) / GROW);
      const g = 1 - (1 - grown) ** 3;
      const span = (POINTS - 1) * (0.05 + 0.95 * g);
      const scale = half * (0.4 + 0.6 * g);
      count = Math.max(6, Math.ceil(span * SUB));
      let tx = 0;
      let ty = 1;
      for (let k = 0; k <= count; k++) {
        const u = (span * k) / count;
        const j = Math.min(POINTS - 2, Math.floor(u));
        const t = u - j;
        const x1 = qx[j];
        const y1 = qy[j];
        const x2 = qx[j + 1];
        const y2 = qy[j + 1];
        const x0 = j > 0 ? qx[j - 1] : 2 * x1 - x2;
        const y0 = j > 0 ? qy[j - 1] : 2 * y1 - y2;
        const x3 = j + 2 < POINTS ? qx[j + 2] : 2 * x2 - x1;
        const y3 = j + 2 < POINTS ? qy[j + 2] : 2 * y2 - y1;
        const ax = -x0 + 3 * x1 - 3 * x2 + x3;
        const ay = -y0 + 3 * y1 - 3 * y2 + y3;
        const bxx = 2 * x0 - 5 * x1 + 4 * x2 - x3;
        const byy = 2 * y0 - 5 * y1 + 4 * y2 - y3;
        const cxx = x2 - x0;
        const cyy = y2 - y0;
        sx[k] = 0.5 * (2 * x1 + cxx * t + bxx * t * t + ax * t * t * t);
        sy[k] = 0.5 * (2 * y1 + cyy * t + byy * t * t + ay * t * t * t);
        const dx = cxx + 2 * bxx * t + 3 * ax * t * t;
        const dy = cyy + 2 * byy * t + 3 * ay * t * t;
        const d = Math.hypot(dx, dy);
        if (d > 1e-5) {
          tx = dx / d;
          ty = dy / d;
        }
        stx[k] = tx;
        sty[k] = ty;
        sh[k] = scale * taper(k / count);
        const phi = rt[j] + (rt[j + 1] - rt[j]) * t;
        sc[k] = Math.cos(phi);
        sp[k] = phi - Math.PI * Math.round(phi / Math.PI);
      }
      for (let k = 0; k < count; k++) {
        const ds = Math.hypot(sx[k + 1] - sx[k], sy[k + 1] - sy[k]) || 1;
        raw[k] = (stx[k] * sty[k + 1] - sty[k] * stx[k + 1]) / ds;
      }
      raw[count] = raw[count - 1];
      for (let k = 0; k <= count; k++) {
        let best = raw[k];
        for (let j = Math.max(0, k - 3); j <= Math.min(count, k + 3); j++) {
          if (Math.abs(raw[j]) > Math.abs(best)) best = raw[j];
        }
        sk[k] = best;
      }
    };

    const put = (
      px: number,
      py: number,
      tx: number,
      ty: number,
      hw: number,
      c: number,
      psi: number,
      k: number,
      side: number,
    ) => {
      const ac = Math.abs(c);
      bx[verts] = px;
      by[verts] = py;
      bnx[verts] = -ty;
      bny[verts] = tx;
      bh[verts] = hw;
      bw[verts] = side * Math.max(ac, FLOOR);
      bm[verts] = smooth(0.06, 0.55, ac);
      bu[verts] = (SHEEN_AT - psi) / SHEEN_CURL;
      bk[verts] = k;
      verts++;
    };
    const emit = (k: number, side: number) => put(sx[k], sy[k], stx[k], sty[k], sh[k], sc[k], sp[k], sk[k], side);
    const crossing = (k: number, side: number) => {
      const f = sc[k] / (sc[k] - sc[k + 1]);
      let tx = stx[k] + (stx[k + 1] - stx[k]) * f;
      let ty = sty[k] + (sty[k + 1] - sty[k]) * f;
      const d = Math.hypot(tx, ty) || 1;
      tx /= d;
      ty /= d;
      put(
        sx[k] + (sx[k + 1] - sx[k]) * f,
        sy[k] + (sy[k + 1] - sy[k]) * f,
        tx,
        ty,
        sh[k] + (sh[k + 1] - sh[k]) * f,
        0,
        sp[k],
        sk[k] + (sk[k + 1] - sk[k]) * f,
        side,
      );
    };
    const close = (from: number, side: number) => {
      chunkFrom.push(from);
      chunkTo.push(verts - 1);
      chunkSide.push(side);
    };

    const chunk = () => {
      verts = 0;
      chunkFrom.length = 0;
      chunkTo.length = 0;
      chunkSide.length = 0;
      let side = sc[0] < 0 ? -1 : 1;
      let from = 0;
      emit(0, side);
      for (let k = 0; k < count; k++) {
        const next = sc[k + 1] < 0 ? -1 : 1;
        if (next !== side) {
          crossing(k, side);
          close(from, side);
          from = verts;
          side = next;
          crossing(k, side);
        } else if (verts - from >= CHUNK && k > 0) {
          close(from, side);
          from = verts;
          emit(k - 1, side);
          emit(k, side);
        }
        emit(k + 1, side);
      }
      close(from, side);
    };

    const offset = (v: number, u: number) => {
      let o = u * bh[v] * bw[v];
      const k = bk[v];
      if (o * k > 0) {
        const lim = 0.8 / Math.abs(k);
        if (Math.abs(o) > lim) o = o > 0 ? lim : -lim;
      }
      return o;
    };

    const strip = (
      g: CanvasRenderingContext2D,
      a: number,
      b: number,
      mode: number,
      lo: number,
      hi: number,
      cap: boolean,
    ) => {
      const n = b - a + 1;
      if (n < 2) return;
      for (let i = 0; i < n; i++) {
        const v = a + i;
        let ulo = lo;
        let uhi = hi;
        if (mode === 1) {
          ulo *= bm[v];
          uhi *= bm[v];
        } else if (mode === 2) {
          const c = bu[v];
          ulo = Math.min(SHEEN_EDGE, Math.max(-SHEEN_EDGE, c - lo)) * bm[v];
          uhi = Math.min(SHEEN_EDGE, Math.max(-SHEEN_EDGE, c + lo)) * bm[v];
        }
        const o1 = offset(v, ulo);
        const o2 = offset(v, uhi);
        ex[i] = bx[v] + bnx[v] * o1;
        ey[i] = by[v] + bny[v] * o1;
        fx[i] = bx[v] + bnx[v] * o2;
        fy[i] = by[v] + bny[v] * o2;
      }
      g.beginPath();
      g.moveTo(ex[0], ey[0]);
      for (let i = 1; i < n - 1; i++)
        g.quadraticCurveTo(ex[i], ey[i], (ex[i] + ex[i + 1]) / 2, (ey[i] + ey[i + 1]) / 2);
      g.lineTo(ex[n - 1], ey[n - 1]);
      g.lineTo(fx[n - 1], fy[n - 1]);
      for (let i = n - 2; i > 0; i--)
        g.quadraticCurveTo(fx[i], fy[i], (fx[i] + fx[i - 1]) / 2, (fy[i] + fy[i - 1]) / 2);
      g.lineTo(fx[0], fy[0]);
      if (cap) {
        const mx = (ex[0] + fx[0]) / 2;
        const my = (ey[0] + fy[0]) / 2;
        const span = Math.hypot(ex[0] - fx[0], ey[0] - fy[0]) * 0.22;
        g.quadraticCurveTo(mx - stx[0] * span, my - sty[0] * span, ex[0], ey[0]);
      }
      g.closePath();
      g.fill();
    };

    const halo = (spread: number, alpha: number) => {
      for (let k = 0; k <= count; k++) {
        const o = sh[k] * Math.max(Math.abs(sc[k]), FLOOR) + spread * Math.sqrt(sh[k] / half);
        const k1 = sk[k];
        const lim = k1 !== 0 ? 0.8 / Math.abs(k1) : Number.POSITIVE_INFINITY;
        const left = k1 > 0 ? Math.min(o, lim) : o;
        const right = k1 < 0 ? Math.min(o, lim) : o;
        ex[k] = sx[k] - sty[k] * left;
        ey[k] = sy[k] + stx[k] * left;
        fx[k] = sx[k] + sty[k] * right;
        fy[k] = sy[k] - stx[k] * right;
      }
      const n = count + 1;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(ex[0], ey[0]);
      for (let i = 1; i < n - 1; i++)
        ctx.quadraticCurveTo(ex[i], ey[i], (ex[i] + ex[i + 1]) / 2, (ey[i] + ey[i + 1]) / 2);
      ctx.lineTo(ex[n - 1], ey[n - 1]);
      for (let i = n - 2; i > 0; i--)
        ctx.quadraticCurveTo(fx[i], fy[i], (fx[i] + fx[i - 1]) / 2, (fy[i] + fy[i - 1]) / 2);
      ctx.lineTo(fx[0], fy[0]);
      const mx = (ex[0] + fx[0]) / 2;
      const my = (ey[0] + fy[0]) / 2;
      const span = Math.hypot(ex[0] - fx[0], ey[0] - fy[0]) * 0.22;
      ctx.quadraticCurveTo(mx - stx[0] * span, my - sty[0] * span, ex[0], ey[0]);
      ctx.closePath();
      ctx.fill();
    };

    const draw = (frac: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!top || !under) return;
      for (const r of ribbons) {
        const alpha = 1 - smooth(0, FADE, r.fade);
        if (alpha <= 0.002) continue;
        sample(r, frac);
        chunk();
        let x0 = Number.POSITIVE_INFINITY;
        let y0 = Number.POSITIVE_INFINITY;
        let x1 = Number.NEGATIVE_INFINITY;
        let y1 = Number.NEGATIVE_INFINITY;
        for (let k = 0; k <= count; k++) {
          x0 = Math.min(x0, sx[k]);
          y0 = Math.min(y0, sy[k]);
          x1 = Math.max(x1, sx[k]);
          y1 = Math.max(y1, sy[k]);
        }
        const pad = half + 4;
        const left = Math.max(0, Math.floor((x0 - pad) * dpr));
        const right = Math.min(canvas.width, Math.ceil((x1 + pad) * dpr));
        const upper = Math.max(0, Math.floor((y0 - pad) * dpr));
        const lower = Math.min(canvas.height, Math.ceil((y1 + pad) * dpr));
        if (right <= left || lower <= upper) continue;

        if (night) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = glow;
          halo(7, 0.035 * alpha);
          halo(3, 0.06 * alpha);
          ctx.globalCompositeOperation = "source-over";
        }

        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.globalAlpha = 1;
        lctx.clearRect(left, upper, right - left, lower - upper);
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (let c = chunkFrom.length - 1; c >= 0; c--) {
          const side = chunkSide[c] > 0 ? top : under;
          const a = chunkFrom[c];
          const b = chunkTo[c];
          for (const band of side.bands) {
            lctx.fillStyle = band.fill;
            lctx.globalAlpha = band.alpha;
            strip(lctx, a, b, band.inner ? 1 : 0, band.lo, band.hi, c === 0);
          }
          lctx.fillStyle = side.sheen;
          for (const [spread, weight] of SHEEN) {
            lctx.globalAlpha = side.sheenAlpha * weight;
            strip(lctx, a, b, 2, spread, 0, c === 0);
          }
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alpha * opacity;
        ctx.drawImage(layer, left, upper, right - left, lower - upper, left, upper, right - left, lower - upper);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.25, Math.max(0, (now - last) / 1000)) : STEP;
      last = now;
      acc = Math.min(acc + dt, STEP * BACKLOG);
      while (acc >= STEP) {
        acc -= STEP;
        clock += STEP;
        for (const r of ribbons) advance(r);
      }
      for (let i = ribbons.length - 1; i >= 0; i--) {
        if (!ribbons[i].held && ribbons[i].fade >= FADE) ribbons.splice(i, 1);
      }
      draw(acc / STEP);
      const busy = ribbons.some((r) => !r.held || r.quiet < 40);
      if (busy && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden || ribbons.length === 0) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const local = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const kx = box.width ? root.offsetWidth / box.width : 1;
      const ky = box.height ? root.offsetHeight / box.height : 1;
      return { x: (e.clientX - box.left) * kx, y: (e.clientY - box.top) * ky };
    };

    const holding = () => ribbons.find((r) => r.held);

    const begin = (e: PointerEvent) => {
      const at = local(e);
      const current = holding();
      if (current) current.held = false;
      const near = ribbons.find((r) => !r.held && r.fade < 0.3 && Math.hypot(r.x[0] - at.x, r.y[0] - at.y) < 48);
      if (near) {
        near.held = true;
        near.id = e.pointerId;
        near.vx = (near.x[0] - near.ox[0]) / STEP;
        near.vy = (near.y[0] - near.oy[0]) / STEP;
        near.tx = near.px = near.fromX = near.x[0];
        near.ty = near.py = near.fromY = near.y[0];
        near.toX = at.x;
        near.toY = at.y;
        near.start = clock;
        near.span = 0.05;
        near.last = clock;
        near.fx = 0;
        near.fy = 0;
        near.quiet = 0;
      } else {
        let dx = -(e.movementX || 0);
        let dy = -(e.movementY || 0);
        const d = Math.hypot(dx, dy);
        if (d < 0.5) {
          dx = 0;
          dy = 1;
        } else {
          dx /= d;
          dy /= d;
        }
        ribbons.push(createRibbon(at.x, at.y, dx, dy, rest, e.pointerId));
        if (ribbons.length > 3) ribbons.shift();
      }
      wake();
    };

    const aim = (r: Ribbon, e: PointerEvent) => {
      const at = local(e);
      r.fromX = r.tx;
      r.fromY = r.ty;
      r.toX = at.x;
      r.toY = at.y;
      const gap = clock - r.last;
      if (gap < 0.1) r.gap += (Math.max(STEP, gap) - r.gap) * 0.2;
      r.span = r.gap * 1.35;
      r.start = clock;
      r.last = clock;
      r.quiet = 0;
      wake();
    };

    const onMove = (e: PointerEvent) => {
      const r = holding();
      if (e.pointerType === "touch") {
        if (r && r.id === e.pointerId) aim(r, e);
        return;
      }
      if (!r || r.id !== e.pointerId) begin(e);
      else aim(r, e);
    };

    const onDown = (e: PointerEvent) => {
      const r = holding();
      if (e.pointerType === "touch" || !r || r.id !== e.pointerId) begin(e);
    };

    const onEnd = (e: PointerEvent) => {
      const r = holding();
      if (!r || r.id !== e.pointerId) return;
      r.held = false;
      r.quiet = 0;
      wake();
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") onEnd(e);
    };

    const resize = () => {
      const nw = root.offsetWidth;
      const nh = root.offsetHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = layer.width = Math.max(1, Math.round(w * dpr));
      canvas.height = layer.height = Math.max(1, Math.round(h * dpr));
      draw(1);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen) wake();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readColors();
      draw(1);
    }, canvas);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onEnd);
    root.addEventListener("pointerleave", onEnd);
    readColors();
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onEnd);
      root.removeEventListener("pointerleave", onEnd);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [color, underside, length, width, gravity, reduce]);

  return (
    <div
      {...props}
      ref={setRoot}
      className={cn(
        "relative isolate [touch-action:pan-y_pinch-zoom]",
        "[--miyuki-ribbon-trail-night:0] dark:[--miyuki-ribbon-trail-night:1]",
        className,
      )}
    >
      {children}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
