"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ShojiTrigger = "hover" | "click" | "view";

export interface ShojiRevealProps extends Omit<ComponentProps<"div">, "onChange"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ShojiTrigger;
  panels?: number;
  openLabel?: string;
  closeLabel?: string;
}

const PEEK = 0.16;
const STACK = 0.1;
const SLIDE = [0.32, 0.06, 0.22, 1] as const;

const FIBRE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.38' numOctaves='3' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0 0.26 0 0 0 1.4 -0.55'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' seed='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.36 0 0 0 0 0.3 0 0 0 0.9 -0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

const COLUMNS = [0.25, 0.5, 0.75];
const ROWS = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];

export function ShojiReveal({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger = "click",
  panels = 4,
  openLabel = "Open the screens",
  closeLabel = "Close the screens",
  className,
  style,
  children,
  onPointerEnter,
  onPointerLeave,
  ...props
}: ShojiRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const n = Math.max(2, Math.round(panels));
  const left = Math.floor(n / 2);

  const set = (next: boolean) => {
    if (next === open) return;
    if (openProp == null) setInner(next);
    onOpenChange?.(next);
  };
  const setRef = useRef(set);
  useEffect(() => {
    setRef.current = set;
  });

  useEffect(() => {
    const el = rootRef.current;
    if (trigger !== "view" || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRef.current(true);
          io.disconnect();
        }
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const screens = Array.from({ length: n }, (_, i) => {
    const fromLeft = i < left;
    const k = fromLeft ? i : n - 1 - i;
    const travel = 1 - PEEK + k * (1 - STACK);
    return { i, k, x: open ? `${(fromLeft ? -travel : travel) * 100}%` : "0%" };
  });
  const deepest = Math.max(...screens.map((s) => s.k));

  return (
    <div
      ref={rootRef}
      {...props}
      data-open={open || undefined}
      className={cn(
        "group/shoji relative isolate overflow-clip rounded-2xl border border-border bg-card shadow-sm",
        "[--miyuki-shoji-reveal-paper:oklch(0.985_0.016_84/0.56)] [--miyuki-shoji-reveal-bar:color-mix(in_oklab,var(--border-strong),var(--foreground)_14%)]",
        "[--miyuki-shoji-reveal-frame:color-mix(in_oklab,var(--border-strong),oklch(0.42_0.03_60)_42%)] [--miyuki-shoji-reveal-shade:oklch(0.42_0.08_250/0.3)]",
        "dark:[--miyuki-shoji-reveal-paper:oklch(0.7_0.06_76/0.5)] dark:[--miyuki-shoji-reveal-bar:oklch(0.19_0.02_60/0.92)]",
        "dark:[--miyuki-shoji-reveal-frame:oklch(0.2_0.018_60)] dark:[--miyuki-shoji-reveal-shade:oklch(0.08_0.02_250/0.55)]",
        className,
      )}
      style={style}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (trigger === "hover" && e.pointerType === "mouse") set(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (trigger === "hover" && e.pointerType === "mouse") set(false);
      }}
    >
      <div inert={!open} className="absolute inset-0">
        {children}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => set(!open)}
        className={cn(
          "group/screens absolute inset-0 z-10 cursor-pointer rounded-[inherit] outline-none [-webkit-tap-highlight-color:transparent]",
          open && "pointer-events-none",
        )}
      >
        {screens.map(({ i, k, x }) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="pointer-events-auto absolute inset-y-0 block"
            style={
              {
                left: `${(i / n) * 100}%`,
                width: `calc(${100 / n}% + 1px)`,
                zIndex: 1 + k,
              } as CSSProperties
            }
            initial={false}
            animate={{ x }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: 1.05 - (deepest - k) * 0.08,
                    delay: open ? (deepest - k) * 0.09 : k * 0.06,
                    ease: SLIDE,
                  }
            }
          >
            <Screen front={k > 0} />
          </motion.span>
        ))}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-[7px] bg-(--miyuki-shoji-reveal-frame)" />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-20 h-[9px] bg-(--miyuki-shoji-reveal-frame)"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] opacity-0 ring-[3px] ring-ring ring-inset transition-opacity duration-150 group-focus-visible/screens:opacity-100"
        />
      </button>
    </div>
  );
}

function Screen({ front }: { front: boolean }) {
  return (
    <span
      className={cn(
        "absolute inset-0 block border-x-[3px] border-y-[7px] border-(--miyuki-shoji-reveal-frame)",
        "bg-(--miyuki-shoji-reveal-paper) backdrop-blur-[12px] backdrop-saturate-[0.75] dark:backdrop-brightness-[0.95]",
        front && "shadow-[0_0_18px_2px_var(--miyuki-shoji-reveal-shade)]",
      )}
    >
      <span
        className="absolute inset-0 block opacity-[0.07] mix-blend-multiply dark:opacity-[0.1] dark:mix-blend-screen"
        style={{ backgroundImage: FIBRE }}
      />
      <span className="absolute inset-0 hidden bg-[radial-gradient(130%_75%_at_50%_58%,oklch(0.88_0.09_80/0.3),transparent_72%)] dark:block" />
      <svg className="absolute inset-0 size-full" shapeRendering="crispEdges">
        <g className="stroke-(--miyuki-shoji-reveal-bar)" strokeWidth={1}>
          {COLUMNS.map((c) => (
            <line key={`c${c}`} x1={`${c * 100}%`} x2={`${c * 100}%`} y1="0" y2="100%" />
          ))}
          {ROWS.map((r) => (
            <line key={`r${r}`} x1="0" x2="100%" y1={`${r * 100}%`} y2={`${r * 100}%`} />
          ))}
        </g>
      </svg>
    </span>
  );
}
