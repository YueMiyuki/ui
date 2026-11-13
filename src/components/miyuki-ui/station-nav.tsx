"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface StationNavItem {
  id: string;
  label: ReactNode;
  detail?: ReactNode;
}

export interface StationNavProps extends Omit<ComponentProps<"nav">, "children"> {
  items: StationNavItem[];
  container?: RefObject<HTMLElement | null>;
  color?: string;
}

const RIDE = { stiffness: 210, damping: 30, mass: 0.9 };
const FILL = { type: "spring", stiffness: 500, damping: 30 } as const;
const DWELL = 0.55;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function scrollerOf(container?: RefObject<HTMLElement | null>) {
  return container?.current ?? null;
}

function findSection(id: string, scroller: HTMLElement | null) {
  if (typeof document === "undefined") return null;
  if (scroller) return scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  return document.getElementById(id);
}

function view(scroller: HTMLElement | null) {
  const el = scroller ?? document.scrollingElement ?? document.documentElement;
  const top = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
  const height = scroller ? scroller.clientHeight : window.innerHeight;
  return { el, top, height, range: Math.max(0, el.scrollHeight - height) };
}

export function StationNav({
  items,
  container,
  color = "var(--brand)",
  className,
  style,
  "aria-label": ariaLabel = "On this page",
  ...props
}: StationNavProps) {
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLElement>(null);
  const ringRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const itemsRef = useRef(items);
  const placed = useRef(false);
  const stops = useRef<number[]>([]);
  const lock = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);
  const [moving, setMoving] = useState(0);

  const target = useMotionValue(0);
  const ride = useSpring(target, RIDE);
  const trainY = reduce ? target : ride;
  const fill = useTransform(trainY, (y) => {
    const s = stops.current;
    if (s.length < 2) return 0;
    return clamp((y - s[0]) / (s[s.length - 1] - s[0]), 0, 1);
  });

  const update = useCallback(() => {
    const s = stops.current;
    if (s.length === 0) return;
    const scroller = scrollerOf(container);
    const v = view(scroller);
    const progress = v.range > 0 ? clamp(v.el.scrollTop / v.range, 0, 1) : 1;
    const line = v.top + v.height * (0.3 + 0.7 * progress ** 5);
    const tops = itemsRef.current.map(
      (item) => findSection(item.id, scroller)?.getBoundingClientRect().top ?? Infinity,
    );

    let index = 0;
    for (let i = 0; i < tops.length; i++) if (tops[i] <= line) index = i;
    let at = index;
    if (tops[index] <= line && index < tops.length - 1 && Number.isFinite(tops[index + 1])) {
      const span = tops[index + 1] - tops[index];
      const t = span > 0 ? clamp((line - tops[index]) / span, 0, 1) : 0;
      at = index + smooth(clamp((t - DWELL) / (1 - DWELL), 0, 1));
    }

    if (lock.current != null) {
      index = lock.current;
      at = index;
    }
    if (reduce) at = index;

    const lo = Math.floor(at);
    const hi = Math.min(s.length - 1, lo + 1);
    const y = s[lo] + (s[hi] - s[lo]) * (at - lo);
    if (!reduce && placed.current && Math.abs(y - target.get()) > 0.5) setMoving(Math.sign(y - target.get()));
    target.set(y);
    setCurrent(index);
  }, [container, reduce, target]);

  const count = items.length;
  const ids = items.map((item) => item.id).join("\n");

  const measure = useCallback(() => {
    const next = ringRefs.current.slice(0, count).map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0));
    stops.current = next;
    if (next.length > 0) {
      const top = next[0];
      const height = next[next.length - 1] - top;
      setRail((prev) => (prev && prev.top === top && prev.height === height ? prev : { top, height }));
    }
    update();
    if (!placed.current) {
      placed.current = true;
      ride.jump(target.get());
    }
  }, [count, update, ride, target]);

  useLayoutEffect(() => {
    itemsRef.current = items;
  });

  useLayoutEffect(() => {
    measure();
  }, [measure, ids]);

  useEffect(() => {
    const scroller = scrollerOf(container);
    const scrollTarget: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const release = () => {
      lock.current = null;
    };
    const keys = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) release();
    };
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    scrollTarget.addEventListener("wheel", release, { passive: true });
    scrollTarget.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", keys);
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    ro.observe(scroller ?? document.body);
    return () => {
      cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      scrollTarget.removeEventListener("wheel", release);
      scrollTarget.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", keys);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [container, measure, update]);

  useEffect(() => {
    return ride.on("change", (y) => {
      if (Math.abs(y - target.get()) < 0.4 && Math.abs(ride.getVelocity()) < 4) setMoving(0);
    });
  }, [ride, target]);

  const go = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    const scroller = scrollerOf(container);
    const section = findSection(itemsRef.current[index].id, scroller);
    if (!section) return;
    event.preventDefault();
    const v = view(scroller);
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 24;
    const top = clamp(v.el.scrollTop + section.getBoundingClientRect().top - v.top - margin, 0, v.range);
    lock.current = index;
    update();
    (scroller ?? window).scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <nav
      {...props}
      ref={rootRef}
      aria-label={ariaLabel}
      className={cn("@container relative text-sm", className)}
      style={{ "--miyuki-station-nav-color": color, ...style } as CSSProperties}
    >
      {rail && (
        <div aria-hidden="true" className="pointer-events-none absolute left-6 w-1 -translate-x-1/2" style={rail}>
          <div className="absolute inset-0 rounded-full bg-border-strong" />
          <motion.div
            className="absolute inset-0 origin-top rounded-full bg-(--miyuki-station-nav-color)"
            style={{ scaleY: fill }}
          />
        </div>
      )}
      <ol className="flex flex-col">
        {items.map((item, i) => {
          const state = i === current ? "current" : i < current ? "passed" : "ahead";
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={i === current ? "location" : undefined}
                onClick={(event) => go(event, i)}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 rounded-lg py-2 pr-2 pl-4 outline-none",
                  "transition-[color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
                  "@max-[9rem]:pr-0",
                )}
              >
                <span
                  ref={(el) => {
                    ringRefs.current[i] = el;
                  }}
                  className="relative mt-0.5 grid size-4 shrink-0 place-items-center"
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full border-[3px] bg-background transition-[border-color,box-shadow] duration-200 ease-settle",
                      state === "ahead"
                        ? "border-border-strong group-hover:border-muted-foreground"
                        : "border-(--miyuki-station-nav-color)",
                      state === "current" &&
                        "shadow-[0_0_0_4px_color-mix(in_oklab,var(--miyuki-station-nav-color)_18%,transparent)]",
                    )}
                  />
                  <motion.span
                    className="absolute inset-[2px] rounded-full bg-(--miyuki-station-nav-color)"
                    initial={false}
                    animate={{ scale: state === "current" ? 1 : 0 }}
                    transition={reduce ? { duration: 0.12 } : state === "current" ? FILL : { duration: 0.12 }}
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 @max-[9rem]:sr-only">
                  <span
                    className={cn(
                      "leading-5 transition-colors duration-150",
                      state === "current"
                        ? "font-medium text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.detail != null && (
                    <span className="text-xs leading-4 text-muted-foreground tabular-nums">{item.detail}</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      {rail && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-[5.5px]"
          style={{ y: trainY }}
        >
          <Train moving={moving} />
        </motion.div>
      )}
    </nav>
  );
}

function Train({ moving }: { moving: number }) {
  return (
    <svg
      viewBox="0 0 11 31"
      width={11}
      height={31}
      className="-translate-x-1/2 -translate-y-1/2 overflow-visible text-foreground"
    >
      <circle
        cx="5.5"
        cy={moving > 0 ? 31.5 : -0.5}
        r="3.2"
        className={cn(
          "fill-warning blur-[2px] transition-opacity duration-300",
          moving !== 0 ? "opacity-80 dark:opacity-100" : "opacity-0",
        )}
      />
      <rect x="3.5" y="13" width="4" height="5" rx="1" fill="currentColor" opacity="0.55" />
      <path d="M0.5 5.5a5 5 0 0 1 10 0V13.2a1.3 1.3 0 0 1-1.3 1.3H1.8A1.3 1.3 0 0 1 0.5 13.2Z" fill="currentColor" />
      <path d="M0.5 25.5a5 5 0 0 0 10 0V17.8a1.3 1.3 0 0 0-1.3-1.3H1.8a1.3 1.3 0 0 0-1.3 1.3Z" fill="currentColor" />
      <g className="fill-background">
        <path d="M2.3 5.6a3.2 3.2 0 0 1 6.4 0v0.6H2.3Z" opacity="0.92" />
        <path d="M2.3 25.4a3.2 3.2 0 0 0 6.4 0v-0.6H2.3Z" opacity="0.92" />
        <rect x="3.4" y="8.2" width="4.2" height="1.9" rx="0.6" opacity="0.7" />
        <rect x="3.4" y="11" width="4.2" height="1.9" rx="0.6" opacity="0.7" />
        <rect x="3.4" y="18.1" width="4.2" height="1.9" rx="0.6" opacity="0.7" />
        <rect x="3.4" y="20.9" width="4.2" height="1.9" rx="0.6" opacity="0.7" />
      </g>
    </svg>
  );
}
