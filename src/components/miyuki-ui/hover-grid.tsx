"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface HoverGridItem {
  title: string;
  description: string;
  icon?: LucideIcon;
  href?: string;
}

export interface HoverGridProps extends Omit<ComponentProps<"div">, "children"> {
  items: HoverGridItem[];
  columns?: number;
}

const GLIDE = { type: "spring", stiffness: 420, damping: 36 } as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const INSET = 6;

export function HoverGrid({ items, columns = 3, className, style, ...props }: HoverGridProps) {
  const reduced = useReducedMotion() ?? false;
  const list = useRef<HTMLUListElement>(null);
  const cells = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActiveIndex] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [fresh, setFresh] = useState(true);
  const [ringed, setRinged] = useState(false);
  const cols = Math.max(1, Math.round(columns));

  const measure = (index: number): Box | null => {
    const ul = list.current;
    const li = cells.current[index];
    if (!ul || !li) return null;
    return {
      x: ul.offsetLeft + li.offsetLeft + INSET,
      y: ul.offsetTop + li.offsetTop + INSET,
      width: li.offsetWidth - INSET * 2,
      height: li.offsetHeight - INSET * 2,
    };
  };

  const setActive = (index: number | null, ring = false) => {
    setRinged(ring);
    if (index === active) return;
    if (index !== null) {
      const next = measure(index);
      if (next) setBox(next);
      setFresh(active === null);
    }
    setActiveIndex(index);
  };

  useEffect(() => {
    const ul = list.current;
    if (!ul || active === null) return;
    const observer = new ResizeObserver(() => {
      const next = measure(active);
      if (next) {
        setFresh(true);
        setBox(next);
      }
    });
    observer.observe(ul);
    return () => observer.disconnect();
  }, [active]);

  const glide = reduced || fresh ? { duration: 0 } : GLIDE;

  return (
    <div
      {...props}
      className={cn("@container w-full", className)}
      style={{ "--miyuki-hover-grid-cols": `repeat(${cols}, minmax(0, 1fr))`, ...style } as CSSProperties}
    >
      <div className="relative overflow-hidden">
        <motion.span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 left-0 rounded-xl bg-accent",
            ringed && active !== null && "ring-[3px] ring-ring",
          )}
          initial={false}
          animate={{
            x: box?.x ?? 0,
            y: box?.y ?? 0,
            width: box?.width ?? 0,
            height: box?.height ?? 0,
            opacity: active === null ? 0 : 1,
          }}
          transition={{
            x: glide,
            y: glide,
            width: glide,
            height: glide,
            opacity: active === null ? { duration: 0.18, delay: 0.06 } : { duration: 0.15 },
          }}
        />
        <ul
          ref={list}
          className={cn(
            "relative -mt-px -ml-px grid w-[calc(100%+1px)] grid-cols-1",
            cols >= 2 && "@lg:grid-cols-2",
            cols >= 3 && "@3xl:grid-cols-(--miyuki-hover-grid-cols)",
          )}
          onPointerLeave={() => setActive(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
          }}
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            const body = (
              <span className="relative flex flex-col">
                {Icon ? <Icon aria-hidden="true" className="size-5 text-brand-strong" strokeWidth={1.75} /> : null}
                <span className={cn("text-[15px] font-semibold tracking-[-0.01em]", Icon && "mt-5")}>{item.title}</span>
                <span className="mt-1.5 text-sm/6 text-muted-foreground">{item.description}</span>
              </span>
            );
            const itemClass = "relative block h-full p-6 outline-none sm:p-7";
            return (
              <li
                key={`${item.title}-${i}`}
                ref={(el) => {
                  cells.current[i] = el;
                }}
                className="border-t border-l border-border"
                onPointerEnter={() => setActive(i)}
                onFocus={(e) => setActive(i, e.target instanceof HTMLElement && e.target.matches(":focus-visible"))}
              >
                {item.href ? (
                  <a href={item.href} className={itemClass}>
                    {body}
                  </a>
                ) : (
                  <div className={itemClass}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
