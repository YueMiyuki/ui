"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export interface StoryCard {
  category: string;
  title: string;
  src: string;
  content: ReactNode;
}

export interface StoryCardsCarouselProps extends Omit<ComponentProps<"section">, "children"> {
  items: StoryCard[];
  "aria-label"?: string;
  labels?: {
    previous?: string;
    next?: string;
    close?: string;
    position?: (first: number, last: number, count: number) => string;
  };
  backdropBlur?: boolean;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const MORPH: Transition = { type: "spring", stiffness: 340, damping: 34, mass: 0.9 };

const MotionModal = motion.create(Modal);

const cover = "absolute inset-0 m-auto aspect-[4/3] w-[max(100cqw,133.34cqh)] max-w-none object-cover";

export function StoryCardsCarousel({
  items,
  labels,
  backdropBlur = false,
  className,
  onKeyDown,
  "aria-label": ariaLabel = "Stories",
  ...props
}: StoryCardsCarouselProps) {
  const group = useId();
  const titleId = useId();
  const reduced = useReducedMotion() ?? false;
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const last = useRef<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [announce, setAnnounce] = useState("");
  const count = items.length;
  const active = open == null ? null : items[open];

  const lid = (part: string, i: number) => (reduced ? undefined : `${part}-${i}`);

  const step = useCallback(() => {
    const el = track.current;
    const first = cards.current[0];
    if (!el || !first) return 0;
    return first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || "0");
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft <= 1;
      const end = el.scrollLeft >= max - 1;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const onScroll = () => {
      measure();
      clearTimeout(settle);
      settle = setTimeout(() => {
        const s = step();
        if (s <= 0) return;
        const first = Math.round(el.scrollLeft / s);
        const shown = Math.max(1, Math.floor((el.clientWidth + 1) / s));
        const end = Math.min(count, first + shown);
        setAnnounce(labels?.position?.(first + 1, end, count) ?? `Stories ${first + 1} to ${end} of ${count}`);
      }, 200);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(settle);
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [count, labels, step]);

  function scrollByCards(direction: 1 | -1) {
    const el = track.current;
    const s = step();
    if (!el || s <= 0) return;
    const pages = Math.max(1, Math.floor((el.clientWidth + 1) / s) - 1);
    el.scrollBy({ left: direction * pages * s, behavior: reduced ? "auto" : "smooth" });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const forward = e.key === "ArrowRight";
    const at = cards.current.indexOf(e.target as HTMLButtonElement);
    e.preventDefault();
    if (at >= 0) {
      const next = cards.current[Math.min(count - 1, Math.max(0, at + (forward ? 1 : -1)))];
      next?.focus({ preventScroll: true });
      next?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "nearest" });
    } else scrollByCards(forward ? 1 : -1);
  }

  function show(i: number) {
    last.current = i;
    setOpen(i);
  }

  return (
    <section
      {...props}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex w-full min-w-0 flex-col gap-5", className)}
    >
      <LayoutGroup id={group}>
        <motion.div
          ref={track}
          layoutScroll
          className={cn(
            "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[var(--miyuki-story-cards-inset,1.5rem)] py-3",
            "scroll-px-[var(--miyuki-story-cards-inset,1.5rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="shrink-0 snap-start"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={reduced ? { duration: 0.2 } : { ...SETTLE, delay: Math.min(i * 0.06, 0.36) }}
            >
              <motion.button
                ref={(node: HTMLButtonElement | null) => {
                  cards.current[i] = node;
                }}
                type="button"
                layoutId={lid("card", i)}
                transition={MORPH}
                onClick={() => show(i)}
                style={{ borderRadius: 22 }}
                className={cn(
                  "group/card relative block aspect-[2/3] w-56 cursor-default overflow-hidden bg-muted text-left [container-type:size] sm:w-60",
                  "shadow-sm outline-none transition-shadow duration-200 ease-settle hover:shadow-md",
                  "focus-visible:ring-[3px] focus-visible:ring-ring",
                )}
              >
                <motion.img
                  layoutId={lid("image", i)}
                  transition={MORPH}
                  src={item.src}
                  alt=""
                  draggable={false}
                  className={cover}
                />
                <span className="dark absolute inset-x-0 top-0 block bg-linear-to-b from-[oklch(0.16_0.03_250/0.72)] via-[oklch(0.16_0.03_250/0.32)] to-transparent px-5 pt-5 pb-20 text-foreground">
                  <span className="block text-[13px] font-medium text-foreground/80">{item.category}</span>
                  <span className="mt-1 block font-display text-xl leading-tight font-semibold tracking-[-0.02em] text-balance">
                    {item.title}
                  </span>
                </span>
              </motion.button>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex justify-end gap-2 px-[var(--miyuki-story-cards-inset,1.5rem)]">
          <IconButton
            aria-label={labels?.previous ?? "Previous stories"}
            isDisabled={edges.start}
            onPress={() => scrollByCards(-1)}
            className="rounded-full"
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            aria-label={labels?.next ?? "Next stories"}
            isDisabled={edges.end}
            onPress={() => scrollByCards(1)}
            className="rounded-full"
          >
            <ChevronRight />
          </IconButton>
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announce}
        </div>

        <AnimatePresence
          onExitComplete={() => {
            const i = last.current;
            if (i != null) cards.current[i]?.focus({ preventScroll: true });
          }}
        >
          {active && open != null ? (
            <ModalOverlay
              key={open}
              isOpen
              isDismissable
              onOpenChange={(isOpen) => {
                if (!isOpen) setOpen(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 bg-foreground/25 dark:bg-background/65",
                  backdropBlur && "backdrop-blur-sm",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
              />
              <MotionModal
                layoutId={lid("card", open)}
                transition={MORPH}
                style={{ borderRadius: 22 }}
                {...(reduced
                  ? {
                      initial: { opacity: 0 },
                      animate: { opacity: 1, transition: { duration: 0.18 } },
                      exit: { opacity: 0, transition: { duration: 0.12 } },
                    }
                  : {})}
                className="relative w-full max-w-3xl overflow-hidden border border-border bg-popover text-popover-foreground shadow-xl outline-none will-change-transform"
              >
                <Dialog
                  aria-labelledby={titleId}
                  render={(domProps) => <article {...domProps} role="dialog" aria-modal="true" />}
                  className="max-h-[calc(100dvh-2rem)] overflow-y-auto outline-none sm:max-h-[calc(100dvh-3rem)]"
                >
                  {({ close }) => (
                    <>
                      <div className="relative h-[min(22rem,48dvh)] overflow-hidden [container-type:size]">
                        <motion.img
                          layoutId={lid("image", open)}
                          transition={MORPH}
                          src={active.src}
                          alt=""
                          draggable={false}
                          className={cover}
                        />
                        <motion.div
                          className="dark absolute inset-x-0 top-0 bg-linear-to-b from-[oklch(0.16_0.03_250/0.72)] via-[oklch(0.16_0.03_250/0.3)] to-transparent px-6 pt-6 pb-24 text-foreground sm:px-10 sm:pt-8"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { duration: 0.24, delay: reduced ? 0 : 0.12 } }}
                          exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        >
                          <p className="text-sm font-medium text-foreground/80">{active.category}</p>
                          <h2
                            id={titleId}
                            className="mt-1.5 max-w-xl font-display text-3xl leading-[1.08] font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
                          >
                            {active.title}
                          </h2>
                        </motion.div>
                        <motion.div
                          className="absolute top-4 right-4"
                          initial={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                          animate={{ opacity: 1, scale: 1, transition: { ...SETTLE, delay: reduced ? 0 : 0.14 } }}
                          exit={{ opacity: 0, transition: { duration: 0.08 } }}
                        >
                          <IconButton
                            aria-label={labels?.close ?? "Close"}
                            onPress={close}
                            className="rounded-full border-transparent bg-popover/92"
                          >
                            <X />
                          </IconButton>
                        </motion.div>
                      </div>
                      <motion.div
                        className="px-6 pt-7 pb-9 text-base/7 text-muted-foreground sm:px-10 [&_p+p]:mt-4"
                        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { ...SETTLE, opacity: { duration: 0.24, delay: 0.1 }, delay: 0.06 },
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.08 } }}
                      >
                        {active.content}
                      </motion.div>
                    </>
                  )}
                </Dialog>
              </MotionModal>
            </ModalOverlay>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
