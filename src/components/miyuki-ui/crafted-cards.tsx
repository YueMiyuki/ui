"use client";

import { LayoutGrid } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface FeatureDeckCard {
  id: string;
  title: string;
  summary: string;
  content: ReactNode;
  src?: string;
  alt?: string;
}

export interface FeatureDeckProps extends Omit<ComponentProps<"div">, "children"> {
  cards: FeatureDeckCard[];
  backLabel?: string;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const INK = "oklch(0.16 0.03 250";

type Form = "grid" | "main" | "tile";

export function FeatureDeck({
  cards,
  backLabel = "Show all",
  className,
  style,
  onKeyDown,
  ...props
}: FeatureDeckProps) {
  const reduced = useReducedMotion() ?? false;
  const group = useId();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [deck, setDeck] = useState<{ w: number; h: number } | null>(null);
  const pendingFocus = useRef<{ to: "main" } | { to: "card"; id: string } | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const mainRegion = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDeck({ w: Math.ceil(width), h: Math.ceil(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const next = pendingFocus.current;
    if (!next) return;
    pendingFocus.current = null;
    if (next.to === "main") mainRegion.current?.focus({ preventScroll: true });
    else buttons.current.get(next.id)?.focus({ preventScroll: true });
  }, [active]);

  const current = cards.find((c) => c.id === active) ?? null;
  const others = current ? cards.filter((c) => c.id !== current.id) : [];
  const columns = 2;
  const rows = Math.ceil(cards.length / columns);

  const gridStyle: CSSProperties = current
    ? {
        gridTemplateColumns: `repeat(${Math.max(1, others.length)}, minmax(0, 1fr))`,
        gridTemplateRows: "minmax(0, 1fr) 5.5rem",
      }
    : {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      };

  function choose(id: string) {
    pendingFocus.current = { to: "main" };
    setActive(id);
  }

  function back() {
    if (!active) return;
    pendingFocus.current = { to: "card", id: active };
    setActive(null);
  }

  return (
    <div
      ref={root}
      {...props}
      className={cn("@container grid gap-3", className)}
      style={
        {
          ...gridStyle,
          "--miyuki-crafted-cards-w": deck ? `${deck.w}px` : "100%",
          "--miyuki-crafted-cards-h": deck ? `${deck.h}px` : "100%",
          ...style,
        } as CSSProperties
      }
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.key === "Escape" && active) {
          e.preventDefault();
          back();
        }
      }}
    >
      <LayoutGroup id={group}>
        {cards.map((card, i) => {
          const form: Form = !current ? "grid" : card.id === current.id ? "main" : "tile";
          const place: CSSProperties = !current
            ? { gridColumn: (i % columns) + 1, gridRow: Math.floor(i / columns) + 1 }
            : form === "main"
              ? { gridColumn: "1 / -1", gridRow: 1 }
              : { gridColumn: others.findIndex((o) => o.id === card.id) + 1, gridRow: 2 };
          return (
            <motion.div
              key={card.id}
              layout={!reduced}
              transition={SETTLE}
              style={{ ...place, borderRadius: form === "tile" ? 14 : 18 }}
              className={cn(
                "relative isolate min-h-0 min-w-0 overflow-clip bg-muted shadow-sm ring-1 ring-foreground/10 will-change-transform",
                "has-[>button:focus-visible]:ring-[3px] has-[>button:focus-visible]:ring-ring",
                form === "main" && "shadow-xl",
              )}
            >
              {card.src ? (
                <motion.img
                  layout={!reduced}
                  transition={SETTLE}
                  src={card.src}
                  alt={card.alt ?? ""}
                  draggable={false}
                  className={cn(
                    "absolute top-1/2 left-1/2 max-w-none object-cover transition-[filter] duration-300 will-change-transform",
                    form === "tile" && "brightness-[0.92]",
                  )}
                  style={{
                    width: "var(--miyuki-crafted-cards-w)",
                    height: "var(--miyuki-crafted-cards-h)",
                    marginLeft: "calc(var(--miyuki-crafted-cards-w) / -2)",
                    marginTop: "calc(var(--miyuki-crafted-cards-h) / -2)",
                  }}
                />
              ) : null}
              <AnimatePresence initial={false} mode="popLayout">
                {form === "main" ? (
                  <motion.div
                    key="main"
                    ref={(node: HTMLDivElement | null) => {
                      if (node) mainRegion.current = node;
                    }}
                    role="region"
                    aria-label={card.title}
                    tabIndex={-1}
                    layout={!reduced}
                    transition={SETTLE}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.24, delay: reduced ? 0 : 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="dark absolute inset-0 flex items-end text-foreground outline-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${INK} / 0.86), ${INK} / 0.62) 38%, ${INK} / 0) 72%), linear-gradient(to top, ${INK} / 0.5), ${INK} / 0) 45%)`,
                    }}
                  >
                    <div className="w-full max-w-[27rem] p-6 @xl:p-8">
                      <h3 className="font-display text-[1.75rem] leading-[1.08] font-semibold tracking-[-0.025em] text-balance @xl:text-[2rem]">
                        {card.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-foreground/80">{card.summary}</p>
                      <div className="mt-5 text-sm/6 text-foreground/85">{card.content}</div>
                    </div>
                    <button
                      type="button"
                      onClick={back}
                      className="absolute top-4 right-4 inline-flex h-8 items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3 text-[13px] font-medium text-foreground shadow-sm outline-none transition-colors duration-150 hover:bg-background/85 focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-3.5"
                    >
                      <LayoutGrid aria-hidden="true" />
                      {backLabel}
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key={form}
                    ref={(node: HTMLButtonElement | null) => {
                      if (node) buttons.current.set(card.id, node);
                    }}
                    type="button"
                    layout={!reduced}
                    transition={SETTLE}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.22, delay: reduced ? 0 : 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    onClick={() => choose(card.id)}
                    className="group/face dark absolute inset-0 flex cursor-pointer flex-col justify-end text-left text-foreground outline-none"
                    style={{
                      backgroundImage:
                        form === "tile"
                          ? `linear-gradient(to top, ${INK} / 0.78), ${INK} / 0.2))`
                          : `linear-gradient(to top, ${INK} / 0.8), ${INK} / 0.35) 40%, ${INK} / 0) 70%)`,
                    }}
                  >
                    {form === "grid" ? (
                      <span className="block p-5 @xl:p-6">
                        <span className="block font-display text-xl leading-tight font-semibold tracking-[-0.02em] transition-transform duration-300 ease-settle group-hover/face:-translate-y-0.5">
                          {card.title}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[13px] text-foreground/80">{card.summary}</span>
                      </span>
                    ) : (
                      <span className="block truncate px-3.5 pb-3 text-[13px] font-medium">{card.title}</span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </LayoutGroup>
    </div>
  );
}
