"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type ComponentProps, type PointerEvent, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export interface NameTagCursorProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
  color?: string;
  children?: ReactNode;
}

const TIGHT = { stiffness: 1100, damping: 64, mass: 0.5 };
const TOW = { stiffness: 210, damping: 21, mass: 0.6 };
const FILL = { type: "spring", stiffness: 500, damping: 30 } as const;

function Pointer({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      className="block drop-shadow-[0_1px_1.5px_oklch(0.25_0.05_250/0.35)]"
    >
      <path
        d="M4.2 3.1L19.6 9.2C20.5 9.6 20.4 10.9 19.5 11.2L13 13L11.2 19.5C10.9 20.4 9.6 20.5 9.2 19.6L3.1 4.2C2.8 3.5 3.5 2.8 4.2 3.1Z"
        fill={color}
        stroke="var(--card)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

export function NameTagCursor({
  title,
  color = "var(--brand)",
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: NameTagCursorProps) {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tightX = useSpring(x, TIGHT);
  const tightY = useSpring(y, TIGHT);
  const towX = useSpring(x, TOW);
  const towY = useSpring(y, TOW);

  function place(e: PointerEvent<HTMLDivElement>, jump: boolean) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = e.clientX - rect.left;
    const ny = e.clientY - rect.top;
    x.set(nx);
    y.set(ny);
    if (jump) {
      tightX.jump(nx);
      tightY.jump(ny);
      towX.jump(nx);
      towY.jump(ny);
    }
  }

  const fine = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <div
      {...props}
      data-pointer={active || undefined}
      className={cn(
        "relative",
        "[@media(pointer:fine)]:data-[pointer]:cursor-none [@media(pointer:fine)]:data-[pointer]:[&_*]:cursor-none",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!fine(e)) return;
        place(e, true);
        setActive(true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!fine(e)) return;
        place(e, false);
        if (!active) setActive(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        setActive(false);
      }}
    >
      {children}
      <AnimatePresence>
        {active && title != null ? (
          <motion.div
            key="tag"
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-50"
            style={{ x: reduced ? x : towX, y: reduced ? y : towY }}
          >
            <motion.div
              className={cn(
                "origin-top-left translate-x-4 translate-y-5 rounded-full rounded-tl-[5px] px-2.5 py-1 shadow-md",
                "text-xs font-medium whitespace-nowrap text-brand-foreground",
              )}
              style={{ backgroundColor: color }}
              initial={{ scale: reduced ? 1 : 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: reduced ? { duration: 0.15 } : { ...FILL, delay: 0.04 } }}
              exit={{ scale: reduced ? 1 : 0.4, opacity: 0, transition: { duration: 0.12 } }}
            >
              {title}
            </motion.div>
          </motion.div>
        ) : null}
        {active ? (
          <motion.div
            key="pointer"
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-50"
            style={{ x: reduced ? x : tightX, y: reduced ? y : tightY }}
          >
            <motion.div
              className="origin-[3.5px_3.5px] -translate-x-[3.5px] -translate-y-[3.5px]"
              initial={{ scale: reduced ? 1 : 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: reduced ? { duration: 0.15 } : FILL }}
              exit={{ scale: reduced ? 1 : 0, opacity: 0, transition: { duration: 0.12 } }}
            >
              <Pointer color={color} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
