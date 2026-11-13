"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface MoonpathProps extends ComponentProps<"div"> {
  phase?: number;
  speed?: number;
}

type Vec3 = [number, number, number];

const NIGHT = "--miyuki-moonpath-night";
const STRIPS = 44;
const SPRITE = 64;
const STILL = 1.4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r * 255, g * 255, b * 255];
}

function css([r, g, b]: Vec3, a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function sprite(w: number, h: number, paint?: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const g = canvas.getContext("2d");
  if (g && paint) paint(g);
  return canvas;
}

function capsule(color: Vec3) {
  return sprite(SPRITE, 16, (g) => {
    const gradient = g.createLinearGradient(0, 0, SPRITE, 0);
    gradient.addColorStop(0, css(color, 0));
    gradient.addColorStop(0.25, css(color, 0.75));
    gradient.addColorStop(0.5, css(color, 1));
    gradient.addColorStop(0.75, css(color, 0.75));
    gradient.addColorStop(1, css(color, 0));
    g.fillStyle = gradient;
    g.beginPath();
    g.ellipse(SPRITE / 2, 8, SPRITE / 2, 4.5, 0, 0, Math.PI * 2);
    g.fill();
  });
}

function band(color: Vec3) {
  return sprite(SPRITE * 2, 8, (g) => {
    const gradient = g.createLinearGradient(0, 0, SPRITE * 2, 0);
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const d = (t - 0.5) * 2;
      gradient.addColorStop(t, css(color, k === 0 || k === 10 ? 0 : Math.exp(-d * d * 3.2)));
    }
    g.fillStyle = gradient;
    g.fillRect(0, 0, SPRITE * 2, 8);
  });
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng();
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return table[i & 255] + (table[(i + 1) & 255] - table[i & 255]) * u;
  };
}

export function Moonpath({ phase = 0.5, speed = 1, className, children, ...props }: MoonpathProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const p = ((phase % 1) + 1) % 1;
    const litFraction = (1 - Math.cos(p * Math.PI * 2)) / 2;
    const noise = makeNoise("moonpath:shore");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let night = true;
    let horizon = 0;
    let mx = 0;
    let my = 0;
    let radius = 20;
    let level = 1;
    let scene: HTMLCanvasElement | null = null;
    let glint: HTMLCanvasElement | null = null;
    let glow: HTMLCanvasElement | null = null;
    let stars: { x: number; y: number; r: number; a: number; t: number }[] = [];
    let starTone: Vec3 = [255, 255, 255];

    let count = 0;
    const MAX = 900;
    const gy = new Float32Array(MAX);
    const gu = new Float32Array(MAX);
    const age = new Float32Array(MAX);
    const life = new Float32Array(MAX);
    const len = new Float32Array(MAX);
    const seedRng = createRng("moonpath:glints");

    const observer = { x: 0, target: 0, v: 0, has: false };
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const depthAt = (y: number) => clamp((y - horizon) / Math.max(1, h - horizon), 0, 1);
    const centerAt = (y: number) => mx + (observer.x - mx) * depthAt(y);
    const halfAt = (y: number) => {
      const d = depthAt(y);
      return radius * (night ? 0.55 : 0.75) + d ** 1.15 * Math.min(w * 0.12, h * 0.3) * (night ? 1 : 1.2);
    };

    const respawn = (i: number, rng: () => number, fresh: boolean) => {
      gy[i] = horizon + 1 + (h - horizon) * rng() ** 1.55;
      let u = 0;
      for (let k = 0; k < 3; k++) u += rng() * 2 - 1;
      gu[i] = u * 0.95;
      life[i] = (0.14 + rng() * 0.5) * (0.6 + 0.8 * depthAt(gy[i]));
      age[i] = fresh ? rng() * life[i] : 0;
      len[i] = 0.5 + rng() * 0.9;
    };

    const layout = () => {
      const narrow = w < 560;
      horizon = Math.round(h * (h > w * 1.1 ? 0.47 : 0.53));
      radius = clamp(Math.min(w, h) * 0.055, 13, 32);
      mx = w * (narrow ? 0.76 : 0.68);
      my = night ? h * (narrow ? 0.15 : 0.2) : horizon - Math.max(radius * 2.4, (horizon - h * 0.1) * 0.32);
      if (!observer.has) {
        observer.x = w * 0.5;
        observer.target = observer.x;
      }
      count = Math.min(MAX, Math.round(520 * clamp(h / 480, 0.7, 1.4) * clamp(w / 960, 0.75, 1.3)));
      for (let i = 0; i < count; i++) respawn(i, seedRng, true);
      const rng = createRng(`moonpath:stars:${Math.round(w)}`);
      stars = [];
      const n = Math.round((w * horizon) / 5200);
      for (let i = 0; i < n; i++) {
        const x = rng() * w;
        const y = rng() ** 1.3 * horizon * 0.9;
        const d = Math.hypot(x - mx, y - my);
        if (d < radius * 5) continue;
        stars.push({ x, y, r: 0.4 + rng() ** 3 * 0.9, a: 0.25 + rng() * 0.6, t: rng() * 10 });
      }
    };

    const shoreAt = (x: number) => {
      const u = x / w;
      const hills = (noise(u * 7 + 3) * 0.6 + noise(u * 19 + 11) * 0.25) * h * 0.022;
      const cone = Math.max(0, 1 - Math.abs(u - 0.17) / 0.2);
      const peak = cone ** 1.7 * h * 0.105;
      const island = Math.max(0, 1 - Math.abs(u - 0.47) / 0.055) ** 1.4 * h * 0.022;
      const right = clamp((u - 0.78) / 0.22, 0, 1) ** 1.4 * h * 0.04;
      return hills + peak + island + right + h * 0.006;
    };

    const paintScene = () => {
      if (w === 0 || h === 0) return;
      scene = sprite(Math.round(w * dpr), Math.round(h * dpr), (g) => {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = g.createLinearGradient(0, 0, 0, horizon);
        const water = g.createLinearGradient(0, horizon, 0, h);
        if (night) {
          sky.addColorStop(0, css(rgb("color-mix(in oklab, var(--background) 82%, black)", canvas)));
          sky.addColorStop(0.6, css(rgb("color-mix(in oklab, var(--background) 92%, var(--brand))", canvas)));
          sky.addColorStop(1, css(rgb("color-mix(in oklab, var(--background) 80%, var(--brand))", canvas)));
          water.addColorStop(0, css(rgb("color-mix(in oklab, var(--background) 86%, var(--brand))", canvas)));
          water.addColorStop(0.25, css(rgb("color-mix(in oklab, var(--background) 94%, var(--brand))", canvas)));
          water.addColorStop(1, css(rgb("color-mix(in oklab, var(--background) 78%, black)", canvas)));
        } else {
          sky.addColorStop(0, css(rgb("color-mix(in oklab, var(--background) 86%, var(--brand))", canvas)));
          sky.addColorStop(0.3, css(rgb("color-mix(in oklab, var(--background) 94%, var(--brand))", canvas)));
          sky.addColorStop(0.62, css(rgb("color-mix(in oklab, var(--background) 95%, var(--warning))", canvas)));
          sky.addColorStop(1, css(rgb("color-mix(in oklab, var(--background) 76%, var(--warning))", canvas)));
          const blue = "color-mix(in oklab, var(--brand) 55%, var(--foreground))";
          water.addColorStop(
            0,
            css(
              rgb(
                `color-mix(in oklab, color-mix(in oklab, var(--background) 74%, ${blue}) 88%, var(--warning))`,
                canvas,
              ),
            ),
          );
          water.addColorStop(0.3, css(rgb(`color-mix(in oklab, var(--background) 72%, ${blue})`, canvas)));
          water.addColorStop(1, css(rgb(`color-mix(in oklab, var(--background) 62%, ${blue})`, canvas)));
        }
        g.fillStyle = sky;
        g.fillRect(0, 0, w, horizon + 1);
        g.fillStyle = water;
        g.fillRect(0, horizon, w, h - horizon);

        const haloTone = night
          ? rgb("color-mix(in oklab, var(--foreground) 70%, var(--brand))", canvas)
          : rgb("color-mix(in oklab, var(--warning) 60%, white)", canvas);
        const reach = night ? radius * 9 : radius * 12;
        const halo = g.createRadialGradient(mx, my, radius * 0.8, mx, my, reach);
        const strength = night ? 0.2 * (0.25 + 0.75 * level) : 0.55;
        halo.addColorStop(0, css(haloTone, strength));
        halo.addColorStop(0.3, css(haloTone, strength * 0.35));
        halo.addColorStop(1, css(haloTone, 0));
        g.globalCompositeOperation = night ? "lighter" : "source-over";
        g.fillStyle = halo;
        g.fillRect(0, 0, w, horizon);
        g.globalCompositeOperation = "source-over";

        const lineTone = night
          ? rgb("color-mix(in oklab, var(--brand) 50%, var(--foreground))", canvas)
          : rgb("var(--card)", canvas);
        const rng = createRng(`moonpath:sheen:${Math.round(w)}x${Math.round(h)}`);
        const lines = Math.round((w * (h - horizon)) / (night ? 900 : 520));
        g.lineCap = "round";
        for (let i = 0; i < lines; i++) {
          const y = horizon + 2 + (h - horizon) * rng() ** 1.3;
          const d = depthAt(y);
          const l = (6 + rng() * 40) * (0.3 + d);
          const x = rng() * w;
          g.strokeStyle = css(lineTone, (night ? 0.03 + rng() * 0.05 : 0.08 + rng() * 0.16) * (0.4 + 0.6 * d));
          g.lineWidth = 0.5 + d;
          g.beginPath();
          g.moveTo(x - l / 2, y);
          g.lineTo(x + l / 2, y);
          g.stroke();
        }

        const far = night
          ? rgb("color-mix(in oklab, var(--background) 72%, black)", canvas)
          : rgb(
              "color-mix(in oklab, color-mix(in oklab, var(--background) 74%, var(--brand)) 85%, var(--foreground))",
              canvas,
            );
        const near = night
          ? rgb("color-mix(in oklab, var(--background) 60%, black)", canvas)
          : rgb(
              "color-mix(in oklab, color-mix(in oklab, var(--background) 66%, var(--brand)) 80%, var(--foreground))",
              canvas,
            );
        const ridge = g.createLinearGradient(0, horizon - h * 0.12, 0, horizon);
        ridge.addColorStop(0, css(far));
        ridge.addColorStop(1, css(near));
        g.fillStyle = ridge;
        g.beginPath();
        g.moveTo(0, horizon + 1);
        for (let x = 0; x <= w + 4; x += 4) g.lineTo(x, horizon - shoreAt(x));
        g.lineTo(w, horizon + 1);
        g.closePath();
        g.fill();
        const tipX = w * 0.17;
        const tipY = horizon - shoreAt(tipX);
        const snowline = tipY + h * 0.034;
        const snow = night
          ? rgb("color-mix(in oklab, var(--background) 74%, var(--foreground))", canvas)
          : rgb("var(--card)", canvas);
        const snowShade = night
          ? rgb("color-mix(in oklab, var(--background) 80%, var(--foreground))", canvas)
          : rgb("color-mix(in oklab, var(--card) 78%, var(--brand))", canvas);
        const px = 1 / dpr;
        for (let x = Math.round((tipX - w * 0.1) * dpr) * px; x <= tipX + w * 0.1; x += px) {
          const top = horizon - shoreAt(x) + 0.4;
          const gully = noise(x * 0.42 + 13) ** 4 * h * 0.03 + noise(x * 0.06 + 5) * h * 0.008;
          const bottom = snowline + gully;
          if (bottom <= top + 0.5) continue;
          const tone = mix(snow, snowShade, clamp((x - tipX) / (w * 0.08), 0, 1));
          const fall = g.createLinearGradient(0, top, 0, bottom);
          fall.addColorStop(0, css(tone, night ? 0.55 : 0.95));
          fall.addColorStop(0.65, css(tone, night ? 0.4 : 0.8));
          fall.addColorStop(1, css(tone, 0));
          g.fillStyle = fall;
          g.fillRect(x, top, px, bottom - top);
        }
        g.globalAlpha = night ? 0.5 : 0.35;
        g.fillStyle = css(near);
        g.beginPath();
        g.moveTo(0, horizon);
        for (let x = 0; x <= w + 4; x += 4) g.lineTo(x, horizon + shoreAt(x) * 0.42);
        g.lineTo(w, horizon);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;

        drawMoon(g);
      });
    };

    const drawMoon = (g: CanvasRenderingContext2D) => {
      if (night) {
        const lit = rgb("color-mix(in oklab, var(--foreground) 86%, var(--warning))", canvas);
        const sea = rgb(
          "color-mix(in oklab, color-mix(in oklab, var(--foreground) 72%, var(--brand)) 88%, var(--background))",
          canvas,
        );
        const dark = rgb("color-mix(in oklab, var(--background) 75%, var(--brand))", canvas);
        const disc = sprite(Math.ceil(radius * 2 * dpr + 4), Math.ceil(radius * 2 * dpr + 4), (m) => {
          const c = m.canvas.width / 2;
          m.setTransform(dpr, 0, 0, dpr, c, c);
          const face = m.createRadialGradient(-radius * 0.25, -radius * 0.3, 0, 0, 0, radius);
          face.addColorStop(0, css(mix(lit, [255, 255, 255], 0.3)));
          face.addColorStop(1, css(mix(lit, sea, 0.25)));
          m.fillStyle = face;
          m.beginPath();
          m.arc(0, 0, radius, 0, Math.PI * 2);
          m.fill();
          const rng = createRng("moonpath:maria");
          m.save();
          m.clip();
          for (let i = 0; i < 9; i++) {
            const a = rng() * Math.PI * 2;
            const r = Math.sqrt(rng()) * radius * 0.62;
            const s = radius * (0.12 + rng() * 0.22);
            const spot = m.createRadialGradient(
              Math.cos(a) * r - radius * 0.1,
              Math.sin(a) * r - radius * 0.12,
              0,
              Math.cos(a) * r - radius * 0.1,
              Math.sin(a) * r - radius * 0.12,
              s,
            );
            spot.addColorStop(0, css(sea, 0.32));
            spot.addColorStop(1, css(sea, 0));
            m.fillStyle = spot;
            m.fillRect(-radius, -radius, radius * 2, radius * 2);
          }
          const limb = m.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius);
          limb.addColorStop(0, css(sea, 0));
          limb.addColorStop(1, css(sea, 0.3));
          m.fillStyle = limb;
          m.fillRect(-radius, -radius, radius * 2, radius * 2);
          m.restore();
          const k = Math.cos(p * Math.PI * 2);
          m.globalCompositeOperation = "destination-in";
          m.save();
          if (p > 0.5) m.scale(-1, 1);
          m.beginPath();
          m.arc(0, 0, radius + 0.5, -Math.PI / 2, Math.PI / 2, false);
          m.ellipse(
            0,
            0,
            Math.max(0.01, (radius + 0.5) * Math.abs(k)),
            radius + 0.5,
            0,
            Math.PI / 2,
            -Math.PI / 2,
            k > 0,
          );
          m.closePath();
          m.fill();
          m.restore();
        });
        g.fillStyle = css(mix(dark, lit, 0.12), 0.25 + 0.6 * (1 - litFraction) ** 2);
        g.beginPath();
        g.arc(mx, my, radius, 0, Math.PI * 2);
        g.fill();
        g.drawImage(disc, mx - disc.width / dpr / 2, my - disc.height / dpr / 2, disc.width / dpr, disc.height / dpr);
      } else {
        const core = rgb("color-mix(in oklab, var(--warning) 22%, white)", canvas);
        const warm = rgb("color-mix(in oklab, var(--warning) 70%, white)", canvas);
        const bloom = g.createRadialGradient(mx, my, radius * 0.5, mx, my, radius * 3.2);
        bloom.addColorStop(0, css(warm, 0.75));
        bloom.addColorStop(0.4, css(warm, 0.25));
        bloom.addColorStop(1, css(warm, 0));
        g.fillStyle = bloom;
        g.fillRect(mx - radius * 4, my - radius * 4, radius * 8, radius * 8);
        const face = g.createRadialGradient(mx, my, 0, mx, my, radius);
        face.addColorStop(0, css([255, 255, 255]));
        face.addColorStop(0.75, css(core));
        face.addColorStop(1, css(mix(core, warm, 0.6)));
        g.fillStyle = face;
        g.beginPath();
        g.arc(mx, my, radius, 0, Math.PI * 2);
        g.fill();
      }
    };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      level = night ? litFraction ** 0.8 : 1;
      const tone = night
        ? rgb("color-mix(in oklab, var(--foreground) 88%, var(--warning))", canvas)
        : rgb("color-mix(in oklab, var(--warning) 35%, white)", canvas);
      glint = capsule(tone);
      glow = band(
        night
          ? rgb("color-mix(in oklab, var(--foreground) 70%, var(--brand))", canvas)
          : rgb("color-mix(in oklab, var(--warning) 55%, white)", canvas),
      );
      starTone = rgb("color-mix(in oklab, var(--foreground) 85%, var(--brand))", canvas);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (w === 0 || h === 0 || !scene || !glint || !glow) return;
      ctx.drawImage(scene, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (night) {
        ctx.fillStyle = css(starTone);
        for (const s of stars) {
          ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(time * 1.3 + s.t * 5));
          ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        }
      }

      ctx.globalCompositeOperation = "lighter";
      const span = h - horizon;
      for (let i = 0; i < STRIPS; i++) {
        const t0 = (i / STRIPS) ** 1.5;
        const t1 = ((i + 1) / STRIPS) ** 1.5;
        const y0 = horizon + span * t0;
        const y1 = horizon + span * t1 + 0.5;
        const ym = (y0 + y1) / 2;
        const d = depthAt(ym);
        const half = halfAt(ym) * 1.3;
        const a = level * (night ? 0.3 : 0.32) * (1.2 - 0.8 * d) * (0.85 + 0.15 * Math.sin(time * 1.7 * pace + i));
        ctx.globalAlpha = clamp(a, 0, 1);
        const slope = (observer.x - mx) / Math.max(1, span);
        ctx.setTransform(dpr, 0, slope * dpr, dpr, (centerAt(ym) - slope * ym) * dpr, 0);
        ctx.drawImage(glow, -half, y0, half * 2, y1 - y0);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const line = Math.max(2, radius * 0.9);
      ctx.globalAlpha = clamp(level * (night ? 0.75 : 0.9), 0, 1);
      ctx.drawImage(glint, mx - line, horizon - 1, line * 2, 3);

      for (let i = 0; i < count; i++) {
        const y = gy[i];
        const d = depthAt(y);
        const t = age[i] / life[i];
        if (t <= 0 || t >= 1) continue;
        const env = Math.sin(Math.PI * t);
        const u = gu[i];
        const across = Math.exp(-u * u * 1.6);
        const swell =
          0.55 + 0.45 * Math.sin(y * (0.16 - 0.1 * d) - time * 2.2 * pace + Math.sin(y * 0.031 + time * 0.4) * 2);
        const a = level * env * across * swell * (night ? 1.1 : 1.05);
        if (a < 0.02) continue;
        const sway = Math.sin(y * 0.045 - time * 0.9 * pace) * 3 * d;
        const x = centerAt(y) + u * halfAt(y) + sway;
        const l = (2.5 + 30 * d ** 1.2) * len[i] * (night ? 1 : 1.2) * (0.55 + 0.45 * across);
        const th = 0.75 + 1.05 * d;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(glint, x - l / 2, y - th, l, th * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const step = (dt: number) => {
      const k = dt * pace;
      for (let i = 0; i < count; i++) {
        age[i] += k;
        if (age[i] >= life[i]) respawn(i, Math.random, false);
      }
      const stiffness = 9;
      const damping = 2 * Math.sqrt(stiffness) * 1.05;
      const a = (observer.target - observer.x) * stiffness - observer.v * damping;
      observer.v += a * dt;
      observer.x += observer.v * dt;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt;
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

    const settle = () => {
      if (!still) return;
      time = STILL;
      for (let i = 0; i < count; i++) {
        respawn(i, seedRng, true);
      }
      observer.x = observer.target;
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
      readColors();
      layout();
      paintScene();
      settle();
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      observer.has = true;
      observer.target = clamp(event.clientX - box.left, -w * 0.1, w * 1.1);
      if (still) {
        observer.x = observer.target;
        draw();
      }
    };
    const onLeave = () => {
      observer.target = w * 0.5;
      if (still) {
        observer.x = observer.target;
        draw();
      }
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
      layout();
      paintScene();
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
  }, [phase, speed, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-moonpath-night:0] dark:[--miyuki-moonpath-night:1]",
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
