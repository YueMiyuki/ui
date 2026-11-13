"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export interface CardShuffleItem {
  id: string | number;
  content: ReactNode;
}

export interface CardShuffleProps extends Omit<ComponentProps<"div">, "children"> {
  items: CardShuffleItem[];
  interval?: number;
  offset?: number;
  scaleStep?: number;
  draggable?: boolean;
  cardClassName?: string;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const VISIBLE = 4;
const FLICK_DISTANCE = 90;
const FLICK_SPEED = 600;

interface Leaving {
  id: CardShuffleItem["id"];
  x: number;
  y: number;
}

export function CardShuffle({
  items,
  interval = 5000,
  offset = 10,
  scaleStep = 0.05,
  draggable = true,
  cardClassName,
  className,
  style,
  onKeyDown,
  ...props
}: CardShuffleProps) {
  const reduced = useReducedMotion() ?? false;
  const [shift, setShift] = useState(0);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [dragging, setDragging] = useState(false);
  const n = items.length;
  const front = n ? ((shift % n) + n) % n : 0;
  const depth = Math.min(n, VISIBLE) - 1;

  function advance(to?: { x: number; y: number }) {
    if (leaving || n < 2) return;
    const out = to ?? { x: 0, y: 36 };
    setLeaving({ id: items[front].id, x: reduced ? 0 : out.x, y: reduced ? 0 : out.y });
  }

  function settle() {
    setShift((s) => s + 1);
    setLeaving(null);
  }

  return (
    <div
      role="region"
      aria-roledescription="card stack"
      tabIndex={0}
      {...props}
      data-paused={dragging || undefined}
      className={cn(
        "group/stack relative grid rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
      style={{ paddingTop: offset * depth, ...style }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          advance({ x: 0, y: 36 });
        }
      }}
    >
      {items.map((item, i) => {
        const k = (i - front + n) % n;
        const isLeaving = leaving?.id === item.id;
        const shown = Math.min(k, depth);
        const target = isLeaving
          ? { x: leaving.x, y: leaving.y, scale: 1, opacity: 0 }
          : { x: 0, y: -shown * offset, scale: 1 - shown * scaleStep, opacity: k <= depth ? 1 : 0 };
        const transition: Transition = reduced
          ? { default: { duration: 0 }, opacity: { duration: 0.2 } }
          : isLeaving
            ? { duration: 0.24, ease: [0.4, 0, 0.9, 0.6] }
            : {
                ...SETTLE,
                x: k === 0 ? SETTLE : { duration: 0 },
                opacity: { duration: 0.2, delay: 0.06 },
              };
        const isFront = k === 0 && !isLeaving;

        return (
          <motion.div
            key={item.id}
            aria-hidden={!isFront || undefined}
            inert={!isFront}
            initial={false}
            animate={target}
            transition={transition}
            onAnimationComplete={isLeaving ? settle : undefined}
            drag={draggable && isFront && !reduced ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            onDragStart={() => setDragging(true)}
            onDragEnd={(_, info) => {
              setDragging(false);
              const far = Math.abs(info.offset.x) > FLICK_DISTANCE || Math.abs(info.velocity.x) > FLICK_SPEED;
              if (far) advance({ x: Math.sign(info.offset.x || info.velocity.x) * 260, y: 12 });
            }}
            style={{ zIndex: isLeaving ? n + 1 : n - k, transformOrigin: "50% 0%" }}
            className={cn(
              "relative overflow-clip rounded-2xl border border-border bg-card p-6 text-card-foreground [grid-area:1/1]",
              k === 0 ? "shadow-md" : "shadow-sm",
              draggable && isFront && "cursor-grab active:cursor-grabbing",
              cardClassName,
            )}
          >
            <motion.div
              className="h-full"
              initial={false}
              animate={{ opacity: k === 0 || isLeaving ? 1 : 0 }}
              transition={{ duration: 0.2, delay: k === 0 && !isLeaving && !reduced ? 0.08 : 0 }}
            >
              {item.content}
            </motion.div>
            {isFront && interval > 0 && n > 1 ? (
              <span
                key={shift}
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand",
                  "animate-[miyuki-card-shuffle-fill_var(--miyuki-card-shuffle-interval)_linear_forwards]",
                  "group-hover/stack:[animation-play-state:paused] group-focus-within/stack:[animation-play-state:paused] group-data-[paused]/stack:[animation-play-state:paused]",
                )}
                style={{ "--miyuki-card-shuffle-interval": `${interval}ms` } as CSSProperties}
                onAnimationEnd={() => advance()}
              />
            ) : null}
          </motion.div>
        );
      })}
      <style href="miyuki-card-shuffle" precedence="miyuki">{`
        @keyframes miyuki-card-shuffle-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
    </div>
  );
}
