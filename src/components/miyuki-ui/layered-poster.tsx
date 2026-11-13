"use client";

import { RotateCcw } from "lucide-react";
import { type MotionValue, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export interface PosterLayer {
  content: ReactNode;
  depth: number;
}

export interface LayeredPosterProps extends Omit<ComponentProps<"div">, "title"> {
  layers: PosterLayer[];
  title: string;
  titleDepth?: number;
  titleClassName?: string;
  shift?: number;
  replayLabel?: string;
}

type Slot = { kind: "layer"; layer: PosterLayer; key: string } | { kind: "title"; key: string };

const SETTLE_SOFT = { type: "spring", stiffness: 110, damping: 19, mass: 1 } as const;
const LETTER = { type: "spring", stiffness: 260, damping: 26 } as const;

export function LayeredPoster({
  layers,
  title,
  titleDepth = 0.35,
  titleClassName,
  shift = 26,
  replayLabel = "Replay",
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: LayeredPosterProps) {
  const reduced = useReducedMotion() ?? false;
  const [run, setRun] = useState(0);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.9 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.9 });

  const ordered = layers.map((layer, i) => ({ layer, i })).sort((a, b) => a.layer.depth - b.layer.depth || a.i - b.i);
  const slots: Slot[] = [];
  let titled = false;
  for (const { layer, i } of ordered) {
    if (!titled && layer.depth > titleDepth) {
      slots.push({ kind: "title", key: "title" });
      titled = true;
    }
    slots.push({ kind: "layer", layer, key: `layer-${i}` });
  }
  if (!titled) slots.push({ kind: "title", key: "title" });

  const letters = Array.from(title);
  let t = 0.15;
  const delays = slots.map((slot) => {
    const at = t;
    t += slot.kind === "title" ? letters.length * 0.055 + 0.2 : 0.24;
    return at;
  });
  const total = t + 0.5;

  return (
    <div
      {...props}
      className={cn("@container group/poster relative isolate overflow-clip", className)}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (reduced || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)));
        py.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)));
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div
        key={run}
        className="absolute inset-0"
        initial={reduced ? { opacity: 0 } : { scale: 1.09 }}
        animate={reduced ? { opacity: 1 } : { scale: 1 }}
        transition={reduced ? { duration: 0.3 } : { duration: total, ease: [0.22, 1, 0.36, 1] }}
      >
        {slots.map((slot, k) =>
          slot.kind === "layer" ? (
            <Depth key={slot.key} depth={slot.layer.depth} x={sx} y={sy} shift={shift}>
              <motion.div
                className="absolute inset-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 + slot.layer.depth * 80 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0.3 }
                    : { ...SETTLE_SOFT, delay: delays[k], opacity: { duration: 0.5, delay: delays[k] } }
                }
              >
                {slot.layer.content}
              </motion.div>
            </Depth>
          ) : (
            <Depth key={slot.key} depth={titleDepth} x={sx} y={sy} shift={shift}>
              <h2
                className={cn(
                  "absolute inset-x-0 top-[24%] text-center font-display text-[19cqw] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap select-none",
                  titleClassName,
                )}
              >
                <span className="sr-only">{title}</span>
                <span aria-hidden="true">
                  {letters.map((ch, i) => (
                    <motion.span
                      key={i}
                      className="inline-block"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: "0.32em", filter: "blur(6px)" }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={
                        reduced
                          ? { duration: 0.3 }
                          : {
                              ...LETTER,
                              delay: delays[k] + i * 0.055,
                              opacity: { duration: 0.35, delay: delays[k] + i * 0.055 },
                              filter: { duration: 0.45, delay: delays[k] + i * 0.055 },
                            }
                      }
                    >
                      {ch === " " ? " " : ch}
                    </motion.span>
                  ))}
                </span>
              </h2>
            </Depth>
          ),
        )}
      </motion.div>
      <Button
        variant="secondary"
        size="sm"
        aria-label={replayLabel}
        onPress={() => setRun((r) => r + 1)}
        className="absolute right-3 bottom-3 z-10 rounded-full border-foreground/10 bg-card/70 backdrop-blur-md"
        iconStart={
          <motion.span
            className="inline-grid"
            initial={false}
            animate={{ rotate: reduced ? 0 : -360 * run }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <RotateCcw />
          </motion.span>
        }
      />
    </div>
  );
}

function Depth({
  depth,
  x,
  y,
  shift,
  children,
}: {
  depth: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  shift: number;
  children: ReactNode;
}) {
  const tx = useTransform(x, (v) => -v * shift * depth);
  const ty = useTransform(y, (v) => -v * shift * depth * 0.6);
  return (
    <motion.div className="pointer-events-none absolute inset-0" style={{ x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}
