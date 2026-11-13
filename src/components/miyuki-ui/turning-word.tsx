"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TurningWordProps extends Omit<ComponentProps<"span">, "children"> {
  words: string[];
  interval?: number;
  animationDuration?: number;
  ref?: Ref<HTMLSpanElement>;
}

interface Turn {
  duration: number;
  delay: number;
}

const AXIS = "50% 50% -0.5em";
const TURN = [0.62, 0, 0.32, 1] as const;
const LAND = [0.62, 0, 0.28, 1.22] as const;

const word: Variants = {
  away: (t: Turn) => ({
    rotateX: 90,
    opacity: [1, 1, 0],
    transition: {
      rotateX: { duration: t.duration * 0.7, ease: TURN },
      opacity: { duration: t.duration * 0.7, times: [0, 0.55, 1], ease: "linear" },
    },
  }),
};

const letter: Variants = {
  below: { rotateX: -90, opacity: 0 },
  shown: (t: Turn) => ({
    rotateX: 0,
    opacity: 1,
    transition: {
      rotateX: { delay: t.delay, duration: t.duration * 0.78, ease: LAND },
      opacity: { delay: t.delay, duration: t.duration * 0.35, ease: [0.2, 0.6, 0.4, 1] },
    },
  }),
};

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function Letters({ text }: { text: string }) {
  return Array.from(text).map((ch, i) => (
    <span key={i} className="inline-block">
      {ch}
    </span>
  ));
}

export function TurningWord({
  words,
  interval = 3000,
  animationDuration = 0.6,
  className,
  ref,
  ...props
}: TurningWordProps) {
  const own = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[] | null>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { amount: 0.5 });
  const width = useMotionValue<number | string>("auto");
  const list = words.length > 0 ? words : [""];
  const current = index % list.length;
  const text = list[current];
  const key = list.join("\u0000");
  const target = widths?.[current];
  const duration = Math.max(0.2, animationDuration);

  useEffect(() => {
    const box = measure.current;
    if (!box) return;
    const items = Array.from(box.children) as HTMLElement[];
    const read = () => setWidths(items.map((el) => parseFloat(getComputedStyle(el).width) || 0));
    const observer = new ResizeObserver(read);
    for (const el of items) observer.observe(el);
    return () => observer.disconnect();
  }, [key]);

  useEffect(() => {
    if (target === undefined) return;
    if (!placed.current || reduced) {
      placed.current = true;
      width.jump(target);
      return;
    }
    const controls = animate(width, target, {
      type: "spring",
      duration: duration * 0.9,
      bounce: 0.28,
      delay: duration * 0.12,
    });
    return () => controls.stop();
  }, [target, reduced, width, duration]);

  useEffect(() => {
    if (reduced || !inView || list.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % list.length), Math.max(duration * 1000 + 400, interval));
    return () => clearTimeout(id);
  }, [index, inView, reduced, interval, duration, list.length]);

  const chars = Array.from(text);
  const stagger = Math.min(0.035, (duration * 0.3) / Math.max(1, chars.length));

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block align-baseline", className)}>
      <span className="sr-only">{list.join(", ")}</span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block rounded-lg bg-muted px-3 align-baseline [clip-path:inset(0_round_var(--radius-lg,10px))]",
          "shadow-[inset_0_1px_2px_oklch(0.42_0.09_250/0.16),inset_0_0_0_1px_oklch(0.42_0.09_250/0.06)]",
          "dark:shadow-[inset_0_1px_3px_oklch(0.05_0.02_250/0.7),inset_0_0_0_1px_oklch(0.05_0.02_250/0.35)]",
        )}
      >
        <motion.span
          className="relative inline-block align-baseline whitespace-pre [perspective:4.5em]"
          style={{ width }}
        >
          <span className="invisible">
            <Letters text={text} />
          </span>
          <AnimatePresence initial={false} custom={{ duration, delay: 0 }}>
            <motion.span
              key={`${current}:${text}`}
              className="absolute top-0 left-0 whitespace-pre [backface-visibility:hidden] [transform-style:preserve-3d]"
              style={{ transformOrigin: AXIS }}
              custom={{ duration, delay: 0 }}
              variants={word}
              initial="below"
              animate="shown"
              exit="away"
            >
              {chars.map((ch, i) => (
                <motion.span
                  key={i}
                  custom={{ duration, delay: i * stagger }}
                  variants={letter}
                  className="inline-block [backface-visibility:hidden]"
                  style={{ transformOrigin: AXIS }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </span>
      <span
        ref={measure}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden whitespace-pre"
      >
        {list.map((w, i) => (
          <span key={i} className="block w-max">
            <Letters text={w} />
          </span>
        ))}
      </span>
    </span>
  );
}
