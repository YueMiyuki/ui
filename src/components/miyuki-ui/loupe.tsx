"use client";

import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ComponentProps, type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LoupeProps extends ComponentProps<"div"> {
  zoom?: number;
  size?: number;
  static?: boolean;
  position?: { x: number; y: number };
  hovering?: boolean;
  onHoveringChange?: (hovering: boolean) => void;
  eager?: boolean;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

export function Loupe({
  zoom = 1.6,
  size = 170,
  static: pinned = false,
  position,
  hovering,
  onHoveringChange,
  eager = true,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}: LoupeProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [inside, setInside] = useState(false);
  const [primed, setPrimed] = useState(false);
  const px = useMotionValue(position?.x ?? 0);
  const py = useMotionValue(position?.y ?? 0);
  const half = size / 2;

  const lensX = useTransform(px, (v) => v - half);
  const lensY = useTransform(py, (v) => v - half);
  const viewX = useTransform(px, (v) => half / zoom - v);
  const viewY = useTransform(py, (v) => half / zoom - v);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !eager) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setPrimed(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!pinned) return;
    px.set(position?.x ?? box.width / 2);
    py.set(position?.y ?? box.height / 2);
  }, [pinned, position?.x, position?.y, box.width, box.height, px, py]);

  const shown = pinned || (hovering ?? inside);

  function track(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set(e.clientX - rect.left);
    py.set(e.clientY - rect.top);
  }

  function set(next: boolean) {
    setInside(next);
    onHoveringChange?.(next);
  }

  return (
    <div
      {...props}
      ref={root}
      data-hovering={shown || undefined}
      className={cn(
        "relative isolate overflow-clip",
        !pinned && "touch-none [@media(pointer:fine)]:data-[hovering]:cursor-none",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (pinned || e.pointerType === "touch") return;
        track(e);
        set(true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!pinned) track(e);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (!pinned && e.pointerType !== "touch") set(false);
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (pinned || e.pointerType !== "touch") return;
        track(e);
        set(true);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        if (!pinned && e.pointerType === "touch") set(false);
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        if (!pinned && e.pointerType === "touch") set(false);
      }}
    >
      {children}
      {(shown || primed) && box.width > 0 ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 overflow-hidden rounded-full bg-background shadow-xl"
          style={{ width: size, height: size, x: lensX, y: lensY }}
          initial={{ opacity: 0.001, scale: reduced ? 1 : 0.9 }}
          animate={{ opacity: shown ? 1 : 0.001, scale: shown || reduced ? 1 : 0.92 }}
          transition={shown ? (reduced ? { duration: 0.15 } : SETTLE) : { duration: 0.12 }}
        >
          <motion.div
            inert
            className="absolute top-0 left-0"
            style={{ width: box.width, height: box.height, x: viewX, y: viewY, zoom }}
          >
            {children}
          </motion.div>
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,transparent_84%,oklch(1_0_0/0.16)_91%,oklch(0.8_0.08_225/0.2)_95%,oklch(0.25_0.05_250/0.18)_98.5%,transparent_100%)]" />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_42%_30%_at_32%_20%,oklch(1_0_0/0.22),transparent_72%)]" />
          <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1.5px_oklch(1_0_0/0.7),inset_0_0_0_2.5px_oklch(0.3_0.04_250/0.12)]" />
        </motion.div>
      ) : null}
    </div>
  );
}
