"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, type Transition, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export interface ShowcaseSlide {
  title: string;
  src: string;
  alt?: string;
  action?: ReactNode;
}

export interface ShowcaseCarouselProps extends Omit<ComponentProps<"section">, "children"> {
  slides: ShowcaseSlide[];
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  "aria-label"?: string;
  labels?: {
    previous?: string;
    next?: string;
    goTo?: (index: number) => string;
    slide?: (title: string, index: number, count: number) => string;
  };
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const GLIDE: Transition = { type: "spring", stiffness: 260, damping: 32, mass: 1 };
const DRIFT = { stiffness: 150, damping: 20, mass: 0.6 };

function wrap(value: number, count: number) {
  let d = ((value % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}

function pose(d: number) {
  const side = Math.sign(d);
  const far = Math.abs(d) >= 2;
  if (d === 0) return { x: "0%", rotateY: 0, scale: 1, opacity: 1 };
  if (!far) return { x: `${side * 62}%`, rotateY: side * 34, scale: 0.8, opacity: 1 };
  return { x: `${side * 104}%`, rotateY: side * 50, scale: 0.64, opacity: 0 };
}

export function ShowcaseCarousel({
  slides,
  defaultIndex = 0,
  onIndexChange,
  labels,
  className,
  "aria-label": ariaLabel = "Showcase",
  ...props
}: ShowcaseCarouselProps) {
  const reduced = useReducedMotion() ?? false;
  const count = slides.length;
  const [state, setState] = useState(() => {
    const start = count ? ((defaultIndex % count) + count) % count : 0;
    return { index: start, from: start };
  });
  const [announce, setAnnounce] = useState("");
  const press = useRef<{ x: number; moved: boolean } | null>(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const driftX = useSpring(tiltX, DRIFT);
  const driftY = useSpring(tiltY, DRIFT);
  const imageX = useTransform(driftX, (v) => v * -9);
  const imageY = useTransform(driftY, (v) => v * -7);

  const { index, from } = state;
  const slideLabel = labels?.slide ?? ((title: string, i: number, n: number) => `${title}, ${i + 1} of ${n}`);

  function go(to: number) {
    if (count < 2) return;
    const next = ((to % count) + count) % count;
    if (next === index) return;
    tiltX.set(0);
    tiltY.set(0);
    setState({ index: next, from: index });
    setAnnounce(slideLabel(slides[next].title, next, count));
    onIndexChange?.(next);
  }

  const shift = wrap(index - from, count);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => go(index - 1),
      ArrowRight: () => go(index + 1),
      Home: () => go(0),
      End: () => go(count - 1),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }

  function track(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch" || reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    tiltX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    tiltY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  return (
    <section
      {...props}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn("flex size-full min-h-0 flex-col items-center justify-center gap-6 overflow-clip py-6", className)}
    >
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          press.current = { x: e.clientX, moved: false };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (p && Math.abs(e.clientX - p.x) > 8) p.moved = true;
        }}
        onPointerUp={(e) => {
          const p = press.current;
          if (!p) return;
          const dx = e.clientX - p.x;
          if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
        }}
        className="group/stage relative grid w-full touch-pan-y place-items-center outline-none [perspective:1600px] select-none"
      >
        {slides.map((slide, i) => {
          const d = wrap(i - index, count);
          const instant = wrap(i - from, count) - shift !== d;
          const active = d === 0;
          const target = pose(d);
          const transition: Transition = reduced
            ? { default: { duration: 0 }, opacity: { duration: 0.2 } }
            : instant
              ? { duration: 0 }
              : { ...GLIDE, opacity: { duration: 0.24 } };
          return (
            <motion.div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={slideLabel(slide.title, i, count)}
              aria-hidden={!active || undefined}
              initial={false}
              animate={target}
              transition={transition}
              onClick={() => {
                if (press.current?.moved) return;
                if (!active) go(i);
              }}
              onPointerMove={active ? track : undefined}
              onPointerLeave={
                active
                  ? () => {
                      tiltX.set(0);
                      tiltY.set(0);
                    }
                  : undefined
              }
              style={{ zIndex: 10 - Math.abs(d) }}
              className={cn(
                "relative aspect-[3/2] w-[min(34rem,76%)] [grid-area:1/1] sm:w-[min(34rem,58%)]",
                "overflow-clip rounded-3xl bg-muted shadow-xl will-change-transform",
                "group-focus-visible/stage:data-[active]:ring-[3px] group-focus-visible/stage:data-[active]:ring-ring",
                Math.abs(d) >= 2 && "pointer-events-none",
              )}
              data-active={active || undefined}
            >
              <motion.img
                src={slide.src}
                alt={slide.alt ?? ""}
                draggable={false}
                style={active && !reduced ? { x: imageX, y: imageY, scale: 1.06 } : { scale: 1.06 }}
                className="absolute inset-0 size-full object-cover will-change-transform"
              />
              <div
                inert={!active}
                className="dark absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-linear-to-t from-[oklch(0.16_0.03_250/0.78)] via-[oklch(0.16_0.03_250/0.35)] to-transparent p-5 pt-20 text-foreground sm:p-6 sm:pt-24"
              >
                <h3 className="min-w-0 font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
                  {slide.title}
                </h3>
                {slide.action ? (
                  <motion.div
                    className="shrink-0"
                    initial={false}
                    animate={{ opacity: active ? 1 : 0, y: active || reduced ? 0 : 6 }}
                    transition={active ? { ...SETTLE, opacity: { duration: 0.2, delay: 0.12 } } : { duration: 0.12 }}
                  >
                    {slide.action}
                  </motion.div>
                ) : null}
              </div>
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-background"
                initial={false}
                animate={{ opacity: active ? 0 : 0.5 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="flex items-center gap-4">
          <IconButton
            aria-label={labels?.previous ?? "Previous slide"}
            onPress={() => go(index - 1)}
            className="rounded-full"
          >
            <ChevronLeft />
          </IconButton>
          <div className="flex items-center">
            {slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                aria-label={labels?.goTo?.(i) ?? `Go to ${slide.title}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className="group/dot flex h-6 cursor-default items-center px-[3px] outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-[width,background-color,box-shadow] duration-300 ease-settle",
                    "group-focus-visible/dot:ring-[3px] group-focus-visible/dot:ring-ring",
                    i === index ? "w-5 bg-brand" : "w-1.5 bg-foreground/15 group-hover/dot:bg-foreground/30",
                  )}
                />
              </button>
            ))}
          </div>
          <IconButton aria-label={labels?.next ?? "Next slide"} onPress={() => go(index + 1)} className="rounded-full">
            <ChevronRight />
          </IconButton>
        </div>
      ) : null}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>
    </section>
  );
}
