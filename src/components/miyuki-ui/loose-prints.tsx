"use client";

import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

interface Pile {
  ref: RefObject<HTMLDivElement | null>;
  raise: () => number;
}

const PileContext = createContext<Pile | null>(null);

export interface LoosePrintsProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export function LoosePrints({ className, children, ...props }: LoosePrintsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const top = useRef(10);
  const pile = useMemo<Pile>(() => ({ ref, raise: () => ++top.current }), []);
  return (
    <div {...props} ref={ref} className={cn("relative isolate", className)}>
      <PileContext value={pile}>{children}</PileContext>
    </div>
  );
}

export interface LoosePrintProps extends Omit<ComponentProps<"div">, "children"> {
  initial?: { x: number; y: number; rotate: number };
  caption?: ReactNode;
  children?: ReactNode;
}

const FRICTION = 3.4;
const RESTITUTION = 0.45;
const MARGIN = 8;
const STEP = 24;
const LIFT = { stiffness: 420, damping: 30 };
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function LoosePrint({
  initial,
  caption,
  className,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onFocus,
  ...props
}: LoosePrintProps) {
  const pile = useContext(PileContext);
  const seed = useId();
  const start = useMemo(() => {
    if (initial) return initial;
    const rng = createRng(seed);
    return { x: rng.range(-220, 220), y: rng.range(-110, 110), rotate: rng.range(-9, 9) };
  }, [initial, seed]);

  const reduced = useReducedMotion() ?? false;
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const tilt = useSpring(0, { stiffness: 240, damping: 20 });
  const scale = useSpring(1, LIFT);
  const rotate = useTransform(tilt, (t) => start.rotate + t);

  const posRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    px: number;
    py: number;
    x: number;
    y: number;
    k: number;
    samples: [number, number, number][];
  } | null>(null);
  const glide = useRef(0);

  const bounds = () => {
    const box = pile?.ref.current;
    const card = cardRef.current;
    if (!box || !card) return null;
    const a = (Math.abs(start.rotate) * Math.PI) / 180;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const ew = (w * Math.cos(a) + h * Math.sin(a)) / 2;
    const eh = (w * Math.sin(a) + h * Math.cos(a)) / 2;
    const mx = Math.max(0, box.clientWidth / 2 - ew - MARGIN);
    const my = Math.max(0, box.clientHeight / 2 - eh - MARGIN);
    return { mx, my };
  };

  const stopGlide = () => {
    cancelAnimationFrame(glide.current);
    glide.current = 0;
  };

  const front = () => {
    if (pile && posRef.current) posRef.current.style.zIndex = String(pile.raise());
  };

  const fit = useEffectEvent(() => {
    const b = bounds();
    if (!b || drag.current || glide.current) return;
    x.set(clamp(x.get(), -b.mx, b.mx));
    y.set(clamp(y.get(), -b.my, b.my));
  });

  useEffect(() => {
    const box = pile?.ref.current;
    if (!box) return;
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    return () => {
      ro.disconnect();
      stopGlide();
    };
  }, [pile]);

  const throwCard = (vx: number, vy: number) => {
    stopGlide();
    if (reduced) {
      tilt.set(0);
      return;
    }
    let last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60;
      last = now;
      const b = bounds();
      const decay = Math.exp(-FRICTION * dt);
      vx *= decay;
      vy *= decay;
      let nx = x.get() + vx * dt;
      let ny = y.get() + vy * dt;
      if (b) {
        if (nx > b.mx || nx < -b.mx) {
          nx = clamp(nx, -b.mx, b.mx);
          vx = -vx * RESTITUTION;
        }
        if (ny > b.my || ny < -b.my) {
          ny = clamp(ny, -b.my, b.my);
          vy = -vy * RESTITUTION;
        }
      }
      x.set(nx);
      y.set(ny);
      tilt.set(clamp(vx / 70, -12, 12));
      if (Math.hypot(vx, vy) < 12) {
        glide.current = 0;
        tilt.set(0);
        return;
      }
      glide.current = requestAnimationFrame(frame);
    };
    glide.current = requestAnimationFrame(frame);
  };

  const lift = (on: boolean) => {
    cardRef.current?.toggleAttribute("data-held", on);
    scale.set(on && !reduced ? 1.04 : 1);
  };

  return (
    <motion.div ref={posRef} className="absolute top-1/2 left-1/2 size-0" style={{ x, y, rotate, scale }}>
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="draggable print"
        {...props}
        ref={cardRef}
        className={cn(
          "absolute top-0 left-0 w-max -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-sm bg-card p-2 pb-9 text-card-foreground shadow-md ring-1 ring-foreground/5 outline-none select-none",
          "transition-shadow duration-200 ease-settle data-[held]:cursor-grabbing data-[held]:shadow-2xl",
          "focus-visible:ring-[3px] focus-visible:ring-ring",
          "[&_img]:pointer-events-none",
          className,
        )}
        onFocus={(e) => {
          onFocus?.(e);
          front();
        }}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
          onPointerDown?.(e);
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          stopGlide();
          front();
          lift(true);
          const t = performance.now();
          const box = pile?.ref.current;
          const k = box?.offsetWidth ? box.getBoundingClientRect().width / box.offsetWidth || 1 : 1;
          drag.current = {
            id: e.pointerId,
            px: e.clientX,
            py: e.clientY,
            x: x.get(),
            y: y.get(),
            k,
            samples: [[t, e.clientX, e.clientY]],
          };
        }}
        onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
          onPointerMove?.(e);
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const b = bounds();
          const nx = d.x + (e.clientX - d.px) / d.k;
          const ny = d.y + (e.clientY - d.py) / d.k;
          x.set(b ? clamp(nx, -b.mx, b.mx) : nx);
          y.set(b ? clamp(ny, -b.my, b.my) : ny);
          const t = performance.now();
          d.samples.push([t, e.clientX, e.clientY]);
          while (d.samples.length > 2 && t - d.samples[0][0] > 90) d.samples.shift();
          const [t0, x0] = d.samples[0];
          const vx = ((e.clientX - x0) / d.k / Math.max(16, t - t0)) * 1000;
          if (!reduced) tilt.set(clamp(vx / 70, -12, 12));
        }}
        onPointerUp={(e: PointerEvent<HTMLDivElement>) => {
          onPointerUp?.(e);
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          drag.current = null;
          lift(false);
          const t = performance.now();
          const [t0, x0, y0] = d.samples[0];
          const span = Math.max(16, t - t0);
          const fresh = t - d.samples[d.samples.length - 1][0] < 80;
          const vx = fresh ? ((e.clientX - x0) / d.k / span) * 1000 : 0;
          const vy = fresh ? ((e.clientY - y0) / d.k / span) * 1000 : 0;
          throwCard(clamp(vx, -3200, 3200), clamp(vy, -3200, 3200));
        }}
        onPointerCancel={(e: PointerEvent<HTMLDivElement>) => {
          onPointerCancel?.(e);
          drag.current = null;
          lift(false);
          tilt.set(0);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(e);
          const dir =
            e.key === "ArrowLeft"
              ? [-1, 0]
              : e.key === "ArrowRight"
                ? [1, 0]
                : e.key === "ArrowUp"
                  ? [0, -1]
                  : e.key === "ArrowDown"
                    ? [0, 1]
                    : null;
          if (!dir) return;
          e.preventDefault();
          stopGlide();
          const b = bounds();
          const step = e.shiftKey ? STEP * 3 : STEP;
          const tx = x.get() + dir[0] * step;
          const ty = y.get() + dir[1] * step;
          const opts = reduced ? { duration: 0 } : SETTLE;
          animate(x, b ? clamp(tx, -b.mx, b.mx) : tx, opts);
          animate(y, b ? clamp(ty, -b.my, b.my) : ty, opts);
          if (!reduced && dir[0]) {
            tilt.set(dir[0] * 4);
            window.setTimeout(() => tilt.set(0), 110);
          }
        }}
      >
        {children}
        {caption != null ? (
          <div className="absolute inset-x-2 bottom-0 flex h-9 items-center truncate px-0.5 font-display text-sm leading-none font-semibold tracking-[-0.01em] text-card-foreground/85">
            {caption}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
