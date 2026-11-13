"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useId } from "react";
import { cn } from "@/lib/utils";

export interface LoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

const keyframes = `
@keyframes miyuki-loaders-tide { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
@keyframes miyuki-loaders-drift { to { transform: translateX(-12px); } }
${[0, 1, 2, 3, 4, 5]
  .map(
    (i) =>
      `@keyframes miyuki-loaders-form-${i} { 0%, ${i * 8}% { transform: scale(0.2); opacity: 0; } ${i * 8 + 16}%, 80% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(0.55); opacity: 0; } }`,
  )
  .join("\n")}
@keyframes miyuki-loaders-ring { from { transform: scale(0.12); opacity: 0.9; } to { transform: scale(1); opacity: 0; } }
@keyframes miyuki-loaders-dot { 0%, 100% { transform: scale(0.5); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
@keyframes miyuki-loaders-sweep { from { background-position: 100% 0; } to { background-position: 0 0; } }
@keyframes miyuki-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Keyframes() {
  return (
    <style href="miyuki-loaders" precedence="miyuki">
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
}: LoaderProps & { children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-loaders-breathe_1.8s_ease-in-out_infinite]",
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

const still = (value: number, opacity = 1) =>
  ({ "--miyuki-loaders-still": value, "--miyuki-loaders-fade": opacity }) as CSSProperties;

const TIDE = [0.62, 0.86, 1, 0.74, 0.5];

export function LoaderBars(props: LoaderProps) {
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        {TIDE.map((level, i) => (
          <rect
            key={i}
            x={1.9 + i * 4.3}
            y={3.5}
            width={2.6}
            height={17}
            rx={1.3}
            className="origin-bottom [transform-box:fill-box] motion-safe:animate-[miyuki-loaders-tide_1.4s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:[scale:1_var(--miyuki-loaders-still)]"
            style={{ ...still(level), animationDelay: `${-1.4 + i * 0.14}s` }}
          />
        ))}
      </svg>
    </Frame>
  );
}

const WAVE = (() => {
  let d = "";
  for (let i = 0; i <= 96; i++) {
    const x = -12 + i * 0.5;
    const y = 12 + Math.sin((x / 12) * Math.PI * 2) * 3.6;
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
})();

export function LoaderWave(props: LoaderProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
        <defs>
          <linearGradient id={`${id}-fade`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.28" stopColor="#fff" />
            <stop offset="0.72" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}-mask)`}>
          <path
            d={WAVE}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="motion-safe:animate-[miyuki-loaders-drift_1.1s_linear_infinite] motion-reduce:translate-x-[-3px]"
          />
        </g>
      </svg>
    </Frame>
  );
}

const ARM = "M0 -1.6V-10M0 -5.4L-2.7 -8.1M0 -5.4L2.7 -8.1";
const CRYSTAL = [0, 1, 2, 3, 4, 5];

export function LoaderCrystal(props: LoaderProps) {
  return (
    <Frame {...props}>
      <svg
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {CRYSTAL.map((i) => (
          <g key={i} transform={`rotate(${i * 60})`}>
            <path
              d={ARM}
              className="origin-bottom [transform-box:fill-box] motion-safe:[animation:var(--miyuki-loaders-form)]"
              style={
                {
                  "--miyuki-loaders-form": `miyuki-loaders-form-${i} 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite`,
                } as CSSProperties
              }
            />
          </g>
        ))}
        <circle r={1.1} fill="currentColor" stroke="none" />
      </svg>
    </Frame>
  );
}

export function LoaderRipple(props: LoaderProps) {
  const stroke = Math.max(1.25, (props.size ?? 24) / 18);
  return (
    <Frame {...props}>
      <svg
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            r={11}
            strokeWidth={stroke}
            vectorEffect="non-scaling-stroke"
            className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-loaders-ring_1.8s_cubic-bezier(0.2,0.6,0.35,1)_infinite] motion-reduce:[scale:var(--miyuki-loaders-still)] motion-reduce:opacity-(--miyuki-loaders-fade)"
            style={{ ...still(0.3 + i * 0.32, 0.9 - i * 0.3), animationDelay: `${-1.8 + i * 0.6}s` }}
          />
        ))}
        <circle r={1.9} fill="currentColor" stroke="none" />
      </svg>
    </Frame>
  );
}

const GRID = [5, 12, 19];

export function LoaderGrid(props: LoaderProps) {
  return (
    <Frame {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        {GRID.flatMap((cy, r) =>
          GRID.map((cx, c) => {
            const level = 1 - Math.abs(r + c - 2) * 0.22;
            return (
              <circle
                key={`${r}-${c}`}
                cx={cx}
                cy={cy}
                r={2.6}
                className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-loaders-dot_1.4s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:[scale:var(--miyuki-loaders-still)] motion-reduce:opacity-(--miyuki-loaders-fade)"
                style={{ ...still(level, level), animationDelay: `${-1.4 + (r + c) * 0.12}s` }}
              />
            );
          }),
        )}
      </svg>
    </Frame>
  );
}

export interface LoaderTextProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
  ref?: Ref<HTMLSpanElement>;
}

export function LoaderText({ size = 14, className, style, children = "Loading", ...props }: LoaderTextProps) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-block font-medium whitespace-nowrap text-brand",
        "bg-[length:300%_100%] bg-[position:50%_0] bg-clip-text [-webkit-text-fill-color:transparent]",
        "bg-[linear-gradient(100deg,currentColor_38%,color-mix(in_oklab,currentColor_52%,white)_50%,currentColor_62%)]",
        "motion-safe:animate-[miyuki-loaders-sweep_1.9s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
        "motion-reduce:animate-[miyuki-loaders-breathe_1.8s_ease-in-out_infinite]",
        className,
      )}
      style={{ fontSize: size, lineHeight: 1.4, ...style }}
    >
      <Keyframes />
      {children}
    </span>
  );
}
