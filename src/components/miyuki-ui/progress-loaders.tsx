"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useId } from "react";
import { cn } from "@/lib/utils";

export interface ProgressLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  value?: number;
  duration?: number;
  ref?: Ref<HTMLSpanElement>;
}

const DRAW = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const P = "var(--miyuki-progress-loaders-p)";
const AMOUNT = `clamp(0, ${P}, 1)`;
const FADE = `min(clamp(0, (${P} + 0.1) * 10, 1), clamp(0, (1.2 - ${P}) * 5, 1))`;
const CHECK_FADE = `clamp(0, (1.3 - ${P}) * 5, 1)`;

const keyframes = `
@property --miyuki-progress-loaders-p { syntax: "<number>"; inherits: true; initial-value: 0; }
@keyframes miyuki-progress-loaders-fill { 0% { --miyuki-progress-loaders-p: -0.1; } 3% { --miyuki-progress-loaders-p: 0; } 73%, 91% { --miyuki-progress-loaders-p: 1; } 100% { --miyuki-progress-loaders-p: 1.2; } }
@keyframes miyuki-progress-loaders-check { 0% { --miyuki-progress-loaders-p: 0; } 70% { --miyuki-progress-loaders-p: 1; animation-timing-function: ${DRAW}; } 76%, 91% { --miyuki-progress-loaders-p: 1.1; } 100% { --miyuki-progress-loaders-p: 1.3; } }
@keyframes miyuki-progress-loaders-pop { 0% { transform: scale(0.4); } 55% { transform: scale(1.2); } 100% { transform: scale(1); } }
@keyframes miyuki-progress-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Keyframes() {
  return (
    <style href="miyuki-progress-loaders" precedence="miyuki">
      {keyframes}
    </style>
  );
}

const LOOP = {
  fill: "motion-safe:[animation:miyuki-progress-loaders-fill_var(--miyuki-progress-loaders-cycle)_linear_var(--miyuki-progress-loaders-delay)_infinite]",
  check:
    "motion-safe:[animation:miyuki-progress-loaders-check_var(--miyuki-progress-loaders-cycle)_linear_var(--miyuki-progress-loaders-delay)_infinite]",
};

const clampValue = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

function Frame({
  size = 24,
  label = "Loading",
  value,
  duration = 2.8,
  loop = "fill",
  phase,
  still,
  width = size,
  className,
  style,
  children,
  ...props
}: ProgressLoaderProps & {
  children: ReactNode;
  loop?: keyof typeof LOOP;
  phase: number;
  still: number;
  width?: number | "auto";
}) {
  const looping = value == null;
  const amount = looping ? 0 : clampValue(value);
  const cycle = Math.max(0.1, duration) / 0.7;
  return (
    <span
      {...(looping
        ? { role: "status" }
        : {
            role: "progressbar",
            "aria-label": label,
            "aria-valuenow": Math.round(amount),
            "aria-valuemin": 0,
            "aria-valuemax": 100,
          })}
      {...props}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center text-brand",
        looping
          ? [
              LOOP[loop],
              "motion-reduce:[--miyuki-progress-loaders-p:var(--miyuki-progress-loaders-still)]",
              "motion-reduce:animate-[miyuki-progress-loaders-breathe_1.8s_ease-in-out_infinite]",
            ]
          : "[transition:--miyuki-progress-loaders-p_200ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:[transition:none]",
        className,
      )}
      style={
        {
          width,
          height: size,
          ...(looping
            ? {
                "--miyuki-progress-loaders-cycle": `${cycle}s`,
                "--miyuki-progress-loaders-delay": `${-phase * cycle}s`,
                "--miyuki-progress-loaders-still": still,
              }
            : { "--miyuki-progress-loaders-p": amount / 100 }),
          ...style,
        } as CSSProperties
      }
    >
      <Keyframes />
      {children}
      {looping && <span className="sr-only">{label}</span>}
    </span>
  );
}

const fix = (n: number) => `${Math.round(n * 1000) / 1000 || 0}`;

const SPOKES = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const [x, y] = [Math.sin(a), -Math.cos(a)];
  return `M${fix(x * 5.5)} ${fix(y * 5.5)}L${fix(x * 10)} ${fix(y * 10)}`;
});

export function SpokesLoader(props: ProgressLoaderProps) {
  const sharp = props.value == null ? 2 : 20;
  return (
    <Frame phase={0.22} still={0.62} {...props}>
      <svg
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {SPOKES.map((d, i) => (
          <path
            key={d}
            d={d}
            style={{
              opacity: `calc(0.2 + 0.8 * clamp(0, (${P} * 12 - ${i + 1}) * ${sharp} + 1, 1) * ${FADE})`,
            }}
          />
        ))}
      </svg>
    </Frame>
  );
}

export function CountLoader({ size = 24, value, ...props }: ProgressLoaderProps) {
  const looping = value == null;
  return (
    <Frame size={size} value={value} width="auto" phase={0.36} still={0.62} {...props}>
      <span
        aria-hidden="true"
        className="flex flex-col items-stretch"
        style={{ fontSize: size * 0.7, gap: size * 0.03, translate: `0 ${fix(size * -0.04)}px` }}
      >
        <span className="grid leading-none font-semibold tabular-nums">
          <span className="invisible col-start-1 row-start-1">000</span>
          <span
            className={cn(
              "col-start-1 row-start-1 text-center",
              looping && "after:content-[counter(miyuki-progress-loaders-count)]",
            )}
            style={
              looping
                ? {
                    counterReset: `miyuki-progress-loaders-count calc(${AMOUNT} * 100)`,
                    opacity: `max(0.15, ${FADE})`,
                  }
                : undefined
            }
          >
            {looping ? null : Math.round(clampValue(value))}
          </span>
        </span>
        <span className="relative overflow-hidden rounded-full" style={{ height: Math.max(1.5, size / 12) }}>
          <span className="absolute inset-0 bg-current opacity-25" />
          <span
            className="absolute inset-0 rounded-full bg-current"
            style={{ translate: `calc((${AMOUNT} - 1) * 100%) 0`, opacity: FADE }}
          />
        </span>
      </span>
    </Frame>
  );
}

export function CapsuleLoader(props: ProgressLoaderProps) {
  const id = `miyuki-capsule-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <Frame phase={0.18} still={0.62} {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        <defs>
          <clipPath id={id}>
            <rect x={4} y={9.5} width={16} height={5} rx={2.5} />
          </clipPath>
        </defs>
        <rect
          x={2}
          y={7.5}
          width={20}
          height={9}
          rx={4.5}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.45}
        />
        <g clipPath={`url(#${id})`}>
          <rect
            x={4}
            y={9.5}
            width={16}
            height={5}
            rx={2.5}
            style={{ translate: `calc((${AMOUNT} - 1) * 11px) 0`, opacity: FADE }}
          />
        </g>
      </svg>
    </Frame>
  );
}

const WEDGE = 3.5;
const WEDGE_LENGTH = 2 * Math.PI * WEDGE;

export function PieLoader(props: ProgressLoaderProps) {
  return (
    <Frame phase={0.3} still={0.62} {...props}>
      <svg
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        <circle r={9.5} strokeWidth={1.75} />
        <path
          d={`M0 -${WEDGE}A${WEDGE} ${WEDGE} 0 1 1 0 ${WEDGE}A${WEDGE} ${WEDGE} 0 1 1 0 -${WEDGE}`}
          strokeWidth={WEDGE * 2}
          strokeDasharray={`${fix(WEDGE_LENGTH)} ${fix(WEDGE_LENGTH)}`}
          style={{ strokeDashoffset: `calc((1 - ${AMOUNT}) * ${fix(WEDGE_LENGTH)}px)`, opacity: FADE }}
        />
      </svg>
    </Frame>
  );
}

const STEP_X = [4, 13.333, 22.667, 32];
const STEP_LOOP = { ends: [0.08, 0.38, 0.7, 1], ramp: 0.08 };
const STEP_VALUE = { ends: [0.01, 0.34, 0.67, 1], ramp: 0.005 };

export function StepsLoader({ size = 24, ...props }: ProgressLoaderProps) {
  const looping = props.value == null;
  const { ends, ramp } = looping ? STEP_LOOP : STEP_VALUE;
  const amount = looping ? 0 : clampValue(props.value ?? 0) / 100;
  const reach = (i: number) => `((${P} - ${ends[i]}) / ${ramp} + 1)`;
  const filled = (i: number) => `clamp(0, ${reach(i)}, 1)`;
  return (
    <Frame size={size} width={size * 1.5} phase={0.4} still={0.5} {...props}>
      <svg
        viewBox="0 0 36 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {STEP_X.slice(1).map((x, j) => (
          <line
            key={x}
            x1={STEP_X[j] + 2.2}
            x2={x - 2.2}
            y1={12}
            y2={12}
            strokeWidth={1.25}
            style={{ opacity: `calc(0.25 + 0.75 * ${filled(j + 1)} * ${FADE})` }}
          />
        ))}
        {STEP_X.map((x, i) => {
          const on = !looping && amount >= ends[i];
          return (
            <g key={x}>
              <circle cx={x} cy={12} r={2.2} strokeWidth={1.5} />
              <circle
                key={on ? "on" : "off"}
                cx={x}
                cy={12}
                r={2.95}
                fill="currentColor"
                stroke="none"
                className={cn(
                  "origin-center [transform-box:fill-box]",
                  on && "motion-safe:animate-[miyuki-progress-loaders-pop_280ms_cubic-bezier(0.22,1,0.36,1)]",
                )}
                style={{
                  scale: looping
                    ? `calc(clamp(0, ${reach(i)} * 2, 1.2) - clamp(0, (${reach(i)} - 0.6) * 0.5, 0.2))`
                    : filled(i),
                  opacity: FADE,
                }}
              />
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

const RING_LENGTH = 2 * Math.PI * 9.5;
const TICK = "M-4.6 0.2L-1.5 3.3L4.8 -3";
const TICK_LENGTH = 13.3;

export function CheckLoader(props: ProgressLoaderProps) {
  const looping = props.value == null;
  const done = !looping && clampValue(props.value ?? 0) >= 100;
  const tick = `clamp(0, (${P} - 1) * 10, 1)`;
  return (
    <Frame loop="check" phase={0.25} still={0.7} {...props}>
      <svg
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        <circle r={9.5} opacity={0.2} />
        <path
          d="M0 -9.5A9.5 9.5 0 1 1 0 9.5A9.5 9.5 0 1 1 0 -9.5"
          strokeDasharray={`${fix(RING_LENGTH)} ${fix(RING_LENGTH)}`}
          style={{
            strokeDashoffset: `calc((1 - ${AMOUNT}) * ${fix(RING_LENGTH)}px)`,
            opacity: `calc(clamp(0, ${P} * 40, 1) * ${CHECK_FADE})`,
          }}
        />
        <path
          d={TICK}
          strokeDasharray={`${TICK_LENGTH} ${TICK_LENGTH}`}
          className={cn(
            done &&
              "[transition:opacity_0s_120ms,stroke-dashoffset_240ms_cubic-bezier(0.45,0.05,0.25,1)_120ms] motion-reduce:[transition:opacity_150ms]",
          )}
          style={
            looping
              ? {
                  strokeDashoffset: `calc((1 - ${tick}) * ${TICK_LENGTH}px)`,
                  opacity: `calc(clamp(0, (${P} - 1) * 200, 1) * ${CHECK_FADE})`,
                }
              : { strokeDashoffset: done ? 0 : TICK_LENGTH, opacity: done ? 1 : 0 }
          }
        />
      </svg>
    </Frame>
  );
}
