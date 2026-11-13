"use client";

import { motion, type Transition, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode, type Ref, useId } from "react";
import { composeRenderProps, SwitchButton, SwitchField, type SwitchFieldProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export type DayNightToggleSize = "sm" | "md" | "lg";

export interface DayNightToggleProps extends Omit<SwitchFieldProps, "children"> {
  label?: ReactNode;
  size?: DayNightToggleSize;
  ref?: Ref<HTMLDivElement>;
}

const sizes = {
  sm: { width: 48, height: 24, text: "text-[13px]", gap: "gap-2.5" },
  md: { width: 64, height: 32, text: "text-sm", gap: "gap-3" },
  lg: { width: 80, height: 40, text: "text-sm", gap: "gap-3.5" },
} as const;

const STARS = [
  [8.5, 9.5, 0.75],
  [15, 5, 0.55],
  [21.5, 12.5, 0.6],
  [27.5, 6.5, 0.8],
  [34, 3.8, 0.5],
  [11.5, 16.5, 0.45],
  [38.5, 10.5, 0.5],
] as const;

const FAR = "M0 25 C 7 21.6 13 20.8 21 23 S 35 19.6 43 21.4 S 57 23.6 64 21 V 32 H 0 Z";
const NEAR =
  "M0 28.6 C 6 27.2 12 26.9 18 27.5 C 24 28.1 28 25 32.6 22.6 C 35.6 21 38 20.1 40.2 20.2 C 43 20.4 46 23.2 50 25.4 C 54 27.4 59 27.6 64 26.4 V 32 H 0 Z";
const SLOPE =
  "M40.2 20.2 C 43 20.4 46 23.2 50 25.4 C 54 27.4 59 27.6 64 26.4 V 32 H 44 C 44.6 28 43.4 23.6 40.2 20.2 Z";
const RIM = "M24 27.8 C 28 25 30.6 23.8 32.6 22.6 C 35.6 21 38 20.1 40.2 20.2 C 43 20.4 46 23.2 50 25.4";
const CLOUD =
  "M31.2 12.6 H 42.6 A 2.7 2.7 0 0 0 42.9 7.2 A 3.6 3.6 0 0 0 36.4 5.6 A 2.9 2.9 0 0 0 31.9 7.9 A 2.4 2.4 0 0 0 31.2 12.6 Z";

const sky: Record<"day" | "night", [string, string]> = {
  day: ["oklch(0.78 0.09 236)", "oklch(0.91 0.05 216)"],
  night: ["oklch(0.22 0.055 268)", "oklch(0.35 0.065 256)"],
};

export function DayNightToggle({ label, size = "md", className, ...props }: DayNightToggleProps) {
  const reduce = useReducedMotion() ?? false;
  const s = sizes[size];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const fade = (delay = 0): Transition => ({ duration: 0.15, delay: reduce ? 0 : delay });

  const sun: Variants = reduce
    ? { day: { opacity: 1, x: 0, y: 0, transition: fade() }, night: { opacity: 0, x: 0, y: 0, transition: fade() } }
    : {
        day: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            x: { duration: 0.72, delay: 0.22, ease: [0.25, 0.6, 0.3, 1] },
            y: { duration: 0.52, delay: 0.22, ease: [0.15, 0.7, 0.35, 1] },
          },
        },
        night: {
          opacity: 1,
          x: 25,
          y: 23,
          transition: {
            x: { duration: 0.62, ease: [0.35, 0.05, 0.55, 1] },
            y: { duration: 0.62, ease: [0.62, 0, 0.88, 0.6] },
          },
        },
      };

  const ember: Variants = {
    day: { opacity: 0, transition: { duration: reduce ? 0.15 : 0.5, delay: reduce ? 0 : 0.3 } },
    night: { opacity: reduce ? 0 : 0.85, transition: { duration: 0.45, ease: "easeIn" } },
  };

  const moon: Variants = reduce
    ? { day: { opacity: 0, y: 0, transition: fade() }, night: { opacity: 1, y: 0, transition: fade() } }
    : {
        day: { opacity: 1, y: 26, transition: { duration: 0.42, ease: [0.5, 0, 0.75, 0.3] } },
        night: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22, delay: 0.4 } },
      };

  const nightSky: Variants = {
    day: {
      opacity: 0,
      transition: { duration: reduce ? 0.15 : 0.8, delay: reduce ? 0 : 0.12, ease: [0.4, 0, 0.3, 1] },
    },
    night: { opacity: 1, transition: { duration: reduce ? 0.15 : 0.85, ease: [0.4, 0, 0.3, 1] } },
  };

  const glow: Variants = reduce
    ? { day: { opacity: 0 }, night: { opacity: 0 } }
    : {
        day: { opacity: [0, 0.55, 0], transition: { duration: 1, times: [0, 0.45, 1], ease: "easeInOut" } },
        night: { opacity: [0, 0.95, 0], transition: { duration: 1, times: [0, 0.38, 1], ease: "easeInOut" } },
      };

  const cloud: Variants = reduce
    ? { day: { opacity: 1, x: 0, transition: fade() }, night: { opacity: 0, x: 0, transition: fade() } }
    : {
        day: { opacity: 1, x: 0, transition: { duration: 0.75, delay: 0.22, ease: [0.2, 0.7, 0.3, 1] } },
        night: {
          opacity: [1, 1, 0],
          x: 26,
          transition: {
            x: { duration: 0.85, ease: [0.4, 0, 0.6, 1] },
            opacity: { duration: 0.85, times: [0, 0.45, 1] },
          },
        },
      };

  const star = (i: number): Variants => ({
    day: { opacity: 0, transition: { duration: 0.18 } },
    night: { opacity: 1, transition: { duration: reduce ? 0.15 : 0.32, delay: reduce ? 0 : 0.48 + i * 0.065 } },
  });

  return (
    <SwitchField
      {...props}
      aria-label={label == null ? (props["aria-label"] ?? "Night") : props["aria-label"]}
      className={composeRenderProps(className, (cls) => cn("flex flex-col data-[disabled]:opacity-50", cls))}
    >
      <SwitchButton
        className={cn(
          "flex w-fit items-center text-foreground outline-none select-none data-[disabled]:cursor-not-allowed",
          s.gap,
          s.text,
        )}
      >
        {({ isSelected, isPressed, isHovered, isFocusVisible }) => {
          const phase = isSelected ? "night" : "day";
          return (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-block shrink-0 overflow-hidden rounded-full transition-shadow duration-200 ease-settle",
                  isFocusVisible && "ring-[3px] ring-ring",
                )}
                style={{ width: s.width, height: s.height }}
              >
                <svg viewBox="0 0 64 32" width={s.width} height={s.height} className="block">
                  <defs>
                    {(["day", "night"] as const).map((key) => (
                      <linearGradient key={key} id={`${uid}-${key}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={sky[key][0]} />
                        <stop offset="1" stopColor={sky[key][1]} />
                      </linearGradient>
                    ))}
                    <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0" stopColor="oklch(0.86 0.13 70)" />
                      <stop offset="0.45" stopColor="oklch(0.74 0.14 32)" stopOpacity="0.55" />
                      <stop offset="1" stopColor="oklch(0.7 0.15 20)" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id={`${uid}-sun`} cx="0.42" cy="0.4" r="0.62">
                      <stop offset="0" stopColor="oklch(0.97 0.08 98)" />
                      <stop offset="0.55" stopColor="oklch(0.89 0.15 88)" />
                      <stop offset="1" stopColor="oklch(0.8 0.16 72)" />
                    </radialGradient>
                    <radialGradient id={`${uid}-halo`} cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0.6" stopColor="currentColor" stopOpacity="0.5" />
                      <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`${uid}-rim`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="oklch(0.88 0.03 240)" stopOpacity="0" />
                      <stop offset="0.45" stopColor="oklch(0.88 0.03 240)" stopOpacity="0.9" />
                      <stop offset="1" stopColor="oklch(0.88 0.03 240)" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${uid}-cloud`}>
                      <path d={CLOUD} />
                    </clipPath>
                    <radialGradient id={`${uid}-moon`} cx="0.4" cy="0.38" r="0.65">
                      <stop offset="0" stopColor="oklch(0.985 0.012 95)" />
                      <stop offset="1" stopColor="oklch(0.9 0.025 92)" />
                    </radialGradient>
                  </defs>
                  <rect width="64" height="32" fill={`url(#${uid}-day)`} />
                  <motion.rect
                    width="64"
                    height="32"
                    fill={`url(#${uid}-night)`}
                    initial={false}
                    animate={phase}
                    variants={nightSky}
                  />
                  <motion.ellipse
                    cx="41"
                    cy="25"
                    rx="30"
                    ry="13"
                    fill={`url(#${uid}-glow)`}
                    initial={false}
                    animate={phase}
                    variants={glow}
                  />
                  <g fill="oklch(0.97 0.02 95)">
                    {STARS.map(([x, y, r], i) => (
                      <motion.g key={i} initial={false} animate={phase} variants={star(i)}>
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          className="animate-[miyuki-day-night-toggle-twinkle_3s_ease-in-out_infinite] motion-reduce:animate-none"
                          style={{ animationDelay: `${-i * 0.83}s`, animationDuration: `${2.6 + (i % 3) * 0.7}s` }}
                        />
                      </motion.g>
                    ))}
                  </g>
                  <motion.g initial={false} animate={phase} variants={cloud}>
                    <path d={CLOUD} fill="oklch(0.99 0.006 230)" />
                    <rect
                      x="28"
                      y="10.9"
                      width="20"
                      height="3"
                      fill="oklch(0.9 0.028 238)"
                      clipPath={`url(#${uid}-cloud)`}
                    />
                  </motion.g>
                  <motion.g initial={false} animate={phase} variants={sun}>
                    <motion.g
                      animate={{ scale: isPressed && !reduce ? 0.9 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <circle
                        cx="15"
                        cy="14"
                        r="15.5"
                        fill={`url(#${uid}-halo)`}
                        color="oklch(0.92 0.14 92)"
                        opacity={isHovered ? 0.95 : 0.6}
                        className="transition-opacity duration-200"
                      />
                      <circle cx="15" cy="14" r="10" fill={`url(#${uid}-sun)`} />
                      <motion.circle
                        cx="15"
                        cy="14"
                        r="10"
                        fill="oklch(0.72 0.17 40)"
                        initial={false}
                        animate={phase}
                        variants={ember}
                      />
                    </motion.g>
                  </motion.g>
                  <motion.g initial={false} animate={phase} variants={moon}>
                    <motion.g
                      animate={{ scale: isPressed && !reduce ? 0.9 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <circle
                        cx="49"
                        cy="14"
                        r="15.5"
                        fill={`url(#${uid}-halo)`}
                        color="oklch(0.95 0.03 95)"
                        opacity={isHovered ? 0.6 : 0.36}
                        className="transition-opacity duration-200"
                      />
                      <circle cx="49" cy="14" r="10" fill={`url(#${uid}-moon)`} />
                      <circle cx="45.6" cy="11" r="2.1" fill="oklch(0.88 0.022 92)" />
                      <circle cx="52.4" cy="16.6" r="1.6" fill="oklch(0.89 0.02 92)" />
                      <circle cx="50.6" cy="9.6" r="1" fill="oklch(0.89 0.02 92)" />
                      <circle cx="46.4" cy="17.4" r="0.8" fill="oklch(0.9 0.02 92)" />
                    </motion.g>
                  </motion.g>
                  <path
                    d={FAR}
                    className="transition-[fill] duration-700 ease-[cubic-bezier(0.4,0,0.3,1)] motion-reduce:duration-150"
                    style={{ fill: isSelected ? "oklch(0.3 0.045 260)" : "oklch(0.84 0.042 236)" }}
                  />
                  <path
                    d={NEAR}
                    className="transition-[fill] duration-700 ease-[cubic-bezier(0.4,0,0.3,1)] motion-reduce:duration-150"
                    style={{ fill: isSelected ? "oklch(0.47 0.04 252)" : "oklch(0.99 0.005 230)" }}
                  />
                  <path
                    d={SLOPE}
                    className="transition-[fill] duration-700 ease-[cubic-bezier(0.4,0,0.3,1)] motion-reduce:duration-150"
                    style={{ fill: isSelected ? "oklch(0.39 0.045 256)" : "oklch(0.91 0.03 238)" }}
                  />
                  <path
                    d={RIM}
                    fill="none"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    className="transition-opacity duration-700 motion-reduce:duration-150"
                    stroke={`url(#${uid}-rim)`}
                    opacity={isSelected ? 0.75 : 0}
                  />
                </svg>
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgb(0_0_0/0.18)] ring-1 ring-inset transition-[box-shadow] duration-200",
                    isHovered ? "ring-foreground/25" : "ring-foreground/12",
                  )}
                />
                <style href="miyuki-day-night-toggle" precedence="miyuki">{`
                  @keyframes miyuki-day-night-toggle-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
                `}</style>
              </span>
              {label != null && <span>{label}</span>}
            </>
          );
        }}
      </SwitchButton>
    </SwitchField>
  );
}
