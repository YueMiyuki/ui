"use client";

import { X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export interface ZoomGridCard {
  id: string;
  src: string;
  title: string;
  description: ReactNode;
  alt?: string;
  className?: string;
}

export interface ZoomGridProps extends Omit<ComponentProps<"div">, "children"> {
  cards: ZoomGridCard[];
  closeLabel?: string;
  backdropBlur?: boolean;
}

const MORPH: Transition = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 };
const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const SHADE = "bg-linear-to-t from-[oklch(0.17_0.03_250/0.86)] via-[oklch(0.17_0.03_250/0.5)] to-transparent";

export function ZoomGrid({ cards, closeLabel = "Close", backdropBlur = false, className, ...props }: ZoomGridProps) {
  const group = useId();
  const titleId = useId();
  const reduced = useReducedMotion() ?? false;
  const [openId, setOpenId] = useState<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastId = useRef<string | null>(null);
  const active = cards.find((card) => card.id === openId) ?? null;

  const lid = (part: string, id: string) => (reduced ? undefined : `${part}-${id}`);

  useEffect(() => {
    if (!openId) return;
    closeButton.current?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (!dialog.current?.contains(event.target as Node)) setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openId]);

  function open(id: string) {
    lastId.current = id;
    setOpenId(id);
  }

  return (
    <div {...props} className={cn("@container relative isolate", className)}>
      <LayoutGroup id={group}>
        <div
          inert={active ? true : undefined}
          className="grid h-full auto-rows-[minmax(7rem,1fr)] grid-cols-1 gap-3 @2xl:grid-cols-3 @2xl:gap-4"
        >
          {cards.map((card) => (
            <div key={card.id} className={cn("relative min-h-0", card.className)}>
              {openId === card.id ? (
                <div className="size-full rounded-2xl bg-muted" />
              ) : (
                <motion.button
                  ref={(node: HTMLButtonElement | null) => {
                    if (node) triggers.current.set(card.id, node);
                    else triggers.current.delete(card.id);
                  }}
                  type="button"
                  aria-haspopup="dialog"
                  layoutId={lid("card", card.id)}
                  transition={MORPH}
                  style={{ borderRadius: 18 }}
                  onClick={() => open(card.id)}
                  className={cn(
                    "group/card relative block size-full cursor-pointer overflow-clip bg-muted text-left shadow-sm outline-none",
                    "transition-shadow duration-200 ease-settle hover:shadow-md",
                    "focus-visible:ring-[3px] focus-visible:ring-ring",
                  )}
                >
                  <motion.img
                    layoutId={lid("image", card.id)}
                    transition={MORPH}
                    src={card.src}
                    alt={card.alt ?? ""}
                    draggable={false}
                    className="absolute inset-0 size-full object-cover"
                  />
                  <span className={cn("dark absolute inset-x-0 bottom-0 px-4 pt-12 pb-3.5 text-foreground", SHADE)}>
                    <span className="block text-sm font-semibold tracking-[-0.005em]">{card.title}</span>
                  </span>
                </motion.button>
              )}
            </div>
          ))}
        </div>

        <AnimatePresence
          onExitComplete={() => {
            const id = lastId.current;
            if (id) triggers.current.get(id)?.focus({ preventScroll: true });
          }}
        >
          {active ? (
            <div
              key={active.id}
              className="absolute inset-0 z-10 grid place-items-center p-4 @2xl:p-8"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setOpenId(null);
                } else if (event.key === "Tab") {
                  trapFocus(event, dialog.current);
                }
              }}
            >
              <motion.div
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 bg-foreground/30 dark:bg-background/70",
                  backdropBlur && "backdrop-blur-sm",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.22 } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
              />
              <motion.div
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                layoutId={lid("card", active.id)}
                transition={MORPH}
                style={{ borderRadius: 18 }}
                {...(reduced
                  ? {
                      initial: { opacity: 0 },
                      animate: { opacity: 1, transition: { duration: 0.18 } },
                      exit: { opacity: 0, transition: { duration: 0.12 } },
                    }
                  : {})}
                className="relative aspect-[4/3] max-h-full w-full max-w-2xl overflow-clip bg-muted shadow-2xl @2xl:aspect-[16/10]"
              >
                <motion.img
                  layoutId={lid("image", active.id)}
                  transition={MORPH}
                  src={active.src}
                  alt={active.alt ?? ""}
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
                <motion.div
                  className={cn(
                    "dark absolute inset-x-0 bottom-0 px-5 pt-28 pb-5 text-foreground @2xl:px-7 @2xl:pb-6",
                    SHADE,
                  )}
                  initial={{ opacity: 0, y: reduced ? 0 : 18 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { ...SETTLE, opacity: { duration: 0.22, delay: 0.12 }, delay: 0.1 },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <h3
                    id={titleId}
                    className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em] @2xl:text-3xl"
                  >
                    {active.title}
                  </h3>
                  <div className="mt-2 max-w-[52ch] text-sm/6 text-foreground/85 @2xl:text-base/7">
                    {active.description}
                  </div>
                </motion.div>
                <motion.div
                  className="absolute top-3 right-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.14 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  <Button
                    ref={closeButton}
                    variant="secondary"
                    size="sm"
                    aria-label={closeLabel}
                    iconStart={<X />}
                    onPress={() => setOpenId(null)}
                    className="rounded-full border-transparent bg-popover/92"
                  />
                </motion.div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (!container) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && (current === first || !container.contains(current))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (current === last || !container.contains(current))) {
    event.preventDefault();
    first.focus();
  }
}
