"use client";

import type { CSSProperties, HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerVariant = "ring" | "drops" | "orbit";

const pixels: Record<SpinnerSize, number> = { xs: 14, sm: 16, md: 20, lg: 28, xl: 40 };

const ringStroke: Record<SpinnerSize, number> = { xs: 2.75, sm: 2.6, md: 2.3, lg: 2, xl: 1.7 };

const R = 10;
const C = 2 * Math.PI * R;

const keyframes = `
@keyframes miyuki-spinner-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-spinner-drip {
  0%, 72%, 100% { transform: translateY(-10%) scale(0.5); opacity: 0.35; }
  24% { transform: translateY(0) scale(1); opacity: 1; }
  50% { transform: translateY(70%) scale(0.72, 0.88); opacity: 0.6; }
}
@keyframes miyuki-spinner-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

const spin = "motion-safe:animate-[miyuki-spinner-spin_var(--miyuki-spinner-period)_linear_infinite]";

function Ring({ size }: { size: SpinnerSize }) {
  const sw = ringStroke[size];
  const quarter = C / 4;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-full -rotate-90 [--miyuki-spinner-period:0.8s]", spin)}
    >
      <circle cx="12" cy="12" r={R} stroke="currentColor" strokeOpacity={0.15} strokeWidth={sw} />
      <circle
        cx="12"
        cy="12"
        r={R}
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${quarter} ${C}`}
        transform="rotate(-60 12 12)"
      />
      <circle
        cx="12"
        cy="12"
        r={R}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${quarter} ${C}`}
      />
    </svg>
  );
}

function Drops() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
      {[5, 12, 19].map((cx, i) => (
        <circle
          key={cx}
          cx={cx}
          cy="12"
          r="3"
          className="origin-center [transform-box:fill-box] motion-safe:animate-[miyuki-spinner-drip_1.2s_ease-in-out_infinite] motion-reduce:scale-[0.7]"
          style={{ animationDelay: `${i * 0.16 - 1.2}s` }}
        />
      ))}
    </svg>
  );
}

function Orbit({ size }: { size: SpinnerSize }) {
  const n = pixels[size];
  const t = Math.max(1.5, Math.round(n * 0.09 * 2) / 2);
  const d = Math.max(3.5, Math.round(n * 0.2 * 2) / 2);
  const inset = (d - t) / 2;
  const tail: CSSProperties = {
    inset,
    background: "conic-gradient(from 0deg, transparent 0turn, transparent 0.3turn, currentColor 1turn)",
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px - 0.5px), #000 calc(100% - ${t}px))`,
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px - 0.5px), #000 calc(100% - ${t}px))`,
  };
  return (
    <span aria-hidden="true" className={cn("relative block size-full [--miyuki-spinner-period:1s]", spin)}>
      <span className="absolute rounded-full opacity-70" style={tail} />
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-current"
        style={{ width: d, height: d }}
      />
    </span>
  );
}

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function Spinner({
  size = "md",
  variant = "ring",
  label = "Loading",
  className,
  style,
  ...props
}: SpinnerProps) {
  const n = pixels[size];
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-spinner-pulse_1.6s_ease-in-out_infinite]",
        className,
      )}
      style={{ width: n, height: n, ...style }}
    >
      <style href="miyuki-spinner" precedence="miyuki">
        {keyframes}
      </style>
      {variant === "ring" && <Ring size={size} />}
      {variant === "drops" && <Drops />}
      {variant === "orbit" && <Orbit size={size} />}
      <span className="sr-only">{label}</span>
    </span>
  );
}
