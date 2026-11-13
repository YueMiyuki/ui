"use client";

import { GripVertical } from "lucide-react";
import { motion, useMotionValue } from "motion/react";
import { type KeyboardEvent, useRef } from "react";
import { RefractingGlass } from "@/components/miyuki-ui/refracting-glass";
import { landscape } from "@/registry/lib/art";

const day = landscape("hold-it-up", { width: 1600, height: 900, mood: "snow" });
const night = landscape("hold-it-up", { width: 1600, height: 900, mood: "night" });
const links = ["Forecast", "Maps", "Journal"];

export default function RefractingGlassDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const nudge = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 48 : 16;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    const box = stage.current?.getBoundingClientRect();
    const own = glass.current?.getBoundingClientRect();
    if (!move || !box || !own) return;
    event.preventDefault();
    const dx = Math.min(box.right - own.right, Math.max(box.left - own.left, move[0]));
    const dy = Math.min(box.bottom - own.bottom, Math.max(box.top - own.top, move[1]));
    x.set(x.get() + dx);
    y.set(y.get() + dy);
  };

  return (
    <div ref={stage} className="relative isolate size-full overflow-hidden">
      <img src={day} alt="" className="absolute inset-0 size-full object-cover dark:hidden" />
      <img src={night} alt="" className="absolute inset-0 hidden size-full object-cover dark:block" />
      <div className="pointer-events-none absolute inset-x-0 top-[24%] flex flex-col items-center px-4">
        <h2 className="px-2 text-center font-display text-5xl leading-[1.04] font-semibold tracking-[-0.025em] text-balance select-none sm:text-7xl">
          Hold it up to the light
        </h2>
        <motion.div
          ref={glass}
          drag
          dragConstraints={stage}
          dragMomentum={false}
          dragElastic={0.06}
          style={{ x, y }}
          className="pointer-events-auto mt-12 cursor-grab touch-none active:cursor-grabbing sm:mt-16"
        >
          <RefractingGlass radius="pill" className="flex items-center gap-0.5 p-2">
            <button
              type="button"
              aria-label="Move the glass with the arrow keys"
              onKeyDown={nudge}
              className="grid h-10 w-7 place-items-center rounded-full text-foreground/70 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <GripVertical className="size-4" />
            </button>
            {links.map((label, index) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                draggable={false}
                aria-current={index === 0 ? "page" : undefined}
                onClick={(event) => event.preventDefault()}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-colors duration-150 select-none hover:bg-foreground/8 focus-visible:ring-[3px] focus-visible:ring-ring aria-[current=page]:bg-card/70 aria-[current=page]:shadow-xs dark:aria-[current=page]:bg-foreground/12 [@media(prefers-reduced-transparency:reduce)]:aria-[current=page]:bg-accent"
              >
                {label}
              </a>
            ))}
          </RefractingGlass>
        </motion.div>
      </div>
    </div>
  );
}
