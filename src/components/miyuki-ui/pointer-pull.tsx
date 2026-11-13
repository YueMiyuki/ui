"use client";

import { type MotionStyle, motion, useMotionTemplate, useReducedMotion, useSpring } from "motion/react";
import { type HTMLAttributes, type Ref, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface PointerPullProps extends HTMLAttributes<HTMLSpanElement> {
  strength?: number;
  maxDistance?: number;
  inner?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

const PULL = { stiffness: 260, damping: 19, mass: 0.7 };
const INNER = 0.45;

const smooth = (t: number) => t * t * (3 - 2 * t);

export function PointerPull({
  strength = 0.35,
  maxDistance = 24,
  inner = false,
  className,
  style,
  children,
  ref,
  ...props
}: PointerPullProps) {
  const box = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, PULL);
  const y = useSpring(0, PULL);
  const ix = useSpring(0, PULL);
  const iy = useSpring(0, PULL);
  const innerTranslate = useMotionTemplate`${ix}px ${iy}px`;

  useEffect(() => {
    const el = box.current;
    if (!el || reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reach = Math.max(32, maxDistance * 2);
    const limit = Math.max(0, maxDistance);
    const k = Math.max(0, strength);
    let active = false;

    const release = () => {
      if (!active) return;
      active = false;
      x.set(0);
      y.set(0);
      ix.set(0);
      iy.set(0);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      const outside = Math.hypot(Math.max(0, Math.abs(dx) - r.width / 2), Math.max(0, Math.abs(dy) - r.height / 2));
      if (outside >= reach) {
        release();
        return;
      }
      active = true;
      const grip = smooth(1 - outside / reach);
      let px = dx * k;
      let py = dy * k;
      const length = Math.hypot(px, py);
      if (length > limit) {
        px *= limit / length;
        py *= limit / length;
      }
      x.set(px * grip);
      y.set(py * grip);
      if (inner) {
        ix.set(px * grip * INNER);
        iy.set(py * grip * INNER);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      x.jump(0);
      y.jump(0);
      ix.jump(0);
      iy.jump(0);
    };
  }, [strength, maxDistance, inner, reduce, x, y, ix, iy]);

  const setRef = useCallback(
    (el: HTMLSpanElement | null) => {
      box.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <span {...props} ref={setRef} className={cn("relative inline-flex", className)} style={style}>
      <motion.span
        className={cn("inline-flex", inner && "[&>*>*]:[translate:var(--miyuki-pointer-pull-inner)]")}
        style={{ x, y, "--miyuki-pointer-pull-inner": innerTranslate } as unknown as MotionStyle}
      >
        {children}
      </motion.span>
    </span>
  );
}
