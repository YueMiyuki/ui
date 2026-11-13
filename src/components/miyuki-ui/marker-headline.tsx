"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type PointerEvent, type Ref, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MarkerHeadlineProps extends ComponentProps<"div"> {
  dotColor?: string;
  activeColor?: string;
  radius?: number;
  ref?: Ref<HTMLDivElement>;
}

export interface MarkerProps extends Omit<ComponentProps<"mark">, "color"> {
  delay?: number;
  duration?: number;
  color?: string | string[];
  ref?: Ref<HTMLElement>;
}

const GRID = 16;
const SEAFOAM_TINT = "color-mix(in oklab, var(--chart-2) 24%, var(--background))";
const DEFAULT_WASH = ["var(--brand-soft)", SEAFOAM_TINT];

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function dots(color: string, size: number) {
  return `radial-gradient(circle at center, ${color} ${size}px, transparent ${size + 0.6}px)`;
}

export function MarkerHeadline({
  children,
  dotColor = "var(--border-strong)",
  activeColor = "var(--brand)",
  radius = 200,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  ref,
  ...props
}: MarkerHeadlineProps) {
  const own = useRef<HTMLDivElement>(null);

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const el = own.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const k = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
    el.style.setProperty("--miyuki-marker-headline-x", `${(event.clientX - rect.left) / k}px`);
    el.style.setProperty("--miyuki-marker-headline-y", `${(event.clientY - rect.top) / k}px`);
    if (el.dataset.lit !== "true") el.dataset.lit = "true";
  };

  const spot = `radial-gradient(${radius}px circle at var(--miyuki-marker-headline-x, -999px) var(--miyuki-marker-headline-y, -999px), #000 0%, rgb(0 0 0 / 0.55) 45%, transparent 100%)`;

  return (
    <div
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("group/marker-headline relative isolate", className)}
      style={style}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        track(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (own.current) own.current.dataset.lit = "false";
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: dots(dotColor, 1),
          backgroundSize: `${GRID}px ${GRID}px`,
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse 90% 85% at 50% 50%, #000 55%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 ease-settle group-data-[lit=true]/marker-headline:opacity-100 group-data-[lit=true]/marker-headline:duration-200"
        style={{
          backgroundImage: dots(activeColor, 1.35),
          backgroundSize: `${GRID}px ${GRID}px`,
          backgroundPosition: "center",
          maskImage: spot,
        }}
      />
      {children}
    </div>
  );
}

export function Marker({
  children,
  delay = 0.4,
  duration = 1.2,
  color = DEFAULT_WASH,
  className,
  style,
  ref,
  ...props
}: MarkerProps) {
  const own = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.6 });
  const stops = Array.isArray(color) ? (color.length > 1 ? color : [color[0], color[0]]) : [color, color];
  const swept = reduced || inView;

  return (
    <mark
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("-mx-[0.08em] rounded-[0.22em] bg-transparent bg-no-repeat px-[0.08em] text-inherit", className)}
      style={
        {
          ...style,
          backgroundImage: `linear-gradient(90deg, ${stops.join(", ")})`,
          backgroundSize: swept ? "100% 100%" : "0% 100%",
          backgroundPosition: "left center",
          transition: reduced
            ? "none"
            : `background-size ${Math.max(0, duration)}s cubic-bezier(0.5, 0.05, 0.25, 1) ${Math.max(0, delay)}s`,
        } as CSSProperties
      }
    >
      {children}
    </mark>
  );
}
