"use client";

import { animate, useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useId, useRef } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface EnsoProps extends Omit<ComponentProps<"span">, "children"> {
  size?: number;
  value?: number;
  duration?: number;
  loop?: boolean;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

type Pt = [number, number];

const START = 150;
const SWEEP = 328;
const RADIUS = 36.5;
const WIDTH = 11.5;
const LEAD = 0.025;
const TRAIL = 0.012;
const HIDDEN = 1.02;
const HOLD = 900;
const FADE = 450;
const REST = 300;

const rad = (deg: number) => (deg * Math.PI) / 180;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function noise(rng: () => number, knots: number) {
  const v = Array.from({ length: knots + 1 }, () => rng() * 2 - 1);
  return (x: number) => {
    const f = Math.min(knots, Math.max(0, x * knots));
    const i = Math.min(knots - 1, Math.floor(f));
    const t = f - i;
    const e = t * t * (3 - 2 * t);
    return v[i] + (v[i + 1] - v[i]) * e;
  };
}

function frame(s: number) {
  const a = rad(START + SWEEP * s);
  const r = RADIUS * (1 + 0.022 * Math.sin(Math.PI * 2 * s * 1.15 + 0.6)) - 2.6 * smooth(0.7, 1, s);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  return { x: 50 + r * nx, y: 50 + r * ny, nx, ny };
}

const PRESSURE: Pt[] = [
  [0, 0.8],
  [0.03, 1],
  [0.12, 0.97],
  [0.28, 0.78],
  [0.45, 0.9],
  [0.6, 0.72],
  [0.72, 0.58],
  [0.82, 0.47],
  [0.92, 0.36],
  [1, 0.26],
];

function width(s: number) {
  let i = 0;
  while (i < PRESSURE.length - 2 && s > PRESSURE[i + 1][0]) i++;
  const [s0, p0] = PRESSURE[i];
  const [s1, p1] = PRESSURE[i + 1];
  const p = p0 + (p1 - p0) * smooth(s0, s1, s);
  return WIDTH * (p + 0.025 * Math.sin(s * 23 + 1.3) + 0.012 * Math.sin(s * 61 + 0.4));
}

const fmt = ([x, y]: Pt) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
const ring = (pts: Pt[]) => `M${pts.map(fmt).join("L")}Z`;

function brush() {
  const rng = createRng("enso:brush");
  const outer = noise(rng, 36);
  const inner = noise(rng, 36);
  const fine = noise(rng, 240);
  const body: Pt[] = [];
  const back: Pt[] = [];
  const END = 0.66;
  for (let s = 0; s <= END + 1e-9; s += 0.006) {
    const f = frame(s);
    const w = width(s) / 2;
    const ro = 0.25 * outer(s) + 0.14 * fine(s);
    const ri = 0.2 * inner(s) + 0.12 * fine(1 - s);
    body.push([f.x + f.nx * (w + ro), f.y + f.ny * (w + ro)]);
    back.push([f.x - f.nx * (w + ri), f.y - f.ny * (w + ri)]);
  }
  const head = frame(0);
  const hw = (width(0) / 2) * 1.08;
  const tx = -head.ny;
  const ty = head.nx;
  const cap: Pt[] = [];
  for (let k = 1; k < 12; k++) {
    const phi = rad(-90 + (180 * k) / 12);
    const bulge = hw * (1 + 0.05 * Math.sin(k * 1.7));
    cap.push([
      head.x + bulge * (-Math.cos(phi) * tx + Math.sin(phi) * head.nx),
      head.y + bulge * (-Math.cos(phi) * ty + Math.sin(phi) * head.ny),
    ]);
  }
  const paths = [ring([...body, ...back.reverse(), ...cap])];

  const K = 11;
  const weights = Array.from({ length: K }, () => rng.range(0.6, 1.4));
  const total = weights.reduce((a, b) => a + b, 0);
  let edge = -1;
  for (let k = 0; k < K; k++) {
    const share = (2 * weights[k]) / total;
    const u = edge + share / 2;
    edge += share;
    const dry = Math.abs(u);
    const end = 0.84 + 0.16 * (1 - dry ** 1.3) * rng.range(0.75, 1);
    const wobble = noise(rng, 30);
    const pieces: [number, number][] = [];
    let at = 0.68 + 0.1 * (1 - dry) + 0.03 * rng();
    pieces.push([0.55, at]);
    while (at < end) {
      const k0 = Math.min(1, Math.max(0, (at - 0.7) / 0.3));
      const gap = rng.range(0.004, 0.014) * (1 + 1.5 * k0) * (1 + 0.6 * dry);
      const run = rng.range(0.025, 0.08) * (1 - 0.6 * k0);
      const a = at + gap;
      const b = Math.min(end, a + run);
      if (b - a > 0.006) pieces.push([a, b]);
      at = b;
    }
    for (const [a, b] of pieces) {
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let s = a; s <= b + 1e-9; s += Math.min(0.007, (b - a) / 3)) {
        const f = frame(s);
        const w = width(s);
        const cover = s < 0.64 ? 1.8 : s < 0.8 ? 1.8 - (0.8 * (s - 0.64)) / 0.16 : 1 - (0.45 * (s - 0.8)) / 0.2;
        const taper = Math.min(1, a > 0.6 ? (s - a) / 0.012 : 1, (b - s) / 0.02);
        const half = Math.max(0, ((w * share) / 2) * cover * taper) / 2;
        const splay = 1 + 0.15 * smooth(0.8, 1, s);
        const off = u * (w / 2) * splay + 0.22 * wobble(s);
        left.push([f.x + f.nx * (off + half), f.y + f.ny * (off + half)]);
        right.push([f.x + f.nx * (off - half), f.y + f.ny * (off - half)]);
      }
      if (left.length > 1) paths.push(ring([...left, ...right.reverse()]));
    }
  }

  const spine: Pt[] = [];
  for (let s = -LEAD; s <= 1 + TRAIL + 1e-9; s += 0.01) {
    const f = frame(s);
    spine.push([f.x, f.y]);
  }
  return { ink: paths.join(""), spine: `M${spine.map(fmt).join("L")}` };
}

let cached: ReturnType<typeof brush> | null = null;
const shape = () => (cached ??= brush());

const reveal = (p: number) => (p <= 0 ? HIDDEN : 1 - (Math.min(1, p) + LEAD) / (1 + LEAD + TRAIL));

export function Enso({
  size = 64,
  value,
  duration = 1.4,
  loop = true,
  label,
  className,
  style,
  ref,
  ...props
}: EnsoProps) {
  const { ink, spine } = shape();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reduce = useReducedMotion() === true;
  const pen = useRef<SVGPathElement>(null);
  const strokeGroup = useRef<SVGGElement>(null);
  const shown = useRef<number | null>(null);
  const measured = value != null;
  const target = measured ? Math.min(100, Math.max(0, value)) / 100 : null;
  const name = label ?? (measured ? undefined : loop ? "Loading" : undefined);

  useEffect(() => {
    const el = pen.current;
    if (!el || target == null) return;
    const from = shown.current ?? target;
    shown.current = from;
    if (reduce || from === target) {
      el.style.strokeDashoffset = String(reveal(target));
      shown.current = target;
      return;
    }
    const controls = animate(from, target, {
      type: "spring",
      stiffness: 90,
      damping: 20,
      onUpdate: (p) => {
        shown.current = p;
        el.style.strokeDashoffset = String(reveal(p));
      },
    });
    return () => controls.stop();
  }, [target, reduce]);

  useEffect(() => {
    const el = pen.current;
    const group = strokeGroup.current;
    if (!el || !group || measured) return;
    if (reduce) {
      el.style.strokeDashoffset = "0";
      if (!loop) return;
      const pulse = group.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
        duration: 2400,
        iterations: Infinity,
        easing: "ease-in-out",
      });
      return () => pulse.cancel();
    }
    const draw = Math.max(200, duration * 1000);
    const total = loop ? draw + HOLD + FADE + REST : draw;
    const stroke = el.animate(
      [
        { strokeDashoffset: HIDDEN, offset: 0, easing: "cubic-bezier(0.5, 0.05, 0.55, 1)" },
        { strokeDashoffset: 0, offset: draw / total },
        { strokeDashoffset: 0, offset: 1 },
      ],
      { duration: total, iterations: loop ? Infinity : 1, fill: "forwards" },
    );
    if (loop) stroke.currentTime = draw;
    const fade = loop
      ? group.animate(
          [
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: (draw + HOLD) / total, easing: "ease-in" },
            { opacity: 0, offset: (draw + HOLD + FADE) / total },
            { opacity: 0, offset: 1 },
          ],
          { duration: total, iterations: Infinity },
        )
      : null;
    if (fade) fade.currentTime = draw;
    return () => {
      stroke.cancel();
      fade?.cancel();
    };
  }, [measured, loop, duration, reduce]);

  const a11y = measured
    ? {
        role: "progressbar" as const,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round((target ?? 0) * 100),
        "aria-label": name,
      }
    : name
      ? { role: "status" as const }
      : { "aria-hidden": true };

  return (
    <span
      {...a11y}
      {...props}
      ref={ref}
      className={cn("relative inline-block shrink-0 text-foreground", className)}
      style={{ width: size, height: size, ...style }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" className="block overflow-visible">
        <defs>
          <mask id={`${uid}-reveal`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
            <path
              ref={pen}
              d={spine}
              fill="none"
              stroke="#fff"
              strokeWidth={20}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1 2"
              style={{ strokeDashoffset: target != null ? reveal(target) : loop ? 0 : HIDDEN }}
            />
          </mask>
          <filter id={`${uid}-bleed`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <g ref={strokeGroup} mask={`url(#${uid}-reveal)`} fill="currentColor">
          <path d={ink} filter={`url(#${uid}-bleed)`} opacity={0.2} />
          <path d={ink} />
        </g>
      </svg>
      {name && !measured ? <span className="sr-only">{name}</span> : null}
    </span>
  );
}
