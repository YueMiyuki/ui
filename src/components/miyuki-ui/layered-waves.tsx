"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface LayeredWavesProps extends ComponentProps<"div"> {
  colors?: string[];
  waveCount?: number;
  amplitude?: number;
  speed?: "slow" | "fast" | number;
  blur?: number;
  variant?: "filled" | "lines";
  level?: number;
}

const DEFAULT_COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-2)", "var(--brand)", "var(--brand-strong)"];
const NIGHT = "--miyuki-layered-waves-night";
const STEP = 7;
const STILL = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng();
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    return a + (b - a) * u;
  };
}

interface Band {
  rest: number;
  amp: number;
  k1: number;
  k2: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  nk: number;
  nv: number;
  no: number;
}

function buildBands(count: number, amplitude: number, level: number, spread: number): Band[] {
  const rng = createRng(`layered-waves:${count}`);
  return Array.from({ length: count }, (_, i) => {
    const depth = count > 1 ? i / (count - 1) : 1;
    return {
      rest: level + depth * (1 - level) * spread,
      amp: amplitude * (0.5 + 0.5 * depth) * rng.range(0.9, 1.1),
      k1: (Math.PI * 2) / rng.range(620, 980),
      k2: (Math.PI * 2) / rng.range(230, 360),
      w1: rng.range(0.22, 0.38) * (i % 2 === 0 ? 1 : 0.8),
      w2: rng.range(0.35, 0.6),
      p1: rng.range(0, Math.PI * 2),
      p2: rng.range(0, Math.PI * 2),
      nk: 1 / rng.range(210, 320),
      nv: rng.range(0.05, 0.11),
      no: rng.range(0, 200),
    };
  });
}

export function LayeredWaves({
  colors = DEFAULT_COLORS,
  waveCount = 5,
  amplitude = 40,
  speed = "slow",
  blur = 6,
  variant = "filled",
  level = 0.55,
  className,
  children,
  ...props
}: LayeredWavesProps) {
  const washRef = useRef<HTMLCanvasElement>(null);
  const crestRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const paletteKey = palette.join("|");
  const soft = Math.max(0, blur);
  const filled = variant !== "lines";
  const overhang = filled ? Math.ceil(soft * 2.5) : 0;

  useEffect(() => {
    const crest = crestRef.current;
    const wash = washRef.current;
    const cctx = crest?.getContext("2d");
    const wctx = wash?.getContext("2d") ?? null;
    if (!crest || !cctx) return;

    const n = clamp(Math.round(waveCount), 1, 8);
    const amp = Math.max(0, amplitude);
    const rest = clamp(level, 0, 1);
    const pace = speed === "fast" ? 2.5 : speed === "slow" ? 1 : Math.max(0, speed);
    const bands = buildBands(n, amp, rest, filled ? 0.46 : 0.78);
    const noise = makeNoise(`layered-waves:noise:${n}`);
    const tints = paletteKey.split("|");
    const still = !!reduce;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let samples = 0;
    let ys = new Float32Array(0);
    let night = false;
    let fills: (CanvasGradient | string)[] = [];
    let lines: string[] = [];
    let time = still ? STILL : 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const readColors = () => {
      night = cssVar(NIGHT, crest) === "1";
      lines = bands.map((_, i) => {
        const tint = tints[i % tints.length];
        const depth = n > 1 ? i / (n - 1) : 1;
        const strength = filled ? 1 : 1.3;
        return night
          ? rgba(`color-mix(in oklab, ${tint} 62%, white)`, Math.min(1, (0.42 + 0.4 * depth) * strength), crest)
          : rgba(
              `color-mix(in oklab, ${tint} 72%, var(--foreground))`,
              Math.min(1, (0.3 + 0.32 * depth) * strength),
              crest,
            );
      });
      paintFills();
    };

    const paintFills = () => {
      if (!wctx || !wash || h === 0) return;
      fills = bands.map((band, i) => {
        const tint = tints[i % tints.length];
        const depth = n > 1 ? i / (n - 1) : 1;
        const top = band.rest * h - band.amp * 1.6;
        const gradient = wctx.createLinearGradient(0, top, 0, h);
        if (night) {
          const a = 0.2 + 0.12 * depth;
          gradient.addColorStop(0, rgba(tint, a * 1.25, wash));
          gradient.addColorStop(0.35, rgba(`color-mix(in oklab, ${tint} 70%, var(--background))`, a, wash));
          gradient.addColorStop(1, rgba(`color-mix(in oklab, ${tint} 45%, var(--background))`, a * 0.8, wash));
        } else {
          const a = 0.13 + 0.07 * depth;
          gradient.addColorStop(0, rgba(tint, a * 1.25, wash));
          gradient.addColorStop(0.3, rgba(tint, a, wash));
          gradient.addColorStop(1, rgba(tint, a * 0.7, wash));
        }
        return gradient;
      });
    };

    const shape = () => {
      const x0 = -STEP * 2;
      for (let b = 0; b < n; b++) {
        const band = bands[b];
        const base = band.rest * h;
        const offset = b * samples;
        const t1 = band.w1 * time;
        const t2 = band.w2 * time;
        const tn = band.nv * time + band.no;
        for (let s = 0; s < samples; s++) {
          const x = x0 + s * STEP;
          const swell = Math.sin(band.k1 * x - t1 + band.p1);
          const chop = Math.sin(band.k2 * x + t2 + band.p2);
          const drift = noise(x * band.nk + tn) * 2 - 1;
          ys[offset + s] = base + band.amp * (0.58 * swell + 0.18 * chop + 0.42 * drift);
        }
      }
    };

    const trace = (ctx: CanvasRenderingContext2D, b: number, dx: number, dy: number) => {
      const offset = b * samples;
      const x0 = -STEP * 2 + dx;
      ctx.moveTo(x0, ys[offset] + dy);
      for (let s = 1; s < samples; s++) ctx.lineTo(x0 + s * STEP, ys[offset + s] + dy);
    };

    const draw = () => {
      shape();
      if (filled && wctx && wash) {
        wctx.setTransform(1, 0, 0, 1, 0, 0);
        wctx.globalCompositeOperation = "source-over";
        wctx.clearRect(0, 0, wash.width, wash.height);
        wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        wctx.globalCompositeOperation = night ? "source-over" : "multiply";
        const floor = h + overhang * 2;
        for (let b = 0; b < n; b++) {
          wctx.save();
          wctx.translate(overhang, overhang);
          wctx.beginPath();
          trace(wctx, b, 0, 0);
          wctx.lineTo(w + STEP * 2 + overhang, ys[b * samples + samples - 1]);
          wctx.lineTo(w + STEP * 2 + overhang, floor);
          wctx.lineTo(-STEP * 2 - overhang, floor);
          wctx.lineTo(-STEP * 2 - overhang, ys[b * samples]);
          wctx.closePath();
          wctx.fillStyle = fills[b] ?? "transparent";
          wctx.fill();
          wctx.restore();
        }
        wctx.globalCompositeOperation = "source-over";
      }

      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalCompositeOperation = "source-over";
      cctx.clearRect(0, 0, crest.width, crest.height);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.globalCompositeOperation = night ? "lighter" : "source-over";
      cctx.lineJoin = "round";
      cctx.lineCap = "round";
      for (let b = 0; b < n; b++) {
        const depth = n > 1 ? b / (n - 1) : 1;
        cctx.lineWidth = (filled ? 1 : 1.4) + depth * (filled ? 0.35 : 0.5);
        cctx.strokeStyle = lines[b] ?? "transparent";
        cctx.beginPath();
        trace(cctx, b, 0, 0);
        cctx.stroke();
      }
      cctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt * pace;
      draw();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && pace > 0;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = crest.clientWidth;
      const nh = crest.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const firstRead = h === 0;
      w = nw;
      h = nh;
      dpr = nd;
      crest.width = Math.max(1, Math.round(w * dpr));
      crest.height = Math.max(1, Math.round(h * dpr));
      if (wash) {
        wash.width = Math.max(1, Math.round((w + overhang * 2) * dpr));
        wash.height = Math.max(1, Math.round((h + overhang * 2) * dpr));
      }
      samples = Math.ceil((w + STEP * 4) / STEP) + 1;
      if (ys.length < samples * n) ys = new Float32Array(samples * n);
      if (firstRead) readColors();
      else paintFills();
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(crest);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(crest);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
    };
  }, [paletteKey, waveCount, amplitude, speed, level, filled, overhang, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-layered-waves-night:0] dark:[--miyuki-layered-waves-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {filled ? (
          <canvas
            ref={washRef}
            className="absolute block"
            style={
              {
                inset: -overhang,
                width: `calc(100% + ${overhang * 2}px)`,
                height: `calc(100% + ${overhang * 2}px)`,
                filter: soft > 0 ? `blur(${soft}px)` : undefined,
              } as CSSProperties
            }
          />
        ) : null}
        <canvas ref={crestRef} className="absolute inset-0 block size-full" />
      </div>
      {children}
    </div>
  );
}
