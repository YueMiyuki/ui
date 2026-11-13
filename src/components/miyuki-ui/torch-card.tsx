"use client";

import type { ComponentProps, CSSProperties, FocusEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";

export type TorchCardPattern = "dots" | "grid" | "none";

export interface TorchCardProps extends ComponentProps<"div"> {
  radius?: number;
  color?: string;
  pattern?: TorchCardPattern;
}

const INK = "color-mix(in oklab, var(--miyuki-torch-card-color) 76%, var(--foreground))";
const MARK = `color-mix(in oklab, ${INK} var(--miyuki-torch-card-mark), transparent)`;

const PATTERNS: Record<Exclude<TorchCardPattern, "none">, CSSProperties> = {
  dots: {
    backgroundImage: `radial-gradient(circle, ${MARK} 0.9px, transparent 1.5px)`,
    backgroundSize: "12px 12px",
    backgroundPosition: "6px 6px",
  },
  grid: {
    backgroundImage: `linear-gradient(to right, ${MARK} 1px, transparent 1px), linear-gradient(to bottom, ${MARK} 1px, transparent 1px)`,
    backgroundSize: "20px 20px",
    backgroundPosition: "-1px -1px",
  },
};

const AT = "at var(--miyuki-torch-card-x, 50%) var(--miyuki-torch-card-y, 50%)";

function mask(size: string, stop: string): CSSProperties {
  const image = `radial-gradient(${size} circle ${AT}, #000, transparent ${stop})`;
  return { maskImage: image, WebkitMaskImage: image };
}

export function TorchCard({
  radius = 220,
  color = "var(--brand)",
  pattern = "dots",
  className,
  style,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: TorchCardProps) {
  function aim(el: HTMLElement, x: number, y: number) {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--miyuki-torch-card-x", `${(x - rect.left).toFixed(1)}px`);
    el.style.setProperty("--miyuki-torch-card-y", `${(y - rect.top).toFixed(1)}px`);
  }
  const light = (el: HTMLElement, on: boolean) => el.toggleAttribute("data-lit", on);
  const mouse = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <div
      {...props}
      className={cn(
        "group/spotlight relative isolate rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        "[--miyuki-torch-card-mark:58%] [--miyuki-torch-card-wash:12%] dark:[--miyuki-torch-card-mark:72%] dark:[--miyuki-torch-card-wash:22%]",
        className,
      )}
      style={
        {
          "--miyuki-torch-card-color": color,
          "--miyuki-torch-card-r": `${radius}px`,
          ...style,
        } as CSSProperties
      }
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!mouse(e)) return;
        aim(e.currentTarget, e.clientX, e.clientY);
        light(e.currentTarget, true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (mouse(e)) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (!mouse(e)) return;
        const el = e.currentTarget;
        const focused = el.querySelector<HTMLElement>(":focus-visible");
        if (focused) {
          const r = focused.getBoundingClientRect();
          aim(el, r.left + r.width / 2, r.top + r.height / 2);
        } else light(el, false);
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        const r = e.target.getBoundingClientRect();
        aim(e.currentTarget, r.left + r.width / 2, r.top + r.height / 2);
        light(e.currentTarget, true);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) light(e.currentTarget, false);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/spotlight:opacity-100"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(var(--miyuki-torch-card-r) circle ${AT}, color-mix(in oklab, var(--miyuki-torch-card-color) var(--miyuki-torch-card-wash), transparent), transparent 72%)`,
          }}
        />
        {pattern !== "none" ? (
          <div
            className="absolute inset-0"
            style={{ ...PATTERNS[pattern], ...mask("calc(var(--miyuki-torch-card-r) * 0.8)", "100%") }}
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px -z-10 rounded-[inherit] border opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/spotlight:opacity-100"
        style={{
          borderColor: "color-mix(in oklab, var(--miyuki-torch-card-color) 75%, transparent)",
          ...mask("calc(var(--miyuki-torch-card-r) * 0.7)", "100%"),
        }}
      />
      {children}
    </div>
  );
}
