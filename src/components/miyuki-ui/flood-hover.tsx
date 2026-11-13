"use client";

import { animate, motion, type Transition, useMotionValue, useReducedMotion } from "motion/react";
import { type ComponentProps, type FocusEvent, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

type Edge = "top" | "right" | "bottom" | "left";

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const DRAIN: Transition = { duration: 0.22, ease: [0.4, 0, 0.7, 0.2] };

const OFF: Record<Edge, { x: string; y: string }> = {
  top: { x: "0%", y: "-100%" },
  right: { x: "100%", y: "0%" },
  bottom: { x: "0%", y: "100%" },
  left: { x: "-100%", y: "0%" },
};

const PUSH: Record<Edge, { x: number; y: number }> = {
  top: { x: 0, y: 8 },
  right: { x: -8, y: 0 },
  bottom: { x: 0, y: -8 },
  left: { x: 8, y: 0 },
};

function edgeAt(el: HTMLElement, clientX: number, clientY: number): Edge {
  const r = el.getBoundingClientRect();
  const dx = (clientX - r.left) / r.width - 0.5;
  const dy = (clientY - r.top) / r.height - 0.5;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

export interface FloodHoverProps extends Omit<ComponentProps<"div">, "children"> {
  src: string;
  alt: string;
  children?: ReactNode;
  imageClassName?: string;
}

export function FloodHover({
  src,
  alt,
  children,
  imageClassName,
  className,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: FloodHoverProps) {
  const reduced = useReducedMotion() ?? false;
  const sheetX = useMotionValue(OFF.bottom.x);
  const sheetY = useMotionValue(OFF.bottom.y);
  const sheetOpacity = useMotionValue(0);
  const imageX = useMotionValue(0);
  const imageY = useMotionValue(0);
  const open = useRef(false);

  function flood(edge: Edge) {
    if (reduced) {
      sheetX.jump("0%");
      sheetY.jump("0%");
      animate(sheetOpacity, 1, { duration: 0.18 });
      open.current = true;
      return;
    }
    if (!open.current && !sheetX.isAnimating() && !sheetY.isAnimating()) {
      sheetX.jump(OFF[edge].x);
      sheetY.jump(OFF[edge].y);
    }
    open.current = true;
    sheetOpacity.jump(1);
    animate(sheetX, "0%", SETTLE);
    animate(sheetY, "0%", SETTLE);
    animate(imageX, PUSH[edge].x, SETTLE);
    animate(imageY, PUSH[edge].y, SETTLE);
  }

  function drain(edge: Edge) {
    open.current = false;
    if (reduced) {
      animate(sheetOpacity, 0, { duration: 0.12 });
      return;
    }
    animate(sheetX, OFF[edge].x, DRAIN);
    animate(sheetY, OFF[edge].y, DRAIN);
    animate(imageX, 0, SETTLE);
    animate(imageY, 0, SETTLE);
  }

  return (
    <div
      {...props}
      className={cn(
        "group/dah relative isolate overflow-clip rounded-2xl border border-border bg-muted shadow-sm",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType !== "touch") flood(edgeAt(e.currentTarget, e.clientX, e.clientY));
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.pointerType === "touch" || e.currentTarget.querySelector(":focus-visible")) return;
        drain(edgeAt(e.currentTarget, e.clientX, e.clientY));
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.pointerType !== "touch") return;
        const onControl =
          e.target instanceof Element && e.target.closest("a, button, input, select, textarea, [role=button]");
        if (!open.current) flood("bottom");
        else if (!onControl) drain("bottom");
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (e.target instanceof HTMLElement && e.target.matches(":focus-visible") && !open.current) flood("bottom");
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (
          !e.currentTarget.contains(e.relatedTarget as Node | null) &&
          open.current &&
          !e.currentTarget.matches(":hover")
        )
          drain("bottom");
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        draggable={false}
        style={{ x: imageX, y: imageY, scale: 1.06 }}
        className={cn("absolute inset-0 -z-10 size-full object-cover", imageClassName)}
      />
      <motion.div
        style={{ x: sheetX, y: sheetY, opacity: sheetOpacity }}
        className={cn(
          "absolute inset-0 flex flex-col justify-end p-5 backdrop-blur-[6px]",
          "bg-brand/70 text-brand-foreground dark:bg-brand-soft/80 dark:text-foreground",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-brand-strong/90 from-15% via-brand-strong/65 via-50% to-transparent dark:from-background/70 dark:via-background/35"
        />
        {children}
      </motion.div>
    </div>
  );
}
