"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface SnowTrailProps extends ComponentProps<"div"> {
  rate?: number;
  color?: string;
}

const NIGHT = "--miyuki-snow-trail-night";
const CAP = 700;
const SIZES = 8;
const STARS = 3;

interface Sprites {
  discs: HTMLCanvasElement[];
  stars: HTMLCanvasElement[];
  scale: number;
}

const radiusOf = (bucket: number) => 0.7 + bucket * 0.32;

function paintSprites(flake: string, core: string, night: boolean, dpr: number): Sprites {
  const scale = dpr;
  const discs: HTMLCanvasElement[] = [];
  const stars: HTMLCanvasElement[] = [];
  for (let b = 0; b < SIZES; b++) {
    const r = radiusOf(b);
    const pad = night ? r * 2.6 : r + 2;
    const side = Math.ceil((r + pad) * 2 * scale);
    const c = document.createElement("canvas");
    c.width = side;
    c.height = side;
    const g = c.getContext("2d");
    if (!g) continue;
    g.scale(scale, scale);
    const m = side / scale / 2;
    if (night) {
      const halo = g.createRadialGradient(m, m, 0, m, m, r + pad);
      halo.addColorStop(0, flake);
      halo.addColorStop(0.28, flake);
      halo.addColorStop(0.42, withAlpha(flake, 0.22));
      halo.addColorStop(1, withAlpha(flake, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, side, side);
    } else {
      const shade = g.createRadialGradient(m, m + r * 0.35, r * 0.4, m, m + r * 0.35, r * 1.35);
      shade.addColorStop(0, withAlpha(flake, 0.9));
      shade.addColorStop(1, withAlpha(flake, 0));
      g.fillStyle = shade;
      g.beginPath();
      g.arc(m, m + r * 0.35, r * 1.4, 0, Math.PI * 2);
      g.fill();
      const body = g.createRadialGradient(m - r * 0.25, m - r * 0.3, 0, m, m, r);
      body.addColorStop(0, core);
      body.addColorStop(0.75, core);
      body.addColorStop(1, withAlpha(core, 0.4));
      g.fillStyle = body;
      g.beginPath();
      g.arc(m, m, r * 0.82, 0, Math.PI * 2);
      g.fill();
    }
    discs.push(c);
  }
  for (let s = 0; s < STARS; s++) {
    const r = 2.6 + s * 0.9;
    const side = Math.ceil((r + 3) * 2 * scale);
    const c = document.createElement("canvas");
    c.width = side;
    c.height = side;
    const g = c.getContext("2d");
    if (!g) continue;
    g.scale(scale, scale);
    const m = side / scale / 2;
    g.lineCap = "round";
    const arms = (width: number, color: string, dy: number) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        g.moveTo(m, m + dy);
        g.lineTo(m + cx * r, m + dy + cy * r);
        const bx = m + cx * r * 0.58;
        const by = m + dy + cy * r * 0.58;
        for (const side of [-1, 1]) {
          const b = a + side * 0.75;
          g.moveTo(bx, by);
          g.lineTo(bx + Math.cos(b) * r * 0.32, by + Math.sin(b) * r * 0.32);
        }
      }
      g.stroke();
    };
    if (night) {
      g.shadowColor = withAlpha(flake, 0.8);
      g.shadowBlur = 3 * scale;
      arms(0.85, flake, 0);
    } else {
      arms(1.5, withAlpha(flake, 0.85), 0.45);
      arms(0.8, core, 0);
    }
    stars.push(c);
  }
  return { discs, stars, scale };
}

function withAlpha(rgba: string, alpha: number) {
  const m = rgba.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgba;
  const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
  return `rgba(${r}, ${g}, ${b}, ${(Number(a) * alpha).toFixed(3)})`;
}

function css([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(3)})`;
}

export function SnowTrail({
  rate = 1,
  color = "var(--miyuki-snow-trail-flake)",
  className,
  children,
  ...props
}: SnowTrailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = reduce;
    const px = new Float32Array(CAP);
    const py = new Float32Array(CAP);
    const vx = new Float32Array(CAP);
    const vy = new Float32Array(CAP);
    const age = new Float32Array(CAP);
    const life = new Float32Array(CAP);
    const size = new Uint8Array(CAP);
    const star = new Int8Array(CAP);
    const phase = new Float32Array(CAP);
    const sway = new Float32Array(CAP);
    const spin = new Float32Array(CAP);
    let count = 0;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let sprites: Sprites | null = null;
    let night = false;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let pointer: { x: number; y: number; t: number } | null = null;
    let speed = 0;
    let owed = 0;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const flake = css(toRgba(color, canvas));
      const core = css(toRgba("var(--card)", canvas));
      sprites = paintSprites(flake, core, night, dpr);
    };

    const spawn = (x: number, y: number, ivx: number, ivy: number, big: number) => {
      const i = count < CAP ? count++ : Math.floor(Math.random() * CAP);
      const r = Math.random();
      const bucket = Math.min(SIZES - 1, Math.floor((0.12 + r * r * 0.72 + big * 0.3 * Math.random()) * SIZES));
      px[i] = x;
      py[i] = y;
      vx[i] = ivx;
      vy[i] = ivy;
      age[i] = 0;
      life[i] = still ? 0.55 + Math.random() * 0.25 : 0.9 + Math.random() * 0.7 + bucket * 0.07;
      size[i] = bucket;
      star[i] = bucket >= SIZES - 3 && Math.random() < 0.38 ? Math.min(STARS - 1, bucket - (SIZES - 3)) : -1;
      phase[i] = Math.random() * Math.PI * 2;
      sway[i] = 1.4 + Math.random() * 2.2;
      spin[i] = (Math.random() - 0.5) * 2.4;
    };

    const step = (dt: number) => {
      const k = 1 - Math.exp(-dt * 2.4);
      for (let i = 0; i < count; i++) {
        age[i] += dt;
        if (age[i] >= life[i]) {
          count--;
          px[i] = px[count];
          py[i] = py[count];
          vx[i] = vx[count];
          vy[i] = vy[count];
          age[i] = age[count];
          life[i] = life[count];
          size[i] = size[count];
          star[i] = star[count];
          phase[i] = phase[count];
          sway[i] = sway[count];
          spin[i] = spin[count];
          i--;
          continue;
        }
        if (still) continue;
        const r = radiusOf(size[i]);
        const fall = 26 + r * 15;
        const drift = Math.sin(age[i] * sway[i] + phase[i]) * (10 + r * 3);
        vx[i] += (drift - vx[i]) * k;
        vy[i] += (fall - vy[i]) * k;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!sprites) return;
      const s = sprites.scale;
      for (let i = 0; i < count; i++) {
        const t = age[i] / life[i];
        const fadeIn = Math.min(1, age[i] / 0.07);
        const fadeOut = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        const alpha = fadeIn * fadeOut * fadeOut * (night ? 0.95 : 0.9);
        if (alpha < 0.01) continue;
        const melt = 1 - 0.3 * t;
        ctx.globalAlpha = alpha;
        if (star[i] >= 0) {
          const img = sprites.stars[star[i]];
          const a = phase[i] + age[i] * spin[i];
          const c = Math.cos(a) * melt;
          const sn = Math.sin(a) * melt;
          ctx.setTransform(c, sn, -sn, c, px[i] * dpr, py[i] * dpr);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        } else {
          const img = sprites.discs[size[i]];
          const side = (img.width / s) * melt;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.drawImage(img, px[i] - side / 2, py[i] - side / 2, side, side);
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0;
      last = now;
      speed *= Math.exp(-dt * 6);
      step(dt);
      draw();
      if (count > 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const local = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const sx = box.width ? root.offsetWidth / box.width : 1;
      const sy = box.height ? root.offsetHeight / box.height : 1;
      return { x: (e.clientX - box.left) * sx, y: (e.clientY - box.top) * sy };
    };

    const onMove = (e: PointerEvent) => {
      const at = local(e);
      const t = e.timeStamp;
      const prev = pointer;
      pointer = { ...at, t };
      if (!prev) return;
      const dx = at.x - prev.x;
      const dy = at.y - prev.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const dts = Math.max(0.004, (t - prev.t) / 1000);
      const v = Math.min(4000, dist / dts);
      speed += (v - speed) * 0.5;
      const boost = Math.min(2.6, 0.45 + speed / 650);
      owed += dist * 0.055 * Math.max(0, rate) * boost * (still ? 0.35 : 1);
      const n = Math.floor(owed);
      owed -= n;
      const ux = dx / dist;
      const uy = dy / dist;
      for (let k = 0; k < n; k++) {
        const along = Math.random();
        const off = (Math.random() - 0.5) * (5 + boost * 3);
        const x = prev.x + dx * along - uy * off;
        const y = prev.y + dy * along + ux * off;
        const carry = 0.1 + Math.random() * 0.08;
        spawn(
          x,
          y,
          still ? 0 : (dx / dts) * carry + (Math.random() - 0.5) * 36,
          still ? 0 : (dy / dts) * carry - 18 - Math.random() * 34,
          Math.min(1, speed / 1600),
        );
      }
      if (n) wake();
    };

    const onLeave = () => {
      pointer = null;
    };

    const onDown = (e: PointerEvent) => {
      if (rate <= 0) return;
      const at = local(e);
      pointer = { ...at, t: e.timeStamp };
      const n = still ? 12 : 40;
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = still ? 0 : 70 + Math.random() * 170;
        const r = still ? 4 + Math.random() * 14 : Math.random() * 4;
        spawn(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v - 45, 1);
      }
      wake();
    };

    const resize = () => {
      const nw = root.offsetWidth;
      const nh = root.offsetHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const redo = nd !== dpr || !sprites;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (redo) readColors();
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen && count) wake();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden && count) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [rate, color, reduce]);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative isolate",
        "[--miyuki-snow-trail-night:0] dark:[--miyuki-snow-trail-night:1]",
        "[--miyuki-snow-trail-flake:color-mix(in_oklab,var(--brand)_58%,var(--muted-foreground))]",
        "dark:[--miyuki-snow-trail-flake:color-mix(in_oklab,var(--foreground)_90%,var(--brand))]",
        className,
      )}
    >
      {children}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
