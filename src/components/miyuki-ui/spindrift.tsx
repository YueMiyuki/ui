"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SpindriftProps extends ComponentProps<"div"> {
  strength?: number;
  direction?: number;
  gusts?: boolean;
}

const NIGHT = "--miyuki-spindrift-night";
const COLS = 120;
const BANDS = 7;
const MARGIN = 60;
const EXPOSURE = 0.05;
const MAX = 4200;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng() * 2 - 1;
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    return a + (b - a) * u;
  };
}

export function Spindrift({
  strength = 0.6,
  direction = 0,
  gusts = true,
  className,
  children,
  ...props
}: SpindriftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const still = !!reduce;
    const power = clamp(strength, 0, 1);
    const top = 150 + 620 * power;
    const angle = (direction * Math.PI) / 180;
    const baseX = Math.cos(angle) * top;
    const baseY = Math.sin(angle) * top;
    const rng = createRng(`spindrift:${power}:${direction}`);
    const wander = makeNoise("spindrift:wander");
    const ripple = makeNoise("spindrift:ripple");

    const px = new Float32Array(MAX);
    const py = new Float32Array(MAX);
    const lam = new Float32Array(MAX);
    const pace = new Float32Array(MAX);
    const glow = new Float32Array(MAX);
    const streak = new Float32Array(MAX);
    const wob = new Float32Array(MAX);
    const wobRate = new Float32Array(MAX);
    const band = new Uint8Array(MAX);
    const sx = new Float32Array(MAX);
    const sy = new Float32Array(MAX);

    let gcol = new Float32Array(COLS);
    let gtmp = new Float32Array(COLS);
    const hcol = new Float32Array(COLS);
    const tcol = new Float32Array(COLS);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let count = 0;
    let span = 1;
    let veil = 100;
    let night = false;
    let strokes: string[] = [];
    let haze = "";
    let hazeTop = "";
    let rgbaMid = "";

    const wind = { x: baseX, y: baseY };
    const lean = { x: 0, y: 0, k: 0, at: -10, lx: 0, ly: 0, lt: 0, has: false };
    const gust = { ou: 0, event: 0, start: -100, rise: 1, hold: 2, fall: 2, amp: 0, next: 1.4, value: 0.6 };
    let ph1 = rng() * 10;
    let ph2 = rng() * 10;
    let ph3 = rng() * 50;
    let ph4 = rng() * 50;
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const gauss = () => {
      const u = Math.max(1e-6, rng());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
    };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const ink = night
        ? "color-mix(in oklab, var(--foreground) 88%, var(--brand))"
        : "color-mix(in oklab, var(--brand) 42%, var(--foreground))";
      strokes = [];
      for (let b = 0; b < BANDS; b++) {
        const a = (b + 0.5) / BANDS;
        strokes.push(rgba(ink, night ? a * 0.66 : a * 0.72, canvas));
      }
      haze = rgba(
        night
          ? "color-mix(in oklab, var(--foreground) 70%, var(--brand))"
          : "color-mix(in oklab, var(--brand) 38%, var(--background))",
        1,
        canvas,
      );
      hazeTop = rgba(
        night
          ? "color-mix(in oklab, var(--foreground) 70%, var(--brand))"
          : "color-mix(in oklab, var(--brand) 38%, var(--background))",
        0,
        canvas,
      );
      rgbaMid = rgba(
        night
          ? "color-mix(in oklab, var(--foreground) 70%, var(--brand))"
          : "color-mix(in oklab, var(--brand) 38%, var(--background))",
        0.3,
        canvas,
      );
    };

    const stepGust = (dt: number) => {
      if (gusts) {
        gust.ou += (0 - gust.ou) * (dt / 2.2) + 0.32 * Math.sqrt(dt) * gauss();
        gust.ou = clamp(gust.ou, -0.35, 0.35);
        if (time >= gust.next) {
          gust.start = time;
          gust.rise = 0.7 + rng() * 0.9;
          gust.hold = 0.8 + rng() * 2.2;
          gust.fall = 1.6 + rng() * 1.8;
          gust.amp = 0.55 + rng() * 0.55;
          gust.next = time + gust.rise + gust.hold + gust.fall + 1.5 + rng() * 5;
        }
        const age = time - gust.start;
        let e = 0;
        if (age < gust.rise) e = smooth(0, gust.rise, age);
        else if (age < gust.rise + gust.hold) e = 1;
        else e = 1 - smooth(gust.rise + gust.hold, gust.rise + gust.hold + gust.fall, age);
        gust.event = e * gust.amp;
        gust.value = clamp(0.42 + gust.ou + gust.event, 0.1, 1.6);
      } else {
        gust.ou += (0 - gust.ou) * (dt / 3) + 0.08 * Math.sqrt(dt) * gauss();
        gust.value = clamp(0.8 + gust.ou, 0.55, 1.05);
      }
    };

    const stepColumns = (dt: number) => {
      const shift = wind.x * dt * 0.9;
      for (let i = 0; i < COLS; i++) {
        const x = -MARGIN + i * span - shift;
        const f = (x + MARGIN) / span;
        if (f < 0 || f > COLS - 1) {
          gtmp[i] = gust.value;
          continue;
        }
        const j = Math.min(COLS - 2, Math.floor(f));
        const t = f - j;
        gtmp[i] = gcol[j] + (gcol[j + 1] - gcol[j]) * t;
      }
      const swap = gcol;
      gcol = gtmp;
      gtmp = swap;

      ph1 += (wind.x * dt * 0.5 * (Math.PI * 2)) / 760;
      ph2 += (wind.x * dt * 0.75 * (Math.PI * 2)) / 310;
      ph3 += (wind.x * dt * 0.9) / 150 + dt * 0.35;
      ph4 += (wind.x * dt) / 64 + dt * 0.6;
      const mag = Math.hypot(wind.x, wind.y) || 1;
      const lift = clamp(1 - (wind.y / mag) * 0.7, 0.55, 1.6);
      for (let i = 0; i < COLS; i++) {
        const x = -MARGIN + i * span;
        const g = gcol[i];
        const swell =
          1 +
          0.3 * Math.sin((x * Math.PI * 2) / 760 - ph1) +
          0.17 * Math.sin((x * Math.PI * 2) / 310 - ph2 + 1.3) +
          0.22 * wander(time * 0.21 + x / 1100);
        hcol[i] = Math.min(h * 0.66, Math.max(veil * 0.34, veil * (0.32 + 0.68 * g) * swell * lift));
        tcol[i] = (ripple(x / 150 - ph3) * 0.7 + ripple(x / 64 - ph4 + 40) * 0.3) * veil * (0.18 + 0.3 * g);
      }
    };

    const respawn = (i: number, x: number) => {
      px[i] = x;
      lam[i] = rng() ** 1.55;
      pace[i] = 0.78 + rng() * 0.44;
      glow[i] = 0.55 + rng() * 0.45;
      streak[i] = 0.55 + rng() ** 2 * 1.4;
      wob[i] = rng() * Math.PI * 2;
      wobRate[i] = 1.5 + rng() * 3.5;
    };

    const seed = () => {
      for (let i = 0; i < count; i++) {
        respawn(i, -MARGIN + rng() * (w + MARGIN * 2));
        py[i] = h - lam[i] * veil * 0.6;
      }
      gcol.fill(gust.value);
    };

    const layout = () => {
      span = (w + MARGIN * 2) / (COLS - 1);
      veil = Math.min(h * 0.4, 230) * (0.7 + 0.45 * power);
      const next = clamp(Math.round(w * 3.4 * (0.4 + power)), 240, MAX);
      count = next;
      seed();
    };

    const sample = (arr: Float32Array, x: number) => {
      const f = clamp((x + MARGIN) / span, 0, COLS - 1.001);
      const j = Math.floor(f);
      const t = f - j;
      return arr[j] + (arr[j + 1] - arr[j]) * t;
    };

    const advance = (dt: number) => {
      time += dt;
      stepGust(dt);

      let tx = baseX;
      let ty = baseY;
      const since = time - lean.at;
      lean.k = since < 0.8 ? 1 : Math.exp(-(since - 0.8) / 2.6);
      if (lean.k > 0.01) {
        const lm = Math.hypot(lean.x, lean.y);
        if (lm > 1) {
          const mag = top * clamp(0.65 + lm / 1800, 0.65, 1.5);
          const k = lean.k * 0.88;
          tx = baseX + ((lean.x / lm) * mag - baseX) * k;
          ty = baseY + ((lean.y / lm) * mag - baseY) * k;
        }
      }
      const ease = 1 - Math.exp(-dt / 0.75);
      wind.x += (tx - wind.x) * ease;
      wind.y += (ty - wind.y) * ease;

      stepColumns(dt);

      const ground = h + 3;
      const follow = 1 - Math.exp(-dt * 9);
      const wrap = w + MARGIN * 2;
      for (let i = 0; i < count; i++) {
        const x0 = px[i];
        const g = sample(gcol, x0);
        const hh = sample(hcol, x0);
        const l = lam[i];
        const prof = 0.42 + 0.7 * Math.sqrt(l);
        const u = wind.x * (0.55 + 0.55 * g) * prof * pace[i];
        let x = x0 + u * dt;
        if (x > w + MARGIN) {
          respawn(i, x - wrap);
          x = px[i];
          py[i] = ground - lam[i] * hh;
        } else if (x < -MARGIN) {
          respawn(i, x + wrap);
          x = px[i];
          py[i] = ground - lam[i] * hh;
        }
        px[i] = x;
        const l2 = l * l;
        const tt = sample(tcol, x);
        const slope =
          (-l * (sample(hcol, x + 4) - sample(hcol, x - 4)) - l2 * (sample(tcol, x + 4) - sample(tcol, x - 4))) / 8;
        const jitter = Math.sin(wob[i] + time * wobRate[i]) * (0.8 + 3 * l);
        const target = ground - l * hh - l2 * tt + jitter;
        const y0 = py[i];
        py[i] = y0 + (target - y0) * follow;
        lam[i] = clamp(l + Math.sin(wob[i] * 3.1 + time * 0.37) * dt * 0.02, 0, 1);

        const reach = clamp(0.24 + (g - 0.3) * 0.85, 0.22, 1);
        const vis = 1 - smooth(reach - 0.3, reach + 0.1, l);
        const a =
          vis * (0.4 + 0.6 * (1 - l)) * (0.6 + 0.4 * Math.min(1, g)) * glow[i] * clamp(hh / (veil * 0.75), 0.5, 1);
        const b = Math.floor(a * BANDS);
        band[i] = b <= 0 ? 255 : Math.min(BANDS - 1, b);
        const len = u * EXPOSURE * (0.75 + 0.55 * g) * streak[i];
        sx[i] = len;
        sy[i] = clamp(len * slope, -18, 18);
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (count === 0) return;

      let hmax = 0;
      let gsum = 0;
      for (let i = 0; i < COLS; i++) {
        if (hcol[i] > hmax) hmax = hcol[i];
        gsum += gcol[i];
      }
      const gavg = gsum / COLS;
      const ground = h + 3;
      const reachUp = Math.max(40, hmax * 0.8);
      const fade = ctx.createLinearGradient(0, ground - reachUp, 0, ground);
      fade.addColorStop(0, hazeTop);
      fade.addColorStop(0.55, rgbaMid);
      fade.addColorStop(1, haze);
      ctx.globalAlpha = clamp((night ? 0.1 : 0.16) + (night ? 0.16 : 0.26) * Math.min(1.2, gavg), 0, 0.5);
      ctx.fillStyle = fade;
      ctx.fillRect(0, ground - reachUp, w, reachUp);
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      ctx.lineCap = "round";
      for (let b = 0; b < BANDS; b++) {
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < count; i++) {
          if (band[i] !== b) continue;
          const x = px[i];
          const y = py[i];
          ctx.moveTo(x - sx[i], y - sy[i]);
          ctx.lineTo(x, y);
          any = true;
        }
        if (!any) continue;
        ctx.lineWidth = b > BANDS - 3 ? 0.95 : 0.75;
        ctx.strokeStyle = strokes[b];
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      advance(dt);
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

    const warm = () => {
      if (still) {
        gust.next = 0.4;
        for (let f = 0; f < 150; f++) advance(1 / 60);
      } else {
        for (let f = 0; f < 50; f++) advance(1 / 60);
      }
      draw();
    };

    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const first = w === 0;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w === 0 || h === 0) return;
      if (strokes.length === 0) readColors();
      layout();
      if (first || still) warm();
      else draw();
    };

    const onMove = (event: PointerEvent) => {
      if (still) return;
      const t = event.timeStamp / 1000;
      if (!lean.has) {
        lean.lx = event.clientX;
        lean.ly = event.clientY;
        lean.lt = t;
        lean.has = true;
        return;
      }
      const dt = Math.max(0.008, t - lean.lt);
      const vx = (event.clientX - lean.lx) / dt;
      const vy = (event.clientY - lean.ly) / dt;
      lean.lx = event.clientX;
      lean.ly = event.clientY;
      lean.lt = t;
      if (Math.hypot(vx, vy) < 60) return;
      const k = Math.min(1, dt * 6);
      lean.x += (vx - lean.x) * k;
      lean.y += (vy - lean.y) * k;
      lean.at = time;
    };
    const onLeave = () => {
      lean.has = false;
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
      draw();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
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
    };
  }, [strength, direction, gusts, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-spindrift-night:0] dark:[--miyuki-spindrift-night:1]",
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
