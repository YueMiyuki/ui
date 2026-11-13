"use client";

import {
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SlidingColumnsProps extends Omit<ComponentProps<"div">, "children"> {
  images: string[];
  columns?: number;
  strength?: number;
  height?: string;
}

export function SlidingColumns({
  images,
  columns = 3,
  strength = 200,
  height = "40rem",
  className,
  style,
  "aria-label": ariaLabel = "Photo wall",
  ...props
}: SlidingColumnsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const half = useMotionValue(0);
  const { scrollY, scrollYProgress } = useScroll({ container: ref });
  const velocity = useVelocity(scrollY);
  const drag = useTransform(velocity, [-2600, 0, 2600], [-1, 0, 1]);
  const lean = useSpring(drag, { stiffness: 180, damping: 26, mass: 0.8 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => half.set(el.clientHeight / 2));
    observer.observe(el);
    return () => observer.disconnect();
  }, [half]);

  const count = Math.max(1, Math.round(columns));
  const groups = Array.from({ length: count }, (_, c) => images.filter((_, i) => i % count === c));

  return (
    <div
      {...props}
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      style={{ height, ...style }}
      className={cn(
        "relative overflow-y-auto overscroll-contain outline-none [scrollbar-width:thin]",
        "[mask-image:linear-gradient(to_bottom,transparent,#000_2.5rem,#000_calc(100%-2.5rem),transparent)]",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      <div className="flex flex-col overflow-clip">
        <div
          className="grid gap-3 p-3 sm:gap-4 sm:p-4"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, marginBottom: -strength }}
        >
          {groups.map((group, c) => {
            const edge = Math.min(c, count - 1 - c);
            const fast = count <= 2 ? c % 2 === 0 : edge % 2 === 0;
            return (
              <Column
                key={c}
                images={group}
                offset={c}
                fast={fast}
                strength={strength}
                progress={scrollYProgress}
                scrollY={scrollY}
                half={half}
                lean={lean}
                reduced={reduced}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Column({
  images,
  offset,
  fast,
  strength,
  progress,
  scrollY,
  half,
  lean,
  reduced,
}: {
  images: string[];
  offset: number;
  fast: boolean;
  strength: number;
  progress: MotionValue<number>;
  scrollY: MotionValue<number>;
  half: MotionValue<number>;
  lean: MotionValue<number>;
  reduced: boolean;
}) {
  const y = useTransform(progress, [0, 1], fast ? [0, -strength] : [-strength, 0]);
  const rotate = useTransform(lean, (v) => v * (fast ? 1.8 : 1.1));
  const transformOrigin = useTransform(() => `50% ${scrollY.get() + half.get() - y.get()}px`);

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3 will-change-transform sm:gap-4"
      style={reduced ? { y: fast ? -strength : 0 } : { y, rotate, transformOrigin }}
    >
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full rounded-xl bg-muted object-cover shadow-xs",
            (i + offset) % 2 === 0 ? "aspect-[4/5]" : "aspect-square",
          )}
        />
      ))}
    </motion.div>
  );
}
