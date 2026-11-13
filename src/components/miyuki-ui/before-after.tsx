"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type AnimationPlaybackControls,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type BeforeAfterMode = "drag" | "hover";

export interface BeforeAfterProps extends Omit<ComponentProps<"div">, "children"> {
  first: ReactNode;
  second: ReactNode;
  initial?: number;
  mode?: BeforeAfterMode;
  autoplay?: boolean;
  autoplayDuration?: number;
  labels?: [string, string];
  "aria-label"?: string;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const SWEEP: [number, number] = [14, 86];

const clamp = (v: number) => Math.min(100, Math.max(0, v));

function Layer({ content, alt, className }: { content: ReactNode; alt: string; className?: string }) {
  if (typeof content === "string") {
    return (
      <img
        src={content}
        alt={alt}
        draggable={false}
        className={cn("pointer-events-none absolute inset-0 size-full object-cover", className)}
      />
    );
  }
  return <div className={cn("absolute inset-0", className)}>{content}</div>;
}

export function BeforeAfter({
  first,
  second,
  initial = 50,
  mode = "drag",
  autoplay = false,
  autoplayDuration = 5000,
  labels,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  "aria-label": ariaLabel,
  ...props
}: BeforeAfterProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const spring = useRef<AnimationPlaybackControls | null>(null);
  const sweep = useRef<(() => void) | null>(null);
  const goal = useRef(clamp(initial));
  const pos = useMotionValue(clamp(initial));
  const [value, setValue] = useState(Math.round(clamp(initial)));
  const [dragging, setDragging] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [held, setHeld] = useState(false);

  useMotionValueEvent(pos, "change", (v) => setValue(Math.round(v)));

  const clip = useTransform(pos, (p) => `inset(0 0 0 ${p}%)`);
  const left = useTransform(pos, (p) => `${p}%`);
  const firstLabel = useTransform(pos, [8, 20], [0, 1]);
  const secondLabel = useTransform(pos, [80, 92], [1, 0]);

  const sweeping = autoplay && !reduced && !takenOver && !held;

  useEffect(() => {
    if (!sweeping) return;
    const [lo, hi] = SWEEP;
    const seconds = autoplayDuration / 1000;
    const from = pos.get();
    const towards = from < (lo + hi) / 2 ? hi : lo;
    let cancelled = false;
    let controls = animate(pos, towards, {
      duration: Math.max(0.4, (seconds * Math.abs(towards - from)) / (hi - lo)),
      ease: "easeInOut",
    });
    controls.then(() => {
      if (cancelled) return;
      controls = animate(pos, [towards, towards === hi ? lo : hi], {
        duration: seconds,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      });
    });
    const stop = () => {
      cancelled = true;
      controls.stop();
    };
    sweep.current = stop;
    return () => {
      stop();
      sweep.current = null;
    };
  }, [sweeping, autoplayDuration, pos]);

  function takeOver() {
    if (takenOver) return;
    sweep.current?.();
    goal.current = pos.get();
    setTakenOver(true);
  }

  function moveTo(target: number, smooth: boolean) {
    spring.current?.stop();
    const next = clamp(target);
    goal.current = next;
    if (smooth && !reduced) spring.current = animate(pos, next, SETTLE);
    else pos.set(next);
  }

  function fromPointer(clientX: number) {
    const rect = root.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return pos.get();
    return ((clientX - rect.left) / rect.width) * 100;
  }

  const follows = (e: PointerEvent) => mode === "hover" && e.pointerType !== "touch";

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const big = e.shiftKey ? 10 : 1;
    const steps: Record<string, number> = {
      ArrowLeft: -big,
      ArrowRight: big,
      ArrowDown: -big,
      ArrowUp: big,
      PageDown: -10,
      PageUp: 10,
    };
    let target: number | null = null;
    if (!(e.key in steps) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    takeOver();
    if (e.key in steps) target = Math.round(goal.current) + steps[e.key];
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = 100;
    if (target == null) return;
    moveTo(target, Math.abs(target - pos.get()) > 2);
  }

  const name = ariaLabel ?? (labels ? `Compare ${labels[0]} and ${labels[1]}` : "Comparison divider");

  return (
    <div
      {...props}
      ref={root}
      data-mode={mode}
      data-dragging={dragging || undefined}
      className={cn(
        "group/before-after relative isolate aspect-[16/10] w-full touch-pan-y overflow-clip rounded-2xl bg-muted select-none",
        mode === "drag" && "cursor-ew-resize",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType === "touch") return;
        if (follows(e)) {
          takeOver();
          moveTo(fromPointer(e.clientX), true);
        } else setHeld(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.pointerType !== "touch") setHeld(false);
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.button !== 0 || follows(e)) return;
        takeOver();
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(fromPointer(e.clientX), true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (dragging || follows(e)) moveTo(fromPointer(e.clientX), false);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        setDragging(false);
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        setDragging(false);
      }}
    >
      <Layer content={first} alt={labels?.[0] ?? ""} />
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <Layer content={second} alt={labels?.[1] ?? ""} />
      </motion.div>

      {labels ? (
        <>
          <motion.span
            aria-hidden="true"
            style={{ opacity: firstLabel }}
            className="pointer-events-none absolute top-3 left-3 rounded-full border border-foreground/10 bg-card/75 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur-md"
          >
            {labels[0]}
          </motion.span>
          <motion.span
            aria-hidden="true"
            style={{ opacity: secondLabel }}
            className="pointer-events-none absolute top-3 right-3 rounded-full border border-foreground/10 bg-card/75 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur-md"
          >
            {labels[1]}
          </motion.span>
        </>
      ) : null}

      <motion.div className="pointer-events-none absolute inset-y-0 z-10 w-0" style={{ left }}>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-px w-0.5 bg-white/85 shadow-[0_0_0_0.5px_oklch(0.2_0.03_250/0.18),0_0_12px_oklch(0.2_0.03_250/0.25)]"
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label={name}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={labels ? `${value}% ${labels[0]}, ${100 - value}% ${labels[1]}` : `${value}%`}
          onKeyDown={handleKeyDown}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className={cn(
            "pointer-events-auto absolute top-1/2 left-0 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
            "border border-border-strong bg-card text-foreground/70 shadow-md outline-none",
            "transition-[transform,box-shadow,color] duration-200 ease-settle",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
            "group-data-[dragging]/before-after:scale-[1.08] group-data-[dragging]/before-after:text-foreground group-data-[dragging]/before-after:shadow-lg",
            mode === "drag" ? "cursor-ew-resize" : "cursor-default",
          )}
        >
          <ChevronLeft className="-mr-0.5 size-3.5" strokeWidth={2.25} />
          <ChevronRight className="-ml-0.5 size-3.5" strokeWidth={2.25} />
        </div>
      </motion.div>
    </div>
  );
}
