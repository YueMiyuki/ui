"use client";

import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export interface SquareLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";

const keyframes = `
@keyframes miyuki-square-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes miyuki-square-loaders-tumble { 0% { rotate: 0deg; animation-timing-function: cubic-bezier(0.55, 0, 0.3, 1.35); } 62.5%, 100% { rotate: 90deg; } }
@keyframes miyuki-square-loaders-dip { 0%, 62.5%, 100% { scale: 1; } 26% { scale: 0.9; } }
@keyframes miyuki-square-loaders-slide {
  0% { transform: translate(0px, 8.5px); }
  8.333%, 25% { transform: translate(8.5px, 8.5px); }
  33.333%, 50% { transform: translate(8.5px, 0px); }
  58.333%, 75% { transform: translate(0px, 0px); }
  83.333%, 100% { transform: translate(0px, 8.5px); }
}
@keyframes miyuki-square-loaders-handover { 0%, 100% { opacity: 0.55; } 33.333% { opacity: 1; } 66.667% { opacity: 0.75; } }
@keyframes miyuki-square-loaders-round { 0%, 100% { border-radius: 10%; } 50% { border-radius: 50%; } }
@keyframes miyuki-square-loaders-quarter { to { rotate: 90deg; } }
@keyframes miyuki-square-loaders-nest { 0% { rotate: 0deg; } 55%, 100% { rotate: 90deg; } }
@keyframes miyuki-square-loaders-cell { 0% { opacity: 0.25; scale: 0.7; animation-timing-function: ${SETTLE}; } 6% { opacity: 1; scale: 1; animation-timing-function: linear; } 40%, 100% { opacity: 0.25; scale: 0.7; } }
@keyframes miyuki-square-loaders-flip {
  0% { transform: rotateY(0deg) rotateX(0deg); }
  29.412%, 50% { transform: rotateY(180deg) rotateX(0deg); }
  79.412%, 100% { transform: rotateY(180deg) rotateX(180deg); }
}
`;

function Keyframes() {
  return (
    <style href="miyuki-square-loaders" precedence="miyuki">
      {keyframes}
    </style>
  );
}

function Frame({
  size = 24,
  label = "Loading",
  className,
  style,
  children,
  ...props
}: SquareLoaderProps & { children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-square-loaders-breathe_1.8s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <Keyframes />
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const vars = (values: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [`--miyuki-square-loaders-${k}`, v])) as CSSProperties;

export function TumbleLoader(props: SquareLoaderProps) {
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        <rect
          x={6}
          y={6}
          width={12}
          height={12}
          rx={2.5}
          className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-square-loaders-tumble_0.8s_infinite,miyuki-square-loaders-dip_0.8s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:rotate-12"
          style={{ animationDelay: "-0.14s" }}
        />
      </svg>
    </Frame>
  );
}

const TILES = [
  { delay: -0.12, x: 0, y: 8.5, fade: 0.55 },
  { delay: -2.92, x: 0, y: 0, fade: 0.75 },
  { delay: -1.52, x: 8.5, y: 0, fade: 1 },
];

export function ShuffleLoader(props: SquareLoaderProps) {
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        {TILES.map((tile) => (
          <rect
            key={tile.delay}
            x={4.5}
            y={4.5}
            width={6.5}
            height={6.5}
            rx={1.5}
            className="motion-safe:animate-[miyuki-square-loaders-slide_4.2s_cubic-bezier(0.22,1,0.36,1)_infinite,miyuki-square-loaders-handover_1.05s_cubic-bezier(0.22,1,0.36,1)_infinite] motion-reduce:[translate:var(--miyuki-square-loaders-x)_var(--miyuki-square-loaders-y)] motion-reduce:opacity-(--miyuki-square-loaders-fade)"
            style={{
              ...vars({ x: `${tile.x}px`, y: `${tile.y}px`, fade: tile.fade }),
              animationDelay: `${tile.delay}s`,
            }}
          />
        ))}
      </svg>
    </Frame>
  );
}

export function RoundingLoader({ size = 24, ...props }: SquareLoaderProps) {
  return (
    <Frame size={size} {...props}>
      <span aria-hidden="true" className="absolute inset-[18.75%] block">
        <span
          className="block size-full rounded-[30%] border-current motion-safe:animate-[miyuki-square-loaders-round_2.4s_cubic-bezier(0.45,0.05,0.25,1)_infinite,miyuki-square-loaders-quarter_2.4s_linear_infinite]"
          style={{ borderWidth: size / 12, borderStyle: "solid", animationDelay: "-0.6s" }}
        />
      </span>
    </Frame>
  );
}

const NEST = [
  { side: 5, radius: 1.25, fade: 1, delay: 0, still: 45 },
  { side: 10.5, radius: 2, fade: 0.7, delay: 0.12, still: 20 },
  { side: 17, radius: 2.75, fade: 0.45, delay: 0.24, still: 0 },
];

export function NestLoader(props: SquareLoaderProps) {
  return (
    <Frame {...props}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {NEST.map(({ side, radius, fade, delay, still }) => (
          <rect
            key={side}
            x={12 - side / 2}
            y={12 - side / 2}
            width={side}
            height={side}
            rx={radius}
            opacity={fade}
            className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-square-loaders-nest_2s_cubic-bezier(0.22,1,0.36,1)_infinite] motion-reduce:rotate-(--miyuki-square-loaders-still)"
            style={{ ...vars({ still: `${still}deg` }), animationDelay: `${delay - 0.3}s` }}
          />
        ))}
      </svg>
    </Frame>
  );
}

const SPIRAL = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
  [1, 1],
];

const SPIRAL_STILL = [0.25, 0.35, 0.55, 0.8, 1, 0.25, 0.25, 0.25, 0.25];

export function SpiralLoader(props: SquareLoaderProps) {
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        {SPIRAL.map(([col, row], step) => {
          const level = SPIRAL_STILL[step];
          return (
            <rect
              key={step}
              x={3 + col * 6.75}
              y={3 + row * 6.75}
              width={4.5}
              height={4.5}
              rx={1}
              className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-square-loaders-cell_1.8s_infinite] motion-reduce:[scale:var(--miyuki-square-loaders-scale)] motion-reduce:opacity-(--miyuki-square-loaders-fade)"
              style={{
                ...vars({ fade: level, scale: 0.7 + (level - 0.25) * 0.4 }),
                animationDelay: `${-1.8 + step * 0.2 - 0.85}s`,
              }}
            />
          );
        })}
      </svg>
    </Frame>
  );
}

export function FlipLoader({ size = 24, ...props }: SquareLoaderProps) {
  // Firefox ignores backface-visibility on a face that has no transform of its own
  return (
    <Frame size={size} {...props}>
      <span aria-hidden="true" className="absolute inset-[20.833%] block" style={{ perspective: size * 3 }}>
        <span
          className="relative block size-full [transform-style:preserve-3d] motion-safe:animate-[miyuki-square-loaders-flip_1.7s_cubic-bezier(0.22,1,0.36,1)_infinite]"
          style={{ animationDelay: "-1.6s" }}
        >
          <span className="absolute inset-0 block rounded-[18%] bg-current [backface-visibility:hidden] [transform:rotateY(0deg)]" />
          <span
            className="absolute inset-0 block rounded-[18%] border-current [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ borderWidth: size / 12, borderStyle: "solid" }}
          />
        </span>
      </span>
    </Frame>
  );
}
