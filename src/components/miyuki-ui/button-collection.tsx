"use client";

import { ArrowRight } from "lucide-react";
import { type CSSProperties, type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type PressEvent,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type ButtonEffect =
  | "lift"
  | "fill"
  | "draw"
  | "frost"
  | "ripple"
  | "sheen"
  | "underline"
  | "reveal"
  | "keycap"
  | "halo"
  | "swap"
  | "march";

export type EffectButtonSize = "sm" | "md" | "lg";

export interface EffectButtonProps extends Omit<AriaButtonProps, "children"> {
  effect?: ButtonEffect;
  size?: EffectButtonSize;
  children?: ReactNode;
  altLabel?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const keyframes = `
@keyframes miyuki-button-collection-ripple {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  45% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
@keyframes miyuki-button-collection-halo {
  0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--brand) 60%, transparent); }
  100% { box-shadow: 0 0 2px 12px color-mix(in oklab, var(--brand) 0%, transparent); }
}
@keyframes miyuki-button-collection-march { to { stroke-dashoffset: -9; } }
`;

const sizes: Record<EffectButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-11 px-5",
};

const base = cn(
  "group/effect relative isolate inline-flex shrink-0 cursor-default items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none outline-none",
  "transition-[translate,scale,background-color,box-shadow,border-color,color] duration-150 ease-settle",
  "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg:not([data-ring])]:size-4 [&_svg]:shrink-0",
);

const press = "data-[pressed]:scale-[0.98]";

const looks: Record<ButtonEffect, string> = {
  lift: cn(
    "bg-primary text-primary-foreground shadow-xs data-[hovered]:bg-primary/92",
    "data-[hovered]:not-data-[pressed]:-translate-y-0.5 data-[hovered]:not-data-[pressed]:shadow-lg",
    press,
  ),
  fill: cn(
    "overflow-hidden border border-brand text-brand-strong data-[hovered]:text-brand-foreground data-[hovered]:[transition-delay:0ms,0ms,0ms,0ms,0ms,70ms]",
    press,
  ),
  draw: cn("border border-border-strong bg-card text-foreground shadow-xs", press),
  frost: cn(
    "border border-foreground/10 bg-card/55 text-foreground shadow-sm backdrop-blur-xl backdrop-saturate-150",
    "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-linear-to-b before:from-white/55 before:to-white/0 before:to-60% dark:before:from-white/12",
    "data-[hovered]:border-foreground/15 data-[hovered]:bg-card/70",
    press,
  ),
  ripple: cn(
    "overflow-hidden border border-border-strong bg-card text-foreground shadow-xs data-[hovered]:bg-accent",
    press,
  ),
  sheen: cn("overflow-hidden bg-brand text-brand-foreground shadow-xs data-[hovered]:bg-brand/92", press),
  underline: cn("text-foreground", press),
  reveal: cn("overflow-hidden bg-primary text-primary-foreground shadow-xs data-[hovered]:bg-primary/90", press),
  keycap: cn(
    "border border-border-strong bg-card text-foreground data-[hovered]:bg-accent dark:bg-accent dark:data-[hovered]:bg-[color-mix(in_oklab,var(--accent),var(--foreground)_6%)]",
    "[--miyuki-button-collection-edge:color-mix(in_oklab,var(--border-strong)_86%,var(--foreground))] dark:[--miyuki-button-collection-edge:var(--card)]",
    "shadow-[0_3px_0_0_var(--miyuki-button-collection-edge),0_3px_0_1px_var(--border-strong)]",
    "data-[pressed]:translate-y-[2px] data-[pressed]:shadow-[0_1px_0_0_var(--miyuki-button-collection-edge),0_1px_0_1px_var(--border-strong)]",
  ),
  halo: cn(
    "bg-brand text-brand-foreground shadow-xs data-[hovered]:bg-brand/92",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]",
    "motion-safe:before:animate-[miyuki-button-collection-halo_2.6s_cubic-bezier(0.3,0.5,0.45,1)_infinite] motion-safe:after:animate-[miyuki-button-collection-halo_2.6s_cubic-bezier(0.3,0.5,0.45,1)_-1.3s_infinite]",
    "motion-reduce:before:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_22%,transparent)]",
    press,
  ),
  swap: cn("bg-secondary text-secondary-foreground data-[hovered]:bg-accent", press),
  march: cn("text-foreground data-[hovered]:bg-accent/60", press),
};

const ring = {
  x: 0.75,
  y: 0.75,
  style: {
    width: "calc(100% - 1.5px)",
    height: "calc(100% - 1.5px)",
    rx: "calc(var(--miyuki-button-collection-radius, var(--radius, 10px)) - 0.75px)",
  } as CSSProperties,
};

function Draw() {
  return (
    <svg
      data-ring=""
      aria-hidden="true"
      className="pointer-events-none absolute -top-px -left-px size-[calc(100%+2px)] overflow-visible"
      fill="none"
    >
      <rect
        {...ring}
        pathLength={1}
        strokeWidth={1.5}
        className="stroke-brand transition-[stroke-dasharray] duration-300 ease-settle [stroke-dasharray:0_0.5] group-data-[hovered]/effect:[stroke-dasharray:0.5_0] group-data-[focus-visible]/effect:[stroke-dasharray:0.5_0]"
      />
    </svg>
  );
}

function March() {
  const rect = useRef<SVGRectElement>(null);
  const [length, setLength] = useState<number>();

  useEffect(() => {
    const el = rect.current;
    const host = el?.ownerSVGElement;
    if (!el || !host) return;
    const ro = new ResizeObserver(() => {
      const total = el.getTotalLength();
      if (total > 0) setLength(Math.max(1, Math.round(total / 9)) * 9);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <svg
      data-ring=""
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 size-full overflow-visible"
      fill="none"
    >
      <rect
        ref={rect}
        {...ring}
        pathLength={length}
        strokeWidth={1.5}
        strokeDasharray="5 4"
        strokeLinecap="round"
        className="stroke-foreground/40 transition-[stroke] duration-150 group-data-[hovered]/effect:stroke-brand motion-safe:animate-[miyuki-button-collection-march_0.9s_linear_infinite]"
      />
    </svg>
  );
}

interface Drop {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function EffectButton({
  effect = "lift",
  size = "md",
  altLabel,
  className,
  children,
  onPressStart,
  ...props
}: EffectButtonProps) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const counter = useRef(0);

  const spread = useCallback((event: PressEvent) => {
    const el = event.target as HTMLElement;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const keyboard = event.pointerType === "keyboard" || event.pointerType === "virtual";
    const x = keyboard ? w / 2 : event.x;
    const y = keyboard ? h / 2 : event.y;
    const reach = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    const id = ++counter.current;
    setDrops((all) => [...all.slice(-3), { id, x, y, size: reach * 2 }]);
  }, []);

  const label = children;

  return (
    <AriaButton
      {...props}
      onPressStart={(event) => {
        if (effect === "ripple") spread(event);
        onPressStart?.(event);
      }}
      className={composeRenderProps(className, (cls) => cn(base, sizes[size], looks[effect], cls))}
    >
      <style href="miyuki-button-collection" precedence="miyuki">
        {keyframes}
      </style>

      {effect === "fill" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-14%] top-full -z-10 h-[calc(100%+18px)] rounded-t-[50%_16px] bg-brand transition-[translate] duration-300 ease-settle group-data-[hovered]/effect:-translate-y-full group-data-[focus-visible]/effect:-translate-y-full"
        />
      )}

      {effect === "sheen" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-2/5 -translate-x-[160%] skew-x-[-18deg] bg-linear-to-r from-white/0 via-white/45 to-white/0 group-data-[hovered]/effect:translate-x-[320%] group-data-[hovered]/effect:transition-[translate] group-data-[hovered]/effect:duration-700 group-data-[hovered]/effect:ease-drift"
        />
      )}

      {effect === "draw" && <Draw />}
      {effect === "march" && <March />}

      {effect === "ripple" &&
        drops.map((drop) => (
          <span
            key={drop.id}
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 rounded-full border-2 border-brand/70 bg-brand/[0.07] animate-[miyuki-button-collection-ripple_680ms_cubic-bezier(0.2,0.55,0.3,1)_forwards] motion-reduce:animate-none motion-reduce:opacity-0"
            style={{ left: drop.x, top: drop.y, width: drop.size, height: drop.size }}
            onAnimationEnd={() => setDrops((all) => all.filter((d) => d.id !== drop.id))}
          />
        ))}

      {effect === "underline" ? (
        <span className="relative py-0.5">
          {label}
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px bg-foreground/15" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-px h-[1.5px] origin-right scale-x-0 rounded-full bg-brand transition-[scale] duration-300 ease-settle group-data-[hovered]/effect:origin-left group-data-[hovered]/effect:scale-x-100 group-data-[focus-visible]/effect:origin-left group-data-[focus-visible]/effect:scale-x-100"
          />
        </span>
      ) : effect === "reveal" ? (
        <span className="flex items-center gap-1.5">
          <span className="translate-x-[11px] transition-[translate] duration-300 ease-settle group-data-[hovered]/effect:translate-x-0">
            {label}
          </span>
          <ArrowRight className="-translate-x-1.5 opacity-0 transition-[translate,opacity] duration-300 ease-settle group-data-[hovered]/effect:translate-x-0 group-data-[hovered]/effect:opacity-100" />
        </span>
      ) : effect === "swap" ? (
        <span className="grid justify-items-center overflow-hidden">
          <span className="col-start-1 row-start-1 inline-flex items-center gap-2 transition-[translate] duration-300 ease-settle group-data-[hovered]/effect:-translate-y-[130%]">
            {label}
          </span>
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 inline-flex translate-y-[130%] items-center gap-2 text-brand-strong transition-[translate] duration-300 ease-settle group-data-[hovered]/effect:translate-y-0"
          >
            {altLabel ?? label}
          </span>
        </span>
      ) : (
        label
      )}
    </AriaButton>
  );
}
