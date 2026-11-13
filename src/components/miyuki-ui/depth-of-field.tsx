"use client";

import { type ComponentProps, type CSSProperties, type FocusEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DepthOfFieldCard {
  title: string;
  subtitle?: string;
  src: string;
  alt?: string;
  href?: string;
}

export interface DepthOfFieldProps extends Omit<ComponentProps<"div">, "children"> {
  cards: DepthOfFieldCard[];
  columns?: 2 | 3 | 4;
}

const COLUMNS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 @md:grid-cols-2",
  3: "grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3",
  4: "grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-4",
};

interface Focus {
  index: number;
  blur: number[];
}

export function DepthOfField({ cards, columns = 3, className, onPointerLeave, onBlur, ...props }: DepthOfFieldProps) {
  const [focus, setFocus] = useState<Focus | null>(null);
  const items = useRef<(HTMLElement | null)[]>([]);

  function activate(index: number) {
    if (focus?.index === index) return;
    const origin = items.current[index]?.getBoundingClientRect();
    if (!origin) return;
    const blur = cards.map((_, i) => {
      const r = items.current[i]?.getBoundingClientRect();
      if (!r || i === index) return 0;
      const d = Math.hypot((r.left - origin.left) / origin.width, (r.top - origin.top) / origin.height);
      return Math.min(5, 2 + Math.max(0, d - 1.1) * 3);
    });
    setFocus({ index, blur });
  }

  return (
    <div
      {...props}
      className={cn("@container", className)}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (!e.currentTarget.querySelector(":focus-visible")) setFocus(null);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(null);
      }}
    >
      <ul className={cn("grid gap-4", COLUMNS[columns])}>
        {cards.map((card, i) => {
          const state = focus == null ? "idle" : focus.index === i ? "active" : "dimmed";
          const Tag = card.href ? "a" : "figure";
          return (
            <li key={`${card.title}-${i}`}>
              <Tag
                ref={(node: HTMLElement | null) => {
                  items.current[i] = node;
                }}
                {...(card.href ? { href: card.href } : { tabIndex: 0 })}
                data-state={state}
                style={{ "--miyuki-depth-of-field-blur": `${(focus?.blur[i] ?? 0).toFixed(2)}px` } as CSSProperties}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch") activate(i);
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) activate(i);
                }}
                className={cn(
                  "group/card relative isolate block aspect-[4/3] overflow-clip rounded-xl bg-muted shadow-sm outline-none",
                  "transition-[filter,opacity,box-shadow] duration-300 ease-settle",
                  "data-[state=active]:shadow-md",
                  "data-[state=dimmed]:opacity-60 data-[state=dimmed]:[filter:blur(var(--miyuki-depth-of-field-blur))]",
                  "focus-visible:ring-[3px] focus-visible:ring-ring",
                )}
              >
                <img
                  src={card.src}
                  alt={card.alt ?? ""}
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
                <div
                  className={cn(
                    "dark absolute inset-x-0 bottom-0 flex flex-col justify-end bg-linear-to-t from-[oklch(0.17_0.03_250/0.88)] via-[oklch(0.17_0.03_250/0.6)] to-transparent px-4 pt-16 pb-3.5 text-foreground",
                    "translate-y-full opacity-0 transition-[translate,opacity] duration-300 ease-settle",
                    "group-data-[state=active]/card:translate-y-0 group-data-[state=active]/card:opacity-100",
                    "motion-reduce:translate-y-0 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
                  )}
                >
                  {Tag === "figure" ? (
                    <figcaption>
                      <Caption card={card} />
                    </figcaption>
                  ) : (
                    <Caption card={card} />
                  )}
                </div>
              </Tag>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Caption({ card }: { card: DepthOfFieldCard }) {
  return (
    <>
      <span className="block text-base font-semibold tracking-[-0.01em]">{card.title}</span>
      {card.subtitle ? <span className="mt-0.5 block text-[13px] text-foreground/85">{card.subtitle}</span> : null}
    </>
  );
}
