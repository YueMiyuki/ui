"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type FocusEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FanCardsProps extends Omit<ComponentProps<"div">, "title"> {
  cards: ReactNode[];
  title?: ReactNode;
  spread?: number;
  rotation?: number;
  cardWidth?: number;
  cardHeight?: number;
}

const OPEN = { type: "spring", stiffness: 300, damping: 26 } as const;
const CLOSE = { type: "spring", stiffness: 420, damping: 34 } as const;

export function FanCards({
  cards,
  title,
  spread = 132,
  rotation = 7,
  cardWidth = 180,
  cardHeight = 240,
  className,
  "aria-label": ariaLabel,
  ...props
}: FanCardsProps) {
  const reduced = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<string>("mouse");
  const [open, setOpen] = useState(false);
  const [sweep, setSweep] = useState(0);
  const [room, setRoom] = useState<number | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setRoom(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = cards.length;
  const mid = (count - 1) / 2;
  const fit = room != null && count > 1 ? Math.max(24, (room - cardWidth - 72) / (count - 1)) : spread;
  const step = Math.min(spread, fit);

  function show(next: boolean) {
    if (next === open) return;
    if (next && !reduced) setSweep((s) => s + 1);
    setOpen(next);
  }

  const pose = (i: number) => {
    const c = i - mid;
    if (open) {
      return { x: c * step, y: c * c * 5 - 14, rotate: c * rotation, scale: 1 };
    }
    const d = count - 1 - i;
    return { x: -d * 2, y: -d * 5, rotate: (d % 2 === 0 ? 1 : -1) * d * 1.3, scale: 1 - d * 0.025 };
  };

  return (
    <div {...props} className={cn("flex w-full flex-col items-center", className)}>
      <div ref={stage} className="relative w-full" style={{ height: cardHeight + 44 }}>
        <div
          role="group"
          tabIndex={0}
          aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
          data-open={open || undefined}
          className="group/fan absolute top-8 left-1/2 rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          style={{ width: cardWidth, height: cardHeight, marginLeft: -cardWidth / 2 }}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
          }}
          onPointerEnter={(e) => {
            lastPointer.current = e.pointerType;
            if (e.pointerType !== "touch") show(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") show(false);
          }}
          onClick={() => {
            if (lastPointer.current === "touch") show(!open);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (e.target !== e.currentTarget) return;
              e.preventDefault();
              show(!open);
            } else if (e.key === "Escape") show(false);
          }}
          onFocus={(e: FocusEvent<HTMLDivElement>) => {
            if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) show(true);
          }}
          onBlur={(e: FocusEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) show(false);
          }}
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              initial={false}
              animate={pose(i)}
              transition={
                reduced
                  ? { duration: 0.15 }
                  : open
                    ? { ...OPEN, delay: Math.abs(i - mid) * 0.025 }
                    : { ...CLOSE, delay: (count - 1 - Math.abs(i - mid)) * 0.015 }
              }
              style={{ transformOrigin: "50% 90%", zIndex: i }}
            >
              <div className="size-full transition-transform duration-200 ease-settle group-data-[open]/fan:hover:-translate-y-1.5 motion-reduce:transition-none">
                {card}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {title ? (
        <h3
          className={cn(
            "relative mt-8 text-center font-display text-3xl leading-tight font-semibold tracking-[-0.025em] text-balance",
            "[--miyuki-fan-cards-band:var(--brand)] dark:[--miyuki-fan-cards-band:color-mix(in_oklab,var(--brand)_55%,white)]",
          )}
        >
          <span>{title}</span>
          {sweep > 0 ? (
            <span
              key={sweep}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-[miyuki-fan-cards-band_1.5s_cubic-bezier(0.45,0.05,0.25,1)_both] bg-clip-text text-transparent dark:drop-shadow-[0_0_10px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, transparent 38%, var(--miyuki-fan-cards-band) 47%, var(--miyuki-fan-cards-band) 53%, transparent 62%)",
                backgroundSize: "260% 100%",
                backgroundRepeat: "no-repeat",
              }}
            >
              {title}
            </span>
          ) : null}
          <style href="miyuki-fan-cards" precedence="miyuki">{`
@keyframes miyuki-fan-cards-band {
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
}
`}</style>
        </h3>
      ) : null}
    </div>
  );
}
