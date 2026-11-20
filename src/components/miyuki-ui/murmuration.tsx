"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface MurmurationProps extends ComponentProps<"div"> {
  count?: number;
  color?: string;
  speed?: number;
  interactive?: boolean;
  seed?: number | string;
  focus?: readonly [x: number, y: number];
}

const NIGHT = "--miyuki-murmuration-night";
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const WARM_STEP = STEP * 3;
const PRERUN = 80;
const SEARCH = 160;
const REF_AREA = 960 * 480;

const REACH = 48;
const SPACE = 18;
const DEPTH = 34;
const BLIND = 0.5;
const CRUISE = 72;
const SLOWEST = 48;
const FASTEST = 130;
const PERIOD = 36;

const REPEL = 300;
const ATTRACT = 35;
const ALIGN = 20;
const DAMP = 5;
const TURN = 3.2;
const ROOST = 120;
const LEAD = 0.7;
const EDGE = 300;
const LOOK = 0.9;
const LONER = 70;
const STRAY = 70;
const FALCON = 120;
const FALCON_PUSH = 800;
const FALCON_SIDE = 240;
const FLEE = 850;
const FLEE_TAU = 0.3;
const FLEE_BOOST = 1.6;
const REGROUP = 260;
const REGROUP_TAU = 1.1;

const BANDS = 6;
const BIRD = 5.2;
const BIRD_WIDTH = 0.58;
const SHOULDER = 0.24;
const WASH_CELL = 5;
const WASH_KNEE = 0.35;
const DAY_INK = [0.42, 0.3];
const NIGHT_INK = [0.3, 0.3];
const DAY_WASH = 0.5;
const NIGHT_WASH = 0.2;

const NEXT = [
  1, 0, 0, -1, 1, 0, 0, 1, 0, 1, 1, 0, -1, -1, 1, 0, -1, 1, 1, -1, 1, -1, 0, 1, 0, 0, 1, 1, 0, 1, -1, 1, 1, 0, 1, 1, 1,
  1, 1,
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);

function blur(src: Float32Array, dst: Float32Array, len: number, lines: number, stride: number, pitch: number) {
  for (let l = 0; l < lines; l++) {
    const o = l * pitch;
    let sum = src[o] + src[o + stride];
    for (let i = 0; i < len; i++) {
      if (i + 2 < len) sum += src[o + (i + 2) * stride];
      dst[o + i * stride] = sum * 0.2;
      if (i >= 2) sum -= src[o + (i - 2) * stride];
    }
  }
}

export function Murmuration({
  count = 700,
  color = "var(--foreground)",
  speed = 1,
  interactive = true,
  seed = "murmuration",
  focus,
  className,
  children,
  ...props
}: MurmurationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const fx = focus?.[0] ?? 0.62;
  const fy = focus?.[1] ?? 0.66;
  const live = useRef({ color, speed, interactive, fx, fy });
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const changed = live.current.color !== color;
    live.current = { color, speed, interactive, fx, fy };
    if (changed) refresh.current?.();
  }, [color, speed, interactive, fx, fy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const still = !!reduce;
    canvas.style.opacity = "0";
    const cap = clamp(Math.ceil(Math.max(0, count) * 1.3), 0, 2400);
    const f32 = () => new Float32Array(cap);
    const X = f32();
    const Y = f32();
    const Z = f32();
    const TH = f32();
    const OM = f32();
    const SP = f32();
    const VZ = f32();
    const PX = f32();
    const PY = f32();
    const PZ = f32();
    const PTH = f32();
    const PREF = f32();
    const HX = f32();
    const HY = f32();
    const SX = f32();
    const SY = f32();
    const SZ = f32();
    const CX = f32();
    const CY = f32();
    const CZ = f32();
    const CW = f32();
    const AL = f32();
    const VS = f32();
    const WT = f32();
    const FB = f32();
    const NB = f32();
    const FR = f32();
    const DIS = f32();
    const FAT = f32();
    const FPW = f32();
    const FDX = f32();
    const FDY = f32();
    const STATE = [X, Y, Z, TH, OM, SP, VZ];
    const SAVE = STATE.map(() => f32());
    const SUMS = [SX, SY, SZ, CX, CY, CZ, CW, AL, VS, WT, FB, NB];
    const CELL = new Int32Array(cap);
    const ORDER = new Int32Array(cap);
    const BAND = new Uint8Array(cap);
    const RANGE = new Int32Array(26);
    const R = [0, 0];

    let n = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let gx = 0;
    let gy = 0;
    let gz = 0;
    let START = new Int32Array(1);
    let FILL = new Int32Array(1);
    let OCC = new Int32Array(1);
    let COMP = new Int32Array(1);
    let STACK = new Int32Array(1);
    let GSX = new Float32Array(1);
    let GSY = new Float32Array(1);
    let main = 0;
    let mainCount = 0;
    let mainX = 0;
    let mainY = 0;

    const wash = document.createElement("canvas");
    const wctx = wash.getContext("2d");
    let ww = 0;
    let wh = 0;
    let WD = new Float32Array(0);
    let WT2 = new Float32Array(0);
    let img: ImageData | null = null;
    const tint = [0, 0, 0, 0];
    let night = false;
    let fills: string[] = [];
    let colorKey = "";

    let time = 0;
    let acc = 0;
    let last = 0;
    let raf = 0;
    let warmRaf = 0;
    let onScreen = false;
    let ready = false;
    let pending = 0;
    let best = 0;
    let bestTime = 0;
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0, in: false, k: 0 };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      colorKey = live.current.color;
      const [r, g, b, a] = toRgba(colorKey, canvas);
      const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
      const [base, rise] = night ? NIGHT_INK : DAY_INK;
      fills = [];
      for (let k = 0; k < BANDS; k++) fills.push(`rgba(${rgb}, ${(a * (base + (rise * k) / (BANDS - 1))).toFixed(3)})`);
      tint[0] = Math.round(r * 255);
      tint[1] = Math.round(g * 255);
      tint[2] = Math.round(b * 255);
      tint[3] = a * (night ? NIGHT_WASH : DAY_WASH) * 255;
    };

    const roost = (at: number) => {
      const { fx: cx, fy: cy } = live.current;
      const a = (at / PERIOD) * TAU;
      const ax = Math.min(w, h * 2.2) * 0.21;
      const ay = h * 0.17;
      const m = Math.min(w, h) * 0.26;
      R[0] = clamp(cx * w + ax * Math.sin(a) + ax * 0.16 * Math.sin(a * 0.37 + 1.3), m, w - m);
      R[1] = clamp(cy * h + ay * Math.sin(2 * a) + ay * 0.22 * Math.sin(a * 0.61 + 0.4), m, h - m);
    };

    const layout = () => {
      gx = Math.ceil((w + 2 * REACH) / REACH) + 1;
      gy = Math.ceil((h + 2 * REACH) / REACH) + 1;
      gz = Math.ceil((2 * DEPTH + 2 * REACH) / REACH) + 1;
      START = new Int32Array(gx * gy * gz + 1);
      FILL = new Int32Array(gx * gy * gz);
      OCC = new Int32Array(gx * gy);
      COMP = new Int32Array(gx * gy);
      STACK = new Int32Array(gx * gy);
      GSX = new Float32Array(gx * gy);
      GSY = new Float32Array(gx * gy);
      ww = Math.ceil(w / WASH_CELL) + 3;
      wh = Math.ceil(h / WASH_CELL) + 3;
      WD = new Float32Array(ww * wh);
      WT2 = new Float32Array(ww * wh);
      wash.width = ww;
      wash.height = wh;
      img = wctx ? wctx.createImageData(ww, wh) : null;
    };

    const init = () => {
      const rng = createRng(`murmuration:${seed}`);
      n = clamp(Math.round(Math.max(0, count) * clamp((w * h) / REF_AREA, 0.45, 1.3)), 0, cap);
      pending = PRERUN + SEARCH;
      best = 0;
      time = PERIOD * (0.18 + 0.06 * rng()) - (PRERUN + SEARCH * 0.5) * WARM_STEP;
      roost(time);
      const rx = R[0];
      const ry = R[1];
      roost(time + 1);
      const ang = Math.atan2(R[1] - ry, R[0] - rx) + rng.range(-0.6, 0.6);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const len = Math.min(w, h * 2) * 0.16;
      const bend = rng.range(-0.5, 0.5);
      for (let i = 0; i < n; i++) {
        const u = (rng() + rng() + rng() - 1.5) / 1.5;
        const v = (rng() + rng() - 1) * 0.42 * Math.sqrt(1 - u * u * 0.8);
        const along = u * len;
        const across = v * len + bend * u * u * len;
        X[i] = rx - ca * len * 1.2 + ca * along - sa * across;
        Y[i] = ry - sa * len * 1.2 + sa * along + ca * across;
        Z[i] = (rng() * 2 - 1) * DEPTH * 0.6;
        TH[i] = ang + bend * u + (rng() - 0.5) * 0.25;
        OM[i] = 0;
        PREF[i] = 0.9 + 0.2 * rng();
        SP[i] = PREF[i] * CRUISE;
        VZ[i] = 0;
        FR[i] = 0;
        DIS[i] = 0;
        FAT[i] = -1;
      }
    };

    const groups = () => {
      const cols = gx * gy;
      OCC.fill(0);
      GSX.fill(0);
      GSY.fill(0);
      COMP.fill(-1);
      for (let i = 0; i < n; i++) {
        const k = CELL[i] % cols;
        OCC[k]++;
        GSX[k] += X[i];
        GSY[k] += Y[i];
      }
      main = -1;
      mainCount = 0;
      let label = 0;
      for (let k0 = 0; k0 < cols; k0++) {
        if (OCC[k0] === 0 || COMP[k0] >= 0) continue;
        let top = 0;
        let total = 0;
        let sx = 0;
        let sy = 0;
        STACK[top++] = k0;
        COMP[k0] = label;
        while (top > 0) {
          const k = STACK[--top];
          total += OCC[k];
          sx += GSX[k];
          sy += GSY[k];
          const kx = k % gx;
          const ky = (k / gx) | 0;
          for (let oy = -1; oy <= 1; oy++) {
            const ny = ky + oy;
            if (ny < 0 || ny >= gy) continue;
            for (let ox = -1; ox <= 1; ox++) {
              const nx = kx + ox;
              if (nx < 0 || nx >= gx) continue;
              const k2 = ny * gx + nx;
              if (OCC[k2] === 0 || COMP[k2] >= 0) continue;
              COMP[k2] = label;
              STACK[top++] = k2;
            }
          }
        }
        if (total > mainCount) {
          mainCount = total;
          main = label;
          mainX = sx / total;
          mainY = sy / total;
        }
        label++;
      }
    };

    const neighbours = () => {
      const ib = 1 / (1 - BLIND);
      const iSpace = 1 / SPACE;
      const iSpan = 1 / (REACH - SPACE);
      const rr = REACH * REACH;
      const iR = 1 / REACH;
      const st = START;
      const ord = ORDER;
      for (let iz = 0; iz < gz; iz++) {
        for (let iy = 0; iy < gy; iy++) {
          for (let ix = 0; ix < gx; ix++) {
            const c = (iz * gy + iy) * gx + ix;
            const s0 = st[c];
            const s1 = st[c + 1];
            if (s0 === s1) continue;
            let nr = 0;
            for (let k = 0; k < 13; k++) {
              const jx = ix + NEXT[k * 3];
              const jy = iy + NEXT[k * 3 + 1];
              const jz = iz + NEXT[k * 3 + 2];
              if (jx < 0 || jx >= gx || jy < 0 || jy >= gy || jz >= gz) continue;
              const c2 = (jz * gy + jy) * gx + jx;
              if (st[c2] === st[c2 + 1]) continue;
              RANGE[nr * 2] = st[c2];
              RANGE[nr * 2 + 1] = st[c2 + 1];
              nr++;
            }
            for (let p = s0; p < s1; p++) {
              const a = ord[p];
              const xa = X[a];
              const ya = Y[a];
              const za = Z[a];
              const hxa = HX[a];
              const hya = HY[a];
              const vza = VZ[a];
              let al = 0;
              let cw = 0;
              let vs = 0;
              let nb = 0;
              let wt = 0;
              let fb = 0;
              let sx = 0;
              let sy = 0;
              let sz = 0;
              let cx = 0;
              let cy = 0;
              let cz = 0;
              for (let k = -1; k < nr; k++) {
                const r0 = k < 0 ? p + 1 : RANGE[k * 2];
                const r1 = k < 0 ? s1 : RANGE[k * 2 + 1];
                for (let q = r0; q < r1; q++) {
                  const b = ord[q];
                  const dx = X[b] - xa;
                  const dy = Y[b] - ya;
                  const dz = Z[b] - za;
                  const d2 = dx * dx + dy * dy + dz * dz;
                  if (d2 >= rr || d2 < 1e-6) continue;
                  const d = Math.sqrt(d2);
                  const id = 1 / d;
                  const wgt = 1 - d * iR;
                  const hxb = HX[b];
                  const hyb = HY[b];
                  const ca = (hxa * dx + hya * dy) * id;
                  const cb = -(hxb * dx + hyb * dy) * id;
                  const va = ca > -BLIND ? Math.min(1, (ca + BLIND) * ib) : 0;
                  const vb = cb > -BLIND ? Math.min(1, (cb + BLIND) * ib) : 0;
                  const sn = (hxa * hyb - hya * hxb) * wgt;
                  const wa = wgt * va;
                  const wb = wgt * vb;
                  al += sn * va;
                  AL[b] -= sn * vb;
                  cw += wa;
                  CW[b] += wb;
                  vs += VZ[b] * wa;
                  VS[b] += vza * wb;
                  nb += va;
                  NB[b] += vb;
                  wt += wgt;
                  WT[b] += wgt;
                  fb += ca * wgt;
                  FB[b] += cb * wgt;
                  if (d < SPACE) {
                    const f = (SPACE - d) * iSpace * id;
                    sx -= dx * f;
                    sy -= dy * f;
                    sz -= dz * f;
                    SX[b] += dx * f;
                    SY[b] += dy * f;
                    SZ[b] += dz * f;
                  } else {
                    const x = (d - SPACE) * iSpan;
                    const f = 4 * x * (1 - x) * id;
                    cx += dx * f * va;
                    cy += dy * f * va;
                    cz += dz * f * va;
                    CX[b] -= dx * f * vb;
                    CY[b] -= dy * f * vb;
                    CZ[b] -= dz * f * vb;
                  }
                }
              }
              AL[a] += al;
              CW[a] += cw;
              VS[a] += vs;
              NB[a] += nb;
              WT[a] += wt;
              FB[a] += fb;
              SX[a] += sx;
              SY[a] += sy;
              SZ[a] += sz;
              CX[a] += cx;
              CY[a] += cy;
              CZ[a] += cz;
            }
          }
        }
      }
    };

    const step = (dt: number) => {
      time += dt;
      for (let i = 0; i < n; i++) {
        HX[i] = Math.cos(TH[i]);
        HY[i] = Math.sin(TH[i]);
      }
      for (const a of SUMS) a.fill(0, 0, n);
      const cells = gx * gy * gz;
      START.fill(0);
      for (let i = 0; i < n; i++) {
        const ix = clamp(Math.floor((X[i] + REACH) / REACH), 0, gx - 1);
        const iy = clamp(Math.floor((Y[i] + REACH) / REACH), 0, gy - 1);
        const iz = clamp(Math.floor((Z[i] + DEPTH + REACH) / REACH), 0, gz - 1);
        const c = (iz * gy + iy) * gx + ix;
        CELL[i] = c;
        START[c + 1]++;
      }
      for (let c = 0; c < cells; c++) START[c + 1] += START[c];
      FILL.set(START.subarray(0, cells));
      for (let i = 0; i < n; i++) ORDER[FILL[CELL[i]]++] = i;
      groups();
      neighbours();

      let mx = 0;
      let my = 0;
      for (let i = 0; i < n; i++) {
        mx += X[i];
        my += Y[i];
      }
      mx /= n || 1;
      my /= n || 1;
      roost(time);
      const rx = R[0];
      const ry = R[1];
      const reach = Math.min(w, h) * 0.45;
      const margin = clamp(Math.min(w, h) * 0.2, 48, 110);
      const zl = DEPTH * 0.6;
      const cols = gx * gy;
      const fk = pointer.k;
      const fpx = pointer.x + pointer.vx * 0.12;
      const fpy = pointer.y + pointer.vy * 0.12;

      for (let i = 0; i < n; i++) {
        const x = X[i];
        const y = Y[i];
        const z = Z[i];
        const c = HX[i];
        const s = HY[i];
        let ax = SX[i] * REPEL;
        let ay = SY[i] * REPEL;
        let az = SZ[i] * REPEL;
        let align = 0;
        let vzm = VZ[i];
        if (CW[i] > 0.001) {
          const k = ATTRACT / NB[i];
          ax += CX[i] * k;
          ay += CY[i] * k;
          az += CZ[i] * k;
          align = AL[i] / CW[i];
          vzm = VS[i] / CW[i];
        }
        if (NB[i] < 3) {
          const gxv = mx - x;
          const gyv = my - y;
          const gd = Math.sqrt(gxv * gxv + gyv * gyv) || 1;
          ax += (gxv / gd) * LONER;
          ay += (gyv / gd) * LONER;
        }
        if (COMP[CELL[i] % cols] !== main) {
          const gxv = mainX - x;
          const gyv = mainY - y;
          const gd = Math.sqrt(gxv * gxv + gyv * gyv) || 1;
          ax += (gxv / gd) * STRAY;
          ay += (gyv / gd) * STRAY;
        }

        const rdx = rx - x;
        const rdy = ry - y;
        const rd = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        const rq = rd / reach;
        const front = WT[i] > 0.001 ? clamp(0.5 - (1.5 * FB[i]) / WT[i], 0, 1) : 1;
        const lead = LEAD * clamp(1.6 - rq, 0, 1);
        const pull = ROOST * Math.min(1.8, rq * Math.sqrt(rq)) * (1 - lead + lead * front);
        ax += (rdx / rd) * pull;
        ay += (rdy / rd) * pull;

        const ex = x + c * SP[i] * LOOK;
        const ey = y + s * SP[i] * LOOK;
        if (ex < margin) ax += EDGE * Math.min(2.5, (margin - ex) / margin);
        else if (ex > w - margin) ax -= EDGE * Math.min(2.5, (ex - (w - margin)) / margin);
        if (ey < margin) ay += EDGE * Math.min(2.5, (margin - ey) / margin);
        else if (ey > h - margin) ay -= EDGE * Math.min(2.5, (ey - (h - margin)) / margin);
        if (z > zl) az -= 260 * ((z - zl) / (DEPTH - zl));
        else if (z < -zl) az += 260 * ((-zl - z) / (DEPTH - zl));

        let fr = FR[i];
        let dis = DIS[i];
        if (FAT[i] >= 0 && time >= FAT[i]) {
          fr = Math.max(fr, FPW[i]);
          dis = Math.max(dis, FPW[i]);
          FAT[i] = -1;
        }
        let side = 0;
        let alarm = 0;
        if (fk > 0.001) {
          const px = x - fpx;
          const py = y - fpy;
          const pd2 = px * px + py * py;
          if (pd2 < FALCON * FALCON) {
            const pd = Math.sqrt(pd2) || 1;
            const f = (1 - pd / FALCON) ** 2 * fk;
            ax += (px / pd) * FALCON_PUSH * f;
            ay += (py / pd) * FALCON_PUSH * f;
            side = (-px * s + py * c >= 0 ? FALCON_SIDE : -FALCON_SIDE) * f;
            alarm = f;
            dis = Math.max(dis, f);
          }
        }
        if (fr > 0.002) {
          if (FAT[i] < 0) {
            ax += FDX[i] * FLEE * fr;
            ay += FDY[i] * FLEE * fr;
          }
          fr *= Math.exp(-dt / FLEE_TAU);
        } else fr = 0;
        FR[i] = fr;
        if (dis > 0.002) {
          const gxv = mainX - x;
          const gyv = mainY - y;
          const gd = Math.sqrt(gxv * gxv + gyv * gyv) || 1;
          const k = REGROUP * Math.min(1, dis * 1.5) * Math.min(1, gd / 60) * (1 - fr);
          ax += (gxv / gd) * k;
          ay += (gyv / gd) * k;
          dis *= Math.exp(-dt / REGROUP_TAU);
        } else dis = 0;
        DIS[i] = dis;

        const calm = clamp(1.3 - rq * 0.5, 0.15, 1);
        const whim =
          calm *
          (0.77 *
            Math.sin(0.0126 * x + 0.0072 * y + 0.43 * time) *
            Math.cos(0.0096 * y - 0.0054 * x - 0.31 * time + 1.7) +
            0.42 * Math.sin(0.0048 * x - 0.0132 * y + 0.23 * time + 4));
        const lat = -ax * s + ay * c + side;
        const lon = ax * c + ay * s;
        const sp = SP[i];
        let om = OM[i];
        om += (ALIGN * (1 - 0.6 * Math.max(fr, dis * 0.7)) * align + DAMP * (lat / sp + whim - om)) * dt;
        const omMax = TURN + 5 * fr + 3 * alarm;
        om = clamp(om, -omMax, omMax);
        OM[i] = om;
        PTH[i] = TH[i];
        TH[i] += om * dt;
        if (TH[i] > Math.PI || TH[i] < -Math.PI) {
          const shift = wrap(TH[i]) - TH[i];
          TH[i] += shift;
          PTH[i] += shift;
        }
        const target = PREF[i] * CRUISE * (1 + FLEE_BOOST * fr + 0.6 * alarm);
        SP[i] = clamp(sp + (lon * 0.5 + (target - sp) * 0.8) * dt, SLOWEST, FASTEST * (1 + 0.5 * fr));
        const vzMax = SP[i] * 0.4;
        VZ[i] = clamp(VZ[i] + (az + (vzm - VZ[i]) * 2 - VZ[i] * 0.6) * dt, -vzMax, vzMax);
        PX[i] = x;
        PY[i] = y;
        PZ[i] = z;
        X[i] = x + Math.cos(TH[i]) * SP[i] * dt;
        Y[i] = y + Math.sin(TH[i]) * SP[i] * dt;
        Z[i] = z + VZ[i] * dt;
      }
    };

    const shape = () => {
      if (n === 0 || mainCount < n * 0.97) return 0;
      let cx = 0;
      let cy = 0;
      let hx = 0;
      let hy = 0;
      let lx = w;
      let ly = h;
      let ux = 0;
      let uy = 0;
      for (let i = 0; i < n; i++) {
        cx += X[i];
        cy += Y[i];
        hx += Math.cos(TH[i]);
        hy += Math.sin(TH[i]);
        lx = Math.min(lx, X[i]);
        ux = Math.max(ux, X[i]);
        ly = Math.min(ly, Y[i]);
        uy = Math.max(uy, Y[i]);
      }
      cx /= n;
      cy /= n;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx;
        const dy = Y[i] - cy;
        sxx += dx * dx;
        syy += dy * dy;
        sxy += dx * dy;
      }
      const tr = (sxx + syy) / 2;
      const det = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
      const long = Math.min(3, Math.sqrt((tr + det) / Math.max(1, tr - det)));
      const polar = Math.sqrt(hx * hx + hy * hy) / n;
      const edge = Math.min(w, h) * 0.08;
      const inside = lx > edge && ly > edge && ux < w - edge && uy < h - edge ? 1 : 0.5;
      const { fx: tx, fy: ty } = live.current;
      const off = Math.hypot(cx / w - tx - 0.06, cy / h - ty);
      const near = 1 - 0.8 * Math.min(1, off / 0.35);
      const size = clamp(Math.sqrt(tr / n) / (Math.min(w, h * 2) * 0.09), 0.5, 1.3);
      return long * inside * near * size * (polar > 0.55 ? 1 : 0.5);
    };

    const settle = () => {
      PX.set(X);
      PY.set(Y);
      PZ.set(Z);
      PTH.set(TH);
    };

    const warm = (budget: number) => {
      const t0 = performance.now();
      while (pending > 0) {
        step(WARM_STEP);
        pending--;
        if (pending < SEARCH && pending % 4 === 0) {
          const score = shape();
          if (score > best) {
            best = score;
            bestTime = time;
            for (let k = 0; k < STATE.length; k++) SAVE[k].set(STATE[k]);
          }
        }
        if (pending % 8 === 0 && performance.now() - t0 > budget) return false;
      }
      if (best > 0) {
        for (let k = 0; k < STATE.length; k++) STATE[k].set(SAVE[k]);
        time = bestTime;
      }
      settle();
      ready = true;
      return true;
    };

    const startle = (cx: number, cy: number) => {
      for (let i = 0; i < n; i++) {
        const dx = X[i] - cx;
        const dy = Y[i] - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        FAT[i] = time + d / 700;
        FPW[i] = clamp(1.25 - d / 520, 0.35, 1);
        FDX[i] = d < 2 ? Math.cos(TH[i]) : dx / d;
        FDY[i] = d < 2 ? Math.sin(TH[i]) : dy / d;
      }
    };

    const paintWash = (alpha: number) => {
      if (!wctx || !img || tint[3] <= 0) return;
      WD.fill(0);
      const q = 1 / WASH_CELL;
      let x0 = ww;
      let y0 = wh;
      let x1 = 0;
      let y1 = 0;
      for (let i = 0; i < n; i++) {
        const fx = (PX[i] + (X[i] - PX[i]) * alpha) * q + 1;
        const fy = (PY[i] + (Y[i] - PY[i]) * alpha) * q + 1;
        if (fx < 0 || fy < 0 || fx >= ww - 1 || fy >= wh - 1) continue;
        const ix = fx | 0;
        const iy = fy | 0;
        x0 = Math.min(x0, ix);
        x1 = Math.max(x1, ix);
        y0 = Math.min(y0, iy);
        y1 = Math.max(y1, iy);
        const tx = fx - ix;
        const ty = fy - iy;
        const k = iy * ww + ix;
        WD[k] += (1 - tx) * (1 - ty);
        WD[k + 1] += tx * (1 - ty);
        WD[k + ww] += (1 - tx) * ty;
        WD[k + ww + 1] += tx * ty;
      }
      if (x1 < x0) return;
      x0 = Math.max(0, x0 - 6);
      y0 = Math.max(0, y0 - 6);
      x1 = Math.min(ww - 1, x1 + 6);
      y1 = Math.min(wh - 1, y1 + 6);
      for (let k = 0; k < 2; k++) {
        blur(WD, WT2, ww, wh, 1, ww);
        blur(WT2, WD, wh, ww, ww, 1);
      }
      const data = img.data;
      const [r, g, b, top] = tint;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0, k = y * ww + x0, j = k * 4; x <= x1; x++, k++, j += 4) {
          const v = WD[k] * WD[k];
          data[j] = r;
          data[j + 1] = g;
          data[j + 2] = b;
          data[j + 3] = (top * v) / (v + WASH_KNEE);
        }
      }
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      wctx.putImageData(img, 0, 0, x0, y0, bw, bh);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        wash,
        x0 + 0.5,
        y0 + 0.5,
        bw - 1,
        bh - 1,
        (x0 - 1) * WASH_CELL,
        (y0 - 1) * WASH_CELL,
        (bw - 1) * WASH_CELL,
        (bh - 1) * WASH_CELL,
      );
    };

    const paint = (alpha: number) => {
      if (live.current.color !== colorKey) readColors();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!ready) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintWash(alpha);
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      for (let i = 0; i < n; i++) {
        const z = PZ[i] + (Z[i] - PZ[i]) * alpha;
        BAND[i] = clamp(Math.floor(((z + DEPTH) / (2 * DEPTH)) * BANDS), 0, BANDS - 1);
      }
      for (let b = 0; b < BANDS; b++) {
        ctx.beginPath();
        let any = false;
        const depth = 0.86 + (0.28 * b) / (BANDS - 1);
        for (let i = 0; i < n; i++) {
          if (BAND[i] !== b) continue;
          any = true;
          const x = PX[i] + (X[i] - PX[i]) * alpha;
          const y = PY[i] + (Y[i] - PY[i]) * alpha;
          const th = PTH[i] + (TH[i] - PTH[i]) * alpha;
          const c = Math.cos(th);
          const s = Math.sin(th);
          const sp = SP[i];
          const vz = VZ[i];
          const fast = clamp((sp - CRUISE) / (FASTEST - CRUISE), 0, 1);
          const len = (BIRD + 2.4 * fast) * depth * (sp / Math.sqrt(sp * sp + vz * vz));
          const hw = (BIRD_WIDTH + 0.4 * Math.min(1, Math.abs(OM[i]) / 2.6)) * depth;
          const kx = x + c * len * SHOULDER;
          const ky = y + s * len * SHOULDER;
          ctx.moveTo(x + c * len * 0.45, y + s * len * 0.45);
          ctx.lineTo(kx - s * hw, ky + c * hw);
          ctx.lineTo(x - c * len * 0.55, y - s * len * 0.55);
          ctx.lineTo(kx + s * hw, ky - c * hw);
          ctx.closePath();
        }
        if (!any) continue;
        ctx.fillStyle = fills[b];
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : STEP;
      last = now;
      const target = pointer.in && live.current.interactive ? 1 : 0;
      pointer.k += (target - pointer.k) * (1 - Math.exp(-dt / 0.25));
      acc = Math.min(acc + dt * Math.max(0, live.current.speed), STEP * 4);
      while (acc >= STEP) {
        step(STEP);
        acc -= STEP;
      }
      paint(acc / STEP);
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && ready;
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
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w === 0 || h === 0) return;
      if (fills.length === 0) readColors();
      layout();
      if (ready) {
        paint(1);
        return;
      }
      if (warmRaf) return;
      init();
      const tick = () => {
        if (!warm(10)) {
          warmRaf = requestAnimationFrame(tick);
          return;
        }
        warmRaf = 0;
        paint(1);
        canvas.style.opacity = "1";
        sync();
      };
      tick();
    };

    const local = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      const now = event.timeStamp / 1000;
      const gap = now - pointer.t;
      if (pointer.in && gap > 0) {
        const k = 1 - Math.exp(-gap / 0.08);
        const span = Math.max(0.008, gap);
        pointer.vx += ((x - pointer.x) / span - pointer.vx) * k;
        pointer.vy += ((y - pointer.y) / span - pointer.vy) * k;
      } else if (!pointer.in) {
        pointer.vx = 0;
        pointer.vy = 0;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.t = now;
      pointer.in = true;
    };
    const onLeave = () => {
      pointer.in = false;
      pointer.vx = 0;
      pointer.vy = 0;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") onLeave();
    };
    const onClick = (event: MouseEvent) => {
      if (still || !ready || !live.current.interactive) return;
      if ((event.target as Element | null)?.closest(OWN_CLICKS)) return;
      const [x, y] = local(event);
      startle(x, y);
    };

    refresh.current = () => {
      readColors();
      if (!raf) paint(1);
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
      if (!raf) paint(1);
    }, root);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("click", onClick);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(warmRaf);
      raf = 0;
      warmRaf = 0;
      refresh.current = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("click", onClick);
    };
  }, [count, seed, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-murmuration-night:0] dark:[--miyuki-murmuration-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full opacity-0 transition-opacity duration-700 ease-out" />
      </div>
      {children}
    </div>
  );
}
