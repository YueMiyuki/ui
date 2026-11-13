"use client";

import { type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useMemo,
} from "react";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type RidgeCardMood = "dawn" | "day" | "dusk" | "night" | "aurora" | "snow";

export interface RidgeCardProps extends ComponentProps<"div"> {
  seed?: number | string;
  mood?: RidgeCardMood;
  maxTilt?: number;
}

type Lab = [number, number, number];

interface Palette {
  sky: [number, Lab][];
  far: Lab;
  near: Lab;
  haze: Lab;
  hazeAlpha: number;
  snow: Lab;
  shade: Lab;
  pine: Lab;
  disc: Lab | null;
  halo: Lab;
  glow: Lab | null;
  sun: [number, number] | "low-left" | "low-right";
  moon: boolean;
  stars: boolean;
  light: -1 | 1;
}

const lch = (l: number, c: number, h: number): Lab => [l, c, h];
const mix = (a: Lab, b: Lab, t: number): Lab => {
  const ah = (a[2] * Math.PI) / 180;
  const bh = (b[2] * Math.PI) / 180;
  const x = a[1] * Math.cos(ah) * (1 - t) + b[1] * Math.cos(bh) * t;
  const y = a[1] * Math.sin(ah) * (1 - t) + b[1] * Math.sin(bh) * t;
  return [a[0] + (b[0] - a[0]) * t, Math.hypot(x, y), ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360];
};
const css = ([l, c, h]: Lab) => `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;

const PALETTES: Record<RidgeCardMood, Palette> = {
  dawn: {
    sky: [
      [0, lch(0.7, 0.06, 256)],
      [0.42, lch(0.81, 0.05, 300)],
      [0.72, lch(0.88, 0.06, 18)],
      [1, lch(0.93, 0.075, 76)],
    ],
    far: lch(0.76, 0.05, 298),
    near: lch(0.3, 0.06, 272),
    haze: lch(0.88, 0.05, 330),
    hazeAlpha: 0.55,
    snow: lch(0.95, 0.04, 28),
    shade: lch(0.6, 0.08, 285),
    pine: lch(0.24, 0.05, 272),
    disc: lch(0.99, 0.04, 88),
    halo: lch(0.93, 0.09, 70),
    glow: lch(0.92, 0.08, 62),
    sun: "low-left",
    moon: false,
    stars: false,
    light: -1,
  },
  day: {
    sky: [
      [0, lch(0.68, 0.11, 244)],
      [0.55, lch(0.83, 0.06, 234)],
      [1, lch(0.94, 0.024, 220)],
    ],
    far: lch(0.8, 0.04, 238),
    near: lch(0.33, 0.06, 236),
    haze: lch(0.93, 0.02, 230),
    hazeAlpha: 0.5,
    snow: lch(0.985, 0.008, 228),
    shade: lch(0.66, 0.07, 248),
    pine: lch(0.27, 0.05, 220),
    disc: lch(0.995, 0.012, 95),
    halo: lch(0.97, 0.035, 95),
    glow: null,
    sun: [0.74, 0.15],
    moon: false,
    stars: false,
    light: 1,
  },
  dusk: {
    sky: [
      [0, lch(0.32, 0.06, 274)],
      [0.42, lch(0.46, 0.085, 296)],
      [0.74, lch(0.64, 0.09, 330)],
      [0.9, lch(0.75, 0.1, 42)],
      [1, lch(0.82, 0.1, 68)],
    ],
    far: lch(0.58, 0.08, 312),
    near: lch(0.2, 0.04, 274),
    haze: lch(0.66, 0.09, 330),
    hazeAlpha: 0.45,
    snow: lch(0.82, 0.08, 30),
    shade: lch(0.42, 0.08, 290),
    pine: lch(0.16, 0.035, 274),
    disc: lch(0.96, 0.07, 76),
    halo: lch(0.83, 0.13, 50),
    glow: lch(0.8, 0.12, 52),
    sun: "low-right",
    moon: false,
    stars: false,
    light: 1,
  },
  night: {
    sky: [
      [0, lch(0.16, 0.035, 262)],
      [0.6, lch(0.22, 0.045, 256)],
      [1, lch(0.31, 0.055, 248)],
    ],
    far: lch(0.33, 0.05, 252),
    near: lch(0.14, 0.03, 258),
    haze: lch(0.4, 0.05, 248),
    hazeAlpha: 0.32,
    snow: lch(0.68, 0.04, 238),
    shade: lch(0.22, 0.045, 258),
    pine: lch(0.11, 0.025, 258),
    disc: lch(0.96, 0.02, 228),
    halo: lch(0.8, 0.05, 236),
    glow: null,
    sun: [0.72, 0.16],
    moon: true,
    stars: true,
    light: 1,
  },
  aurora: {
    sky: [
      [0, lch(0.13, 0.03, 258)],
      [0.55, lch(0.19, 0.045, 234)],
      [1, lch(0.28, 0.05, 204)],
    ],
    far: lch(0.3, 0.05, 222),
    near: lch(0.12, 0.025, 250),
    haze: lch(0.36, 0.06, 200),
    hazeAlpha: 0.3,
    snow: lch(0.62, 0.06, 192),
    shade: lch(0.2, 0.045, 240),
    pine: lch(0.1, 0.02, 250),
    disc: null,
    halo: lch(0.8, 0.05, 220),
    glow: null,
    sun: [0.72, 0.16],
    moon: false,
    stars: true,
    light: 1,
  },
  snow: {
    sky: [
      [0, lch(0.8, 0.026, 248)],
      [1, lch(0.92, 0.016, 238)],
    ],
    far: lch(0.84, 0.022, 244),
    near: lch(0.95, 0.01, 236),
    haze: lch(0.95, 0.01, 236),
    hazeAlpha: 0.6,
    snow: lch(0.985, 0.006, 236),
    shade: lch(0.76, 0.04, 248),
    pine: lch(0.42, 0.045, 222),
    disc: null,
    halo: lch(0.97, 0.02, 90),
    glow: null,
    sun: [0.7, 0.18],
    moon: false,
    stars: false,
    light: 1,
  },
};

const VW = 400;
const VH = 480;
const DEPTH = [0.08, 0.2, 0.38, 0.64, 1];
const SHIFT_X = 18;
const SHIFT_Y = 9;
const SETTLE = { stiffness: 170, damping: 22, mass: 0.9 };

function noise1(rng: Rng, n = 128) {
  const v = Array.from({ length: n }, () => rng());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f1 = (v: number) => Math.round(v * 10) / 10;

interface Ridge {
  d: string;
  snow: string;
  shade: string;
  pines: string;
  top: number;
  base: number;
  ys: number[];
}

const STEP = 4;
const X0 = -48;
const X1 = VW + 48;

function buildRidges(seed: number | string, light: -1 | 1): Ridge[] {
  const ridges: Ridge[] = [];
  for (let i = 0; i < 5; i++) {
    const rng = createRng(`${seed}:ridge:${i}`);
    const n1 = noise1(rng);
    const n2 = noise1(rng);
    const n3 = noise1(rng);
    const n4 = noise1(rng);
    const d = i / 4;
    const base = VH * lerp(0.56, 0.95, d ** 1.05);
    const amp = VH * lerp(0.27, 0.13, d) * rng.range(0.88, 1.1);
    const sharp = lerp(1.7, 1.05, d);
    const ys: number[] = [];
    for (let x = X0; x <= X1; x += STEP) {
      const r = 1 - Math.abs(2 * n1(x / lerp(46, 120, d)) - 1);
      const h =
        lerp(0.62, 0.32, d) * r ** sharp +
        lerp(0.28, 0.5, d) * n2(x / lerp(110, 190, d)) +
        lerp(0.1, 0.06, d) * n3(x / lerp(13, 30, d)) +
        lerp(0.06, 0.02, d) * n4(x / 5);
      ys.push(base - amp * h);
    }
    const top = Math.min(...ys);
    let d0 = `M${X0} ${VH + 40}`;
    ys.forEach((y, k) => (d0 += `L${X0 + k * STEP} ${f1(y)}`));
    d0 += `L${X1} ${VH + 40}Z`;

    let snow = "";
    if (i < 3) {
      const line = top + amp * lerp(0.42, 0.3, d);
      const top2: string[] = [];
      const bottom: string[] = [];
      ys.forEach((y, k) => {
        const x = X0 + k * STEP;
        const jag = (n3(x / 6 + 40) - 0.5) * 14 + (n4(x / 17 + 9) - 0.5) * 18;
        top2.push(`${x} ${f1(y)}`);
        bottom.push(`${x} ${f1(Math.max(y, line + jag))}`);
      });
      snow = `M${top2.join("L")}L${bottom.reverse().join("L")}Z`;
    }

    let shade = "";
    if (i < 4) {
      let k = 1;
      while (k < ys.length - 1) {
        const falling = light === -1 ? ys[k + 1] > ys[k] : ys[k + 1] < ys[k];
        if (!falling) {
          k++;
          continue;
        }
        const start = k;
        while (k < ys.length - 1 && (light === -1 ? ys[k + 1] >= ys[k] - 0.4 : ys[k + 1] <= ys[k] + 0.4)) k++;
        const end = k;
        const rise = Math.abs(ys[end] - ys[start]);
        if (end - start < 3 || rise < amp * 0.12) continue;
        const peak = light === -1 ? start : end;
        const valley = light === -1 ? end : start;
        const px = X0 + peak * STEP;
        const vx = X0 + valley * STEP;
        const fx = px + (vx - px) * 0.18;
        const fy = Math.min(VH + 30, ys[valley] + rise * 0.3);
        const pts: string[] = [];
        for (let j = start; j <= end; j++) pts.push(`${X0 + j * STEP} ${f1(ys[j])}`);
        shade += `M${pts.join("L")}L${f1(fx)} ${f1(fy)}Z`;
      }
    }

    let pines = "";
    if (i >= 3) {
      const scale = i === 4 ? 1 : 0.6;
      for (let x = X0; x < X1; x += rng.range(3.2, 6.5) * scale) {
        if (n2(x / 34 + 77) < 0.46) continue;
        const k = Math.max(0, Math.min(ys.length - 1, Math.round((x - X0) / STEP)));
        const h = rng.range(7, 16) * scale * (0.7 + 0.5 * n3(x / 22 + 3));
        const w = h * rng.range(0.3, 0.38);
        const y = ys[k] + 2.5;
        pines += `M${f1(x)} ${f1(y - h)}L${f1(x + w * 0.55)} ${f1(y - h * 0.48)}L${f1(x + w * 0.28)} ${f1(
          y - h * 0.48,
        )}L${f1(x + w)} ${f1(y)}L${f1(x - w)} ${f1(y)}L${f1(x - w * 0.28)} ${f1(y - h * 0.48)}L${f1(
          x - w * 0.55,
        )} ${f1(y - h * 0.48)}Z`;
      }
    }

    ridges.push({ d: d0, snow, shade, pines, top, base, ys });
  }
  return ridges;
}

function ridgeAt(r: Ridge, x: number) {
  const k = Math.max(0, Math.min(r.ys.length - 1, Math.round((x - X0) / STEP)));
  return r.ys[k];
}

interface Scene {
  ridges: Ridge[];
  sun: { x: number; y: number; r: number };
  stars: { x: number; y: number; r: number; o: number; tw: number }[];
  hazes: { y: number; h: number; puffs: { x: number; dy: number; rx: number; ry: number; o: number }[] }[];
  flakes: { x: number; y: number; r: number; o: number; layer: number }[];
}

function buildScene(seed: number | string, mood: RidgeCardMood): Scene {
  const P = PALETTES[mood];
  const ridges = buildRidges(seed, P.light);
  const rng = createRng(`${seed}:scene:${mood}`);
  let sun: Scene["sun"];
  const r = P.moon ? 15 : 19;
  if (P.sun === "low-left" || P.sun === "low-right") {
    let best = P.sun === "low-left" ? VW * 0.28 : VW * 0.72;
    for (let k = 0; k < 8; k++) {
      const x = P.sun === "low-left" ? rng.range(VW * 0.16, VW * 0.42) : rng.range(VW * 0.58, VW * 0.84);
      if (ridgeAt(ridges[0], x) > ridgeAt(ridges[0], best)) best = x;
    }
    sun = { x: best, y: ridgeAt(ridges[0], best) - r * 0.35, r: r * 1.15 };
  } else {
    sun = { x: VW * P.sun[0], y: VH * P.sun[1], r };
  }

  const stars: Scene["stars"] = [];
  if (P.stars) {
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: rng() * VW,
        y: VH * 0.55 * rng() ** 1.5,
        r: rng() < 0.85 ? rng.range(0.4, 0.8) : rng.range(0.9, 1.3),
        o: rng.range(0.35, 0.95),
        tw: rng() < 0.18 ? rng.range(2.5, 6) : 0,
      });
    }
  }

  const hazes: Scene["hazes"] = [];
  for (let i = 0; i < 4; i++) {
    const below = ridges[i];
    const y = lerp(below.top, below.base, 0.72);
    const puffs: Scene["hazes"][number]["puffs"] = [];
    for (let x = 0; x < VW; x += rng.range(40, 76)) {
      puffs.push({
        x,
        dy: rng.range(-7, 7) * (1 + i * 0.3),
        rx: rng.range(56, 128),
        ry: rng.range(7, 17) * (1 + i * 0.25),
        o: rng.range(0.35, 1),
      });
    }
    hazes.push({ y, h: 30 + i * 8, puffs });
  }

  const flakes: Scene["flakes"] = [];
  if (mood === "snow") {
    for (let i = 0; i < 70; i++) {
      const layer = rng() < 0.6 ? 0 : 1;
      flakes.push({
        x: rng() * VW,
        y: rng() * VH,
        r: layer ? rng.range(1.3, 2) : rng.range(0.6, 1.1),
        o: rng.range(0.55, 0.95),
        layer,
      });
    }
  }
  return { ridges, sun, stars, hazes, flakes };
}

function Layer({
  depth,
  px,
  py,
  children,
}: {
  depth: number;
  px: MotionValue<number>;
  py: MotionValue<number>;
  children: ReactNode;
}) {
  const x = useTransform(px, (v) => -v * SHIFT_X * depth);
  const y = useTransform(py, (v) => -v * SHIFT_Y * depth);
  return <motion.g style={{ x, y }}>{children}</motion.g>;
}

export function RidgeCard({
  seed = "northern-alps",
  mood = "day",
  maxTilt = 5,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: RidgeCardProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const px = useSpring(0, SETTLE);
  const py = useSpring(0, SETTLE);
  const rotateY = useTransform(px, (v) => (reduced ? 0 : v * maxTilt));
  const rotateX = useTransform(py, (v) => (reduced ? 0 : -v * maxTilt * 0.8));
  const scene = useMemo(() => buildScene(seed, mood), [seed, mood]);
  const P = PALETTES[mood];
  const id = (name: string) => `miyuki-ridge-${uid}-${name}`;
  const colors = DEPTH.map((_, i) => mix(P.far, P.near, (i / 4) ** 0.85));

  function aim(el: HTMLElement, cx: number, cy: number) {
    if (reduced) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    px.set(Math.max(-1, Math.min(1, ((cx - rect.left) / rect.width - 0.5) * 2)));
    py.set(Math.max(-1, Math.min(1, ((cy - rect.top) / rect.height - 0.5) * 2)));
  }

  function rest() {
    px.set(0);
    py.set(0);
  }

  const mouse = (e: PointerEvent) => e.pointerType !== "touch";
  const dark = mood !== "snow";
  const { sun } = scene;

  return (
    <div
      {...props}
      className={cn("group/ridge relative w-full [perspective:1000px]", className)}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (mouse(e)) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (mouse(e)) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (mouse(e) && !e.currentTarget.querySelector(":focus-visible")) rest();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (reduced || !(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        px.set(-0.55);
        py.set(0.4);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={cn(
          "relative isolate flex aspect-[19/23] w-full flex-col justify-end overflow-clip rounded-2xl border border-foreground/10 shadow-md",
          "transition-shadow duration-300 ease-settle group-hover/ridge:shadow-xl group-has-[:focus-visible]/ridge:shadow-xl",
        )}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMax slice"
          className="pointer-events-none absolute -inset-x-7 -inset-y-3 -z-10 h-[calc(100%+1.5rem)] w-[calc(100%+3.5rem)]"
        >
          <defs>
            <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
              {P.sky.map(([o, c]) => (
                <stop key={o} offset={o} stopColor={css(c)} />
              ))}
            </linearGradient>
            <radialGradient id={id("halo")}>
              <stop offset="0" stopColor={css(P.halo)} stopOpacity={P.moon ? 0.4 : 0.75} />
              <stop offset="0.15" stopColor={css(P.halo)} stopOpacity={P.moon ? 0.18 : 0.4} />
              <stop offset="0.45" stopColor={css(P.halo)} stopOpacity={P.moon ? 0.05 : 0.12} />
              <stop offset="1" stopColor={css(P.halo)} stopOpacity="0" />
            </radialGradient>
            {P.glow ? (
              <radialGradient id={id("glow")}>
                <stop offset="0" stopColor={css(P.glow)} stopOpacity="0.75" />
                <stop offset="0.4" stopColor={css(P.glow)} stopOpacity="0.3" />
                <stop offset="1" stopColor={css(P.glow)} stopOpacity="0" />
              </radialGradient>
            ) : null}
            {scene.ridges.map((r, i) => (
              <linearGradient
                key={i}
                id={id(`shade-${i}`)}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1={r.top}
                x2="0"
                y2={r.base}
              >
                <stop offset="0" stopColor={css(P.shade)} stopOpacity={0.55 - i * 0.08} />
                <stop offset="0.8" stopColor={css(P.shade)} stopOpacity="0" />
              </linearGradient>
            ))}
            {scene.hazes.map((_, i) => (
              <radialGradient key={i} id={id(`haze-${i}`)}>
                <stop offset="0" stopColor={css(P.haze)} stopOpacity={P.hazeAlpha} />
                <stop offset="0.55" stopColor={css(P.haze)} stopOpacity={P.hazeAlpha * 0.45} />
                <stop offset="1" stopColor={css(P.haze)} stopOpacity="0" />
              </radialGradient>
            ))}
            {mood === "aurora" ? (
              <>
                <linearGradient id={id("aurora-a")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={css(lch(0.8, 0.13, 168))} stopOpacity="0" />
                  <stop offset="0.6" stopColor={css(lch(0.8, 0.13, 168))} stopOpacity="0.32" />
                  <stop offset="0.92" stopColor={css(lch(0.86, 0.14, 160))} stopOpacity="0.8" />
                  <stop offset="1" stopColor={css(lch(0.86, 0.14, 160))} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={id("aurora-b")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={css(lch(0.66, 0.13, 300))} stopOpacity="0" />
                  <stop offset="0.5" stopColor={css(lch(0.68, 0.13, 296))} stopOpacity="0.28" />
                  <stop offset="0.9" stopColor={css(lch(0.76, 0.12, 200))} stopOpacity="0.6" />
                  <stop offset="1" stopColor={css(lch(0.76, 0.12, 200))} stopOpacity="0" />
                </linearGradient>
                <filter id={id("aurora-blur")} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.4 7" />
                </filter>
              </>
            ) : null}
            <linearGradient id={id("floor")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={css(colors[4])} stopOpacity="0" />
              <stop offset="1" stopColor={css(colors[4])} stopOpacity="0.7" />
            </linearGradient>
          </defs>

          <Layer depth={0.02} px={px} py={py}>
            <rect x={-40} y={-40} width={VW + 80} height={VH + 80} fill={`url(#${id("sky")})`} />
            {scene.stars.map((s, i) => (
              <circle
                key={i}
                cx={f1(s.x)}
                cy={f1(s.y)}
                r={s.r}
                fill={css(lch(0.97, 0.015, 230))}
                opacity={s.o}
                className={
                  s.tw && !reduced ? "animate-[miyuki-ridge-card-twinkle_var(--tw)_ease-in-out_infinite]" : undefined
                }
                style={s.tw ? ({ "--tw": `${s.tw}s` } as CSSProperties) : undefined}
              />
            ))}
            {mood === "aurora" ? (
              <g
                filter={`url(#${id("aurora-blur")})`}
                className={
                  reduced ? undefined : "animate-[miyuki-ridge-card-curtain_26s_ease-in-out_infinite_alternate]"
                }
                style={{ transformOrigin: "50% 40%" }}
              >
                <path
                  d={`M-30 ${VH * 0.12} C ${VW * 0.2} ${VH * 0.04}, ${VW * 0.45} ${VH * 0.3}, ${VW * 0.7} ${VH * 0.14} S ${VW + 20} ${VH * 0.08}, ${VW + 40} ${VH * 0.2} L ${VW + 40} ${VH * 0.42} C ${VW * 0.7} ${VH * 0.3}, ${VW * 0.45} ${VH * 0.48}, ${VW * 0.2} ${VH * 0.3} S -10 ${VH * 0.3}, -30 ${VH * 0.36} Z`}
                  fill={`url(#${id("aurora-a")})`}
                />
                <path
                  d={`M-30 ${VH * 0.2} C ${VW * 0.3} ${VH * 0.1}, ${VW * 0.55} ${VH * 0.26}, ${VW * 0.85} ${VH * 0.06} L ${VW + 40} ${VH * 0.04} L ${VW + 40} ${VH * 0.22} C ${VW * 0.6} ${VH * 0.44}, ${VW * 0.3} ${VH * 0.3}, -30 ${VH * 0.4} Z`}
                  fill={`url(#${id("aurora-b")})`}
                  opacity="0.75"
                />
              </g>
            ) : null}
            {P.glow ? (
              <ellipse
                cx={sun.x}
                cy={scene.ridges[0].top + 40}
                rx={VW * 0.9}
                ry={VH * 0.22}
                fill={`url(#${id("glow")})`}
              />
            ) : null}
            {P.disc ? (
              <>
                <circle cx={sun.x} cy={sun.y} r={sun.r * 8} fill={`url(#${id("halo")})`} />
                <circle cx={sun.x} cy={sun.y} r={sun.r} fill={css(P.disc)} />
                {P.moon ? (
                  <g fill={css(lch(0.86, 0.02, 236))} opacity="0.55">
                    <circle cx={sun.x - sun.r * 0.3} cy={sun.y - sun.r * 0.2} r={sun.r * 0.28} />
                    <circle cx={sun.x + sun.r * 0.32} cy={sun.y + sun.r * 0.18} r={sun.r * 0.2} />
                    <circle cx={sun.x - sun.r * 0.05} cy={sun.y + sun.r * 0.45} r={sun.r * 0.14} />
                  </g>
                ) : null}
              </>
            ) : null}
          </Layer>

          {scene.ridges.map((r, i) => (
            <Layer key={i} depth={DEPTH[i]} px={px} py={py}>
              <path d={r.d} fill={css(colors[i])} />
              {r.snow ? <path d={r.snow} fill={css(P.snow)} opacity={[0.92, 0.75, 0.45][i]} /> : null}
              {r.shade ? <path d={r.shade} fill={`url(#${id(`shade-${i}`)})`} /> : null}
              {r.pines ? <path d={r.pines} fill={css(mix(P.pine, colors[i], i === 3 ? 0.35 : 0))} /> : null}
              {i < 4 ? (
                <g
                  className={reduced ? undefined : "animate-[miyuki-ridge-card-drift_var(--d)_linear_infinite]"}
                  style={{ "--d": `${64 - i * 9}s`, animationDirection: i % 2 ? "reverse" : "normal" } as CSSProperties}
                >
                  {[0, VW].map((offset) =>
                    scene.hazes[i].puffs.map((h, k) => (
                      <ellipse
                        key={`${offset}-${k}`}
                        cx={h.x + offset}
                        cy={scene.hazes[i].y + h.dy}
                        rx={h.rx}
                        ry={h.ry}
                        fill={`url(#${id(`haze-${i}`)})`}
                        opacity={h.o}
                      />
                    )),
                  )}
                </g>
              ) : null}
              {i === 4 ? (
                <rect x={-60} y={VH * 0.62} width={VW + 120} height={VH * 0.45} fill={`url(#${id("floor")})`} />
              ) : null}
            </Layer>
          ))}

          {scene.flakes.length ? (
            <g>
              {[0, 1].map((layer) => (
                <g
                  key={layer}
                  className={reduced ? undefined : "animate-[miyuki-ridge-card-fall_var(--d)_linear_infinite]"}
                  style={{ "--d": layer ? "16s" : "26s" } as CSSProperties}
                >
                  {[0, -VH].map((offset) =>
                    scene.flakes
                      .filter((f) => f.layer === layer)
                      .map((f, k) => (
                        <circle
                          key={`${offset}-${k}`}
                          cx={f1(f.x)}
                          cy={f1(f.y + offset)}
                          r={f.r}
                          fill={css(lch(0.99, 0.004, 240))}
                          opacity={f.o}
                        />
                      )),
                  )}
                </g>
              ))}
            </g>
          ) : null}
        </svg>
        <div className={cn(dark ? "dark" : "light", "relative p-6 text-foreground")}>{children}</div>
      </motion.div>
      <style href="miyuki-ridge-card" precedence="miyuki">{`
        @keyframes miyuki-ridge-card-drift { from { transform: translateX(0); } to { transform: translateX(-${VW}px); } }
        @keyframes miyuki-ridge-card-fall { from { transform: translate(0, 0); } to { transform: translate(-24px, ${VH}px); } }
        @keyframes miyuki-ridge-card-twinkle { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.25; } }
        @keyframes miyuki-ridge-card-curtain { from { transform: translateX(-12px) skewX(-4deg); opacity: 0.8; } to { transform: translateX(14px) skewX(5deg); opacity: 1; } }
      `}</style>
    </div>
  );
}
