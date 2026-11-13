"use client";

import {
  AnimatePresence,
  animate,
  motion,
  type Transition,
  useInView,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface EvaporatingWordProps extends Omit<ComponentProps<"span">, "children"> {
  words: string[];
  interval?: number;
  ref?: Ref<HTMLSpanElement>;
}

interface Drift {
  enter: number;
  leave: number;
  x: string;
  y: string;
}

const resize: Transition = { type: "spring", stiffness: 240, damping: 30, delay: 0.14 };

const letter: Variants = {
  below: { opacity: 0, y: "0.34em", x: "0em", scale: 0.96, filter: "blur(0.14em)" },
  shown: (d: Drift) => ({
    opacity: 1,
    y: "0em",
    x: "0em",
    scale: 1,
    filter: "blur(0em)",
    transition: { delay: d.enter, duration: 0.56, ease: [0.22, 1, 0.36, 1] },
  }),
  gone: (d: Drift) => ({
    opacity: 0,
    y: d.y,
    x: d.x,
    scale: 1.08,
    filter: "blur(0.18em)",
    transition: {
      delay: d.leave,
      duration: 0.62,
      ease: [0.33, 0, 0.67, 1],
      opacity: { delay: d.leave + 0.06, duration: 0.5, ease: [0.4, 0, 1, 1] },
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

function drift(word: string, i: number, count: number, after: number): Drift {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(word.length + 5, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  const r = ((h >>> 0) % 1000) / 1000;
  return {
    enter: Math.max(0, after - 1) * 0.04 + 0.12 + i * 0.045,
    leave: (count - 1 - i) * 0.04,
    x: `${((r - 0.5) * 0.12).toFixed(3)}em`,
    y: `${(-0.42 - r * 0.16).toFixed(3)}em`,
  };
}

function Letters({ word }: { word: string }) {
  const chars = Array.from(word);
  return chars.map((ch, i) => (
    <span key={i} className="inline-block">
      {ch}
    </span>
  ));
}

export function EvaporatingWord({ words, interval = 3000, className, ref, ...props }: EvaporatingWordProps) {
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
  const word = list[current];
  const key = list.join("\u0000");
  const target = widths?.[current];

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
    const controls = animate(width, target, resize);
    return () => controls.stop();
  }, [target, reduced, width]);

  useEffect(() => {
    if (reduced || !inView || list.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % list.length), Math.max(1200, interval));
    return () => clearTimeout(id);
  }, [index, inView, reduced, interval, list.length]);

  const chars = Array.from(word);
  const before = Array.from(list[(current + list.length - 1) % list.length]).length;

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block align-baseline", className)}>
      <span className="sr-only">{list.join(", ")}</span>
      <motion.span aria-hidden="true" className="relative inline-block align-baseline whitespace-pre" style={{ width }}>
        <span className="invisible">
          <Letters word={word} />
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={`${current}:${word}`}
            className="absolute top-0 left-0 whitespace-pre"
            initial="below"
            animate="shown"
            exit="gone"
          >
            {chars.map((ch, i) => (
              <motion.span
                key={i}
                custom={drift(word, i, chars.length, before)}
                variants={letter}
                className="inline-block will-change-[transform,opacity,filter]"
              >
                {ch}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <span
        ref={measure}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden whitespace-pre"
      >
        {list.map((w, i) => (
          <span key={i} className="block w-max">
            <Letters word={w} />
          </span>
        ))}
      </span>
    </span>
  );
}
