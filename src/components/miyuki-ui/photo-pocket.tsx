"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type CSSProperties, type FocusEvent, type HTMLAttributes, type PointerEvent, type Ref, useState } from "react";
import { cn } from "@/lib/utils";

export interface PhotoPocketProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  text: string;
  images?: string[];
  href?: string;
  target?: string;
  rel?: string;
  size?: number;
  lift?: number;
  spread?: number;
  rotation?: number;
  ref?: Ref<HTMLElement>;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const SLOTS: Record<number, number[]> = {
  1: [0],
  2: [-0.5, 0.5],
  3: [0, -1, 1],
};

export function PhotoPocket({
  text,
  images = [],
  href,
  target,
  rel,
  size = 28,
  lift = 12,
  spread = 16,
  rotation = 12,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ref,
  ...props
}: PhotoPocketProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;
  const shown = images.slice(0, 3);
  const slots = SLOTS[shown.length] ?? [];

  const s = Math.max(16, size);
  const pocketH = Math.round(s * 0.8);
  const frontH = Math.round(pocketH * 0.68);
  const thumbH = Math.round((frontH - 1) * 1.5);
  const thumbW = Math.round(s * 0.54);
  const height = s + 12;
  const rest = s * 0.11;

  const order = slots
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => a.slot - b.slot)
    .map(({ i }) => i);

  const handlers = {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      onPointerEnter?.(e);
      if (e.pointerType !== "touch") setHovered(true);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      onPointerLeave?.(e);
      setHovered(false);
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      onFocus?.(e);
      if (e.currentTarget.matches(":focus-visible")) setFocused(true);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      onBlur?.(e);
      setFocused(false);
    },
  };

  const content = (
    <>
      <span aria-hidden="true" className="relative shrink-0" style={{ width: s, height: pocketH }}>
        <span className="absolute inset-0 rounded-[5px] border border-border-strong bg-secondary" />
        {shown.map((src, i) => {
          const slot = slots[i];
          const rank = order.indexOf(i);
          const delay = reduce ? 0 : (open ? rank : shown.length - 1 - rank) * 0.04;
          const transition: Transition = reduce ? { duration: 0.12 } : { ...SETTLE, delay };
          return (
            <motion.img
              key={`${i}-${src}`}
              src={src}
              alt=""
              draggable={false}
              className={cn(
                "absolute bottom-px left-1/2 max-w-none rounded-[3px] border-[1.5px] border-card object-cover shadow-xs",
                slot === 0 ? "z-[3]" : slot < 0 ? "z-[1]" : "z-[2]",
              )}
              style={{ width: thumbW, height: thumbH, marginLeft: -thumbW / 2, originX: 0.5, originY: 1 }}
              initial={false}
              animate={
                open
                  ? { x: slot * spread, y: -lift, rotate: slot * rotation, scale: 1.14 }
                  : { x: slot * rest, y: 0, rotate: slot * rotation * 0.4, scale: 1 }
              }
              transition={transition}
            />
          );
        })}
        <span
          className="absolute inset-x-0 bottom-0 z-[4] rounded-[4px] rounded-b-[5px] border border-border-strong bg-secondary shadow-[inset_0_1px_0_color-mix(in_oklab,var(--card)_65%,transparent)]"
          style={{ height: frontH }}
        />
      </span>
      <span className="truncate">{text}</span>
    </>
  );

  const classes = cn(
    "relative inline-flex max-w-full shrink-0 items-center gap-3 rounded-full border border-border bg-card pr-4 align-middle font-sans text-sm font-medium tracking-normal whitespace-nowrap text-foreground shadow-xs outline-none select-none",
    "transition-[border-color,box-shadow,background-color] duration-200 ease-settle hover:border-border-strong hover:shadow-sm",
    "focus-visible:ring-[3px] focus-visible:ring-ring data-[open]:z-10",
    className,
  );
  const rootStyle: CSSProperties = { height, paddingLeft: Math.round((height - s) / 2) + 1, ...style };

  if (href) {
    return (
      <a
        {...props}
        {...handlers}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
        data-open={open || undefined}
        className={classes}
        style={rootStyle}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      {...handlers}
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      data-open={open || undefined}
      className={classes}
      style={rootStyle}
    >
      {content}
    </button>
  );
}
