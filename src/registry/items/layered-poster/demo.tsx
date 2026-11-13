"use client";

import { type ReactNode, useId } from "react";
import { LayeredPoster } from "@/components/miyuki-ui/layered-poster";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const W = 1500;
const H = 1000;

function ridge(seed: string, peaks: [number, number][], base: number, rough: number) {
  const rng = createRng(seed);
  const pts: string[] = [];
  for (let x = -260; x <= W + 260; x += 22) {
    let y = base;
    for (const [px, py] of peaks) {
      const d = Math.abs(x - px) / 260;
      y = Math.min(y, py + d * d * 160 + d * 70);
    }
    y += rng.range(-rough, rough);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M-260,${H + 60} L${pts.join(" L")} L${W + 260},${H + 60}Z`;
}

function rolling(seed: string, base: number, amp: number, flanks: number) {
  const rng = createRng(seed);
  const a = rng.range(0, Math.PI * 2);
  const b = rng.range(0, Math.PI * 2);
  const pts: string[] = [];
  for (let x = -260; x <= W + 260; x += 20) {
    const rise = flanks * (Math.exp(-(((x - 40) / 280) ** 2)) + 0.9 * Math.exp(-(((x - 1470) / 300) ** 2)));
    const y = base - rise + amp * (0.65 * Math.sin(x / 240 + a) + 0.35 * Math.sin(x / 95 + b)) + rng.range(-3, 3);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M-260,${H + 60} L${pts.join(" L")} L${W + 260},${H + 60}Z`;
}

function pines(seed: string, from: number, to: number, ground: number, count: number, scale: number) {
  const rng = createRng(seed);
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = from + ((to - from) * (i + rng.range(0.1, 0.9))) / count;
    const h = rng.range(170, 320) * scale;
    const w = h * rng.range(0.24, 0.3);
    const base = ground + rng.range(-18, 24);
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const top = base - h + (h * t) / (tiers + 1);
      const bottom = base - (h * (tiers - 1 - t)) / (tiers + 2.6);
      const half = (w * (t + 1.6)) / (tiers + 0.6);
      d += `M${(x - half).toFixed(1)},${bottom.toFixed(1)} L${x.toFixed(1)},${top.toFixed(1)} L${(x + half).toFixed(1)},${bottom.toFixed(1)}Z`;
    }
    d += `M${(x - w * 0.06).toFixed(1)},${(base - 6).toFixed(1)} h${(w * 0.12).toFixed(1)} v40 h${(-w * 0.12).toFixed(1)}Z`;
  }
  return d;
}

const farRidge = ridge(
  "hakuba-far",
  [
    [260, 395],
    [610, 330],
    [905, 372],
    [1250, 318],
  ],
  560,
  9,
);
const nearRidge = rolling("hakuba-near", 598, 22, 110);
const nearShade = rolling("hakuba-near-shade", 700, 20, 60);
const leftPines = pines("hakuba-pines-left", -120, 330, 945, 7, 1);
const rightPines = pines("hakuba-pines-right", 1150, 1640, 960, 8, 1.08);
const bank = "M-260,1060 L-260,905 C200,860 520,935 760,918 C1020,900 1260,870 1760,915 L1760,1060Z";

const palette = [
  "[--p-sky-top:color-mix(in_oklab,var(--brand)_34%,var(--background))]",
  "[--p-sky-low:color-mix(in_oklab,var(--chart-4)_16%,var(--background))]",
  "[--p-sun:color-mix(in_oklab,var(--chart-4)_28%,var(--card))]",
  "[--p-far:color-mix(in_oklab,var(--brand)_30%,var(--background))]",
  "[--p-far-shade:color-mix(in_oklab,var(--brand)_40%,var(--background))]",
  "[--p-title:var(--foreground)]",
  "[--p-near:var(--card)]",
  "[--p-near-shade:color-mix(in_oklab,var(--brand)_14%,var(--card))]",
  "[--p-rim:transparent]",
  "[--p-pine:color-mix(in_oklab,var(--foreground)_86%,var(--brand))]",
  "[--p-bank:var(--card)]",
  "[--p-foot:var(--foreground)]",
  "dark:[--p-sky-top:oklch(0.15_0.03_256)]",
  "dark:[--p-sky-low:oklch(0.34_0.065_238)]",
  "dark:[--p-sun:oklch(0.93_0.035_92)]",
  "dark:[--p-far:oklch(0.35_0.05_244)]",
  "dark:[--p-far-shade:oklch(0.3_0.045_248)]",
  "dark:[--p-near:oklch(0.25_0.035_248)]",
  "dark:[--p-near-shade:oklch(0.21_0.03_250)]",
  "dark:[--p-rim:oklch(0.78_0.07_232/0.7)]",
  "dark:[--p-pine:oklch(0.135_0.025_252)]",
  "dark:[--p-bank:oklch(0.29_0.035_246)]",
].join(" ");

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full overflow-visible"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function LayeredPosterDemo() {
  const id = useId().replace(/[^\w-]/g, "");

  return (
    <div className="grid size-full place-items-center p-4 sm:p-8" style={{ containerType: "size" }}>
      <LayeredPoster
        title="HAKUBA"
        titleDepth={0.3}
        titleClassName="top-[35%] text-(--p-title)"
        className={`aspect-[3/2] w-[min(100cqw,150cqh)] rounded-2xl bg-(--p-sky-top) shadow-2xl ring-1 ring-foreground/10 ${palette}`}
        layers={[
          {
            depth: 0,
            content: (
              <Svg>
                <defs>
                  <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--p-sky-top)" />
                    <stop offset="0.62" stopColor="var(--p-sky-low)" />
                  </linearGradient>
                  <radialGradient id={`${id}-glow`}>
                    <stop offset="0" stopColor="var(--p-sun)" stopOpacity="0.75" />
                    <stop offset="1" stopColor="var(--p-sun)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${id}-sky)`} />
                <circle cx={1150} cy={250} r={190} fill={`url(#${id}-glow)`} />
                <circle cx={1150} cy={250} r={62} fill="var(--p-sun)" />
              </Svg>
            ),
          },
          {
            depth: 0.16,
            content: (
              <Svg>
                <path d={farRidge} fill="var(--p-far)" />
                <path
                  d={ridge(
                    "hakuba-far-shade",
                    [
                      [300, 470],
                      [650, 430],
                      [950, 460],
                      [1290, 420],
                    ],
                    620,
                    6,
                  )}
                  fill="var(--p-far-shade)"
                />
              </Svg>
            ),
          },
          {
            depth: 0.5,
            content: (
              <Svg>
                <path d={nearRidge} fill="var(--p-near)" stroke="var(--p-rim)" strokeWidth={2} />
                <path d={nearShade} fill="var(--p-near-shade)" />
              </Svg>
            ),
          },
          {
            depth: 0.85,
            content: (
              <Svg>
                <path d={bank} fill="var(--p-bank)" />
                <path d={leftPines} fill="var(--p-pine)" />
                <path d={rightPines} fill="var(--p-pine)" />
              </Svg>
            ),
          },
          {
            depth: 1,
            content: (
              <p className="absolute inset-x-0 bottom-[5.5%] text-center text-[1.9cqw] font-medium tracking-[0.01em] text-(--p-foot)">
                Winter 2027
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
