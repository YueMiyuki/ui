"use client";

import { X } from "lucide-react";
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import { type HTMLAttributes, type Ref, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export interface TickingStepsProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  steps: string[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
  contained?: boolean;
  backdropBlur?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
  ref?: Ref<HTMLDivElement>;
}

const ROW = 52;
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const FILL = { type: "spring", stiffness: 500, damping: 30 } as const;

const P = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const at = (deg: number): [number, number] => [
  12 + 8 * Math.cos((deg * Math.PI) / 180),
  12 + 8 * Math.sin((deg * Math.PI) / 180),
];
const arcPiece = (a0: number, a1: number) => {
  const k = (4 / 3) * Math.tan(((a1 - a0) * Math.PI) / 180 / 4) * 8;
  const [x0, y0] = at(a0);
  const [x1, y1] = at(a1);
  const t0 = (a0 * Math.PI) / 180;
  const t1 = (a1 * Math.PI) / 180;
  return `C${P(x0 - k * Math.sin(t0), y0 + k * Math.cos(t0))} ${P(x1 + k * Math.sin(t1), y1 - k * Math.cos(t1))} ${P(x1, y1)}`;
};
const line = (a: [number, number], b: [number, number]) =>
  `C${P(a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3)} ${P(a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3)} ${P(b[0], b[1])}`;

const ARC = `M${P(...at(150))}${arcPiece(150, 90)}${arcPiece(90, 30)}`;
const TICK: [number, number][] = [
  [7.25, 12.5],
  [10.5, 15.75],
  [16.75, 9],
];
const CHECK = `M${P(...TICK[0])}${line(TICK[0], TICK[1])}${line(TICK[1], TICK[2])}`;

type StepState = "todo" | "current" | "done";

function Marker({ state }: { state: StepState }) {
  const reduce = useReducedMotion();
  const spin = useMotionValue(0);
  const turn = useRef<SVGGElement>(null);
  const [check, setCheck] = useState(state === "done");
  useMotionValueEvent(spin, "change", (v) => turn.current?.setAttribute("transform", `rotate(${v.toFixed(2)} 12 12)`));

  useEffect(() => {
    let run: AnimationPlaybackControls | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (value: boolean, ms = 0) => {
      timer = setTimeout(() => setCheck(value), ms);
    };
    if (state === "current") {
      settle(false);
      spin.jump(spin.get() % 360);
      run = animate(spin, spin.get() + 360, {
        duration: reduce ? 2.4 : 0.85,
        ease: "linear",
        repeat: Infinity,
      });
    } else if (state === "done") {
      const from = spin.get() % 360;
      spin.jump(from);
      if (reduce || from === 0) {
        settle(true);
      } else {
        const target = from > 290 ? 720 : 360;
        run = animate(spin, target, {
          type: "spring",
          stiffness: 170,
          damping: 22,
          velocity: 420,
        });
        settle(true, 160);
      }
    } else {
      settle(false);
      spin.jump(0);
    }
    return () => {
      run?.stop();
      clearTimeout(timer);
    };
  }, [state, reduce, spin]);

  return (
    <span className="relative grid size-6 shrink-0 place-items-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full border-[1.5px] transition-colors duration-200",
          state === "todo" ? "border-border-strong" : "border-transparent",
        )}
      />
      <motion.span
        className="absolute inset-0 rounded-full bg-brand"
        initial={false}
        animate={state === "done" ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
        transition={reduce ? { duration: 0.12 } : FILL}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="relative size-6"
      >
        <circle
          cx="12"
          cy="12"
          r="8"
          strokeWidth={2.25}
          className={cn(
            "stroke-brand/25 transition-opacity duration-200",
            state === "current" ? "opacity-100" : "opacity-0",
          )}
        />
        <g ref={turn}>
          <MorphPath
            d={check ? CHECK : ARC}
            strokeWidth={2.25}
            transition={{ stiffness: 380, damping: 26 }}
            className={cn(
              "transition-[stroke,opacity] duration-200",
              check ? "stroke-brand-foreground" : "stroke-brand",
              state === "todo" ? "opacity-0" : "opacity-100",
            )}
          />
        </g>
      </svg>
    </span>
  );
}

function Overlay({
  steps,
  duration,
  loop,
  contained,
  backdropBlur = false,
  onComplete,
  onClose,
  className,
  ref,
  ...props
}: Omit<TickingStepsProps, "loading"> & { duration: number }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const n = steps.length;
    if (n === 0) return;
    const timer = setTimeout(
      () => {
        if (index < n) setIndex(index + 1);
        else if (loop) setIndex(0);
      },
      index < n ? duration : Math.min(duration, 900),
    );
    if (index === n) done.current?.();
    return () => clearTimeout(timer);
  }, [index, steps.length, duration, loop]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  const n = steps.length;
  const focus = Math.min(index, Math.max(0, n - 1));
  const current = index < n ? steps[index] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className={cn(contained ? "absolute" : "fixed", "inset-0 z-50", backdropBlur && "backdrop-blur-sm")}
    >
      <div
        role="dialog"
        aria-modal={contained ? undefined : true}
        aria-label={props["aria-label"] ?? "Progress"}
        aria-busy={index < n}
        {...props}
        ref={ref}
        tabIndex={-1}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (event.key === "Escape" && onClose) {
            event.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          "grid size-full place-items-center",
          backdropBlur ? "bg-background/70" : "bg-background/94",
          "outline-none",
          className,
        )}
      >
        {onClose && (
          <IconButton
            ref={closeRef}
            variant="ghost"
            size="sm"
            aria-label="Close"
            onPress={onClose}
            className="absolute top-3 right-3"
          >
            <X />
          </IconButton>
        )}
        <div
          className="relative w-max max-w-[calc(100%-3rem)]"
          style={{
            height: ROW * 5,
            maskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)",
            WebkitMaskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)",
          }}
        >
          <motion.ol
            className="relative top-1/2"
            initial={false}
            animate={{ y: -(focus * ROW + ROW / 2) }}
            transition={reduce ? { duration: 0 } : SETTLE}
          >
            {steps.map((step, i) => {
              const state: StepState = i < index ? "done" : i === index ? "current" : "todo";
              return (
                <li
                  key={i}
                  aria-current={state === "current" ? "step" : undefined}
                  className="relative flex items-center gap-3.5"
                  style={{ height: ROW }}
                >
                  {i < n - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[11px] w-0.5 overflow-hidden rounded-full bg-border"
                      style={{ top: ROW / 2 + 16, height: ROW - 32 }}
                    >
                      <motion.span
                        className="absolute inset-0 origin-top rounded-full bg-brand"
                        initial={false}
                        animate={{ scaleY: i < index ? 1 : 0 }}
                        transition={reduce ? { duration: 0.12 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  )}
                  <Marker state={state} />
                  <span
                    className={cn(
                      "text-[15px] transition-colors duration-200",
                      state === "current" && "font-medium text-foreground",
                      state === "done" && "text-foreground/70",
                      state === "todo" && "text-muted-foreground",
                    )}
                  >
                    {step}
                    {state === "done" && <span className="sr-only">, done</span>}
                  </span>
                </li>
              );
            })}
          </motion.ol>
        </div>
        <span role="status" className="sr-only">
          {current ? `Step ${index + 1} of ${n}: ${current}` : "All steps done"}
        </span>
      </div>
    </motion.div>
  );
}

export function TickingSteps({ loading = false, duration = 1800, ...props }: TickingStepsProps) {
  return (
    <AnimatePresence>
      {loading && <Overlay key="overlay" duration={Math.max(200, duration)} {...props} />}
    </AnimatePresence>
  );
}
