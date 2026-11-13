"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SteamProps extends ComponentProps<"div"> {
  density?: number;
  rise?: number;
  sway?: number;
  color?: string;
}

const NIGHT = "--miyuki-steam-night";
const CELL = 4;
const VCELL = 12;
const STIR_RADIUS = 56;

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

export function Steam({
  density = 0.5,
  rise = 1,
  sway = 0.3,
  color,
  className,
  style,
  children,
  ...props
}: SteamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d");
    if (!sctx) return;

    const still = !!reduce;
    const amount = clamp(density, 0, 1);
    const lift = Math.max(0, rise);
    const breeze = clamp(sway, 0, 2);
    const rng = createRng("steam");
    const noise = makeNoise2("steam:curl");
    const grain = makeNoise2("steam:strands");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let vcols = 0;
    let vrows = 0;
    let dye = new Float32Array(0);
    let next = new Float32Array(0);
    let spare = new Float32Array(0);
    let lo = new Float32Array(0);
    let hi = new Float32Array(0);
    let scale = new Float32Array(0);
    let back = new Float32Array(0);
    let vu = new Float32Array(0);
    let vv = new Float32Array(0);
    let psi = new Float32Array(0);
    let su = new Float32Array(0);
    let sv = new Float32Array(0);
    let tmpU = new Float32Array(0);
    let tmpV = new Float32Array(0);
    let image: ImageData | null = null;
    let tone: [number, number, number] = [0, 0, 0];
    let cap = 0.4;
    let thick = 1.6;

    let sources: { base: number; spread: number; wobble: number; pulse: number }[] = [];
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let stirring = 0;
    const pointer = { x: 0, y: 0, t: 0, has: false };

    const readColors = () => {
      const night = cssVar(NIGHT, canvas) === "1";
      const [r, g, b] = toRgba("var(--miyuki-steam-color)", canvas);
      tone = [r * 255, g * 255, b * 255];
      cap = night ? 0.34 : 0.4;
      thick = night ? 1.7 : 1.6;
    };

    const layout = () => {
      const old = dye;
      const oldCols = cols;
      const oldRows = rows;
      cols = Math.max(8, Math.ceil(w / CELL));
      rows = Math.max(8, Math.ceil(h / CELL));
      vcols = Math.ceil(w / VCELL) + 3;
      vrows = Math.ceil(h / VCELL) + 3;
      dye = new Float32Array(cols * rows);
      if (old.length > 0) {
        for (let j = 0; j < rows; j++) {
          const oj = j - rows + oldRows;
          if (oj < 0 || oj >= oldRows) continue;
          for (let i = 0; i < cols; i++)
            dye[j * cols + i] = old[oj * oldCols + Math.min(oldCols - 1, Math.floor((i * oldCols) / cols))];
        }
      }
      next = new Float32Array(cols * rows);
      spare = new Float32Array(cols * rows);
      lo = new Float32Array(cols * rows);
      hi = new Float32Array(cols * rows);
      scale = new Float32Array(cols * rows).fill(1);
      back = new Float32Array(cols * rows * 2);
      const n = vcols * vrows;
      vu = new Float32Array(n);
      vv = new Float32Array(n);
      psi = new Float32Array(n);
      su = new Float32Array(n);
      sv = new Float32Array(n);
      tmpU = new Float32Array(n);
      tmpV = new Float32Array(n);
      small.width = cols;
      small.height = rows;
      image = sctx.createImageData(cols, rows);
      const count = Math.max(3, Math.round(w / 230));
      sources = Array.from({ length: count }, (_, i) => ({
        base: (i + 0.5 + rng.range(-0.25, 0.25)) / count,
        spread: rng.range(22, 38),
        wobble: rng.range(0, 100),
        pulse: rng.range(0, 100),
      }));
    };

    const buildVelocity = () => {
      const t = time;
      const L = 130;
      const up = 52 * lift;
      const wind = breeze * 70 * (noise(t * 0.045, 3.3) * 1.6 + 0.25 * Math.sin(t * 0.09));
      for (let j = 0; j < vrows; j++) {
        const y = (j - 1) * VCELL;
        const hf = clamp(1 - y / Math.max(h, 1), 0, 1);
        const amp = 4300 * (0.5 + 1.05 * hf);
        for (let i = 0; i < vcols; i++) {
          const x = (i - 1) * VCELL;
          psi[j * vcols + i] =
            amp *
            (noise(x / L + t * 0.03, (y + up * 0.6 * t) / L) +
              0.42 * noise(x / (L * 0.42) - t * 0.05 + 11.7, (y + up * 0.8 * t) / (L * 0.42)) +
              0.16 * hf * noise(x / (L * 0.2) + 31.4, (y + up * 0.9 * t) / (L * 0.2) - t * 0.3));
        }
      }
      for (let j = 0; j < vrows; j++) {
        const y = (j - 1) * VCELL;
        const hf = clamp(1 - y / Math.max(h, 1), 0, 1);
        const rising = up * (1 - 0.45 * hf);
        const drift = wind * (0.2 + 0.9 * hf);
        for (let i = 0; i < vcols; i++) {
          const k = j * vcols + i;
          const n = psi[Math.max(0, j - 1) * vcols + i];
          const s = psi[Math.min(vrows - 1, j + 1) * vcols + i];
          const wv = psi[j * vcols + Math.max(0, i - 1)];
          const e = psi[j * vcols + Math.min(vcols - 1, i + 1)];
          vu[k] = (s - n) / (2 * VCELL) + drift + su[k];
          vv[k] = -(e - wv) / (2 * VCELL) - rising + sv[k];
        }
      }
    };

    const relaxStir = (dt: number) => {
      if (stirring <= 0) return;
      const keep = Math.exp(-dt / 0.9);
      const mixK = clamp(dt * 10, 0, 0.5);
      let peak = 0;
      for (let j = 0; j < vrows; j++) {
        for (let i = 0; i < vcols; i++) {
          const k = j * vcols + i;
          const l = i > 0 ? k - 1 : k;
          const r = i < vcols - 1 ? k + 1 : k;
          const u = j > 0 ? k - vcols : k;
          const d = j < vrows - 1 ? k + vcols : k;
          tmpU[k] = (su[k] + (0.25 * (su[l] + su[r] + su[u] + su[d]) - su[k]) * mixK) * keep;
          tmpV[k] = (sv[k] + (0.25 * (sv[l] + sv[r] + sv[u] + sv[d]) - sv[k]) * mixK) * keep;
          const m = Math.abs(tmpU[k]) + Math.abs(tmpV[k]);
          if (m > peak) peak = m;
        }
      }
      const a = su;
      su = tmpU;
      tmpU = a;
      const b = sv;
      sv = tmpV;
      tmpV = b;
      if (peak < 0.5) {
        su.fill(0);
        sv.fill(0);
        stirring = 0;
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
    const sampleAt = (field: Float32Array, fx: number, fy: number) => {
      const cx = clamp(fx, 0, cols - 1.001);
      const cy = clamp(fy, 0, rows - 1.001);
      const si = Math.floor(cx);
      const sj = Math.floor(cy);
      const tx = cx - si;
      const ty = cy - sj;
      const k = sj * cols + si;
      const top = field[k] + (field[k + 1] - field[k]) * tx;
      const bot = field[k + cols] + (field[k + cols + 1] - field[k + cols]) * tx;
      return top + (bot - top) * ty;
    };

    const advect = (dt: number) => {
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * CELL;
        const hf = clamp(1 - y / h, 0, 1);
        const keep = Math.exp(-dt * (0.08 + 1.25 * hf * hf));
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * CELL;
          const o = j * cols + i;
          velAt(x, y, vel);
          back[o * 2] = vel[0] * dt;
          back[o * 2 + 1] = vel[1] * dt;
          velAt(x - vel[0] * dt * 0.5, y - vel[1] * dt * 0.5, vel);
          const fx = (x - vel[0] * dt) / CELL - 0.5;
          const fy = (y - vel[1] * dt) / CELL - 0.5;
          if (fx < -0.5 || fx > cols - 0.5) {
            next[o] = 0;
            lo[o] = 0;
            hi[o] = 0;
            continue;
          }
          const cx = clamp(fx, 0, cols - 1.001);
          const cy = clamp(fy, 0, rows - 1.001);
          const si = Math.floor(cx);
          const sj = Math.floor(cy);
          const tx = cx - si;
          const ty = cy - sj;
          const k = sj * cols + si;
          const a = dye[k];
          const b = dye[k + 1];
          const c = dye[k + cols];
          const d = dye[k + cols + 1];
          const top = a + (b - a) * tx;
          const bot = c + (d - c) * tx;
          next[o] = (top + (bot - top) * ty) * keep;
          lo[o] = Math.min(a, b, c, d) * keep;
          hi[o] = Math.max(a, b, c, d) * keep;
          scale[o] = keep;
        }
      }
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * CELL;
        const sharp = 0.5 * clamp(1.15 - 1.25 * (1 - y / h), 0, 1);
        for (let i = 0; i < cols; i++) {
          const o = j * cols + i;
          if (hi[o] <= 0) continue;
          const x = (i + 0.5) * CELL;
          const tilde = sampleAt(next, (x + back[o * 2]) / CELL - 0.5, (y + back[o * 2 + 1]) / CELL - 0.5) / scale[o];
          const fixed = next[o] + sharp * (dye[o] - tilde) * scale[o];
          spare[o] = fixed < lo[o] ? lo[o] : Math.min(fixed, hi[o]);
        }
      }
      for (let o = 0; o < cols * rows; o++) if (hi[o] <= 0) spare[o] = next[o];
      const swap = dye;
      dye = spare;
      spare = swap;
    };

    const emit = (dt: number) => {
      const band = Math.max(3, Math.round(26 / CELL));
      const base = amount * 3.2;
      for (let j = rows - band; j < rows; j++) {
        const depth = (j - (rows - band) + 1) / band;
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * CELL;
          let s = 0.1;
          for (const src of sources) {
            const cx = (src.base + 0.09 * noise(time * 0.05 + src.wobble, 1.7)) * w;
            const dx = (x - cx) / src.spread;
            const puff = clamp(0.3 + 1.3 * noise(time * 0.42 + src.pulse, 5.1), 0, 1.25);
            s += Math.exp(-dx * dx) * puff;
          }
          const strand = clamp(0.55 + 1.1 * grain(x / 46 + time * 0.12, time * 0.5), 0, 1.3);
          const o = j * cols + i;
          const target = base * s * strand * depth;
          if (dye[o] < target) dye[o] += (target - dye[o]) * clamp(dt * 14, 0, 1);
        }
      }
    };

    const render = () => {
      if (!image) return;
      const data = image.data;
      const [r, g, b] = tone;
      for (let o = 0; o < cols * rows; o++) {
        const p = o * 4;
        const d = dye[o] - 0.025;
        if (d <= 0) {
          data[p + 3] = 0;
          continue;
        }
        data[p] = r;
        data[p + 1] = g;
        data[p + 2] = b;
        data[p + 3] = cap * (1 - Math.exp(-thick * d * Math.sqrt(d))) * 255;
      }
      sctx.putImageData(image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, cols, rows, 0, 0, cols * CELL * dpr, rows * CELL * dpr);
    };

    const step = (dt: number) => {
      time += dt;
      relaxStir(dt);
      buildVelocity();
      advect(dt);
      emit(dt);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      render();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && w > 0;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const warm = (seconds: number, dt: number) => {
      const n = Math.round(seconds / dt);
      for (let s = 0; s < n; s++) step(dt);
      render();
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
      const first = cols === 0;
      readColors();
      layout();
      if (first) warm(still ? 6 : 3, 1 / 12);
      else render();
      sync();
    };

    const onMove = (event: PointerEvent) => {
      if (still) return;
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const t = event.timeStamp / 1000;
      if (!pointer.has) {
        pointer.x = x;
        pointer.y = y;
        pointer.t = t;
        pointer.has = true;
        return;
      }
      const dt = Math.max(0.008, t - pointer.t);
      let vx = (x - pointer.x) / dt;
      let vy = (y - pointer.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > 1400) {
        vx *= 1400 / speed;
        vy *= 1400 / speed;
      }
      const reach = STIR_RADIUS * 2.2;
      const i0 = Math.max(0, Math.floor((x - reach) / VCELL) + 1);
      const i1 = Math.min(vcols - 1, Math.ceil((x + reach) / VCELL) + 1);
      const j0 = Math.max(0, Math.floor((y - reach) / VCELL) + 1);
      const j1 = Math.min(vrows - 1, Math.ceil((y + reach) / VCELL) + 1);
      const r2 = STIR_RADIUS * STIR_RADIUS;
      const k = clamp(dt * 9, 0.05, 0.6);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const dx = (i - 1) * VCELL - x;
          const dy = (j - 1) * VCELL - y;
          const g = Math.exp(-(dx * dx + dy * dy) / r2) * k;
          const o = j * vcols + i;
          su[o] += (vx * 0.5 - su[o]) * g;
          sv[o] += (vy * 0.5 - sv[o]) * g;
        }
      }
      stirring = 1;
      pointer.x = x;
      pointer.y = y;
      pointer.t = t;
    };
    const onLeave = () => {
      pointer.has = false;
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
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
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
    };
  }, [density, rise, sway, color, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-steam-night:0] [--miyuki-steam-tone:color-mix(in_oklab,var(--brand)_42%,var(--muted-foreground))]",
        "dark:[--miyuki-steam-night:1] dark:[--miyuki-steam-tone:color-mix(in_oklab,var(--foreground)_90%,var(--brand))]",
        className,
      )}
      style={{ "--miyuki-steam-color": color ?? "var(--miyuki-steam-tone)", ...style } as CSSProperties}
      {...props}
    >
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <canvas ref={canvasRef} className="block size-full" />
      </div>
    </div>
  );
}
