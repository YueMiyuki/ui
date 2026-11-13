"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface HoverNoteProps extends Omit<ComponentProps<"span">, "content"> {
  content: ReactNode;
  containerClassName?: string;
}

type Mode = "pointer" | "focus";

const FOLLOW = { stiffness: 320, damping: 30, mass: 0.7 };
const OFFSET_X = 18;
const OFFSET_Y = 22;
const EDGE = 12;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const noop = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export function HoverNote({
  content,
  containerClassName,
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: HoverNoteProps) {
  const id = useId();
  const hydrated = useHydrated();
  const reduced = useReducedMotion() ?? false;
  const [mode, setMode] = useState<Mode | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const side = useRef({ x: 1, y: 1 });
  const hovered = useRef(false);
  const modeRef = useRef<Mode | null>(null);

  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);
  const velocity = useVelocity(x);
  const lean = useSpring(
    useTransform(velocity, (v) => (reduced ? 0 : clamp(v / 160, -5, 5))),
    { stiffness: 260, damping: 24 },
  );
  const origin = useMotionValue("0% 0%");

  function follow(px: number, py: number, jump: boolean) {
    const card = cardRef.current;
    const w = card?.offsetWidth ?? 288;
    const h = card?.offsetHeight ?? 180;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const fitsRight = px + OFFSET_X + w <= vw - EDGE;
    const fitsLeft = px - OFFSET_X - w >= EDGE;
    const fitsBelow = py + OFFSET_Y + h <= vh - EDGE;
    const fitsAbove = py - OFFSET_Y - h >= EDGE;
    if (side.current.x > 0 && !fitsRight && fitsLeft) side.current.x = -1;
    else if (side.current.x < 0 && !fitsLeft) side.current.x = 1;
    if (side.current.y > 0 && !fitsBelow && fitsAbove) side.current.y = -1;
    else if (side.current.y < 0 && !fitsAbove) side.current.y = 1;
    const tx = side.current.x > 0 ? px + OFFSET_X : px - OFFSET_X - w;
    const ty = side.current.y > 0 ? py + OFFSET_Y : py - OFFSET_Y - h;
    const fx = clamp(tx, EDGE, Math.max(EDGE, vw - w - EDGE));
    const fy = clamp(ty, EDGE, Math.max(EDGE, vh - h - EDGE));
    origin.set(`${side.current.x > 0 ? 0 : 100}% ${side.current.y > 0 ? 0 : 100}%`);
    if (jump || reduced) {
      x.jump(fx);
      y.jump(fy);
    } else {
      x.set(fx);
      y.set(fy);
    }
  }

  function anchor() {
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!trigger || !card) return;
    const rects = trigger.getClientRects();
    const r = rects[rects.length - 1] ?? trigger.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const fx = clamp(r.left + r.width / 2 - w / 2, EDGE, Math.max(EDGE, vw - w - EDGE));
    const below = r.bottom + 10;
    const fy = below + h <= vh - EDGE ? below : Math.max(EDGE, r.top - 10 - h);
    origin.set(`50% ${fy >= r.bottom ? 0 : 100}%`);
    x.jump(fx);
    y.jump(fy);
  }

  function place(next: Mode, jump: boolean) {
    if (next === "pointer") follow(pointer.current.x, pointer.current.y, jump);
    else anchor();
  }

  function open(next: Mode | null) {
    modeRef.current = next;
    setMode(next);
  }

  const bind = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const paint = () => {
        const tilt = modeRef.current === "pointer" ? lean.get() : 0;
        node.style.transformOrigin = origin.get();
        node.style.transform = `translate3d(${x.get()}px, ${y.get()}px, 0) rotate(${tilt.toFixed(3)}deg)`;
      };
      paint();
      const stops = [x, y, lean, origin].map((v) => v.on("change", paint));
      return () => stops.forEach((stop) => stop());
    },
    [x, y, lean, origin],
  );

  const settle = useEffectEvent((next: Mode) => place(next, true));
  useLayoutEffect(() => {
    if (mode) settle(mode);
  }, [mode]);

  const card = (
    <AnimatePresence>
      {mode ? (
        <motion.div
          key="card"
          className="pointer-events-none fixed top-0 left-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <div ref={bind}>
            <motion.div
              ref={cardRef}
              id={id}
              role="tooltip"
              initial={reduced ? false : { scale: 0.96, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              style={{ transformOrigin: "inherit" }}
              className={cn(
                "w-72 rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg",
                containerClassName,
              )}
            >
              {content}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <span
        {...props}
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={mode ? id : undefined}
        className={cn(
          "rounded-[3px] text-brand-strong underline decoration-brand/55 decoration-dotted decoration-[1.5px] underline-offset-[3px] outline-none",
          "transition-[text-decoration-color] duration-150 hover:decoration-brand focus-visible:ring-[3px] focus-visible:ring-ring",
          className,
        )}
        onPointerEnter={(e) => {
          onPointerEnter?.(e);
          if (e.pointerType === "touch") return;
          hovered.current = true;
          pointer.current = { x: e.clientX, y: e.clientY };
          if (modeRef.current === "focus") return;
          if (modeRef.current === "pointer") follow(e.clientX, e.clientY, false);
          else open("pointer");
        }}
        onPointerMove={(e) => {
          onPointerMove?.(e);
          if (e.pointerType === "touch") return;
          pointer.current = { x: e.clientX, y: e.clientY };
          if (modeRef.current === "pointer") follow(e.clientX, e.clientY, false);
        }}
        onPointerLeave={(e) => {
          onPointerLeave?.(e);
          hovered.current = false;
          if (modeRef.current === "pointer") open(null);
        }}
        onFocus={(e) => {
          onFocus?.(e);
          if (e.currentTarget.matches(":focus-visible")) open("focus");
        }}
        onBlur={(e) => {
          onBlur?.(e);
          if (modeRef.current === "focus") open(hovered.current ? "pointer" : null);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.key === "Escape" && modeRef.current) {
            e.stopPropagation();
            open(null);
          }
        }}
      >
        {children}
      </span>
      {hydrated ? createPortal(card, document.body) : null}
    </>
  );
}
