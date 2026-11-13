"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ComponentProps, FocusEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";

export type FloatingCardTone = "water" | "seafoam" | "wisteria" | "ink";

const FLOAT = { stiffness: 190, damping: 24, mass: 0.9 };
const DRIFT = 12;
const COUNTER = 0.35;

const TONES: Record<FloatingCardTone, string> = {
  water:
    "[--miyuki-floating-card-field:oklch(0.455_0.105_246)] [--miyuki-floating-card-blob:oklch(0.74_0.11_226)] dark:[--miyuki-floating-card-field:oklch(0.42_0.105_246)] dark:[--miyuki-floating-card-blob:oklch(0.64_0.12_230)]",
  seafoam:
    "[--miyuki-floating-card-field:oklch(0.45_0.075_194)] [--miyuki-floating-card-blob:oklch(0.8_0.1_172)] dark:[--miyuki-floating-card-field:oklch(0.41_0.07_194)] dark:[--miyuki-floating-card-blob:oklch(0.68_0.1_176)]",
  wisteria:
    "[--miyuki-floating-card-field:oklch(0.455_0.125_292)] [--miyuki-floating-card-blob:oklch(0.76_0.12_302)] dark:[--miyuki-floating-card-field:oklch(0.4_0.11_292)] dark:[--miyuki-floating-card-blob:oklch(0.64_0.13_300)]",
  ink: "[--miyuki-floating-card-field:oklch(0.27_0.04_250)] [--miyuki-floating-card-blob:oklch(0.5_0.09_238)] dark:[--miyuki-floating-card-field:oklch(0.27_0.045_250)] dark:[--miyuki-floating-card-blob:oklch(0.45_0.09_238)]",
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

export interface FloatingCardProps extends ComponentProps<"div"> {
  tone?: FloatingCardTone;
  containerClassName?: string;
}

export function FloatingCard({
  tone = "water",
  containerClassName,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: FloatingCardProps) {
  const reduced = useReducedMotion() ?? false;
  const x = useSpring(0, FLOAT);
  const y = useSpring(0, FLOAT);
  const scale = useSpring(1, FLOAT);
  const glow = useSpring(0, FLOAT);
  const innerX = useTransform(x, (v) => -v * COUNTER);
  const innerY = useTransform(y, (v) => -v * COUNTER);
  const blobOpacity = useTransform(glow, [0, 1], [0.55, 0.8]);

  function drift(el: HTMLElement, cx: number, cy: number) {
    // measured on the outer box, which does not move, so the drift cannot feed back
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = Math.min(1, Math.max(-1, ((cx - rect.left) / rect.width - 0.5) * 2));
    const ny = Math.min(1, Math.max(-1, ((cy - rect.top) / rect.height - 0.5) * 2));
    x.set(nx * DRIFT);
    y.set(ny * DRIFT);
  }

  function rest() {
    x.set(0);
    y.set(0);
    scale.set(1);
    glow.set(0);
  }

  const mouse = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <div
      {...props}
      className={cn("relative flex hover:z-10 focus-within:z-10", containerClassName)}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!mouse(e)) return;
        glow.set(1);
        if (reduced) return;
        scale.set(1.02);
        drift(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (mouse(e) && !reduced) drift(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (mouse(e)) rest();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        glow.set(1);
        if (!reduced) {
          scale.set(1.02);
          y.set(-4);
        }
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
    >
      <motion.div
        style={{ x, y, scale }}
        className={cn(
          "relative isolate flex flex-1 overflow-clip rounded-2xl bg-(--miyuki-floating-card-field) shadow-md",
          TONES[tone],
        )}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-44 -bottom-44 -z-10 size-[30rem] rounded-full"
          style={{
            opacity: blobOpacity,
            background:
              "radial-gradient(closest-side, var(--miyuki-floating-card-blob), color-mix(in oklab, var(--miyuki-floating-card-blob) 40%, transparent) 55%, transparent)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
        />
        <motion.div
          style={{ x: innerX, y: innerY }}
          className={cn("dark relative flex-1 p-6 text-foreground sm:p-8", className)}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
