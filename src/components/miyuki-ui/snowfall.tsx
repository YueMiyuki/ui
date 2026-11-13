"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SnowfallHandle {
  clear: () => void;
}

export interface SnowfallProps extends Omit<ComponentProps<"div">, "ref"> {
  density?: number;
  wind?: number;
  speed?: number;
  accumulate?: boolean;
  maxDepth?: number;
  resetKey?: string | number;
  ref?: Ref<SnowfallHandle>;
}

const NIGHT = "--miyuki-snowfall-night";
const LEDGE = "[data-snow-ledge]";
const PER_AREA = 46;
const MAX_FLAKES = 1400;
const STEP = 2;
const REPOSE = 0.85;
const SPRITE = 64;

interface Layer {
  share: number;
  size: [number, number];
  fall: [number, number];
  sway: [number, number];
  alpha: [number, number];
  drift: number;
  soft: number;
}

const LAYERS: Layer[] = [
  { share: 0.5, size: [0.55, 1.05], fall: [16, 24], sway: [3, 7], alpha: [0.32, 0.55], drift: 0.45, soft: 0.5 },
  { share: 0.33, size: [1.15, 1.9], fall: [30, 44], sway: [7, 15], alpha: [0.55, 0.85], drift: 0.75, soft: 0.42 },
  { share: 0.17, size: [2.2, 3.4], fall: [56, 80], sway: [10, 22], alpha: [0.55, 0.85], drift: 1, soft: 0.2 },
];

interface Pile {
  el: Element;
  x: number;
  y: number;
  width: number;
  radius: number;
  n: number;
  h: Float32Array;
  drop: Float32Array;
  grain: Float32Array;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function sprite(paint: (g: CanvasRenderingContext2D, c: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const g = canvas.getContext("2d");
  if (g) paint(g, SPRITE / 2);
  return canvas;
}

function disc(color: string, soft: number, el: Element) {
  return sprite((g, c) => {
    const gradient = g.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, rgba(color, 1, el));
    gradient.addColorStop(soft, rgba(color, 0.95, el));
    gradient.addColorStop(Math.min(0.98, soft + (1 - soft) * 0.45), rgba(color, 0.35, el));
    gradient.addColorStop(1, rgba(color, 0, el));
    g.fillStyle = gradient;
    g.fillRect(0, 0, SPRITE, SPRITE);
  });
}

function star(color: string, el: Element) {
  return sprite((g, c) => {
    g.strokeStyle = rgba(color, 1, el);
    g.lineCap = "round";
    const arm = c * 0.86;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      g.lineWidth = SPRITE * 0.07;
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + ux * arm, c + uy * arm);
      g.stroke();
      g.lineWidth = SPRITE * 0.05;
      for (const [at, len] of [
        [0.5, 0.26],
        [0.74, 0.17],
      ]) {
        const bx = c + ux * arm * at;
        const by = c + uy * arm * at;
        for (const side of [-1, 1]) {
          const b = a + (side * Math.PI) / 3;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx + Math.cos(b) * arm * len, by + Math.sin(b) * arm * len);
          g.stroke();
        }
      }
    }
    g.fillStyle = rgba(color, 1, el);
    g.beginPath();
    g.arc(c, c, SPRITE * 0.07, 0, Math.PI * 2);
    g.fill();
  });
}

export function Snowfall({
  density = 1,
  wind = 0.15,
  speed = 1,
  accumulate = true,
  maxDepth = 14,
  resetKey,
  ref,
  className,
  children,
  ...props
}: SnowfallProps) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const meltRef = useRef<() => void>(() => {});
  const keyRef = useRef(resetKey);
  const reduce = useReducedMotion();

  useImperativeHandle(ref, () => ({ clear: () => meltRef.current() }), []);

  useEffect(() => {
    if (keyRef.current === resetKey) return;
    keyRef.current = resetKey;
    meltRef.current();
  }, [resetKey]);

  useEffect(() => {
    const back = backRef.current;
    const front = frontRef.current;
    const root = back?.parentElement;
    const bctx = back?.getContext("2d");
    const fctx = front?.getContext("2d");
    if (!back || !front || !root || !bctx || !fctx) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const lean = clamp(wind, -1, 1);
    const depthCap = Math.max(1, maxDepth);
    const rng = createRng("snowfall");

    const layerOf = new Uint8Array(MAX_FLAKES);
    const fx = new Float32Array(MAX_FLAKES);
    const fy = new Float32Array(MAX_FLAKES);
    const size = new Float32Array(MAX_FLAKES);
    const fall = new Float32Array(MAX_FLAKES);
    const swayAmp = new Float32Array(MAX_FLAKES);
    const swayRate = new Float32Array(MAX_FLAKES);
    const phase = new Float32Array(MAX_FLAKES);
    const alpha = new Float32Array(MAX_FLAKES);
    const spin = new Float32Array(MAX_FLAKES);
    const isStar = new Uint8Array(MAX_FLAKES);
    for (let i = 0; i < MAX_FLAKES; i++) {
      const pick = rng();
      const l = pick < LAYERS[0].share ? 0 : pick < LAYERS[0].share + LAYERS[1].share ? 1 : 2;
      const layer = LAYERS[l];
      layerOf[i] = l;
      fx[i] = rng();
      fy[i] = rng();
      size[i] = rng.range(layer.size[0], layer.size[1]);
      fall[i] = rng.range(layer.fall[0], layer.fall[1]);
      swayAmp[i] = rng.range(layer.sway[0], layer.sway[1]);
      swayRate[i] = rng.range(0.35, 0.9);
      phase[i] = rng.range(0, Math.PI * 2);
      alpha[i] = rng.range(layer.alpha[0], layer.alpha[1]);
      spin[i] = rng.range(-0.6, 0.6);
      isStar[i] = l === 2 && rng() < 0.16 ? 1 : 0;
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    let count = 0;
    let night = false;
    let sprites: HTMLCanvasElement[] = [];
    let starSprite: HTMLCanvasElement | null = null;
    let snowTop = "";
    let snowBottom = "";
    let outline = "";
    let shade = "";
    let halo = "";
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let melting = false;
    let scale = 1;
    let originX = 0;
    let originY = 0;
    const piles = new Map<Element, Pile>();

    const readColors = () => {
      night = cssVar(NIGHT, back) === "1";
      const flake = night
        ? "color-mix(in oklab, var(--foreground) 90%, var(--brand))"
        : "color-mix(in oklab, var(--brand) 58%, var(--foreground))";
      sprites = LAYERS.map((layer) => disc(flake, layer.soft, back));
      starSprite = star(flake, back);
      snowTop = night
        ? rgba("color-mix(in oklab, var(--foreground) 97%, var(--brand))", 1, back)
        : rgba("var(--card)", 1, back);
      snowBottom = night
        ? rgba("color-mix(in oklab, var(--foreground) 78%, var(--brand))", 1, back)
        : rgba("color-mix(in oklab, var(--brand) 20%, var(--card))", 1, back);
      outline = night
        ? rgba("color-mix(in oklab, var(--brand) 50%, var(--foreground))", 0.18, back)
        : rgba("color-mix(in oklab, var(--brand) 55%, var(--foreground))", 0.16, back);
      shade = night ? rgba("var(--brand)", 0.55, back) : rgba("var(--brand)", 0.42, back);
      halo = night ? "transparent" : rgba("color-mix(in oklab, var(--brand) 70%, var(--foreground))", 0.32, back);
    };

    const measure = () => {
      const box = root.getBoundingClientRect();
      scale = root.clientWidth > 0 ? box.width / root.clientWidth : 1;
      if (!(scale > 0)) scale = 1;
      originX = box.left + root.clientLeft * scale;
      originY = box.top + root.clientTop * scale;
    };

    const shape = (pile: Pile, width: number, radius: number) => {
      const n = Math.max(2, Math.ceil(width / STEP) + 1);
      const old = pile.h;
      const oldN = pile.n;
      pile.n = n;
      pile.width = width;
      pile.radius = radius;
      pile.h = new Float32Array(n);
      pile.drop = new Float32Array(n);
      pile.grain = new Float32Array(n);
      const grains = createRng(`snowfall:grain:${n}`);
      let wobble = 0;
      for (let i = 0; i < n; i++) {
        const x = Math.min(width, i * STEP);
        const d = Math.min(x, width - x);
        pile.drop[i] = d < radius ? radius - Math.sqrt(Math.max(0, radius * radius - (radius - d) ** 2)) : 0;
        wobble = wobble * 0.82 + (grains() - 0.5) * 0.36;
        pile.grain[i] = 1 + wobble;
        if (oldN > 1) {
          const t = (i / (n - 1)) * (oldN - 1);
          const k = Math.min(oldN - 2, Math.floor(t));
          pile.h[i] = old[k] + (old[k + 1] - old[k]) * (t - k);
        }
      }
    };

    const syncLedges = () => {
      if (!accumulate) {
        piles.clear();
        return;
      }
      const found = new Set(root.querySelectorAll(LEDGE));
      for (const el of piles.keys()) if (!found.has(el)) piles.delete(el);
      for (const el of found) {
        if (!piles.has(el)) {
          piles.set(el, {
            el,
            x: 0,
            y: 0,
            width: 0,
            radius: 0,
            n: 0,
            h: new Float32Array(0),
            drop: new Float32Array(0),
            grain: new Float32Array(0),
          });
        }
      }
    };

    const place = () => {
      measure();
      for (const pile of piles.values()) {
        const r = pile.el.getBoundingClientRect();
        const x = (r.left - originX) / scale;
        const y = (r.top - originY) / scale;
        const width = r.width / scale;
        pile.x = x;
        pile.y = y;
        if (Math.abs(width - pile.width) > 0.5 || pile.n === 0) {
          const style = getComputedStyle(pile.el);
          const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, width / 2);
          shape(pile, width, radius);
        }
      }
    };

    const surface = (pile: Pile, lx: number) => {
      const t = clamp(lx / STEP, 0, pile.n - 1);
      const k = Math.min(pile.n - 2, Math.floor(t));
      const f = t - k;
      const hh = pile.h[k] + (pile.h[k + 1] - pile.h[k]) * f;
      const dd = pile.drop[k] + (pile.drop[k + 1] - pile.drop[k]) * f;
      return pile.y + dd - hh;
    };

    const deposit = (pile: Pile, lx: number, amount: number) => {
      const c = lx / STEP;
      const sigma = 3;
      const k0 = Math.max(0, Math.floor(c - sigma * 2.5));
      const k1 = Math.min(pile.n - 1, Math.ceil(c + sigma * 2.5));
      for (let k = k0; k <= k1; k++) {
        const d = (k - c) / sigma;
        const room = depthCap - pile.h[k];
        if (room <= 0) continue;
        pile.h[k] += Math.min(room, amount * Math.exp(-d * d));
      }
    };

    const relax = (pile: Pile, dt: number) => {
      const { n, h: hh, drop } = pile;
      const limit = REPOSE * STEP;
      for (let pass = 0; pass < 2; pass++) {
        for (let k = -1; k < n; k++) {
          const a = k;
          const b = k + 1;
          const sa = a < 0 ? -drop[0] - 4 : hh[a] - drop[a];
          const sb = b >= n ? -drop[n - 1] - 4 : hh[b] - drop[b];
          const diff = sa - sb;
          if (Math.abs(diff) <= limit) continue;
          const move = (Math.abs(diff) - limit) * 0.25;
          if (diff > 0 && a >= 0) {
            const m = Math.min(move, hh[a]);
            hh[a] -= m;
            if (b < n) hh[b] += m;
          } else if (diff < 0 && b < n) {
            const m = Math.min(move, hh[b]);
            hh[b] -= m;
            if (a >= 0) hh[a] += m;
          }
        }
      }
      const soften = Math.min(0.2, dt * 3);
      let prev = hh[0];
      for (let k = 1; k < n - 1; k++) {
        const cur = hh[k];
        hh[k] = cur + ((prev + hh[k + 1]) * 0.5 - cur) * soften;
        prev = cur;
      }
    };

    const grow = (dt: number) => {
      const fine = 0.66 * Math.max(0, density) * pace;
      const meltRate = depthCap / 0.9;
      let left = false;
      for (const pile of piles.values()) {
        const hh = pile.h;
        for (let k = 0; k < pile.n; k++) {
          if (melting) {
            hh[k] = Math.max(0, hh[k] - meltRate * dt * (0.75 + 0.5 * pile.grain[k]));
            if (hh[k] > 0) left = true;
            continue;
          }
          const fill = hh[k] / depthCap;
          const edge = pile.drop[k] > 0 ? Math.max(0, 1 - pile.drop[k] / 3) : 1;
          hh[k] += fine * dt * pile.grain[k] * edge * (1 - fill ** 4);
          hh[k] -= 0.08 * dt * fill * fill;
          if (hh[k] > depthCap) hh[k] = depthCap;
          if (hh[k] < 0) hh[k] = 0;
        }
        if (!melting) relax(pile, dt);
      }
      if (melting && !left) melting = false;
    };

    const step = (dt: number) => {
      const move = dt * pace;
      const gust = 1 + 0.28 * Math.sin(time * 0.13) + 0.12 * Math.sin(time * 0.37 + 1.3);
      const span = w + 80;
      for (let i = 0; i < count; i++) {
        const l = layerOf[i];
        const layer = LAYERS[l];
        const px = fx[i] * span - 40;
        const py = fy[i] * (h + 40) - 20;
        const s = swayRate[i] * time + phase[i];
        const vx = lean * 72 * layer.drift * gust + Math.cos(s) * swayAmp[i] * swayRate[i];
        const vy = fall[i] * (1 + 0.12 * Math.sin(s * 1.7));
        let nx = px + vx * move;
        const ny = py + vy * move;
        if (l === 1 && !melting && piles.size > 0) {
          let landed = false;
          for (const pile of piles.values()) {
            const lx = nx - pile.x;
            if (lx < 0 || lx > pile.width) continue;
            const top = surface(pile, lx);
            if (py <= top && ny >= top) {
              deposit(pile, lx, 0.9 * Math.max(0.6, size[i]));
              landed = true;
              break;
            }
          }
          if (landed) {
            fy[i] = 0;
            fx[i] = Math.random();
            continue;
          }
        }
        if (nx < -40) nx += span;
        else if (nx > w + 40) nx -= span;
        fx[i] = (nx + 40) / span;
        let v = (ny + 20) / (h + 40);
        if (v > 1) {
          v -= 1;
          fx[i] = Math.random();
        }
        fy[i] = v;
      }
    };

    const drawFlakes = (ctx: CanvasRenderingContext2D, layers: number[]) => {
      const span = w + 80;
      for (let i = 0; i < count; i++) {
        const l = layerOf[i];
        if (!layers.includes(l)) continue;
        const x = (fx[i] * span - 40) * dpr;
        const y = (fy[i] * (h + 40) - 20) * dpr;
        ctx.globalAlpha = alpha[i] * (night ? 1 : 0.72);
        if (isStar[i] && starSprite) {
          const r = size[i] * 1.55 * dpr;
          const a = spin[i] * time + phase[i];
          ctx.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), x, y);
          ctx.drawImage(starSprite, -r, -r, r * 2, r * 2);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          const r = size[i] * (1 + LAYERS[l].soft * 0.9) * dpr;
          ctx.drawImage(sprites[l], x - r, y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawPiles = (ctx: CanvasRenderingContext2D) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const pile of piles.values()) {
        const { n, h: hh, drop } = pile;
        let first = -1;
        let lastK = -1;
        let peak = 0;
        for (let k = 0; k < n; k++) {
          if (hh[k] > 0.15) {
            if (first < 0) first = k;
            lastK = k;
            if (hh[k] > peak) peak = hh[k];
          }
        }
        if (first < 0 || peak < 0.4) continue;
        const k0 = Math.max(0, first - 1);
        const k1 = Math.min(n - 1, lastK + 1);
        const X = (k: number) => pile.x + Math.min(pile.width, k * STEP);
        const top = (k: number) => pile.y + drop[k] - hh[k];
        const base = (k: number) => pile.y + drop[k];

        const trace = () => {
          ctx.moveTo(X(k0), base(k0));
          ctx.lineTo(X(k0), top(k0));
          for (let k = k0 + 1; k <= k1; k++) {
            const mx = (X(k - 1) + X(k)) / 2;
            const my = (top(k - 1) + top(k)) / 2;
            ctx.quadraticCurveTo(X(k - 1), top(k - 1), mx, my);
          }
          ctx.lineTo(X(k1), top(k1));
          ctx.lineTo(X(k1), base(k1));
        };

        ctx.beginPath();
        ctx.moveTo(X(k0), base(k0) + 0.5);
        for (let k = k0 + 1; k <= k1; k++) ctx.lineTo(X(k), base(k) + 0.5);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = shade;
        ctx.globalAlpha = Math.min(1, peak / 3);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        trace();
        for (let k = k1; k >= k0; k--) ctx.lineTo(X(k), base(k));
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, pile.y - peak, 0, pile.y + 1);
        gradient.addColorStop(0, snowTop);
        gradient.addColorStop(0.4, snowTop);
        gradient.addColorStop(1, snowBottom);
        ctx.fillStyle = gradient;
        ctx.shadowColor = halo;
        ctx.shadowBlur = 5 * dpr;
        ctx.shadowOffsetY = -0.5 * dpr;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.beginPath();
        ctx.moveTo(X(k0), top(k0));
        for (let k = k0 + 1; k <= k1; k++) {
          const mx = (X(k - 1) + X(k)) / 2;
          const my = (top(k - 1) + top(k)) / 2;
          ctx.quadraticCurveTo(X(k - 1), top(k - 1), mx, my);
        }
        ctx.lineTo(X(k1), top(k1));
        ctx.lineWidth = 1;
        ctx.strokeStyle = outline;
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const draw = (fresh = true) => {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, back.width, back.height);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, front.width, front.height);
      if (sprites.length === 0) return;
      drawFlakes(bctx, [0, 1]);
      if (piles.size > 0) {
        if (fresh) place();
        drawPiles(fctx);
      }
      drawFlakes(fctx, [2]);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt * pace;
      if (piles.size > 0) {
        place();
        grow(dt);
      }
      step(dt);
      draw(false);
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

    const settleStill = () => {
      if (!still) return;
      place();
      for (const pile of piles.values()) {
        for (let k = 0; k < pile.n; k++) {
          const edge = pile.drop[k] > 0 ? Math.max(0, 1 - pile.drop[k] / 3) : 1;
          pile.h[k] = depthCap * 0.62 * pile.grain[k] * edge;
        }
        for (let s = 0; s < 40; s++) relax(pile, 1 / 30);
      }
      draw();
    };

    const resize = () => {
      const nw = back.clientWidth;
      const nh = back.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      for (const c of [back, front]) {
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
      }
      count = clamp(Math.round(((w * h) / 100000) * PER_AREA * Math.max(0, density)), 0, MAX_FLAKES);
      if (sprites.length === 0) readColors();
      if (still) settleStill();
      else draw();
    };

    meltRef.current = () => {
      if (still) {
        for (const pile of piles.values()) pile.h.fill(0);
        draw();
        return;
      }
      melting = true;
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (still) settleStill();
    });
    ro.observe(back);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(back);
    const mo = new MutationObserver(() => {
      syncLedges();
      if (still) settleStill();
    });
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-snow-ledge"] });
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    syncLedges();
    resize();
    settleStill();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      meltRef.current = () => {};
    };
  }, [density, wind, speed, accumulate, maxDepth, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-snowfall-night:0] dark:[--miyuki-snowfall-night:1]",
        className,
      )}
      {...props}
    >
      <canvas ref={backRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 block size-full" />
      {children}
      <canvas ref={frontRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 block size-full" />
    </div>
  );
}
