"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ComponentProps, FocusEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";

const SETTLE = { stiffness: 420, damping: 34 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface SheenCardProps extends ComponentProps<"div"> {
  maxTilt?: number;
  glare?: number;
  sheen?: boolean;
}

export function SheenCard({
  maxTilt = 8,
  glare = 0.5,
  sheen = true,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: SheenCardProps) {
  const reduced = useReducedMotion() ?? false;
  const px = useSpring(0.5, SETTLE);
  const py = useSpring(0.5, SETTLE);
  const lit = useSpring(0, SETTLE);

  const rotateY = useTransform(px, (v) => (reduced ? 0 : (v - 0.5) * 2 * maxTilt));
  const rotateX = useTransform(py, (v) => (reduced ? 0 : (0.5 - v) * 2 * maxTilt));
  const bandX = useTransform(px, (v) => `${((v - 0.5) * 34).toFixed(2)}%`);
  const bandY = useTransform(py, (v) => `${((v - 0.5) * 34).toFixed(2)}%`);
  const sheenX = useTransform(px, (v) => `${((0.5 - v) * 12).toFixed(2)}%`);
  const sheenY = useTransform(py, (v) => `${((0.5 - v) * 12).toFixed(2)}%`);
  const bandOpacity = useTransform(lit, (v) => v * Math.min(1, Math.max(0, glare)));
  const sheenOpacity = useTransform(lit, (v) => 0.04 + v * 0.035);

  function aim(el: HTMLElement, x: number, y: number) {
    if (reduced) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    px.set(clamp01((x - rect.left) / rect.width));
    py.set(clamp01((y - rect.top) / rect.height));
  }

  function rest() {
    px.set(0.5);
    py.set(0.5);
    lit.set(0);
  }

  const mouse = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <div
      {...props}
      className={cn("group/glare [perspective:900px]", className)}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!mouse(e)) return;
        aim(e.currentTarget, e.clientX, e.clientY);
        lit.set(1);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (mouse(e)) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (mouse(e) && !e.currentTarget.querySelector(":focus-visible")) rest();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        if (!reduced) {
          px.set(0.3);
          py.set(0.25);
        }
        lit.set(1);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
    >
      <motion.div
        style={{ rotateX, rotateY }}
        className={cn(
          "relative isolate aspect-[3/4] w-full overflow-clip rounded-2xl border border-foreground/10 bg-muted shadow-md",
          "transition-shadow duration-300 ease-settle group-hover/glare:shadow-xl group-has-[:focus-visible]/glare:shadow-xl",
          "group-has-[:focus-visible]/glare:ring-[3px] group-has-[:focus-visible]/glare:ring-ring",
        )}
      >
        {children}
        {sheen ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-full"
            style={{
              x: sheenX,
              y: sheenY,
              opacity: sheenOpacity,
              backgroundImage:
                "linear-gradient(125deg, transparent 30%, var(--chart-2) 42%, var(--brand) 50%, var(--chart-3) 58%, transparent 70%)",
            }}
          />
        ) : null}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-full mix-blend-soft-light"
          style={{
            x: bandX,
            y: bandY,
            opacity: bandOpacity,
            backgroundImage:
              "linear-gradient(115deg, transparent 37%, rgb(255 255 255 / 0.35) 44%, rgb(255 255 255 / 0.75) 47.5%, rgb(255 255 255 / 1) 50%, rgb(255 255 255 / 0.75) 52.5%, rgb(255 255 255 / 0.35) 56%, transparent 63%)",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-full"
          style={{
            x: bandX,
            y: bandY,
            opacity: bandOpacity,
            backgroundImage:
              "linear-gradient(115deg, transparent 44.5%, rgb(255 255 255 / 0.18) 47.5%, rgb(255 255 255 / 0.42) 49.6%, rgb(255 255 255 / 0.5) 50%, rgb(255 255 255 / 0.42) 50.4%, rgb(255 255 255 / 0.18) 52.5%, transparent 55.5%)",
          }}
        />
      </motion.div>
    </div>
  );
}
