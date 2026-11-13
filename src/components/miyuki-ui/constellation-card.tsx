"use client";

import { type ComponentProps, type CSSProperties, useId } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ConstellationCardProps extends ComponentProps<"div"> {
  columns?: number;
  rows?: number;
  seed?: number | string;
  size?: number;
}

const CELL = 10;

type Point = [number, number];

function buildConstellation(seed: number | string, cols: number, rows: number, size: number) {
  const rng = createRng(`constellation-card:${seed}:${cols}x${rows}:${size}`);
  const n = Math.max(2, Math.min(Math.round(size), cols * rows));
  const closed = n >= 5;
  const ring = closed ? n - 1 : n;
  const cx = rng.range(cols * 0.38, cols * 0.62) - 0.5;
  const cy = (rows - 1) / 2;
  const rx = Math.min((cols - 1) * 0.42, rng.range(3.4, 5.4));
  const ry = Math.max(1, ((rows - 1) / 2) * 0.92);
  const start = rng.range(0, Math.PI * 2);
  const taken = new Set<string>();
  const snap = ([x, y]: Point): Point => {
    let c = Math.min(cols - 1, Math.max(0, Math.round(x)));
    const r = Math.min(rows - 1, Math.max(0, Math.round(y)));
    for (let step = 1; taken.has(`${c},${r}`) && step < cols; step++) {
      c = Math.min(cols - 1, Math.max(0, c + (step % 2 ? step : -step)));
    }
    taken.add(`${c},${r}`);
    return [c, r];
  };
  const stars: Point[] = [];
  for (let k = 0; k < ring; k++) {
    const a = start + (k / ring) * Math.PI * 2 + rng.range(-0.28, 0.28);
    const reach = rng.range(0.78, 1.05);
    stars.push(snap([cx + Math.cos(a) * rx * reach, cy + Math.sin(a) * ry * reach]));
  }
  const edges: [number, number][] = [];
  for (let k = 0; k < ring - 1; k++) edges.push([k, k + 1]);
  if (closed) {
    edges.push([ring - 1, 0]);
    const inner = snap([cx + rng.range(-1.2, 1.2), cy + rng.range(-0.6, 0.6)]);
    stars.push(inner);
    let nearest = 0;
    let best = Infinity;
    stars.slice(0, ring).forEach(([x, y], k) => {
      const d = (x - inner[0]) ** 2 + (y - inner[1]) ** 2;
      if (d < best) {
        best = d;
        nearest = k;
      }
    });
    edges.push([nearest, ring]);
  }

  const twinkles = new Map<string, { duration: number; delay: number }>();
  const quota = Math.max(3, Math.round((cols * rows) / 14));
  for (let tries = 0; twinkles.size < quota && tries < quota * 6; tries++) {
    const key = `${rng.int(0, cols - 1)},${rng.int(0, rows - 1)}`;
    if (taken.has(key) || twinkles.has(key)) continue;
    const duration = rng.range(5, 11);
    twinkles.set(key, { duration, delay: -rng.range(0, duration) });
  }
  return { stars, edges, twinkles };
}

const at = (v: number) => (v + 0.5) * CELL;
const STEP = 120;
const LINE_MS = 260;

export function ConstellationCard({
  columns = 18,
  rows = 6,
  seed = 1,
  size = 7,
  className,
  children,
  ...props
}: ConstellationCardProps) {
  const cols = Math.max(2, Math.round(columns));
  const rws = Math.max(1, Math.round(rows));
  const { stars, edges, twinkles } = buildConstellation(seed, cols, rws, size);
  const lightAt = new Map<number, number>([[edges[0]?.[0] ?? 0, 0]]);
  edges.forEach(([, to], k) => {
    if (!lightAt.has(to)) lightAt.set(to, k * STEP + LINE_MS * 0.8);
  });
  const starIndex = new Map(stars.map(([c, r], i) => [`${c},${r}`, i]));
  const W = cols * CELL;
  const H = rws * CELL;
  const filterId = `miyuki-constellation-card-soft-${useId().replace(/[^\w-]/g, "")}`;

  return (
    <div
      className={cn(
        "miyuki-constellation-card relative overflow-hidden rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-sm",
        "[--miyuki-constellation-card-star:var(--brand)] dark:[--miyuki-constellation-card-star:color-mix(in_oklab,var(--brand)_55%,white)]",
        className,
      )}
      {...props}
    >
      <style href="miyuki-constellation-card" precedence="miyuki">{`
@keyframes miyuki-constellation-card-twinkle {
  0%, 84%, 100% { opacity: 0.32; transform: scale(1); }
  91% { opacity: 1; transform: scale(1.7); }
}
.miyuki-constellation-card-dot { transform-box: fill-box; transform-origin: center; }
.miyuki-constellation-card-twinkle {
  animation: miyuki-constellation-card-twinkle var(--miyuki-constellation-card-duration) ease-in-out var(--miyuki-constellation-card-delay) infinite;
}
.miyuki-constellation-card-star {
  transition: fill 160ms ease-out, opacity 160ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.miyuki-constellation-card-halo {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0.4);
  transition: opacity 160ms ease-out, transform 220ms ease-out;
}
.miyuki-constellation-card-line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 160ms cubic-bezier(0.4, 0, 1, 1) var(--miyuki-constellation-card-out);
}
.miyuki-constellation-card:is(:hover, :focus-within) .miyuki-constellation-card-line {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset ${LINE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) var(--miyuki-constellation-card-in);
}
.miyuki-constellation-card:is(:hover, :focus-within) .miyuki-constellation-card-star {
  fill: var(--miyuki-constellation-card-star);
  opacity: 1;
  transform: scale(1.9);
  transition-delay: var(--miyuki-constellation-card-in);
}
.miyuki-constellation-card:is(:hover, :focus-within) .miyuki-constellation-card-halo {
  opacity: var(--miyuki-constellation-card-halo);
  transform: scale(1);
  transition-delay: var(--miyuki-constellation-card-in);
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-constellation-card-twinkle { animation: none; }
  .miyuki-constellation-card-line, .miyuki-constellation-card:is(:hover, :focus-within) .miyuki-constellation-card-line {
    stroke-dashoffset: 0;
    opacity: 0;
    transition: opacity 150ms ease-out;
  }
  .miyuki-constellation-card:is(:hover, :focus-within) .miyuki-constellation-card-line { opacity: 1; }
  .miyuki-constellation-card-star, .miyuki-constellation-card-halo,
  .miyuki-constellation-card:is(:hover, :focus-within) :is(.miyuki-constellation-card-star, .miyuki-constellation-card-halo) {
    transition-property: fill, opacity;
    transition-duration: 150ms;
    transition-delay: 0ms;
  }
}
`}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none rounded-lg bg-muted px-4 py-3.5 [--miyuki-constellation-card-halo:0.32] dark:bg-background dark:[--miyuki-constellation-card-halo:0.55]"
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
          <defs>
            <filter id={filterId} x="-1" y="-1" width="3" height="3">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
          </defs>
          <g
            stroke="var(--miyuki-constellation-card-star)"
            strokeLinecap="round"
            strokeWidth={0.6}
            className="dark:[filter:drop-shadow(0_0_2px_var(--miyuki-constellation-card-star))]"
          >
            {edges.map(([a, b], k) => (
              <line
                key={k}
                className="miyuki-constellation-card-line"
                x1={at(stars[a][0])}
                y1={at(stars[a][1])}
                x2={at(stars[b][0])}
                y2={at(stars[b][1])}
                pathLength={1}
                style={
                  {
                    "--miyuki-constellation-card-in": `${k * STEP}ms`,
                    "--miyuki-constellation-card-out": `${(edges.length - 1 - k) * 40}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </g>
          <g fill="var(--miyuki-constellation-card-star)" filter={`url(#${filterId})`}>
            {stars.map(([c, r], i) => (
              <circle
                key={i}
                className="miyuki-constellation-card-halo"
                cx={at(c)}
                cy={at(r)}
                r={3.4}
                style={{ "--miyuki-constellation-card-in": `${lightAt.get(i) ?? 0}ms` } as CSSProperties}
              />
            ))}
          </g>
          <g fill="var(--foreground)">
            {Array.from({ length: cols * rws }, (_, i) => {
              const c = i % cols;
              const r = Math.floor(i / cols);
              const key = `${c},${r}`;
              const star = starIndex.get(key);
              const twinkle = twinkles.get(key);
              return (
                <circle
                  key={key}
                  cx={at(c)}
                  cy={at(r)}
                  r={0.72}
                  className={cn(
                    "miyuki-constellation-card-dot",
                    star !== undefined
                      ? "miyuki-constellation-card-star opacity-40 dark:opacity-35"
                      : twinkle
                        ? "miyuki-constellation-card-twinkle opacity-[0.26] dark:opacity-[0.22]"
                        : "opacity-[0.26] dark:opacity-[0.22]",
                  )}
                  style={
                    star !== undefined
                      ? ({ "--miyuki-constellation-card-in": `${lightAt.get(star) ?? 0}ms` } as CSSProperties)
                      : twinkle
                        ? ({
                            "--miyuki-constellation-card-duration": `${twinkle.duration.toFixed(2)}s`,
                            "--miyuki-constellation-card-delay": `${twinkle.delay.toFixed(2)}s`,
                          } as CSSProperties)
                        : undefined
                  }
                />
              );
            })}
          </g>
        </svg>
      </div>
      <div className="px-4.5 pt-4 pb-5">{children}</div>
    </div>
  );
}
