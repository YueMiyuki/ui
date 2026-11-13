"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ContourCardProps extends ComponentProps<"div"> {
  seed?: number | string;
  interval?: number;
  range?: [number, number];
  lineColor?: string;
  indexColor?: string;
  interactive?: boolean;
}

const CELL = 6;
const SCALE = 150;
const HILL = 0.11;
const HILL_RADIUS = 74;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function makeField(seed: number | string) {
  const rng = createRng(`contour-card:${seed}`);
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = rng();
  const ox = rng.range(0, 200);
  const oy = rng.range(0, 200);
  const at = (x: number, y: number) => table[(y & (size - 1)) * size + (x & (size - 1))];
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return (x: number, y: number) => {
    const u = x + ox;
    const v = y + oy;
    const wx = u + 0.6 * (noise(u * 0.7 + 9.2, v * 0.7 + 1.3) - 0.5);
    const wy = v + 0.6 * (noise(u * 0.7 + 4.1, v * 0.7 + 7.7) - 0.5);
    return (
      noise(wx, wy) * 0.62 + noise(wx * 2.03 + 17, wy * 2.03 + 3) * 0.27 + noise(wx * 4.1 + 31, wy * 4.1 + 11) * 0.11
    );
  };
}

const format = new Intl.NumberFormat("en");

export function ContourCard({
  seed = "contour",
  interval = 20,
  range = [0, 400],
  lineColor = "var(--border-strong)",
  indexColor = "var(--brand)",
  interactive = true,
  className,
  children,
  ...props
}: ContourCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [low, high] = range;

  useEffect(() => {
    const canvas = canvasRef.current;
    const label = labelRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx || !label) return;

    const still = !!reduce;
    const field = makeField(seed);
    const step = Math.max(1e-6, Math.abs(interval));
    const base = Math.min(low, high);
    const relief = Math.max(1e-6, Math.abs(high - low));
    const text = label.querySelector("span");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let values = new Float32Array(0);
    let minor = "";
    let major = "";

    const pointer = { x: 0, y: 0, inside: false };
    const hill = { x: 0, y: 0, amount: 0 };
    const shift = { x: 0, y: 0 };
    let drift = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let settled = false;

    const readColors = () => {
      minor = rgba(lineColor, 1, canvas);
      major = rgba(indexColor, 0.85, canvas);
    };

    const elevation = (x: number, y: number) => {
      const fx = (x + shift.x + drift) / SCALE;
      const fy = (y + shift.y + drift * 0.35) / SCALE;
      let v = field(fx, fy);
      if (hill.amount > 0.001) {
        const dx = x - hill.x;
        const dy = y - hill.y;
        v += HILL * hill.amount * Math.exp(-(dx * dx + dy * dy) / (HILL_RADIUS * HILL_RADIUS));
      }
      return base + relief * clamp((v - 0.18) / 0.66, 0, 1.2);
    };

    const sample = () => {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) values[j * cols + i] = elevation(i * CELL, j * CELL);
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sample();
      const thin = new Path2D();
      const thick = new Path2D();
      const edge = (a: number, b: number, level: number) => (level - a) / (b - a);
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const tl = values[j * cols + i];
          const tr = values[j * cols + i + 1];
          const br = values[(j + 1) * cols + i + 1];
          const bl = values[(j + 1) * cols + i];
          const lo = Math.min(tl, tr, br, bl);
          const hi = Math.max(tl, tr, br, bl);
          const first = Math.ceil(lo / step);
          const lastLevel = Math.floor(hi / step);
          if (first > lastLevel) continue;
          const x = i * CELL;
          const y = j * CELL;
          for (let n = first; n <= lastLevel; n++) {
            const level = n * step;
            if (level === lo || level === hi) continue;
            const code = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
            if (code === 0 || code === 15) continue;
            const top = () => [x + edge(tl, tr, level) * CELL, y] as const;
            const right = () => [x + CELL, y + edge(tr, br, level) * CELL] as const;
            const bottom = () => [x + edge(bl, br, level) * CELL, y + CELL] as const;
            const left = () => [x, y + edge(tl, bl, level) * CELL] as const;
            const path = Math.abs(n % 5) === 0 ? thick : thin;
            const line = (a: readonly [number, number], b: readonly [number, number]) => {
              path.moveTo(a[0], a[1]);
              path.lineTo(b[0], b[1]);
            };
            switch (code) {
              case 1:
              case 14:
                line(left(), bottom());
                break;
              case 2:
              case 13:
                line(bottom(), right());
                break;
              case 3:
              case 12:
                line(left(), right());
                break;
              case 4:
              case 11:
                line(top(), right());
                break;
              case 6:
              case 9:
                line(top(), bottom());
                break;
              case 7:
              case 8:
                line(left(), top());
                break;
              case 5:
              case 10: {
                const centre = (tl + tr + br + bl) / 4 > level;
                if ((code === 5) === centre) {
                  line(left(), top());
                  line(bottom(), right());
                } else {
                  line(left(), bottom());
                  line(top(), right());
                }
                break;
              }
            }
          }
        }
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = minor;
      ctx.lineWidth = 1;
      ctx.stroke(thin);
      ctx.strokeStyle = major;
      ctx.lineWidth = 1.6;
      ctx.stroke(thick);
    };

    const showLabel = () => {
      if (!interactive || !pointer.inside) {
        label.style.opacity = "0";
        return;
      }
      label.style.opacity = "1";
      const flip = pointer.x > w - 96;
      const below = pointer.y < 40;
      label.style.transform = `translate3d(${pointer.x.toFixed(1)}px, ${pointer.y.toFixed(1)}px, 0)`;
      label.dataset.side = `${flip ? "left" : "right"}-${below ? "below" : "above"}`;
      if (text) text.textContent = `${format.format(Math.round(elevation(pointer.x, pointer.y)))} m`;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      drift += dt * 2.2;
      const targetShift =
        pointer.inside && interactive ? [(pointer.x - w / 2) * 0.09, (pointer.y - h / 2) * 0.09] : [0, 0];
      const ease = 1 - Math.exp(-dt * 2.2);
      shift.x += (targetShift[0] - shift.x) * ease;
      shift.y += (targetShift[1] - shift.y) * ease;
      const follow = 1 - Math.exp(-dt * 3.2);
      if (pointer.inside && interactive) {
        hill.x += (pointer.x - hill.x) * follow;
        hill.y += (pointer.y - hill.y) * follow;
      }
      hill.amount += ((pointer.inside && interactive ? 1 : 0) - hill.amount) * (1 - Math.exp(-dt * 1.8));
      draw();
      showLabel();
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
      cols = Math.ceil(w / CELL) + 2;
      rows = Math.ceil(h / CELL) + 2;
      values = new Float32Array(cols * rows);
      if (!settled) {
        hill.x = w / 2;
        hill.y = h / 2;
        settled = true;
      }
      if (!minor) readColors();
      draw();
    };

    const local = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      const [x, y] = local(event);
      if (!pointer.inside) {
        hill.x = x;
        hill.y = y;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.inside = true;
      if (still) showLabel();
    };

    const onLeave = () => {
      pointer.inside = false;
      if (still) showLabel();
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
    if (interactive) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerdown", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointercancel", onLeave);
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
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
    };
  }, [seed, interval, low, high, lineColor, indexColor, interactive, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-clip rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--card)_6%,color-mix(in_oklab,var(--card)_70%,transparent)_24%,transparent_44%,transparent_54%,color-mix(in_oklab,var(--card)_76%,transparent)_74%,var(--card)_94%)]" />
      </div>
      {children}
      <div
        ref={labelRef}
        aria-hidden="true"
        className="group/label pointer-events-none absolute top-0 left-0 z-10 opacity-0 transition-opacity duration-200 ease-settle"
      >
        <div className="absolute -top-[3px] -left-[3px] size-1.5 rounded-full bg-brand ring-2 ring-card" />
        <span
          className={cn(
            "absolute rounded-md border border-border bg-popover/90 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-popover-foreground tabular-nums shadow-sm backdrop-blur-sm",
            "group-data-[side=right-above]/label:bottom-2 group-data-[side=right-above]/label:left-2",
            "group-data-[side=right-below]/label:top-2 group-data-[side=right-below]/label:left-2",
            "group-data-[side=left-above]/label:right-2 group-data-[side=left-above]/label:bottom-2",
            "group-data-[side=left-below]/label:top-2 group-data-[side=left-below]/label:right-2",
          )}
        />
      </div>
    </div>
  );
}
