"use client";

import { type MotionStyle, type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ElementType,
  type FocusEvent,
  type HTMLAttributes,
  type PointerEvent,
  type Ref,
  useContext,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

const SETTLE = { stiffness: 420, damping: 34 };

interface TiltCardState {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  lift: MotionValue<number>;
  maxTilt: number;
  reduced: boolean;
}

const TiltCardContext = createContext<TiltCardState | null>(null);

function useTiltCard(name: string) {
  const state = useContext(TiltCardContext);
  if (!state) throw new Error(`${name} must be placed inside <TiltCard>.`);
  return state;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface TiltCardProps extends ComponentProps<"div"> {
  maxTilt?: number;
  perspective?: number;
}

export function TiltCard({
  maxTilt = 10,
  perspective = 1000,
  className,
  style,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: TiltCardProps) {
  const reduced = useReducedMotion() ?? false;
  const rotateX = useSpring(0, SETTLE);
  const rotateY = useSpring(0, SETTLE);
  const lift = useSpring(0, SETTLE);

  const state = useMemo<TiltCardState>(
    () => ({ rotateX, rotateY, lift, maxTilt, reduced }),
    [rotateX, rotateY, lift, maxTilt, reduced],
  );

  function tiltToward(el: HTMLElement, x: number, y: number) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = clamp((x - rect.left) / rect.width, 0, 1) - 0.5;
    const py = clamp((y - rect.top) / rect.height, 0, 1) - 0.5;
    rotateY.set(px * 2 * maxTilt);
    rotateX.set(-py * 2 * maxTilt);
  }

  function rest() {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
  }

  const active = (e: PointerEvent) => e.pointerType !== "touch" && !reduced;

  return (
    <div
      {...props}
      className={cn("group/tilt-card", className)}
      style={{ perspective: `${perspective}px`, ...style }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!active(e)) return;
        lift.set(1);
        tiltToward(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!active(e)) return;
        tiltToward(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.pointerType === "touch") return;
        rest();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (reduced || !(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        const r = e.target.getBoundingClientRect();
        lift.set(1);
        tiltToward(e.currentTarget, r.left + r.width / 2, r.top + r.height / 2);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
    >
      <TiltCardContext value={state}>{children}</TiltCardContext>
    </div>
  );
}

export interface TiltCardBodyProps extends ComponentProps<typeof motion.div> {
  className?: string;
}

export function TiltCardBody({ className, style, children, ...props }: TiltCardBodyProps) {
  const { rotateX, rotateY, lift, maxTilt, reduced } = useTiltCard("TiltCardBody");

  const raised = useTransform(lift, (v) => Math.max(0, v));

  const boxShadow = useTransform(() => {
    const l = raised.get();
    const nx = maxTilt ? rotateY.get() / maxTilt : 0;
    const ny = maxTilt ? -rotateX.get() / maxTilt : 0;
    const x = -nx * 14 * l;
    const y = (6 + 18 * l - ny * 10 * l).toFixed(2);
    const blur = (18 + 30 * l).toFixed(2);
    const spread = (-10 - 4 * l).toFixed(2);
    const alpha = (100 * l).toFixed(1);
    return `var(--miyuki-shadow-sm, 0 1px 2px oklch(0.42 0.09 250 / 0.07)), ${x.toFixed(2)}px ${y}px ${blur}px ${spread}px color-mix(in oklab, var(--miyuki-tilt-card-shade) ${alpha}%, transparent)`;
  });

  const motionStyle = {
    rotateX,
    rotateY,
    transformStyle: "preserve-3d",
    "--miyuki-tilt-card-lift": raised,
    ...(reduced ? {} : { boxShadow }),
    ...style,
  } as MotionStyle;

  return (
    <motion.div
      {...props}
      className={cn(
        "relative rounded-2xl border border-border bg-card p-5 text-card-foreground",
        "[--miyuki-tilt-card-shade:oklch(0.42_0.09_250/0.3)] dark:[--miyuki-tilt-card-shade:oklch(0.05_0.02_250/0.75)]",
        reduced &&
          "shadow-sm transition-shadow duration-200 ease-settle group-hover/tilt-card:shadow-md group-focus-within/tilt-card:shadow-md",
        className,
      )}
      style={motionStyle}
    >
      {children}
    </motion.div>
  );
}

export interface TiltCardItemProps extends HTMLAttributes<HTMLElement> {
  depth?: number;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

export function TiltCardItem({ depth = 0, as, className, style, ...props }: TiltCardItemProps) {
  const Tag: ElementType = as ?? "div";
  const d = clamp(depth, 0, 100);
  const itemStyle: CSSProperties = {
    transform: `translateZ(calc(max(var(--miyuki-tilt-card-lift, 0), 0) * ${d}px))`,
    ...style,
  };
  return <Tag {...props} className={cn("[transform-style:preserve-3d]", className)} style={itemStyle} />;
}
