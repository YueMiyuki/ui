"use client";

import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface EdgeGlintProps extends ComponentProps<"div"> {
  spread?: number;
  proximity?: number;
  inactiveZone?: number;
  borderWidth?: number;
  blur?: number;
  colors?: string[];
  disabled?: boolean;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];

type Watcher = (x: number, y: number) => void;
const watchers = new Set<Watcher>();
let pointerX = Number.NaN;
let pointerY = Number.NaN;
let pending = 0;

function flush() {
  pending = 0;
  for (const watcher of watchers) watcher(pointerX, pointerY);
}
function schedule() {
  if (!pending) pending = requestAnimationFrame(flush);
}
function onPointerMove(event: PointerEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  schedule();
}
function onPointerGone() {
  pointerX = Number.NaN;
  pointerY = Number.NaN;
  schedule();
}

function watch(watcher: Watcher) {
  if (watchers.size === 0) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onPointerGone);
  }
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
    if (watchers.size > 0) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("scroll", schedule, { capture: true });
    document.documentElement.removeEventListener("pointerleave", onPointerGone);
    cancelAnimationFrame(pending);
    pending = 0;
  };
}

const RING: CSSProperties = {
  maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
  WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
  maskClip: "content-box, border-box",
  WebkitMaskClip: "content-box, border-box",
  maskComposite: "exclude",
  WebkitMaskComposite: "xor",
};

export function EdgeGlint({
  spread = 40,
  proximity = 64,
  inactiveZone = 0.5,
  borderWidth = 1.5,
  blur = 0,
  colors = DEFAULT_COLORS,
  disabled = false,
  className,
  style,
  ...props
}: EdgeGlintProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const target = useMotionValue(0);
  const angle = useSpring(target, { stiffness: 190, damping: 26, mass: 0.9 });
  const opacity = useMotionValue(0);
  const arc = Math.min(360, Math.max(4, spread));
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const stops = palette.map((c, i) => `${c} ${(((i + 1) / (palette.length + 1)) * arc).toFixed(2)}deg`).join(", ");
  const from = useMotionTemplate`${angle}deg`;
  const gradient = `conic-gradient(from calc(var(--miyuki-edge-glint-angle) - ${arc / 2}deg) at 50% 50%, transparent 0deg, ${stops}, transparent ${arc}deg, transparent 360deg)`;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    let lit = false;
    let fade: ReturnType<typeof animate> | null = null;
    const light = (on: boolean) => {
      if (on === lit) return;
      lit = on;
      fade?.stop();
      fade = animate(opacity, on ? 1 : 0, { duration: on ? 0.2 : 0.32, ease: [0.22, 1, 0.36, 1] });
    };
    const stop = watch((x, y) => {
      if (Number.isNaN(x)) return light(false);
      const box = el.getBoundingClientRect();
      const near =
        x >= box.left - proximity &&
        x <= box.right + proximity &&
        y >= box.top - proximity &&
        y <= box.bottom + proximity;
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      const calm = Math.hypot(dx, dy) < (Math.min(box.width, box.height) / 2) * inactiveZone;
      if (!near || calm) return light(false);
      const toward = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const current = target.get();
      const next = current + ((((toward - current) % 360) + 540) % 360) - 180;
      if (!lit || reduce) {
        target.jump(next);
        angle.jump(next);
      } else {
        target.set(next);
      }
      light(true);
    });
    return () => {
      stop();
      fade?.stop();
      opacity.set(0);
    };
  }, [disabled, proximity, inactiveZone, reduce, target, angle, opacity]);

  if (disabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute -inset-px rounded-[inherit]", className)}
      style={style}
      {...props}
    >
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{ opacity, "--miyuki-edge-glint-angle": from } as unknown as CSSProperties}
      >
        {blur > 0 ? (
          <div
            className="absolute inset-0 rounded-[inherit] opacity-50 dark:opacity-90"
            style={{ filter: `blur(${blur}px)` }}
          >
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{ ...RING, padding: borderWidth + blur / 3, backgroundImage: gradient }}
            />
          </div>
        ) : null}
        <div
          className="absolute inset-0 rounded-[inherit]"
          style={{ ...RING, padding: borderWidth, backgroundImage: gradient }}
        />
      </motion.div>
    </div>
  );
}
