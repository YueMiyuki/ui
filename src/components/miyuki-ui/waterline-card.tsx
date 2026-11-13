"use client";

import { animate, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { type ComponentProps, type PointerEvent, type Ref, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface WaterlineCardProps extends ComponentProps<"div"> {
  text: string;
  revealText: string;
  ref?: Ref<HTMLDivElement>;
}

const MAX_LEAN = 9;
const drain = { duration: 0.8, ease: [0.45, 0.05, 0.25, 1] } as const;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export function WaterlineCard({
  text,
  revealText,
  children,
  className,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onFocus,
  onBlur,
  ref,
  ...props
}: WaterlineCardProps) {
  const own = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const geometry = useRef({ width: 0, height: 0, top: 0, bottom: 0, left: 0 });
  const dragging = useRef(false);
  const focused = useRef(false);
  const reduced = useReducedMotion() === true;
  const target = useMotionValue(0);
  const x = useSpring(target, { stiffness: 210, damping: 26, mass: 0.7 });
  const velocity = useVelocity(x);
  const tilt = useTransform(velocity, (v) => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, -v * 0.006)));
  const lean = useSpring(tilt, { stiffness: 260, damping: 24 });

  useEffect(() => {
    const card = own.current;
    const box = area.current;
    if (!card || !box) return;

    const paint = () => {
      const g = geometry.current;
      const pos = reduced ? target.get() : x.get();
      const angle = reduced ? 0 : lean.get();
      const slope = Math.tan((angle * Math.PI) / 180);
      const mid = g.height / 2;
      const atTop = pos + (mid - g.top) * slope - g.left;
      const atBottom = pos + (mid - g.bottom) * slope - g.left;
      const t = `${atTop.toFixed(2)}px`;
      const b = `${atBottom.toFixed(2)}px`;
      if (reveal.current) reveal.current.style.clipPath = `polygon(0 0, ${t} 0, ${b} 100%, 0 100%)`;
      if (base.current) base.current.style.clipPath = `polygon(${t} 0, 100% 0, 100% 100%, ${b} 100%)`;
      const shown = Math.max(0, Math.min(1, pos / 28, (g.width - pos) / 28 + 0.0001));
      if (line.current) {
        line.current.style.transform = `translateX(${pos.toFixed(2)}px) rotate(${angle.toFixed(3)}deg)`;
        line.current.style.opacity = shown.toFixed(3);
      }
      if (wash.current) {
        wash.current.style.transform = `translateX(${(pos - g.width).toFixed(2)}px) skewX(${(-angle).toFixed(3)}deg)`;
        wash.current.style.opacity = Math.min(1, pos / 60).toFixed(3);
      }
    };

    const measure = () => {
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;
      geometry.current = {
        width: cardWidth,
        height: cardHeight,
        top: box.offsetTop,
        bottom: box.offsetTop + box.offsetHeight,
        left: box.offsetLeft,
      };
      if (focused.current) target.jump(cardWidth);
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(box);
    const stopX = x.on("change", paint);
    const stopLean = lean.on("change", paint);
    const stopTarget = target.on("change", paint);
    return () => {
      observer.disconnect();
      stopX();
      stopLean();
      stopTarget();
    };
  }, [x, lean, target, reduced]);

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const card = own.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const k = card.offsetWidth > 0 ? rect.width / card.offsetWidth : 1;
    const pos = Math.max(0, Math.min(card.offsetWidth, (event.clientX - rect.left) / k));
    target.stop();
    target.set(pos);
    if (reduced) x.jump(pos);
  };

  const settle = () => {
    if (focused.current) return;
    if (reduced) {
      target.jump(0);
      x.jump(0);
      return;
    }
    animate(target, 0, drain);
  };

  return (
    <div
      {...props}
      ref={mergeRefs(own, ref)}
      tabIndex={0}
      className={cn(
        "group/reveal relative isolate w-full touch-pan-y overflow-clip rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm outline-none select-none sm:p-8",
        "focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.pointerType === "mouse" || event.pointerType === "pen" || dragging.current) follow(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.pointerType === "mouse") return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        follow(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        if (!dragging.current) return;
        dragging.current = false;
        settle();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        dragging.current = false;
        settle();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (event.pointerType === "mouse" || event.pointerType === "pen") settle();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (event.target !== event.currentTarget || !event.currentTarget.matches(":focus-visible")) return;
        focused.current = true;
        const width = event.currentTarget.offsetWidth;
        if (reduced) {
          target.jump(width);
          x.jump(width);
        } else animate(target, width, { duration: 0.9, ease: [0.45, 0.05, 0.25, 1] });
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!focused.current) return;
        focused.current = false;
        settle();
      }}
    >
      <div
        ref={wash}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-full bg-linear-to-r from-transparent from-40% to-brand/6 opacity-0 dark:to-brand/12"
        style={{ transform: "translateX(-100%)" }}
      />
      <div
        ref={line}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-px opacity-0"
        style={{ transform: "translateX(0px)" }}
      >
        <div className="absolute inset-y-[8%] -left-3 w-6 bg-brand/25 blur-[10px] [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)] dark:bg-brand/45" />
        <div className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-brand to-transparent dark:via-brand-strong" />
      </div>

      {children}

      <div
        ref={area}
        className="relative mt-10 grid font-display text-[34px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:mt-14 sm:text-[44px]"
      >
        <span className="sr-only">
          {text} {revealText}
        </span>
        <div
          ref={base}
          aria-hidden="true"
          className="col-start-1 row-start-1 text-muted-foreground"
          style={{ clipPath: "polygon(0px 0, 100% 0, 100% 100%, 0px 100%)" }}
        >
          {text}
        </div>
        <div
          ref={reveal}
          aria-hidden="true"
          className="col-start-1 row-start-1 bg-linear-to-r from-brand to-foreground bg-clip-text text-transparent dark:from-brand dark:to-foreground"
          style={{ clipPath: "polygon(0 0, 0px 0, 0px 100%, 0 100%)" }}
        >
          {revealText}
        </div>
      </div>
    </div>
  );
}
