"use client";

import { type MotionStyle, motion, useMotionTemplate, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ComponentProps, CSSProperties, FocusEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface FoilTicketProps extends ComponentProps<"div"> {
  rotateDepth?: number;
  translateDepth?: number;
  foil?: boolean;
}

const SETTLE = { stiffness: 260, damping: 26, mass: 0.8 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const CRYSTAL = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="14" viewBox="0 0 16 14"><g stroke="white" stroke-opacity="0.6" stroke-width="0.6" stroke-linecap="round" fill="none"><path d="M4 1.5v4M2.27 2.5l3.46 2M2.27 4.5l3.46-2M12 8.5v4M10.27 9.5l3.46 2M10.27 11.5l3.46-2"/></g></svg>',
)}")`;

const notch = (side: string) =>
  `radial-gradient(circle 9px at ${side} calc(var(--miyuki-foil-ticket-foil-y) + var(--miyuki-foil-ticket-foil-h) / 2), #0000 8.5px, #000 9px)`;
const TICKET = `${notch("0%")}, ${notch("100%")}`;

export function FoilTicket({
  rotateDepth = 17.5,
  translateDepth = 20,
  foil = true,
  className,
  style,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: FoilTicketProps) {
  const reduced = useReducedMotion() ?? false;
  const px = useSpring(0.5, SETTLE);
  const py = useSpring(0.5, SETTLE);
  const lit = useSpring(0, SETTLE);

  const still = (v: number) => (reduced ? 0 : v);
  const rotateY = useTransform(px, (v) => still((v - 0.5) * 2 * rotateDepth));
  const rotateX = useTransform(py, (v) => still((0.5 - v) * 2 * rotateDepth));
  const x = useTransform(px, (v) => still((v - 0.5) * 2 * translateDepth));
  const y = useTransform(py, (v) => still((v - 0.5) * 2 * translateDepth));
  const scale = useTransform(lit, (v) => 1 + still(v * 0.05));

  const shadowX = useTransform(px, (v) => still((0.5 - v) * 2 * translateDepth * 2.8));
  const shadowY = useTransform(
    [py, lit],
    ([v, l]: number[]) => 16 + l * 26 + still((0.5 - v) * 2 * translateDepth * 1.6),
  );
  const shadowOpacity = useTransform(lit, (v) => 0.45 + v * 0.55);
  const shadowScale = useTransform(lit, (v) => 0.94 + v * 0.06);

  const foilX = useTransform([px, py], ([a, b]: number[]) => `${(a * 82 + b * 18).toFixed(2)}%`);
  const foilShine = useTransform([px, py], ([a, b]: number[]) => `${(((a + b) / 2) * 140 - 20).toFixed(2)}%`);
  const bandX = useTransform([px, py], ([a, b]: number[]) => `${((a * 0.7 + b * 0.3 - 0.5) * 46).toFixed(2)}%`);
  const glowX = useTransform(px, (v) => `${(v * 100).toFixed(2)}%`);
  const glowY = useTransform(py, (v) => `${(v * 100).toFixed(2)}%`);
  const glow = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgb(255 255 255 / 0.32), transparent 48%)`;
  const foilImage = useMotionTemplate`linear-gradient(105deg, transparent 0%, rgb(255 255 255 / 0) calc(${foilShine} - 18%), rgb(255 255 255 / 0.55) ${foilShine}, rgb(255 255 255 / 0) calc(${foilShine} + 18%), transparent 100%), ${CRYSTAL}, linear-gradient(100deg, var(--miyuki-foil-ticket-a), var(--miyuki-foil-ticket-b), var(--miyuki-foil-ticket-c), var(--miyuki-foil-ticket-a), var(--miyuki-foil-ticket-b), var(--miyuki-foil-ticket-c), var(--miyuki-foil-ticket-a))`;
  const foilPosition = useMotionTemplate`0 0, 0 0, ${foilX} 50%`;

  function aim(el: HTMLElement, cx: number, cy: number) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    px.set(clamp01((cx - rect.left) / rect.width));
    py.set(clamp01((cy - rect.top) / rect.height));
  }

  function rest() {
    px.set(0.5);
    py.set(0.5);
    lit.set(0);
  }

  const mouse = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <div
      {...props}
      className={cn("group/comet relative [perspective:1000px]", className)}
      style={
        {
          "--miyuki-foil-ticket-foil-y": "66.667%",
          "--miyuki-foil-ticket-foil-h": "1.75rem",
          ...style,
        } as CSSProperties
      }
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!mouse(e)) return;
        aim(e.currentTarget, e.clientX, e.clientY);
        lit.set(1);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (mouse(e)) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (mouse(e) && !e.currentTarget.querySelector(":focus-visible")) rest();
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        px.set(0.3);
        py.set(0.28);
        lit.set(1);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
      }}
    >
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-[8%] top-[10%] bottom-0 rounded-[28px] blur-2xl",
          "bg-[oklch(0.42_0.09_250/0.5)] dark:bg-[oklch(0.04_0.02_250/0.9)] ink:bg-[oklch(0.04_0_0/0.9)]",
        )}
        style={{ x: shadowX, y: shadowY, opacity: shadowOpacity, scale: shadowScale }}
      />
      <motion.div
        className={cn(
          "relative isolate size-full overflow-clip rounded-2xl border border-foreground/10 bg-card text-card-foreground",
        )}
        style={
          {
            rotateX,
            rotateY,
            x,
            y,
            scale,
            maskImage: foil ? TICKET : undefined,
            maskComposite: foil ? "intersect" : undefined,
            WebkitMaskImage: foil ? TICKET : undefined,
            WebkitMaskComposite: foil ? "source-in" : undefined,
          } as MotionStyle
        }
      >
        {children}
        {foil ? (
          <motion.div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 border-y border-white/40 dark:border-white/15",
              "[--miyuki-foil-ticket-a:color-mix(in_oklab,var(--brand)_62%,white)] [--miyuki-foil-ticket-b:color-mix(in_oklab,var(--chart-2)_62%,white)] [--miyuki-foil-ticket-c:color-mix(in_oklab,var(--chart-3)_62%,white)]",
              "dark:[--miyuki-foil-ticket-a:var(--brand)] dark:[--miyuki-foil-ticket-b:var(--chart-2)] dark:[--miyuki-foil-ticket-c:var(--chart-3)]",
            )}
            style={{
              top: "var(--miyuki-foil-ticket-foil-y)",
              height: "var(--miyuki-foil-ticket-foil-h)",
              backgroundImage: foilImage,
              backgroundSize: "100% 100%, 16px 14px, 340% 100%",
              backgroundPosition: foilPosition,
            }}
          />
        ) : null}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-full mix-blend-soft-light"
          style={{
            x: bandX,
            opacity: lit,
            backgroundImage:
              "linear-gradient(112deg, transparent 40%, rgb(255 255 255 / 0.5) 46%, rgb(255 255 255 / 0.95) 50%, rgb(255 255 255 / 0.5) 54%, transparent 60%)",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-full"
          style={{
            x: bandX,
            opacity: lit,
            backgroundImage:
              "linear-gradient(112deg, transparent 45%, rgb(255 255 255 / 0.07) 48.5%, rgb(255 255 255 / 0.15) 50%, rgb(255 255 255 / 0.07) 51.5%, transparent 55%)",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ opacity: lit, backgroundImage: glow }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ring-[3px] ring-ring ring-inset group-has-[:focus-visible]/comet:opacity-100"
        />
      </motion.div>
    </div>
  );
}
