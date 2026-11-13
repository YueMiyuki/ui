"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectionBoxProps extends ComponentProps<"span"> {
  children?: ReactNode;
  color?: string;
  delay?: number;
  rectangleClassName?: string;
  pointerClassName?: string;
}

const DRAW = 0.55;

export function SelectionBox({
  children,
  color = "var(--brand)",
  delay = 0.3,
  rectangleClassName,
  pointerClassName,
  className,
  style,
  ...props
}: SelectionBoxProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.8 });
  const arrive = delay + DRAW - 0.1;

  return (
    <span
      {...props}
      ref={ref}
      className={cn("relative inline-block", className)}
      style={{ "--miyuki-selection-box-color": color, ...style } as CSSProperties}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -inset-x-[0.14em] -inset-y-[0.02em]">
        <motion.span
          className={cn(
            "absolute top-0 left-0 border border-[var(--miyuki-selection-box-color)]",
            "bg-[color-mix(in_oklab,var(--miyuki-selection-box-color)_9%,transparent)]",
            rectangleClassName,
          )}
          initial={reduced ? { width: "100%", height: "100%", opacity: 0 } : { width: "0%", height: "0%", opacity: 0 }}
          animate={seen ? { width: "100%", height: "100%", opacity: 1 } : undefined}
          transition={
            reduced
              ? { opacity: { duration: 0.2, delay } }
              : {
                  width: { duration: DRAW, delay, ease: [0.22, 1, 0.36, 1] },
                  height: { duration: DRAW * 0.8, delay, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.08, delay },
                }
          }
        />
        <motion.span
          className={cn("absolute top-full left-full block", pointerClassName)}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 22, y: 26 }}
          animate={seen ? (reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: [1, 1, 0.84, 1] }) : undefined}
          transition={
            reduced
              ? { duration: 0.2, delay: delay + 0.1 }
              : {
                  opacity: { duration: 0.15, delay: arrive },
                  x: { type: "spring", stiffness: 260, damping: 26, delay: arrive },
                  y: { type: "spring", stiffness: 260, damping: 26, delay: arrive },
                  scale: { duration: 0.32, times: [0, 0.4, 0.65, 1], delay: arrive + 0.3, ease: "easeInOut" },
                }
          }
          style={{ originX: 0, originY: 0 }}
        >
          <svg
            viewBox="0 0 24 24"
            className="-mt-[0.1em] -ml-[0.1em] block size-[0.55em] min-h-4 min-w-4 drop-shadow-[0_1px_1.5px_oklch(0.25_0.05_250/0.35)]"
          >
            <path
              d="M4.2 3.1L19.6 9.2C20.5 9.6 20.4 10.9 19.5 11.2L13 13L11.2 19.5C10.9 20.4 9.6 20.5 9.2 19.6L3.1 4.2C2.8 3.5 3.5 2.8 4.2 3.1Z"
              fill="var(--miyuki-selection-box-color)"
              stroke="var(--card)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              paintOrder="stroke"
            />
          </svg>
        </motion.span>
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}
