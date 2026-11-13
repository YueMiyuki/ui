"use client";

import { motion, useMotionTemplate, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type FocusEvent, type PointerEvent, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MaskRevealProps extends ComponentProps<"div"> {
  reveal: ReactNode;
  size?: number;
  revealSize?: number;
  feather?: number;
}

const FOLLOW = { stiffness: 900, damping: 60, mass: 0.6 };
const GROW = { stiffness: 320, damping: 28, mass: 0.9 };

const LAYER = "col-start-1 row-start-1 flex items-center justify-center px-6 py-10 text-center";

export function MaskReveal({
  reveal,
  size = 24,
  revealSize = 320,
  feather = 2,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerDown,
  onPointerLeave,
  onPointerUp,
  onPointerCancel,
  onFocus,
  onBlur,
  ...props
}: MaskRevealProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const tracking = useRef(false);
  const reduce = useReducedMotion() ?? false;
  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);
  const radius = useSpring(0, GROW);
  const soft = Math.max(0, feather);
  const inner = useTransform(radius, (r) => Math.max(0, r - soft));
  const outer = useTransform(radius, (r) => Math.max(0.01, r));
  const mask = useMotionTemplate`radial-gradient(circle at ${x}px ${y}px, #000 ${inner}px, transparent ${outer}px)`;

  const setRadius = (r: number) => (reduce ? radius.jump(r) : radius.set(r));

  const follow = (e: PointerEvent<HTMLDivElement>, jump: boolean) => {
    const layer = revealRef.current;
    const base = baseRef.current;
    if (!layer || !base) return;
    const rect = layer.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (jump || reduce) {
      x.jump(px);
      y.jump(py);
    } else {
      x.set(px);
      y.set(py);
    }
    const target = e.target as Node;
    const over = target !== base && base.contains(target);
    setRadius((over ? revealSize : size) / 2);
  };

  const close = () => {
    tracking.current = false;
    setRadius(0);
  };

  return (
    <div
      tabIndex={0}
      role="group"
      {...props}
      className={cn(
        "relative grid touch-pan-y touch-pinch-zoom outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType === "touch") return;
        tracking.current = true;
        follow(e, radius.get() < 1);
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.pointerType !== "touch") return;
        tracking.current = true;
        follow(e, true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!tracking.current) {
          if (e.pointerType === "touch") return;
          tracking.current = true;
        }
        follow(e, false);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        if (e.pointerType === "touch") close();
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        close();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.currentTarget.matches(":focus-visible")) return;
        close();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        const layer = revealRef.current;
        if (e.target !== e.currentTarget || !layer || !e.currentTarget.matches(":focus-visible")) return;
        const { width, height } = layer.getBoundingClientRect();
        if (radius.get() < 1) {
          x.jump(width / 2);
          y.jump(height / 2);
        }
        const cx = x.get();
        const cy = y.get();
        setRadius(Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + soft + 2);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={baseRef} className={LAYER}>
        {children}
      </div>
      <motion.div
        ref={revealRef}
        className={cn(
          LAYER,
          "pointer-events-none rounded-[inherit] text-brand-foreground",
          "bg-[radial-gradient(130%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_86%,white),var(--brand)_50%,color-mix(in_oklab,var(--brand)_80%,var(--foreground)))]",
          "dark:bg-[radial-gradient(130%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_58%,var(--background)),color-mix(in_oklab,var(--brand)_36%,var(--background))_55%,color-mix(in_oklab,var(--brand)_22%,var(--background)))] dark:text-foreground",
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {reveal}
      </motion.div>
    </div>
  );
}
