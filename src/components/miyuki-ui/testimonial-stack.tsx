"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type KeyboardEvent, useState } from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

export interface TestimonialStackProps extends Omit<ComponentProps<"section">, "children"> {
  testimonials: Testimonial[];
  autoplay?: boolean;
  interval?: number;
  "aria-label"?: string;
  labels?: {
    previous?: string;
    next?: string;
    slide?: (name: string, index: number, count: number) => string;
  };
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

function poses(count: number) {
  const rng = createRng(`testimonial-stack:${count}`);
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    return {
      rotate: side * rng.range(3.5, 9),
      x: side * rng.range(4, 14),
      y: rng.range(-6, 10),
    };
  });
}

export function TestimonialStack({
  testimonials,
  autoplay = false,
  interval = 5000,
  labels,
  className,
  style,
  onKeyDown,
  "aria-label": ariaLabel = "Testimonials",
  ...props
}: TestimonialStackProps) {
  const reduced = useReducedMotion() ?? false;
  const count = testimonials.length;
  const [pile, setPile] = useState(() => Array.from({ length: count }, (_, i) => count - 1 - i));
  const [turn, setTurn] = useState(0);
  const [announce, setAnnounce] = useState("");
  const active = pile[pile.length - 1] ?? 0;
  const current = testimonials[active];
  const scatter = poses(count);
  const running = autoplay && !reduced && count > 1;
  const slideLabel = labels?.slide ?? ((name: string, i: number, n: number) => `Testimonial ${i + 1} of ${n}, ${name}`);

  function go(to: number, fromUser: boolean) {
    if (count < 2) return;
    const next = ((to % count) + count) % count;
    if (next === active) return;
    setPile((p) => [...p.filter((i) => i !== next), next]);
    setTurn((t) => t + 1);
    if (fromUser) setAnnounce(slideLabel(testimonials[next].name, next, count));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "ArrowLeft") go(active - 1, true);
    else if (e.key === "ArrowRight") go(active + 1, true);
    else return;
    e.preventDefault();
  }

  if (!current) return null;
  const words = current.quote.split(/\s+/).filter(Boolean);
  const stagger = Math.min(0.035, 0.55 / Math.max(1, words.length));

  return (
    <section
      {...props}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/testimonials grid w-full items-center gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16",
        className,
      )}
      style={{ "--miyuki-testimonial-stack-interval": `${interval}ms`, ...style } as CSSProperties}
    >
      <style href="miyuki-testimonial-stack" precedence="miyuki">{`
        @keyframes miyuki-testimonial-stack-timer { from { opacity: 0; } to { opacity: 0.01; } }
      `}</style>
      <div className="relative mx-auto aspect-square w-full max-w-[20rem] sm:max-w-[22rem]">
        {testimonials.map((person, i) => {
          const depth = pile.indexOf(i);
          const top = i === active;
          const rest = scatter[i];
          const rise = top && turn > 0 && !reduced;
          return (
            <motion.img
              key={i}
              src={person.src}
              alt={top ? person.name : ""}
              aria-hidden={top ? undefined : true}
              draggable={false}
              initial={false}
              animate={
                top
                  ? rise
                    ? {
                        rotate: [rest.rotate, rest.rotate * 0.4, 0],
                        x: [rest.x, rest.x * 0.5, 0],
                        y: [rest.y, -34, 0],
                        scale: [0.94, 1.02, 1],
                      }
                    : { rotate: 0, x: 0, y: 0, scale: 1 }
                  : { rotate: rest.rotate, x: rest.x, y: rest.y, scale: 0.94 }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : rise
                    ? { duration: 0.46, times: [0, 0.42, 1], ease: ["easeOut", [0.22, 1, 0.36, 1]] }
                    : SETTLE
              }
              style={{ zIndex: depth + 1 }}
              className={cn(
                "absolute inset-0 size-full rounded-3xl bg-muted object-cover ring-1 ring-foreground/[0.06]",
                "transition-[box-shadow,filter] duration-300",
                top ? "shadow-xl" : "shadow-md brightness-[0.97]",
              )}
            />
          );
        })}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="grid">
          {testimonials.map((person, i) => (
            <div key={i} aria-hidden="true" className="invisible [grid-area:1/1]">
              <p className="text-lg font-semibold">{person.name}</p>
              <p className="text-sm">{person.designation}</p>
              <p className="mt-6 font-display text-[22px] leading-[1.45] font-semibold tracking-[-0.01em]">
                {person.quote}
              </p>
            </div>
          ))}
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={active}
              className="[grid-area:1/1]"
              exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: 0.12 } }}
            >
              <motion.figcaption
                initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0.15 } : SETTLE}
              >
                <span className="block text-lg font-semibold tracking-[-0.01em] text-foreground">{current.name}</span>
                <span className="block text-sm text-muted-foreground">{current.designation}</span>
              </motion.figcaption>
              <blockquote className="mt-6 font-display text-[22px] leading-[1.45] font-semibold tracking-[-0.01em] text-pretty text-foreground">
                {reduced ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    {current.quote}
                  </motion.span>
                ) : (
                  words.map((word, i) => (
                    <span key={i}>
                      <motion.span
                        className="inline-block"
                        initial={{ opacity: 0, y: 5, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.06 + i * stagger }}
                      >
                        {word}
                      </motion.span>
                      {i < words.length - 1 ? " " : null}
                    </span>
                  ))
                )}
              </blockquote>
            </motion.figure>
          </AnimatePresence>
        </div>

        {count > 1 ? (
          <div className="mt-9 flex items-center gap-2">
            <IconButton
              aria-label={labels?.previous ?? "Previous testimonial"}
              onPress={() => go(active - 1, true)}
              className="rounded-full"
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              aria-label={labels?.next ?? "Next testimonial"}
              onPress={() => go(active + 1, true)}
              className="rounded-full"
            >
              <ChevronRight />
            </IconButton>
            {running ? (
              <span
                key={turn}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none size-px opacity-0",
                  "animate-[miyuki-testimonial-stack-timer_var(--miyuki-testimonial-stack-interval)_linear_forwards]",
                  "group-hover/testimonials:[animation-play-state:paused] group-focus-within/testimonials:[animation-play-state:paused]",
                )}
                onAnimationEnd={() => go(active + 1, false)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <div aria-live={running ? "off" : "polite"} aria-atomic="true" className="sr-only">
        {announce}
      </div>
    </section>
  );
}
