"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ReactNode, type Ref, useEffect } from "react";
import {
  ProgressBar as AriaProgressBar,
  type ProgressBarProps as AriaProgressBarProps,
  composeRenderProps,
  Label,
  useLocale,
} from "react-aria-components";
import { cn } from "@/lib/utils";

const FILL = { type: "spring", stiffness: 500, damping: 30 } as const;

const keyframes = `
@keyframes miyuki-progress-sweep { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
@keyframes miyuki-progress-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-progress-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Keyframes() {
  return (
    <style href="miyuki-progress" precedence="miyuki">
      {keyframes}
    </style>
  );
}

export type ProgressBarSize = "sm" | "md";
export type ProgressBarTone = "brand" | "success" | "warning" | "destructive";

const tones: Record<ProgressBarTone, string> = {
  brand: "var(--brand)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
};

export interface ProgressBarProps extends Omit<AriaProgressBarProps, "children"> {
  label?: ReactNode;
  showValue?: boolean;
  size?: ProgressBarSize;
  tone?: ProgressBarTone;
  ref?: Ref<HTMLDivElement>;
}

export function ProgressBar({
  label,
  showValue = true,
  size = "md",
  tone = "brand",
  className,
  ...props
}: ProgressBarProps) {
  const reduce = useReducedMotion();
  const { direction } = useLocale();
  const rtl = direction === "rtl";
  const fill = tones[tone];

  return (
    <AriaProgressBar
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex w-full flex-col gap-1.5", cls))}
    >
      {({ percentage = 0, valueText, isIndeterminate }) => (
        <>
          <Keyframes />
          {(label != null || (showValue && !isIndeterminate)) && (
            <div className="flex items-baseline justify-between gap-4">
              {label != null ? <Label className="text-sm font-medium text-foreground">{label}</Label> : <span />}
              {showValue && !isIndeterminate && (
                <span className="text-sm text-muted-foreground tabular-nums">{valueText}</span>
              )}
            </div>
          )}
          <div
            aria-hidden="true"
            className={cn(
              "relative overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset",
              size === "md" ? "h-1.5" : "h-1",
            )}
          >
            {isIndeterminate ? (
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, transparent, ${fill} 35%, ${fill} 65%, transparent)`,
                }}
                className={cn(
                  "absolute inset-y-0 start-0 w-2/5 rounded-full",
                  "motion-safe:animate-[miyuki-progress-sweep_1.6s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
                  "motion-reduce:translate-x-[75%] motion-reduce:animate-[miyuki-progress-pulse_1.6s_ease-in-out_infinite]",
                  "rtl:-scale-x-100",
                )}
              />
            ) : (
              <motion.span
                className="absolute inset-y-0 -start-full w-[200%] rounded-full"
                style={{
                  backgroundColor: fill,
                  backgroundImage: `linear-gradient(to ${rtl ? "left" : "right"}, ${fill} calc(100% - 24px), oklch(from ${fill} calc(l + 0.07) calc(c + 0.02) h))`,
                }}
                initial={false}
                animate={{ x: `${((rtl ? 100 - percentage : percentage - 100) / 2).toFixed(3)}%` }}
                transition={reduce ? { duration: 0.12 } : FILL}
              />
            )}
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}

export type ProgressRingSize = "sm" | "md" | "lg";

const rings: Record<ProgressRingSize, { px: number; stroke: number }> = {
  sm: { px: 20, stroke: 2.5 },
  md: { px: 32, stroke: 3 },
  lg: { px: 56, stroke: 4.5 },
};

export interface ProgressRingProps extends Omit<AriaProgressBarProps, "children"> {
  size?: ProgressRingSize;
  showValue?: boolean;
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

function RingArc({ percentage, r, c, stroke }: { percentage: number; r: number; c: number; stroke: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(100 - percentage, FILL);
  const offset = useTransform(spring, (v) => Math.min(100, Math.max(0, v)));

  useEffect(() => {
    if (reduce) spring.jump(100 - percentage);
    else spring.set(100 - percentage);
  }, [percentage, reduce, spring]);

  return (
    <motion.circle
      cx={c}
      cy={c}
      r={r}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray="100 100"
      style={{ strokeDashoffset: offset }}
      initial={false}
      animate={{ opacity: percentage > 0 ? 1 : 0 }}
      transition={{ duration: 0.12 }}
    />
  );
}

export function ProgressRing({
  size = "md",
  showValue = false,
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: ProgressRingProps) {
  const { px, stroke } = rings[size];
  const r = (px - stroke) / 2;
  const c = px / 2;

  return (
    <AriaProgressBar
      {...props}
      aria-label={ariaLabel ?? label ?? "Progress"}
      className={composeRenderProps(className, (cls) =>
        cn("relative inline-grid shrink-0 place-items-center text-brand", cls),
      )}
      style={{ width: px, height: px }}
    >
      {({ percentage = 0, valueText, isIndeterminate }) => (
        <>
          <Keyframes />
          <svg
            width={px}
            height={px}
            viewBox={`0 0 ${px} ${px}`}
            fill="none"
            aria-hidden="true"
            className="col-start-1 row-start-1 -rotate-90"
          >
            <circle cx={c} cy={c} r={r} strokeWidth={stroke} className="stroke-border" />
            {isIndeterminate ? (
              <circle
                cx={c}
                cy={c}
                r={r}
                stroke="currentColor"
                strokeWidth={stroke}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="28 100"
                className={cn(
                  "origin-center [transform-box:view-box]",
                  "motion-safe:animate-[miyuki-progress-spin_0.9s_linear_infinite]",
                  "motion-reduce:animate-[miyuki-progress-pulse_1.6s_ease-in-out_infinite]",
                )}
              />
            ) : (
              <RingArc percentage={percentage} r={r} c={c} stroke={stroke} />
            )}
          </svg>
          {showValue && size === "lg" && !isIndeterminate && (
            <span className="col-start-1 row-start-1 text-xs font-medium text-foreground tabular-nums">
              {valueText}
            </span>
          )}
        </>
      )}
    </AriaProgressBar>
  );
}
