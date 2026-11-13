"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavPillItem {
  name: string;
  href: string;
  icon?: ReactNode;
  current?: boolean;
}

export interface NavPillProps extends Omit<ComponentProps<"nav">, "children"> {
  items: NavPillItem[];
  action?: ReactNode;
  threshold?: number;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const LEAVE = { duration: 0.18, ease: [0.4, 0, 1, 1] } as const;

interface Highlight {
  index: number;
  on: boolean;
  moved: boolean;
  run: number;
}

function useHighlight() {
  const [hl, setHl] = useState<Highlight>({ index: -1, on: false, moved: false, run: 0 });
  const enter = (index: number) =>
    setHl((h) =>
      h.on ? { ...h, index, moved: h.index !== index || h.moved } : { index, on: true, moved: false, run: h.run + 1 },
    );
  const leave = (index?: number) => setHl((h) => (index === undefined || h.index === index ? { ...h, on: false } : h));
  return { hl, enter, leave };
}

export function NavPill({
  items,
  action,
  threshold = 80,
  className,
  onFocus,
  "aria-label": ariaLabel = "Main",
  ...props
}: NavPillProps) {
  const [hidden, setHidden] = useState(false);
  const { hl, enter, leave } = useHighlight();
  const reduce = useReducedMotion();
  const id = useId();

  useEffect(() => {
    let last = Math.max(0, window.scrollY);
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - last;
      last = y;
      if (y <= threshold) setHidden(false);
      else if (delta > 1) setHidden(true);
      else if (delta < 0) setHidden(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      data-hidden={hidden || undefined}
      onFocus={(event) => {
        setHidden(false);
        onFocus?.(event);
      }}
      className={cn("pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-3", className)}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={hidden ? { opacity: 0, y: reduce ? 0 : -24 } : { opacity: 1, y: 0 }}
        transition={hidden ? LEAVE : reduce ? { duration: 0.15 } : SETTLE}
        className={cn(
          "flex max-w-full items-center gap-1 rounded-full border border-border bg-card/70 p-1 shadow-md backdrop-blur-xl",
          !hidden && "pointer-events-auto",
        )}
      >
        <LayoutGroup id={id}>
          <ul className="flex min-w-0 items-center" onPointerLeave={() => leave()}>
            {items.map((item, i) => (
              <li key={`${item.href}-${item.name}`} className="flex">
                <a
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  onPointerEnter={() => enter(i)}
                  onFocus={() => enter(i)}
                  onBlur={() => leave(i)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-none select-none",
                    "text-foreground/70 transition-[color,box-shadow] duration-150 ease-settle hover:text-foreground",
                    "aria-[current=page]:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
                    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
                    item.icon != null && "max-sm:w-10 max-sm:px-0",
                  )}
                >
                  {hl.index === i && (
                    <motion.span
                      layoutId={`highlight-${hl.run}`}
                      aria-hidden="true"
                      className="absolute inset-0 bg-accent"
                      style={{ borderRadius: 999 }}
                      initial={hl.moved ? false : { opacity: 0 }}
                      animate={{ opacity: hl.on ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { ...SETTLE, opacity: { duration: hl.on ? 0.15 : 0.12 } }}
                    />
                  )}
                  {item.icon != null && (
                    <span aria-hidden="true" className="relative z-10 flex sm:hidden">
                      {item.icon}
                    </span>
                  )}
                  <span className={cn("relative z-10", item.icon != null && "max-sm:sr-only")}>{item.name}</span>
                  {item.current && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[3px] left-1/2 z-10 size-1 -translate-x-1/2 rounded-full bg-brand"
                    />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </LayoutGroup>
        {action != null && (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
            <div className="flex shrink-0 items-center">{action}</div>
          </>
        )}
      </motion.div>
    </nav>
  );
}
