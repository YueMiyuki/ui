"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface RainOnGlassProps extends ComponentProps<"div"> {
  intensity?: number;
  fog?: number;
  wind?: number;
  overlay?: ReactNode;
}

const NIGHT = "--miyuki-rain-on-glass-night";
const MAX = 2000;
const CELL = 3;
const HASH = 24;
const PAD = 24;
const MARGIN = 48;
const SLIDE = 6.2;
const LENS = 2.6;
const FIELD = 0.11;
const BEAD = 2.4;
const DRY = 0.085;
const FOG_BACK = 4;
const WARM = 18;
const SPRITE = 128;
const TAU = Math.PI * 2;

interface Look {
  haze: string;
  hazeAlpha: number;
  room: string;
  shine: number;
  rim: string;
  rimAlpha: number;
  beadRim: string;
  glint: string;
  glintAlpha: number;
  beadGlint: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function readLook(el: Element): Look {
  const night = cssVar(NIGHT, el) === "1";
  if (night) {
    return {
      haze: rgba("color-mix(in oklab, var(--background) 84%, var(--brand))", 1, el),
      hazeAlpha: 0.3,
      room: "",
      shine: 0.85,
      rim: "color-mix(in oklab, var(--background) 55%, black)",
      rimAlpha: 0.75,
      beadRim: rgba("color-mix(in oklab, var(--background) 55%, black)", 0.5, el),
      glint: "color-mix(in oklab, var(--foreground) 88%, var(--brand))",
      glintAlpha: 0.7,
      beadGlint: rgba("color-mix(in oklab, var(--foreground) 88%, var(--brand))", 0.55, el),
    };
  }
  return {
    haze: rgba("color-mix(in oklab, var(--background) 70%, white)", 1, el),
    hazeAlpha: 0.3,
    room: rgba("var(--background)", 0.14, el),
    shine: 0.55,
    rim: "color-mix(in oklab, var(--brand-strong) 55%, var(--foreground))",
    rimAlpha: 0.6,
    beadRim: rgba("color-mix(in oklab, var(--brand-strong) 55%, var(--foreground))", 0.4, el),
    glint: "white",
    glintAlpha: 0.95,
    beadGlint: "rgba(255, 255, 255, 0.8)",
  };
}

function makeCanvas(width = 1, height = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function placeMedia(el: Element, nw: number, nh: number, bw: number, bh: number): [number, number, number, number] {
  const style = getComputedStyle(el);
  const fit = style.objectFit;
  let dw = bw;
  let dh = bh;
  if (fit === "cover" || fit === "contain" || fit === "scale-down" || fit === "none") {
    const s = fit === "cover" ? Math.max(bw / nw, bh / nh) : fit === "none" ? 1 : Math.min(bw / nw, bh / nh);
    const k = fit === "scale-down" ? Math.min(1, s) : s;
    dw = nw * k;
    dh = nh * k;
  }
  const [px, py] = style.objectPosition.split(/\s+/);
  const at = (token: string | undefined, free: number) => {
    if (token?.endsWith("%")) return (free * parseFloat(token)) / 100;
    if (token?.endsWith("px")) return parseFloat(token);
    return free / 2;
  };
  return [at(px, bw - dw), at(py, bh - dh), dw, dh];
}

function smoothNoise(cols: number, rows: number, scale: number) {
  const gx = Math.ceil(cols / scale) + 2;
  const gy = Math.ceil(rows / scale) + 2;
  const grid = new Float32Array(gx * gy);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
  return (cx: number, cy: number) => {
    const fx = cx / scale;
    const fy = cy / scale;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = grid[iy * gx + ix];
    const b = grid[iy * gx + ix + 1];
    const c = grid[(iy + 1) * gx + ix];
    const d = grid[(iy + 1) * gx + ix + 1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

export function RainOnGlass({
  intensity = 0.5,
  fog = 0.4,
  wind = 0,
  overlay,
  className,
  children,
  ...props
}: RainOnGlassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const back = backRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !back || !ctx) return;

    const still = !!reduce;
    const rain = clamp(intensity, 0, 1);
    const haze = clamp(fog, 0, 1);
    const lean = clamp(wind, -1, 1) * 0.6;
    const fogAlpha = Math.min(1, haze * 1.5);

    const x = new Float32Array(MAX);
    const y = new Float32Array(MAX);
    const r = new Float32Array(MAX);
    const vy = new Float32Array(MAX);
    const drift = new Float32Array(MAX);
    const stuck = new Float32Array(MAX);
    const travel = new Float32Array(MAX);
    const gap = new Float32Array(MAX);
    const wob = new Float32Array(MAX);
    const wobV = new Float32Array(MAX);
    const aspect = new Float32Array(MAX);
    const alive = new Uint8Array(MAX);
    const fresh = new Uint8Array(MAX);
    const hashItems = new Int32Array(MAX);
    let n = 0;

    const world = makeCanvas();
    const bright = makeCanvas();
    const quarter = makeCanvas();
    const eighth = makeCanvas();
    const fogImg = makeCanvas();
    const mask = makeCanvas();
    const sprite = makeCanvas(SPRITE, SPRITE);
    const wctx = world.getContext("2d");
    const bctx = bright.getContext("2d");
    const qctx = quarter.getContext("2d");
    const ectx = eighth.getContext("2d");
    const fctx = fogImg.getContext("2d");
    const mctx = mask.getContext("2d");
    const sctx = sprite.getContext("2d");
    if (!wctx || !bctx || !qctx || !ectx || !fctx || !mctx || !sctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let fogF = new Float32Array(0);
    let fogT = new Float32Array(0);
    let maskData: ImageData | null = null;
    let hCols = 0;
    let hRows = 0;
    let hashStart = new Int32Array(0);
    let maxR = 4;
    let below: CanvasPattern | null = null;
    let above: CanvasPattern | null = null;
    let look = readLook(canvas);
    let hasVideo = false;
    let nextHit = 0;
    let nextMist = 0;
    let fogAcc = 0;
    let raf = 0;
    let last = 0;
    let onScreen = false;

    const add = (px: number, py: number, pr: number, isFresh: boolean) => {
      if (n >= MAX) return -1;
      const i = n++;
      x[i] = px;
      y[i] = py;
      r[i] = pr;
      vy[i] = 0;
      drift[i] = (Math.random() - 0.5) * 0.16;
      stuck[i] = 0;
      travel[i] = 0;
      gap[i] = pr * (0.5 + Math.random() * 1.2);
      wob[i] = 0;
      wobV[i] = 0;
      aspect[i] = (Math.random() - 0.5) * 0.12;
      alive[i] = 1;
      fresh[i] = isFresh ? 1 : 0;
      return i;
    };

    const clearFog = (px: number, py: number, radius: number, amount: number) => {
      if (cols === 0) return;
      const c0 = Math.max(0, Math.floor((px - radius) / CELL));
      const c1 = Math.min(cols - 1, Math.floor((px + radius) / CELL));
      const r0 = Math.max(0, Math.floor((py - radius) / CELL));
      const r1 = Math.min(rows - 1, Math.floor((py + radius) / CELL));
      const inv = 1 / (radius * radius);
      for (let cy = r0; cy <= r1; cy++) {
        const dy = (cy + 0.5) * CELL - py;
        for (let cx = c0; cx <= c1; cx++) {
          const dx = (cx + 0.5) * CELL - px;
          const q = (dx * dx + dy * dy) * inv;
          if (q >= 1) continue;
          const f = Math.min(1, (1 - Math.sqrt(q)) * 5);
          fogF[cy * cols + cx] *= 1 - amount * f;
        }
      }
    };

    const hit = () => {
      const u = Math.random();
      const pr = 0.9 + (4.8 + 3.6 * rain) * u ** 2.3;
      const i = add(Math.random() * (w + 20) - 10, Math.random() * (h + 10) - 12, pr, true);
      if (i >= 0) clearFog(x[i], y[i], pr * 1.8, 0.75);
    };

    const sprinkle = () => {
      add(Math.random() * w, Math.random() * h, 0.35 + 0.85 * Math.random() ** 2, false);
    };

    const shed = (i: number) => {
      const ri = r[i];
      const big = Math.random() < 0.07;
      const rb = ri * (big ? 0.3 + Math.random() * 0.1 : 0.13 + Math.random() * 0.16);
      r[i] = Math.cbrt(ri * ri * ri - rb * rb * rb);
      const stretch = 1 + Math.min(0.5, vy[i] / 240);
      const off = Math.max((ri + rb) * 0.9, ri * stretch * 0.95);
      add(x[i] + (Math.random() - 0.5) * ri * 0.5, y[i] - off, rb, false);
      travel[i] = 0;
      gap[i] = r[i] * (0.45 + Math.random() * 1.3);
    };

    const merge = (i: number, j: number) => {
      const vi = r[i] * r[i] * r[i];
      const vj = r[j] * r[j] * r[j];
      const vt = vi + vj;
      const keep = vi >= vj ? i : j;
      const lose = keep === i ? j : i;
      x[keep] = (x[i] * vi + x[j] * vj) / vt;
      y[keep] = (y[i] * vi + y[j] * vj) / vt;
      vy[keep] = (vy[i] * vi + vy[j] * vj) / vt;
      drift[keep] = (drift[i] * vi + drift[j] * vj) / vt;
      r[keep] = Math.cbrt(vt);
      stuck[keep] = 0;
      const dir = Math.abs(y[j] - y[i]) > Math.abs(x[j] - x[i]) ? 1 : -1;
      wobV[keep] += dir * Math.min(9, 40 * (vj < vi ? vj / vt : vi / vt) + 2);
      alive[lose] = 0;
      if (r[keep] > maxR) maxR = r[keep];
      if (vj > 4) clearFog(x[keep], y[keep], r[keep] * 1.5, 0.6);
      return keep;
    };

    const cellOf = (px: number, py: number) =>
      clamp(Math.floor((py + PAD) / HASH), 0, hRows - 1) * hCols + clamp(Math.floor((px + PAD) / HASH), 0, hCols - 1);

    const touch = (i: number) => {
      const reach = r[i] + maxR;
      const cx0 = clamp(Math.floor((x[i] - reach + PAD) / HASH), 0, hCols - 1);
      const cx1 = clamp(Math.floor((x[i] + reach + PAD) / HASH), 0, hCols - 1);
      const cy0 = clamp(Math.floor((y[i] - reach + PAD) / HASH), 0, hRows - 1);
      const cy1 = clamp(Math.floor((y[i] + reach + PAD) / HASH), 0, hRows - 1);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const c = cy * hCols + cx;
          for (let k = hashStart[c]; k < hashStart[c + 1]; k++) {
            const j = hashItems[k];
            if (j === i || !alive[j]) continue;
            const dx = x[j] - x[i];
            const dy = y[j] - y[i];
            const lim = (r[i] + r[j]) * 0.8;
            if (dx * dx + dy * dy < lim * lim && merge(i, j) !== i) return;
          }
        }
      }
    };

    const collide = () => {
      const cells = hCols * hRows;
      hashStart.fill(0);
      for (let i = 0; i < n; i++) if (alive[i]) hashStart[cellOf(x[i], y[i]) + 1]++;
      for (let c = 0; c < cells; c++) hashStart[c + 1] += hashStart[c];
      const fill = hashStart.slice(0, cells);
      for (let i = 0; i < n; i++) if (alive[i]) hashItems[fill[cellOf(x[i], y[i])]++] = i;
      for (let i = 0; i < n; i++) {
        if (alive[i] && (vy[i] > 0.5 || fresh[i])) touch(i);
        fresh[i] = 0;
      }
    };

    const compact = () => {
      let k = 0;
      maxR = 3;
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        if (k !== i) {
          x[k] = x[i];
          y[k] = y[i];
          r[k] = r[i];
          vy[k] = vy[i];
          drift[k] = drift[i];
          stuck[k] = stuck[i];
          travel[k] = travel[i];
          gap[k] = gap[i];
          wob[k] = wob[i];
          wobV[k] = wobV[i];
          aspect[k] = aspect[i];
          alive[k] = 1;
          fresh[k] = fresh[i];
        }
        if (r[k] > maxR) maxR = r[k];
        k++;
      }
      for (let i = k; i < n; i++) alive[i] = 0;
      n = k;
    };

    const step = (dt: number) => {
      if (w === 0 || h === 0) return;
      if (rain > 0) {
        const area = (w * h) / (960 * 480);
        const hitRate = rain * 36 * area;
        const mistRate = rain * 70 * area;
        nextHit -= dt;
        while (nextHit <= 0) {
          hit();
          nextHit += -Math.log(1 - Math.random()) / hitRate;
        }
        nextMist -= dt;
        while (nextMist <= 0) {
          sprinkle();
          nextMist += -Math.log(1 - Math.random()) / mistRate;
        }
      }
      const settle = Math.exp(-dt * 12);
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const ri = r[i] - (DRY / Math.max(0.5, r[i])) * dt;
        if (ri < 0.3) {
          alive[i] = 0;
          continue;
        }
        r[i] = ri;
        if (wob[i] !== 0 || wobV[i] !== 0) {
          wobV[i] += (-420 * wob[i] - 11 * wobV[i]) * dt;
          wob[i] += wobV[i] * dt;
          if (Math.abs(wob[i]) < 0.002 && Math.abs(wobV[i]) < 0.02) {
            wob[i] = 0;
            wobV[i] = 0;
          }
        }
        if (ri > SLIDE) {
          const excess = (ri - SLIDE) / SLIDE;
          if (stuck[i] > 0) {
            stuck[i] -= dt;
            vy[i] *= settle;
          } else {
            const terminal = 22 + 320 * excess;
            vy[i] += (terminal - vy[i]) * (1 - Math.exp(-dt * (3 + 6 * excess)));
            if (Math.random() < (dt * 2.6) / (1 + excess * 8))
              stuck[i] = (0.06 + Math.random() * 0.6) / (1 + excess * 5);
          }
        } else {
          vy[i] *= settle;
        }
        const v = vy[i];
        if (v <= 0.5) continue;
        drift[i] = clamp(drift[i] + (Math.random() - 0.5) * dt * 4.5, -0.42, 0.42);
        const dy = v * dt;
        const dx = dy * (drift[i] + lean);
        x[i] += dx;
        y[i] += dy;
        clearFog(x[i], y[i], ri * 1.15, Math.min(0.95, (dy / ri) * 0.9 + 0.1));
        travel[i] += dy;
        if (travel[i] > gap[i] && ri > 2) shed(i);
        if (y[i] - r[i] > h + 8) alive[i] = 0;
      }
      collide();
      compact();
      fogAcc += dt;
      if (fogAcc < 0.05) return;
      const k = fogAcc / FOG_BACK;
      fogAcc = 0;
      for (let i = 0; i < fogF.length; i++) {
        const f = fogF[i];
        fogF[i] = Math.min(fogT[i], f + (fogT[i] - f) * k * (0.25 + 5 * f * f));
      }
    };

    const paintSprite = () => {
      const c = SPRITE / 2;
      sctx.clearRect(0, 0, SPRITE, SPRITE);
      const rim = sctx.createRadialGradient(c, c - c * 0.14, c * 0.2, c, c, c);
      rim.addColorStop(0, rgba(look.rim, 0, sprite));
      rim.addColorStop(0.58, rgba(look.rim, 0, sprite));
      rim.addColorStop(0.8, rgba(look.rim, look.rimAlpha * 0.3, sprite));
      rim.addColorStop(0.93, rgba(look.rim, look.rimAlpha * 0.85, sprite));
      rim.addColorStop(1, rgba(look.rim, look.rimAlpha * 0.6, sprite));
      sctx.fillStyle = rim;
      sctx.beginPath();
      sctx.arc(c, c, c, 0, TAU);
      sctx.fill();
      const gx = c - c * 0.32;
      const gy = c - c * 0.44;
      const glint = sctx.createRadialGradient(gx, gy, 0, gx, gy, c * 0.26);
      glint.addColorStop(0, rgba(look.glint, look.glintAlpha, sprite));
      glint.addColorStop(0.45, rgba(look.glint, look.glintAlpha * 0.6, sprite));
      glint.addColorStop(1, rgba(look.glint, 0, sprite));
      sctx.fillStyle = glint;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
      const low = sctx.createRadialGradient(c, c + c * 0.55, 0, c, c + c * 0.55, c * 0.5);
      low.addColorStop(0, rgba(look.glint, look.glintAlpha * 0.22, sprite));
      low.addColorStop(1, rgba(look.glint, 0, sprite));
      sctx.fillStyle = low;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
    };

    const derive = () => {
      const bw = w + MARGIN * 2;
      const bh = h + MARGIN * 2;
      if (bright.width !== bw || bright.height !== bh) {
        bright.width = bw;
        bright.height = bh;
      }
      bctx.globalCompositeOperation = "source-over";
      bctx.globalAlpha = 1;
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(world, 0, 0, w, h, MARGIN, MARGIN, w, h);
      bctx.drawImage(world, 0, 0, w, 1, MARGIN, 0, w, MARGIN);
      bctx.drawImage(world, 0, h - 1, w, 1, MARGIN, h + MARGIN, w, MARGIN);
      bctx.drawImage(bright, MARGIN, 0, 1, bh, 0, 0, MARGIN, bh);
      bctx.drawImage(bright, MARGIN + w - 1, 0, 1, bh, MARGIN + w, 0, MARGIN, bh);
      bctx.globalCompositeOperation = "screen";
      bctx.globalAlpha = look.shine;
      bctx.drawImage(bright, 0, 0);
      bctx.globalAlpha = 1;
      bctx.globalCompositeOperation = "source-over";
      below = ctx.createPattern(bright, "no-repeat");
      above = ctx.createPattern(bright, "no-repeat");
      const peek = Math.min(MARGIN, h * FIELD * 0.7);
      below?.setTransform(new DOMMatrix().translate(-MARGIN, -MARGIN - peek));
      above?.setTransform(new DOMMatrix().translate(-MARGIN, -MARGIN + peek));

      const qw = Math.max(1, Math.round(w / 4));
      const qh = Math.max(1, Math.round(h / 4));
      const ew = Math.max(1, Math.round(w / 10));
      const eh = Math.max(1, Math.round(h / 10));
      quarter.width = qw;
      quarter.height = qh;
      eighth.width = ew;
      eighth.height = eh;
      fogImg.width = Math.max(1, Math.round(w / 2));
      fogImg.height = Math.max(1, Math.round(h / 2));
      qctx.imageSmoothingQuality = "high";
      qctx.drawImage(world, 0, 0, qw, qh);
      ectx.imageSmoothingQuality = "high";
      ectx.drawImage(quarter, 0, 0, ew, eh);
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = "high";
      fctx.globalCompositeOperation = "source-over";
      fctx.globalAlpha = 1;
      fctx.drawImage(eighth, 0, 0, fogImg.width, fogImg.height);
      fctx.globalAlpha = look.hazeAlpha;
      fctx.fillStyle = look.haze;
      fctx.fillRect(0, 0, fogImg.width, fogImg.height);
      fctx.globalAlpha = 1;
    };

    const snapshot = () => {
      if (w === 0 || h === 0) return;
      if (world.width !== w || world.height !== h) {
        world.width = w;
        world.height = h;
      }
      const box = back.getBoundingClientRect();
      const kx = box.width > 0 ? w / box.width : 1;
      const ky = box.height > 0 ? h / box.height : 1;
      const bg = getComputedStyle(back).backgroundColor;
      const clear = !bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)";
      wctx.globalCompositeOperation = "source-over";
      wctx.fillStyle = clear ? rgba("var(--background)", 1, back) : bg;
      wctx.fillRect(0, 0, w, h);
      hasVideo = false;
      for (const el of back.querySelectorAll("img, canvas, video")) {
        let nw = 0;
        let nh = 0;
        if (el instanceof HTMLImageElement) {
          if (!el.complete) continue;
          nw = el.naturalWidth;
          nh = el.naturalHeight;
        } else if (el instanceof HTMLVideoElement) {
          hasVideo = true;
          nw = el.videoWidth;
          nh = el.videoHeight;
        } else if (el instanceof HTMLCanvasElement) {
          nw = el.width;
          nh = el.height;
        }
        if (!nw || !nh) continue;
        const rect = el.getBoundingClientRect();
        const bx = (rect.left - box.left) * kx;
        const by = (rect.top - box.top) * ky;
        const bw = rect.width * kx;
        const bh = rect.height * ky;
        if (bw < 1 || bh < 1) continue;
        const [ox, oy, dw, dh] = placeMedia(el, nw, nh, bw, bh);
        wctx.save();
        wctx.beginPath();
        wctx.rect(bx, by, bw, bh);
        wctx.clip();
        try {
          wctx.drawImage(el as CanvasImageSource, bx + ox, by + oy, dw, dh);
        } catch {}
        wctx.restore();
      }
      derive();
    };

    const layout = () => {
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      fogF = new Float32Array(cols * rows);
      fogT = new Float32Array(cols * rows);
      const noise = smoothNoise(cols, rows, 22);
      const fine = smoothNoise(cols, rows, 6);
      for (let cy = 0; cy < rows; cy++) {
        const low = cy / Math.max(1, rows - 1);
        for (let cx = 0; cx < cols; cx++) {
          const edge = Math.min(cx, cols - 1 - cx) / Math.max(1, cols * 0.12);
          const t = 0.6 + 0.26 * noise(cx, cy) + 0.08 * fine(cx, cy) + 0.12 * low * low + 0.1 * (1 - Math.min(1, edge));
          fogT[cy * cols + cx] = clamp(t, 0, 1);
        }
      }
      fogF.set(fogT);
      mask.width = cols;
      mask.height = rows;
      maskData = mctx.createImageData(cols, rows);
      const d = maskData.data;
      for (let i = 0; i < cols * rows; i++) {
        d[i * 4] = 255;
        d[i * 4 + 1] = 255;
        d[i * 4 + 2] = 255;
      }
      hCols = Math.ceil((w + PAD * 2) / HASH);
      hRows = Math.ceil((h + PAD * 2) / HASH);
      hashStart = new Int32Array(hCols * hRows + 1);
    };

    const warm = (seconds: number) => {
      n = 0;
      alive.fill(0);
      nextHit = 0;
      nextMist = 0;
      for (let t = 0; t < seconds; t += 1 / 15) step(1 / 15);
    };

    const drawBeads = () => {
      if (!below || !above) return;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ri = r[i];
        if (ri >= BEAD) continue;
        ctx.moveTo(x[i] + ri, y[i]);
        ctx.arc(x[i], y[i], ri, 0, TAU);
      }
      ctx.fillStyle = below;
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ri = r[i];
        if (ri >= BEAD || ri < 0.7) continue;
        const cy = y[i] + ri * 0.34;
        ctx.moveTo(x[i] + ri * 0.64, cy);
        ctx.arc(x[i], cy, ri * 0.64, 0, TAU);
      }
      ctx.fillStyle = above;
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ri = r[i];
        if (ri >= BEAD || ri < 1) continue;
        ctx.moveTo(x[i] + ri - 0.35, y[i]);
        ctx.arc(x[i], y[i], ri - 0.35, 0, TAU);
      }
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = look.beadRim;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ri = r[i];
        if (ri >= BEAD || ri < 1.1) continue;
        const gx = x[i] - ri * 0.3;
        const gy = y[i] - ri * 0.38;
        ctx.moveTo(gx + ri * 0.24, gy);
        ctx.arc(gx, gy, ri * 0.24, 0, TAU);
      }
      ctx.fillStyle = look.beadGlint;
      ctx.fill();
    };

    const drawDrops = () => {
      const bw = bright.width;
      const bh = bright.height;
      for (let i = 0; i < n; i++) {
        const ri = r[i];
        if (ri < BEAD) continue;
        const stretch = (1 + Math.min(0.45, vy[i] / 260)) * (1 + clamp(wob[i], -0.3, 0.3) - aspect[i]);
        const sx = (1 + aspect[i]) / Math.sqrt(stretch);
        const view = Math.min(ri * LENS + h * FIELD, bw / 2, bh / 2);
        const srcX = clamp(x[i] + MARGIN - view, 0, bw - view * 2);
        const srcY = clamp(y[i] + MARGIN - view, 0, bh - view * 2);
        ctx.save();
        ctx.translate(x[i], y[i] - (stretch - 1) * ri * 0.45);
        ctx.scale(sx, stretch);
        ctx.beginPath();
        ctx.arc(0, 0, ri, 0, TAU);
        ctx.clip();
        ctx.rotate(Math.PI);
        ctx.drawImage(bright, srcX, srcY, view * 2, view * 2, -ri, -ri, ri * 2, ri * 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(sprite, -ri, -ri, ri * 2, ri * 2);
        ctx.restore();
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (w === 0 || h === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (fogAlpha > 0 && maskData) {
        const d = maskData.data;
        for (let i = 0; i < fogF.length; i++) d[i * 4 + 3] = fogF[i] * 255;
        mctx.putImageData(maskData, 0, 0);
        ctx.globalAlpha = fogAlpha;
        ctx.drawImage(fogImg, 0, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mask, 0, 0, cols * CELL, rows * CELL);
      }
      if (look.room) {
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = look.room;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
      drawBeads();
      drawDrops();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (hasVideo) snapshot();
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
      const nw = Math.round(canvas.clientWidth);
      const nh = Math.round(canvas.clientHeight);
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const sized = nw !== w || nh !== h;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w === 0 || h === 0) return;
      if (sized) {
        layout();
        snapshot();
        warm(still ? WARM * 1.5 : WARM);
      }
      draw();
    };

    let pending = 0;
    const refresh = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        snapshot();
        if (!raf) draw();
      });
    };

    paintSprite();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    const mo = new MutationObserver(refresh);
    mo.observe(back, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "class", "style"],
    });
    back.addEventListener("load", refresh, true);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      look = readLook(canvas);
      paintSprite();
      snapshot();
      draw();
    });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      back.removeEventListener("load", refresh, true);
      document.removeEventListener("visibilitychange", sync);
      offTheme();
    };
  }, [intensity, fog, wind, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-rain-on-glass-night:0] dark:[--miyuki-rain-on-glass-night:1]",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -z-10">
        <div ref={backRef} className="absolute inset-0">
          {children}
        </div>
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />
      </div>
      {overlay}
    </div>
  );
}
