"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useId } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface CurrentLinesProps extends ComponentProps<"div"> {
  count?: number;
  colors?: [string, string] | string[];
  speed?: number;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)"];
const W = 1000;
const H = 500;
const PULSE = 0.17;

interface Beam {
  d: string;
  from: [number, number];
  to: [number, number];
  pulse: null | { duration: number; delay: number; travel: number; rest: number };
}

const f = (n: number) => n.toFixed(1);

function buildBeams(count: number): Beam[] {
  const rng = createRng(`current-lines:${count}`);
  const n = Math.max(1, Math.round(count));
  const pulsed = new Set(rng.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, Math.max(1, Math.round(n / 3))));
  const beams: Beam[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const u = t - 0.5 + rng.range(-0.25, 0.25) / n;
    const y0 = 400 + u * 230;
    const y1 = 30 + u * 800;
    const x0 = -40;
    const x1 = W + 40;
    const bend = rng.range(-30, 30) - u * 120;
    const c1: [number, number] = [330 + bend, y0 + rng.range(-14, 10)];
    const c2: [number, number] = [610 + bend, y1 + rng.range(-10, 14)];
    const d = `M${f(x0)} ${f(y0)}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(x1)} ${f(y1)}`;
    let pulse: Beam["pulse"] = null;
    if (pulsed.has(i)) {
      const travel = rng.range(6, 14);
      const rest = rng.range(1.5, 6);
      pulse = { duration: travel + rest, travel, rest, delay: -rng.range(0, travel + rest) };
    }
    beams.push({ d, from: [x0, y0], to: [x1, y1], pulse });
  }
  return beams;
}

export function CurrentLines({
  count = 24,
  colors = DEFAULT_COLORS,
  speed = 1,
  className,
  children,
  ...props
}: CurrentLinesProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const reduce = useReducedMotion();
  const beams = buildBeams(count);
  const tail = colors[0] ?? DEFAULT_COLORS[0];
  const head = colors[1] ?? colors[0] ?? DEFAULT_COLORS[1];
  const rate = speed > 0 ? speed : 1;

  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 -z-10 size-full"
        fill="none"
      >
        <defs>
          {beams.map((beam, i) => {
            if (!beam.pulse) return null;
            const [ax, ay] = beam.from;
            const [bx, by] = beam.to;
            const dx = bx - ax;
            const dy = by - ay;
            const start = `${f(-dx * PULSE)} ${f(-dy * PULSE)}`;
            const end = `${f(dx)} ${f(dy)}`;
            const { travel, duration, delay } = beam.pulse;
            const still = `${f(dx * 0.45)} ${f(dy * 0.45)}`;
            return (
              <linearGradient
                key={i}
                id={`${id}-p${i}`}
                gradientUnits="userSpaceOnUse"
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                gradientTransform={reduce ? `translate(${still})` : `translate(${start})`}
              >
                <stop offset="0" stopColor={tail} stopOpacity="0" />
                <stop offset={PULSE * 0.55} stopColor={tail} stopOpacity="0.9" />
                <stop offset={PULSE * 0.93} stopColor={head} stopOpacity="1" />
                <stop offset={PULSE} stopColor={head} stopOpacity="0" />
                {reduce ? null : (
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values={`${start};${end};${end}`}
                    keyTimes={`0;${(travel / duration).toFixed(3)};1`}
                    dur={`${(duration / rate).toFixed(2)}s`}
                    begin={`${(delay / rate).toFixed(2)}s`}
                    repeatCount="indefinite"
                  />
                )}
              </linearGradient>
            );
          })}
        </defs>
        <g stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {beams.map((beam, i) => (
            <path key={i} d={beam.d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <g className="hidden blur-[3px] dark:inline" strokeLinecap="round">
          {beams.map((beam, i) =>
            beam.pulse ? (
              <path key={i} d={beam.d} stroke={`url(#${id}-p${i})`} strokeWidth="5" vectorEffect="non-scaling-stroke" />
            ) : null,
          )}
        </g>
        <g strokeLinecap="round" className="[stroke-width:1.75px] dark:[stroke-width:1.5px]">
          {beams.map((beam, i) =>
            beam.pulse ? (
              <path key={i} d={beam.d} stroke={`url(#${id}-p${i})`} vectorEffect="non-scaling-stroke" />
            ) : null,
          )}
        </g>
      </svg>
      {children}
    </div>
  );
}
