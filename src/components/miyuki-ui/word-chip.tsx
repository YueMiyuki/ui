"use client";

import {
  AnimatePresence,
  animate,
  motion,
  type Transition,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface WordChipProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  words: string[];
  duration?: number;
  ref?: Ref<HTMLSpanElement>;
}

const grow: Transition = { type: "spring", stiffness: 300, damping: 32 };
const arrive: Transition = { type: "spring", stiffness: 320, damping: 30, delay: 0.05 };
const leave: Transition = { duration: 0.24, ease: [0.4, 0, 1, 1] };

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export function WordChip({ text, words, duration = 3000, className, ref, ...props }: WordChipProps) {
  const own = useRef<HTMLSpanElement>(null);
  const lead = useRef<HTMLSpanElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const breakRef = useRef<HTMLBRElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[] | null>(null);
  const [ownLine, setOwnLine] = useState(false);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { amount: 0.4 });
  const width = useMotionValue<number | string>("auto");
  const placed = useRef(false);
  const list = words.length > 0 ? words : [""];
  const current = index % list.length;
  const key = list.join("\u0000");
  const target = widths?.[current];

  useEffect(() => {
    const box = measure.current;
    const root = own.current;
    if (!box || !root) return;
    const items = Array.from(box.children) as HTMLElement[];
    let block = root.parentElement;
    while (block && /^(inline|contents)$/.test(getComputedStyle(block).display)) block = block.parentElement;

    const read = () => {
      const next = items.map((el) => parseFloat(getComputedStyle(el).width) || 0);
      setWidths(next);
      const node = lead.current?.firstChild;
      const frame = chip.current;
      const slot = slotRef.current;
      if (!node || !frame || !slot) return;
      const width = slot.style.width;
      const br = breakRef.current;
      slot.style.width = `${Math.max(0, ...next)}px`;
      if (br) br.style.display = "none";
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, (node.textContent ?? "").trimEnd().length);
      const lines = range.getClientRects();
      const last = lines[lines.length - 1];
      const rect = frame.getBoundingClientRect();
      slot.style.width = width;
      if (br) br.style.display = "";
      if (last) setOwnLine(rect.top + rect.height / 2 > last.bottom);
    };
    const observer = new ResizeObserver(read);
    for (const el of items) observer.observe(el);
    if (block) observer.observe(block);
    return () => observer.disconnect();
  }, [key, text]);

  useEffect(() => {
    if (target === undefined) return;
    if (!placed.current || reduced) {
      placed.current = true;
      width.jump(target);
      return;
    }
    const controls = animate(width, target, grow);
    return () => controls.stop();
  }, [target, reduced, width]);

  useEffect(() => {
    if (reduced || !inView || list.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % list.length), Math.max(600, duration));
    return () => clearTimeout(id);
  }, [index, inView, reduced, duration, list.length]);

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative", className)}>
      <span className="sr-only">
        {text} {words.join(", ")}
      </span>
      <span ref={lead} aria-hidden="true">
        {`${text} `}
      </span>
      {ownLine ? <br ref={breakRef} /> : null}
      <span
        ref={chip}
        aria-hidden="true"
        className={cn(
          "inline-block rounded-lg border border-border bg-card align-baseline shadow-sm",
          ownLine && "mt-[0.22em]",
        )}
      >
        <span
          className={cn(
            "inline-block px-3 align-baseline [clip-path:inset(0_round_9px)]",
            "supports-[text-box:trim-both_cap_alphabetic]:pt-[0.17em] supports-[text-box:trim-both_cap_alphabetic]:pb-[0.27em]",
          )}
        >
          <motion.span
            ref={slotRef}
            className="relative inline-block whitespace-nowrap align-baseline [text-box:trim-both_cap_alphabetic]"
            style={{ width }}
          >
            <span className="invisible">{list[current]}</span>
            <AnimatePresence initial={false}>
              <motion.span
                key={current}
                className="absolute top-0 left-0 [text-box:trim-both_cap_alphabetic]"
                initial={{ y: "0.6em", opacity: 0, filter: "blur(6px)" }}
                animate={{ y: "0em", opacity: 1, filter: "blur(0px)", transition: arrive }}
                exit={{ y: "-0.6em", opacity: 0, filter: "blur(4px)", transition: leave }}
              >
                {list[current]}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </span>
      </span>
      <span
        ref={measure}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden whitespace-nowrap"
      >
        {list.map((word, i) => (
          <span key={i} className="block w-max">
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}
