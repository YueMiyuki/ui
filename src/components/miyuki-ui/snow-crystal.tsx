"use client";

import { useReducedMotion } from "motion/react";
import { type Ref, type SVGProps, useId } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SnowCrystalProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  seed?: number | string;
  size?: number;
  complexity?: number;
  strokeWidth?: number;
  animate?: boolean;
  spin?: boolean;
  label?: string;
  ref?: Ref<SVGSVGElement>;
}

type Pt = [number, number];
type Tier = 0 | 1 | 2;

interface Seg {
  pts: Pt[];
  tier: Tier;
  from: number;
  to: number;
  min: number;
  max: number;
}

const R = 44;
const SIN60 = Math.sqrt(3) / 2;
const GROW_MS = 1500;

const keyframes = `
@keyframes miyuki-snow-crystal-grow {
  0% { stroke-dashoffset: 1; opacity: 0; }
  1% { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes miyuki-snow-crystal-spin { to { transform: rotate(360deg); } }
`;

function maxBranch(d: number) {
  const reach = (-d + Math.sqrt(Math.max(0, 4 * (R - 1) ** 2 - 3 * d * d))) / 2;
  return Math.max(0, Math.min(0.8 * d - 2, reach));
}

function hexHalves(cx: number, cy: number, dx: number, dy: number, r: number): [Pt[], Pt[]] {
  const nx = -dy;
  const ny = dx;
  const at = (a: number, b: number): Pt => [cx + dx * a + nx * b, cy + dy * a + ny * b];
  const side = (s: number) => [at(-r, 0), at(-r / 2, s * r * SIN60), at(r / 2, s * r * SIN60), at(r, 0)];
  return [side(1), side(-1)];
}

type Kind = "dendrite" | "fern" | "plate" | "star" | "sector" | "broad";
type Tip = "point" | "fork" | "plate";

const KINDS: [Kind, number][] = [
  ["dendrite", 3],
  ["fern", 2],
  ["plate", 2],
  ["star", 1.6],
  ["sector", 1.4],
  ["broad", 2],
];

const HABIT: Record<Kind, { tips: [Tip, number][]; counts: number[]; reach: [number, number] }> = {
  dendrite: {
    tips: [
      ["point", 5],
      ["fork", 3.5],
      ["plate", 1.5],
    ],
    counts: [1, 2, 3, 3, 4],
    reach: [0.78, 1],
  },
  fern: {
    tips: [
      ["point", 7],
      ["fork", 3],
    ],
    counts: [2, 3, 4, 5, 6],
    reach: [0.35, 0.55],
  },
  plate: {
    tips: [
      ["fork", 1],
      ["plate", 1],
    ],
    counts: [0, 1, 1, 2, 2],
    reach: [0.45, 0.7],
  },
  star: { tips: [["plate", 1]], counts: [0, 0, 1, 1, 2], reach: [0.4, 0.6] },
  sector: {
    tips: [
      ["point", 1],
      ["fork", 1],
    ],
    counts: [0, 0, 0, 1, 1],
    reach: [0.5, 0.8],
  },
  broad: {
    tips: [
      ["plate", 3],
      ["fork", 2],
    ],
    counts: [1, 1, 2, 2, 3],
    reach: [0.6, 0.85],
  },
};

function weighted<T>(rng: () => number, items: [T, number][]): T {
  let roll = rng() * items.reduce((sum, [, w]) => sum + w, 0);
  for (const [item, w] of items) {
    roll -= w;
    if (roll <= 0) return item;
  }
  return items[items.length - 1][0];
}

function grow(seed: number | string, complexity: number): Seg[] {
  const rng = createRng(`snow-crystal:${seed}`);
  const c = Math.min(5, Math.max(1, Math.round(complexity)));
  const kind = weighted(rng, KINDS);
  const habit = HABIT[kind];
  const segs: Seg[] = [];
  const add = (pts: Pt[], tier: Tier, from: number, to: number, min = 0, max = Infinity) =>
    segs.push({ pts, tier, from, to, min, max });
  const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x, -y]);
  const both = (pts: Pt[], tier: Tier, from: number, to: number, min = 0, max = Infinity) => {
    add(pts, tier, from, to, min, max);
    add(mirror(pts), tier, from, to, min, max);
  };
  const ring = (h: number, tier: Tier, min = 0) =>
    both(
      [
        [h, 0],
        [h * 0.75, h * SIN60 * 0.5],
      ],
      tier,
      h,
      h * 1.5,
      min,
    );

  const hub = {
    dendrite: rng() < 0.5 ? rng.range(4.5, 7) : 0,
    fern: rng() < 0.3 ? rng.range(4, 5) : 0,
    plate: rng.range(13, 18),
    star: rng.range(6, 9),
    sector: rng.range(27, 32),
    broad: rng() < 0.5 ? rng.range(6, 9) : 0,
  }[kind];
  if (hub > 0) ring(hub, 0);
  if (kind === "plate") ring(hub * rng.range(0.42, 0.58), 1, 40);
  if (kind === "sector") {
    ring(hub * 0.32, 1, 40);
    if (c >= 3) ring(hub * 0.84, 2, 48);
  }
  if (kind === "star" && c >= 3 && rng() < 0.5) ring(hub * 0.5, 1, 48);

  const tip = weighted(rng, habit.tips);
  const plate = tip === "plate" ? (kind === "star" ? rng.range(5.5, 7.5) : rng.range(3.5, 5)) : 0;
  const fork = tip === "fork" ? rng.range(5, 7) : 0;
  const spineEnd = plate > 0 ? R - plate * 2 : R;

  const n =
    habit.counts[c - 1] +
    ((kind === "dendrite" || kind === "fern" || kind === "broad") && c > 1 && rng() < 0.3 ? 1 : 0);
  const lo = Math.max(hub + 4.5, 12);
  const hi = (fork > 0 ? R - fork : spineEnd) - 5;
  const spots: number[] = [];
  for (let i = 0; i < n && hi > lo; i++) {
    const d = lo + (hi - lo) * ((i + 0.5 + rng.range(-0.22, 0.22)) / n);
    if (spots.length === 0 || d - spots[spots.length - 1] >= 6) spots.push(d);
  }
  const branches = spots
    .map((d) => ({ d, len: maxBranch(d) * rng.range(habit.reach[0], habit.reach[1]) }))
    .filter((b) => b.len >= 3);
  const ranked = [...branches].sort((a, b) => b.len - a.len);

  const stops = [0, ...branches.map((b) => b.d), ...(fork > 0 ? [R - fork] : []), spineEnd].sort((a, b) => a - b);
  for (let i = 0; i < stops.length - 1; i++) {
    if (stops[i + 1] - stops[i] > 0.01)
      add(
        [
          [stops[i], 0],
          [stops[i + 1], 0],
        ],
        0,
        stops[i],
        stops[i + 1],
      );
  }
  if (plate > 0) {
    const [a, b] = hexHalves(R - plate, 0, 1, 0, plate);
    const small = plate < 4.5 ? 32 : 0;
    add(a, 0, spineEnd, spineEnd + plate * 3, small);
    add(b, 0, spineEnd, spineEnd + plate * 3, small);
    if (small > 0)
      add(
        [
          [spineEnd, 0],
          [R, 0],
        ],
        0,
        spineEnd,
        R,
        0,
        small,
      );
    if (plate >= 6.5) {
      const [p, q] = hexHalves(R - plate, 0, 1, 0, plate * 0.45);
      add(p, 2, spineEnd + plate, spineEnd + plate * 2, 64);
      add(q, 2, spineEnd + plate, spineEnd + plate * 2, 64);
    }
  }
  if (fork > 0) {
    const len = fork * rng.range(0.9, 1.15);
    const d = R - fork;
    both(
      [
        [d, 0],
        [d + len / 2, len * SIN60],
      ],
      1,
      d,
      d + len,
    );
  }

  branches.forEach((b, i) => {
    const rank = ranked.indexOf(b);
    const min = rank === 0 || (rank === 1 && b.len >= 8) ? 0 : b.len < 6 ? 48 : 36;
    const cap =
      (kind === "broad" && b.len >= 8) || (kind === "star" && c >= 4 && b.len >= 9) ? Math.min(4, b.len * 0.3) : 0;
    const stem = b.len - cap * 2;
    const end: Pt = [b.d + stem / 2, stem * SIN60];
    both([[b.d, 0], end], 1, b.d, b.d + stem, min);
    if (cap > 0) {
      const [p, q] = hexHalves(end[0] + cap * 0.5, end[1] + cap * SIN60, 0.5, SIN60, cap);
      const capMin = kind === "broad" ? Math.max(min, 40) : 64;
      both(p, 2, b.d + stem, b.d + stem + cap * 3, capMin);
      both(q, 2, b.d + stem, b.d + stem + cap * 3, capMin);
    }
    const twigs = kind === "dendrite" ? c >= 3 : kind === "fern" ? c >= 4 : false;
    if (!twigs || b.len < 9) return;
    const next = branches[i + 1]?.d ?? (fork > 0 ? R - fork : spineEnd);
    const along = c >= 4 && b.len > 14 ? [0.34, 0.68] : [0.5];
    const share = kind === "fern" ? [0.22, 0.32] : [0.3, 0.45];
    for (const f of along) {
      const s = b.len * (f + rng.range(-0.06, 0.06));
      const x = b.d + s / 2;
      const y = s * SIN60;
      const room = Math.sqrt(Math.max(0, (R - 1) ** 2 - y * y)) - x;
      const u = Math.min(b.len * rng.range(share[0], share[1]), next - b.d - 3, room);
      if (u >= 2.5)
        both(
          [
            [x, y],
            [x + u, y],
          ],
          2,
          b.d + s,
          b.d + s + u,
          56,
        );
    }
  });

  return segs;
}

function polyline(pts: Pt[]) {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${+y.toFixed(2)} ${+(-x).toFixed(2)}`).join("");
}

function defaultWidth(size: number) {
  return Math.min(3, Math.max(1.25, 1 + size * 0.009));
}

export function SnowCrystal({
  seed = 1,
  size = 48,
  complexity = 3,
  strokeWidth,
  animate = false,
  spin = false,
  label,
  className,
  ...props
}: SnowCrystalProps) {
  const reduce = useReducedMotion() === true;
  const uid = useId();
  const segs = grow(seed, complexity).filter((s) => size >= s.min && size < s.max);
  const px = strokeWidth ?? defaultWidth(size);
  const unit = 100 / size;
  const widths = [px, Math.max(1, px * 0.85), Math.max(1, px * 0.7)].map((w) => w * unit);
  const growing = animate && !reduce;
  const reach = Math.max(1, ...segs.map((s) => s.to));
  const clock = (d: number) => (1 - (1 - Math.min(1, d / reach)) ** 1.6) * GROW_MS;

  const arm = growing
    ? segs.map((s, i) => {
        const start = clock(s.from);
        return (
          <path
            key={i}
            d={polyline(s.pts)}
            pathLength={1}
            strokeWidth={widths[s.tier]}
            strokeDasharray="1 1"
            className="animate-[miyuki-snow-crystal-grow_1s_linear_both]"
            style={{ animationDelay: `${start}ms`, animationDuration: `${Math.max(40, clock(s.to) - start)}ms` }}
          />
        );
      })
    : ([0, 1, 2] as const).map((tier) => {
        const d = segs
          .filter((s) => s.tier === tier)
          .map((s) => polyline(s.pts))
          .join("");
        return d ? <path key={tier} d={d} strokeWidth={widths[tier]} /> : null;
      });

  return (
    <>
      <style href="miyuki-snow-crystal" precedence="miyuki">
        {keyframes}
      </style>
      <svg
        viewBox="-50 -50 100 100"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        className={cn(
          "shrink-0 overflow-visible",
          spin && !reduce && "animate-[miyuki-snow-crystal-spin_9s_linear_infinite]",
          className,
        )}
        {...props}
      >
        <g key={`${uid}:${seed}:${complexity}`}>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={deg ? `rotate(${deg})` : undefined}>
              {arm}
            </g>
          ))}
        </g>
      </svg>
    </>
  );
}
