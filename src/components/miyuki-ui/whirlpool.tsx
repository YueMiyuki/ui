"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useId, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface WhirlpoolProps extends ComponentProps<"div"> {
  particleCount?: number;
  colors?: string[];
  speed?: number;
  trail?: number;
  clockwise?: boolean;
  center?: [number, number];
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-1)", "var(--chart-3)"];
const NIGHT = "--miyuki-whirlpool-night";
const EYE = 0.1;
const BANDS = 14;
const TURN = 0.11;
const SINK = 0.021;
const WARM = 48;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

export function Whirlpool({
  particleCount = 600,
  colors = DEFAULT_COLORS,
  speed = 1,
  trail = 0.9,
  clockwise = true,
  center = [0.5, 0.5],
  className,
  style,
  children,
  ...props
}: WhirlpoolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const filterId = `miyuki-whirlpool-${useId().replace(/[^\w-]/g, "")}`;
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const paletteKey = palette.join("|");
  const cx = clamp(center[0], 0, 1);
  const cy = clamp(center[1], 0, 1);
  const core = palette[palette.length - 1];

  useEffect(() => {
    const canvas = canvasRef.current;
    // 8-bit trails never fade to zero and leave ghost rings; float16 avoids it, the alpha filter covers the rest
    const ctx =
      canvas?.getContext("2d", { colorType: "float16" } as CanvasRenderingContext2DSettings) ??
      canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const deep = (ctx.getContextAttributes?.() as { colorType?: string } | undefined)?.colorType === "float16";
    canvas.style.filter = deep ? "" : `url(#${filterId})`;

    const tints = paletteKey.split("|");
    const count = clamp(Math.round(particleCount), 0, 5000);
    const pace = Math.max(0, speed);
    const keep = clamp(trail, 0, 0.995);
    const turn = clockwise ? 1 : -1;
    const still = !!reduce;

    const radius = new Float32Array(count);
    const angle = new Float32Array(count);
    const rate = new Float32Array(count);
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    const band = new Uint8Array(count);
    let rng = createRng("whirlpool");

    const seed = () => {
      rng = createRng(`whirlpool:${count}`);
      for (let i = 0; i < count; i++) {
        radius[i] = EYE + (1 - EYE) * rng() ** (2 / 3);
        angle[i] = rng() * Math.PI * 2;
        rate[i] = 0.82 + 0.36 * rng();
      }
    };

    let w = 0;
    let h = 0;
    let dpr = 1;
    let ox = 0;
    let oy = 0;
    let rim = 1;
    let squash = 1;
    let night = false;
    let strokes: string[] = [];
    let alphas = new Float32Array(BANDS);
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const bandOf = (r: number) => clamp(Math.floor(((r - EYE) / (1 - EYE)) * BANDS), 0, BANDS - 1);

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      strokes = [];
      alphas = new Float32Array(BANDS);
      for (let b = 0; b < BANDS; b++) {
        const t = 1 - b / (BANDS - 1);
        const at = t * (tints.length - 1);
        const i = Math.min(tints.length - 2, Math.floor(at));
        const mix =
          tints.length > 1
            ? `color-mix(in oklab, ${tints[i]}, ${tints[i + 1]} ${((at - i) * 100).toFixed(0)}%)`
            : tints[0];
        const color = night ? mix : `color-mix(in oklab, ${mix} 64%, var(--foreground))`;
        strokes.push(rgba(color, 1, canvas));
        const r = EYE + ((b + 0.5) / BANDS) * (1 - EYE);
        const fadeIn = clamp((1.02 - r) / 0.16, 0, 1);
        const fadeOut = clamp((r - EYE) / 0.12, 0, 1);
        alphas[b] = (night ? 0.72 : 0.8) * fadeIn * fadeOut;
      }
    };

    const place = (i: number) => {
      const r = radius[i] * rim;
      px[i] = ox + Math.cos(angle[i]) * r;
      py[i] = oy + Math.sin(angle[i]) * r * squash;
    };

    const advance = (dt: number) => {
      const step = dt * pace;
      for (let i = 0; i < count; i++) {
        let r = radius[i];
        const q = 1 / Math.max(r, EYE);
        angle[i] += turn * TURN * rate[i] * q * Math.sqrt(q) * step;
        r -= SINK * rate[i] * Math.sqrt(q) * step;
        if (r < EYE) {
          r = 0.86 + 0.16 * rng();
          angle[i] = rng() * Math.PI * 2;
          radius[i] = r;
          place(i);
          band[i] = 255;
          continue;
        }
        radius[i] = r;
        band[i] = bandOf(r);
      }
    };

    const paint = (dt: number) => {
      const w2 = canvas.width;
      const h2 = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fade = keep <= 0 ? 1 : 1 - keep ** Math.max(0.25, dt * 60);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w2, h2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      ctx.lineWidth = night ? 1.1 : 1;
      ctx.lineCap = "butt";
      for (let b = 0; b < BANDS; b++) {
        if (alphas[b] < 0.01) continue;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (band[i] !== b) continue;
          const r = radius[i] * rim;
          const x = ox + Math.cos(angle[i]) * r;
          const y = oy + Math.sin(angle[i]) * r * squash;
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(x, y);
          px[i] = x;
          py[i] = y;
        }
        ctx.globalAlpha = alphas[b];
        ctx.strokeStyle = strokes[b];
        ctx.stroke();
      }
      for (let i = 0; i < count; i++) {
        if (band[i] === 255) band[i] = bandOf(radius[i]);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const warm = (frames: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      seed();
      for (let i = 0; i < count; i++) {
        band[i] = bandOf(radius[i]);
        place(i);
      }
      for (let f = 0; f < frames; f++) {
        advance(1 / 60);
        paint(1 / 60);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      advance(dt);
      paint(dt);
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
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ox = w * cx;
      oy = h * cy;
      squash = w > 0 ? clamp((h / w) * 1.25, 0.6, 1) : 1;
      rim = 1;
      for (const [x, y] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ]) {
        rim = Math.max(rim, Math.hypot(x - ox, (y - oy) / squash));
      }
      if (strokes.length === 0) readColors();
      warm(still ? WARM * 2 : WARM);
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
      warm(still ? WARM * 2 : WARM);
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
  }, [paletteKey, particleCount, speed, trail, clockwise, cx, cy, reduce, filterId]);

  const at = `${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%`;
  const calm = `radial-gradient(ellipse 32% 24% at ${at}, rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.8) 55%, #000)`;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-whirlpool-night:0] dark:[--miyuki-whirlpool-night:1]",
        className,
      )}
      style={style}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background: `radial-gradient(ellipse 30% 26% at ${at}, color-mix(in oklab, ${core} 20%, transparent), color-mix(in oklab, ${core} 6%, transparent) 55%, transparent)`,
          }}
        />
        <svg className="absolute size-0">
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.025" intercept="-0.025" />
            </feComponentTransfer>
          </filter>
        </svg>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block size-full"
          style={{ maskImage: calm, WebkitMaskImage: calm }}
        />
      </div>
      {children}
    </div>
  );
}
