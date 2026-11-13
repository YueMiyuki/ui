"use client";

import { ArrowUp } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useId, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type WindField = (x: number, y: number, t: number) => [u: number, v: number];

export interface WindMapProps extends ComponentProps<"div"> {
  field?: WindField;
  particles?: number;
  speed?: number;
  color?: string;
}

const NIGHT = "--miyuki-wind-map-night";
const BANDS = 8;
const CELL = 16;
const FAST = 78;
const KEEP = 0.955;
const REF_AREA = 960 * 520;
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

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
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const g00 = perm[X + perm[Y]];
    const g10 = perm[X + 1 + perm[Y]];
    const g01 = perm[X + perm[Y + 1]];
    const g11 = perm[X + 1 + perm[Y + 1]];
    const n00 = gx[g00] * xf + gy[g00] * yf;
    const n10 = gx[g10] * (xf - 1) + gy[g10] * yf;
    const n01 = gx[g01] * xf + gy[g01] * (yf - 1);
    const n11 = gx[g11] * (xf - 1) + gy[g11] * (yf - 1);
    const u = fade(xf);
    const v = fade(yf);
    const a = n00 + (n10 - n00) * u;
    const b = n01 + (n11 - n01) * u;
    return a + (b - a) * v;
  };
}

export function WindMap({ field, particles = 2500, speed = 1, color, className, children, ...props }: WindMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const bearingRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const fieldRef = useRef(field);
  const reduce = useReducedMotion();
  const filterId = `miyuki-wind-map-${useId().replace(/[^\w-]/g, "")}`;
  const custom = typeof field === "function";

  useEffect(() => {
    fieldRef.current = field;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    // 8-bit trails never fade to zero and leave ghost lines; float16 avoids it, the alpha filter covers the rest
    const ctx =
      canvas?.getContext("2d", { colorType: "float16" } as CanvasRenderingContext2DSettings) ??
      canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;
    const deep = (ctx.getContextAttributes?.() as { colorType?: string } | undefined)?.colorType === "float16";
    canvas.style.filter = deep ? "" : `url(#${filterId})`;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const rng = createRng("wind-map");
    const noise = makeNoise2("wind-map:stream");
    const MAX = 8000;
    const px = new Float32Array(MAX);
    const py = new Float32Array(MAX);
    const age = new Float32Array(MAX);
    const life = new Float32Array(MAX);
    const nx = new Float32Array(MAX);
    const ny = new Float32Array(MAX);
    const band = new Uint8Array(MAX);

    const centres = [
      { x: 0.24, y: 0.36, r: 0.24, s: -58, inflow: 0.34, aspect: 1.35, turn: 0.5, drift: 0.008 },
      { x: 0.8, y: 0.72, r: 0.2, s: -46, inflow: 0.3, aspect: 1.2, turn: -0.4, drift: 0.01 },
      { x: 0.66, y: 0.12, r: 0.3, s: 30, inflow: -0.16, aspect: 1.6, turn: 0.2, drift: 0.006 },
    ].map((c) => ({
      ...c,
      x: c.x + rng.range(-0.05, 0.05),
      y: c.y + rng.range(-0.05, 0.05),
      cos: Math.cos(c.turn),
      sin: Math.sin(c.turn),
    }));

    let w = 0;
    let h = 0;
    let dpr = 1;
    let count = 0;
    let gw = 0;
    let gh = 0;
    let psi = new Float32Array(0);
    let gu = new Float32Array(0);
    let gv = new Float32Array(0);
    let gridAt = -1;
    let night = false;
    let strokes: string[] = [];
    let widths: number[] = [];
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let frames = 0;
    const pointer = { x: 0, y: 0, in: false, dirty: false };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const base = color ?? "var(--brand)";
      strokes = [];
      widths = [];
      for (let b = 0; b < BANDS; b++) {
        const t = b / (BANDS - 1);
        const mix = night
          ? `color-mix(in oklab, ${base} ${Math.round(100 - t * 62)}%, white)`
          : `color-mix(in oklab, ${base} ${Math.round(100 - t * 55)}%, var(--foreground))`;
        strokes.push(rgba(mix, night ? 0.12 + 0.88 * t ** 1.4 : 0.14 + 0.82 * t ** 1.3, canvas));
        widths.push(0.8 + 0.8 * t);
      }
    };

    const buildGrid = () => {
      const t = time;
      const L = 300;
      const size = Math.min(Math.max(w, 1), Math.max(h, 1) * 1.6);
      for (let j = 0; j < gh; j++) {
        const y = j * CELL;
        for (let i = 0; i < gw; i++) {
          const x = i * CELL;
          let s = 20 * y;
          s += 2000 * noise(x / L + t * 0.016, y / L - t * 0.01);
          s += 520 * noise(x / (L * 0.42) - t * 0.03 + 17.3, y / (L * 0.42) + t * 0.021 + 5.1);
          psi[j * gw + i] = s;
        }
      }
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const k = j * gw + i;
          const up = psi[Math.max(0, j - 1) * gw + i];
          const dn = psi[Math.min(gh - 1, j + 1) * gw + i];
          const lf = psi[j * gw + Math.max(0, i - 1)];
          const rt = psi[j * gw + Math.min(gw - 1, i + 1)];
          const sy = (j > 0 && j < gh - 1 ? 2 : 1) * CELL;
          const sx = (i > 0 && i < gw - 1 ? 2 : 1) * CELL;
          let u = (dn - up) / sy;
          let v = -(rt - lf) / sx;
          const x = i * CELL;
          const y = j * CELL;
          for (const c of centres) {
            const cx = (((((c.x + c.drift * t + 0.4) % 1.8) + 1.8) % 1.8) - 0.4) * w;
            const cy = c.y * h;
            const R = c.r * size;
            const dx = x - cx;
            const dy = y - cy;
            const a = (dx * c.cos + dy * c.sin) / c.aspect;
            const b = -dx * c.sin + dy * c.cos;
            const e = Math.exp(-(a * a + b * b) / (R * R));
            const k2 = (2 * c.s * e) / (0.858 * R);
            u -= k2 * ((a * c.sin) / c.aspect + b * c.cos);
            v += k2 * ((a * c.cos) / c.aspect - b * c.sin);
            const pull = (-c.inflow * Math.abs(c.s) * e) / R;
            u += dx * pull;
            v += dy * pull;
          }
          gu[k] = u;
          gv[k] = v;
        }
      }
      gridAt = time;
    };

    const out: [number, number] = [0, 0];
    const sample = (x: number, y: number): [number, number] => {
      const fn = fieldRef.current;
      if (custom && fn) {
        const r = fn(x, y, time);
        out[0] = r[0];
        out[1] = r[1];
        return out;
      }
      const fx = clamp(x / CELL, 0, gw - 1.001);
      const fy = clamp(y / CELL, 0, gh - 1.001);
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const tx = fx - i;
      const ty = fy - j;
      const k = j * gw + i;
      const u0 = gu[k] + (gu[k + 1] - gu[k]) * tx;
      const u1 = gu[k + gw] + (gu[k + gw + 1] - gu[k + gw]) * tx;
      const v0 = gv[k] + (gv[k + 1] - gv[k]) * tx;
      const v1 = gv[k + gw] + (gv[k + gw + 1] - gv[k + gw]) * tx;
      out[0] = u0 + (u1 - u0) * ty;
      out[1] = v0 + (v1 - v0) * ty;
      return out;
    };

    const spawn = (i: number, fresh: boolean) => {
      px[i] = rng() * w;
      py[i] = rng() * h;
      life[i] = 1.4 + rng() * 2.6;
      age[i] = fresh ? rng() * life[i] : 0;
      band[i] = 255;
    };

    const layout = () => {
      gw = Math.ceil(w / CELL) + 2;
      gh = Math.ceil(h / CELL) + 2;
      psi = new Float32Array(gw * gh);
      gu = new Float32Array(gw * gh);
      gv = new Float32Array(gw * gh);
      count = clamp(Math.round(Math.max(0, particles) * clamp((w * h) / REF_AREA, 0.3, 1.8)), 0, MAX);
      if (!custom) buildGrid();
      for (let i = 0; i < count; i++) spawn(i, true);
    };

    const advance = (dt: number) => {
      time += dt * pace;
      if (!custom && time - gridAt > 0.12) buildGrid();
      const step = dt * pace;
      for (let i = 0; i < count; i++) {
        age[i] += dt;
        if (age[i] > life[i]) {
          spawn(i, false);
          continue;
        }
        const x = px[i];
        const y = py[i];
        const [u, v] = sample(x, y);
        const s = Math.sqrt(u * u + v * v);
        const x2 = x + u * step;
        const y2 = y + v * step;
        if (x2 < -4 || x2 > w + 4 || y2 < -4 || y2 > h + 4) {
          spawn(i, false);
          continue;
        }
        nx[i] = x2;
        ny[i] = y2;
        const fadeIn = Math.min(1, age[i] / 0.35, (life[i] - age[i]) / 0.35);
        const b = Math.floor(clamp((s / FAST) * fadeIn, 0, 0.999) * BANDS);
        band[i] = b;
      }
    };

    const paint = (dt: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fade = 1 - KEEP ** Math.max(0.25, dt * 60);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      ctx.lineCap = "butt";
      for (let b = 0; b < BANDS; b++) {
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < count; i++) {
          if (band[i] !== b) continue;
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(nx[i], ny[i]);
          any = true;
        }
        if (!any) continue;
        ctx.lineWidth = widths[b];
        ctx.strokeStyle = strokes[b];
        ctx.stroke();
      }
      for (let i = 0; i < count; i++) {
        if (band[i] === 255) continue;
        px[i] = nx[i];
        py[i] = ny[i];
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const chip = chipRef.current;
    const updateChip = () => {
      if (!chip) return;
      if (!pointer.in || w === 0) {
        chip.style.opacity = "0";
        return;
      }
      const [u, v] = sample(pointer.x, pointer.y);
      const s = Math.hypot(u, v);
      const to = (Math.atan2(u, -v) * 180) / Math.PI;
      const from = (((to + 180) % 360) + 360) % 360;
      const name = COMPASS[Math.round(from / 22.5) % 16];
      if (speedRef.current) speedRef.current.textContent = `${Math.round(s)} km/h`;
      if (bearingRef.current)
        bearingRef.current.textContent = `from ${name} ${String(Math.round(from) % 360).padStart(3, "0")}°`;
      if (arrowRef.current) arrowRef.current.style.transform = `rotate(${to.toFixed(1)}deg)`;
      const cw = chip.offsetWidth;
      const ch = chip.offsetHeight;
      const x = pointer.x + 16 + cw > w - 8 ? pointer.x - 16 - cw : pointer.x + 16;
      const y = pointer.y + 18 + ch > h - 8 ? pointer.y - 14 - ch : pointer.y + 18;
      chip.style.transform = `translate(${Math.round(clamp(x, 8, w - cw - 8))}px, ${Math.round(clamp(y, 8, h - ch - 8))}px)`;
      chip.style.opacity = "1";
      pointer.dirty = false;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      advance(dt);
      paint(dt);
      frames++;
      if (pointer.dirty || (pointer.in && frames % 6 === 0)) updateChip();
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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let f = 0; f < (still ? 90 : 40); f++) {
        advance(1 / 60);
        paint(1 / 60);
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
      if (strokes.length === 0) readColors();
      layout();
      warm();
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.in = true;
      pointer.dirty = true;
      if (!raf) updateChip();
    };
    const onLeave = () => {
      pointer.in = false;
      updateChip();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") onLeave();
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
      warm();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    root.addEventListener("pointerup", onUp);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      root.removeEventListener("pointerup", onUp);
    };
  }, [custom, particles, speed, color, reduce, filterId]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-wind-map-night:0] dark:[--miyuki-wind-map-night:1]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <svg className="absolute size-0">
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.03" intercept="-0.03" />
            </feComponentTransfer>
          </filter>
        </svg>
        <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
      </div>
      {children}
      <div
        ref={chipRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-10 flex items-center gap-1.5 rounded-md border border-border bg-popover/90 px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150"
      >
        <ArrowUp ref={arrowRef} className="size-3 shrink-0 text-brand-strong" strokeWidth={2.25} />
        <span ref={speedRef} className="font-medium tabular-nums" />
        <span ref={bearingRef} className="text-muted-foreground tabular-nums" />
      </div>
    </div>
  );
}
