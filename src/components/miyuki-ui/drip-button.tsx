"use client";

import { useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useRef } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type HoverEvent,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type DripButtonVariant = "brand" | "primary";
export type DripButtonSize = "sm" | "md" | "lg";

export interface DripButtonProps extends AriaButtonProps {
  variant?: DripButtonVariant;
  size?: DripButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const sizes: Record<DripButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-11 px-5",
};

const metrics: Record<DripButtonSize, { bead: number; blur: number; fall: number }> = {
  sm: { bead: 4.4, blur: 2.4, fall: 34 },
  md: { bead: 5.2, blur: 2.8, fall: 40 },
  lg: { bead: 6.2, blur: 3.2, fall: 46 },
};

const variants: Record<DripButtonVariant, string> = {
  brand: cn(
    "text-brand-foreground [--miyuki-drip-button-fill:var(--brand)]",
    "data-[hovered]:[--miyuki-drip-button-fill:color-mix(in_oklab,var(--brand)_90%,var(--background))]",
  ),
  primary: cn(
    "text-primary-foreground [--miyuki-drip-button-fill:var(--primary)]",
    "data-[hovered]:[--miyuki-drip-button-fill:color-mix(in_oklab,var(--primary)_90%,var(--background))]",
  ),
};

const SLOTS = 6;
const SLOT_KEYS = Array.from({ length: SLOTS }, (_, i) => i);
const RADIUS = 10;
const GRAVITY = 2100;

interface Drop {
  phase: "gather" | "neck" | "fall" | "land" | "idle";
  x: number;
  t: number;
  gather: number;
  neck: number;
  y: number;
  vy: number;
  mound: number;
  moundT: number;
  ground: number;
}

interface Slot {
  mound: SVGEllipseElement | null;
  bead: SVGEllipseElement | null;
  splat: SVGEllipseElement | null;
  ring: SVGEllipseElement | null;
}

const smooth = (u: number) => u * u * (3 - 2 * u);
const set = (el: Element | null, attrs: Record<string, number>) => {
  if (!el) return;
  for (const key in attrs) el.setAttribute(key, String(Math.round(attrs[key] * 100) / 100));
};

export function DripButton({
  variant = "brand",
  size = "md",
  iconStart,
  iconEnd,
  className,
  children,
  onHoverStart,
  onHoverEnd,
  onPressStart,
  ...props
}: DripButtonProps) {
  const reduce = useReducedMotion() ?? false;
  const goo = `miyuki-drip-button-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const m = metrics[size];
  const host = useRef<HTMLSpanElement>(null);
  const strip = useRef<SVGRectElement>(null);
  const slots = useRef<Slot[]>(
    Array.from({ length: SLOTS }, () => ({ mound: null, bead: null, splat: null, ring: null })),
  );
  const engine = useRef<{ hover: (on: boolean) => void; pour: () => void } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const R = m.bead;
    const box = { w: el.offsetWidth, h: el.offsetHeight };
    const drops: Drop[] = Array.from({ length: SLOTS }, () => ({
      phase: "idle",
      x: 0,
      t: 0,
      gather: 0,
      neck: 0,
      y: 0,
      vy: 0,
      mound: 0,
      moundT: 0,
      ground: 0,
    }));
    let hovering = false;
    let nextAt = 0;
    let frame = 0;
    let last = 0;

    const layout = () => {
      const inset = RADIUS + 3;
      set(strip.current, { x: inset, y: box.h - 9, width: Math.max(0, box.w - inset * 2), height: 9 });
    };
    layout();
    const ro = new ResizeObserver(() => {
      box.w = el.offsetWidth;
      box.h = el.offsetHeight;
      layout();
    });
    ro.observe(el);

    const span = () => {
      const lo = RADIUS + R + 5;
      const hi = box.w - RADIUS - R - 5;
      return [lo, hi] as const;
    };

    const draw = (i: number) => {
      const d = drops[i];
      const s = slots.current[i];
      const h = box.h;
      const hide = (e: SVGEllipseElement | null) => set(e, { rx: 0, ry: 0 });
      if (d.phase === "idle") {
        hide(s.mound);
        hide(s.bead);
        hide(s.splat);
        set(s.ring, { rx: 0, ry: 0, opacity: 0 });
        return;
      }
      if (d.phase === "gather") {
        const e = smooth(Math.min(1, d.t / d.gather));
        const r = R * (0.35 + 0.65 * e);
        set(s.bead, { cx: d.x, cy: h - r * 0.75 + e * R * 1.05, rx: r * (1.18 - 0.16 * e), ry: r * (0.86 + 0.14 * e) });
        set(s.mound, { cx: d.x, cy: h - R * 0.5, rx: R * 0.9 * e, ry: R * 0.9 * e });
      } else if (d.phase === "neck") {
        const u = Math.min(1, d.t / d.neck);
        set(s.bead, { cx: d.x, cy: d.y, rx: R * (1 - 0.06 * u), ry: R * (1 + 0.18 * u) });
        set(s.mound, { cx: d.x, cy: h - R * 0.5, rx: d.mound, ry: d.mound });
      } else if (d.phase === "fall") {
        const stretch = Math.min(0.32, d.vy / 2000);
        set(s.bead, { cx: d.x, cy: d.y, rx: R * (1 - stretch * 0.3), ry: R * (1 + stretch) });
      }
      if (d.phase === "fall" || d.phase === "land") {
        const k = Math.min(1, d.moundT / 0.24);
        const recoil = Math.sin(k * Math.PI) * 0.18;
        const r = d.mound * (1 - smooth(k)) + R * recoil * (1 - k);
        set(s.mound, { cx: d.x, cy: h - R * 0.5 - recoil * R * 0.6, rx: Math.max(0, r), ry: Math.max(0, r) });
      }
      if (d.phase === "land") {
        hide(s.bead);
        const k = Math.min(1, d.t / 0.12);
        set(s.splat, {
          cx: d.x,
          cy: d.ground - R * 0.2,
          rx: R * (1.1 + 0.7 * k),
          ry: R * 0.42 * (1 - k),
          opacity: 1 - k,
        });
        const q = Math.min(1, d.t / 0.62);
        const e = 1 - (1 - q) ** 3;
        set(s.ring, {
          cx: d.x,
          cy: d.ground - R * 0.2,
          rx: R * (0.9 + 2.3 * e),
          ry: R * (0.9 + 2.3 * e) * 0.3,
          opacity: 0.8 * (1 - q),
          "stroke-width": 1.5 * (1 - e) + 0.35,
        });
      } else {
        hide(s.splat);
        set(s.ring, { rx: 0, ry: 0, opacity: 0 });
      }
    };

    const spawn = (x: number, gather: number, neck: number) => {
      const d = drops.find((q) => q.phase === "idle");
      if (!d) return false;
      Object.assign(d, {
        phase: "gather",
        x,
        t: 0,
        gather,
        neck,
        y: 0,
        vy: 0,
        mound: 0,
        moundT: 0,
        ground: box.h + m.fall,
      });
      return true;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      const [lo, hi] = span();
      const forming = drops.some((d) => d.phase === "gather" || d.phase === "neck");
      if (hovering && !forming && now >= nextAt && hi > lo) {
        const mid = (lo + hi) / 2;
        spawn(mid + (Math.random() - 0.5) * (hi - lo) * 0.55, 0.62 + Math.random() * 0.2, 0.36);
      }
      let active = false;
      drops.forEach((d, i) => {
        if (d.phase === "idle") return;
        active = true;
        d.t += dt;
        if (d.phase === "gather" && d.t >= d.gather) {
          d.phase = "neck";
          d.t = 0;
        }
        if (d.phase === "neck") {
          const u = Math.min(1, d.t / d.neck);
          const reach = R * 2.1;
          d.y = box.h + R * 0.3 + reach * u * u;
          d.mound = R * 0.9 - R * 0.25 * u;
          if (u >= 1) {
            d.phase = "fall";
            d.t = 0;
            d.vy = (2 * reach) / d.neck;
            d.moundT = 0;
            if (hovering) nextAt = now + 380 + Math.random() * 520;
          }
        } else if (d.phase === "fall") {
          d.moundT += dt;
          d.vy += GRAVITY * dt;
          d.y += d.vy * dt;
          if (d.y + R >= d.ground) {
            d.phase = "land";
            d.t = 0;
          }
        } else if (d.phase === "land") {
          d.moundT += dt;
          if (d.t >= 0.62) d.phase = "idle";
        }
        draw(i);
      });
      frame = active || hovering ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    engine.current = {
      hover: (on) => {
        hovering = on && !reduce;
        if (hovering) {
          nextAt = performance.now() + 120;
          wake();
        }
      },
      pour: () => {
        if (reduce) return;
        const [lo, hi] = span();
        if (hi <= lo) return;
        const count = size === "lg" ? 4 : 3;
        const taken = drops.filter((d) => d.phase === "gather" || d.phase === "neck").map((d) => d.x);
        for (let k = 0; k < count; k++) {
          const x = lo + ((k + 0.5) / count) * (hi - lo) + (Math.random() - 0.5) * 8;
          if (taken.some((t) => Math.abs(t - x) < R * 3)) continue;
          const delay = k * 0.045 + Math.random() * 0.02;
          if (spawn(x, 0.1 + Math.random() * 0.05 + delay, 0.16 + Math.random() * 0.04)) taken.push(x);
        }
        wake();
      },
    };

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      engine.current = null;
      drops.forEach((d, i) => {
        d.phase = "idle";
        draw(i);
      });
    };
  }, [m.bead, m.fall, size, reduce]);

  return (
    <AriaButton
      {...props}
      onHoverStart={(event: HoverEvent) => {
        engine.current?.hover(true);
        onHoverStart?.(event);
      }}
      onHoverEnd={(event: HoverEvent) => {
        engine.current?.hover(false);
        onHoverEnd?.(event);
      }}
      onPressStart={(event) => {
        engine.current?.pour();
        onPressStart?.(event);
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/drip relative isolate inline-flex shrink-0 cursor-default items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none outline-none",
          "transition-[scale,box-shadow,color] duration-150 ease-settle data-[pressed]:scale-[0.98]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg:not([data-drip])]:pointer-events-none [&_svg:not([data-drip])]:size-4 [&_svg:not([data-drip])]:shrink-0",
          variants[variant],
          sizes[size],
          cls,
        ),
      )}
    >
      {composeRenderProps(children, (label) => (
        <>
          <span ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]">
            <svg
              data-drip=""
              className="absolute top-0 left-0 w-full overflow-visible"
              style={{ height: `calc(100% + ${m.fall + 14}px)` }}
            >
              <defs>
                <filter
                  id={goo}
                  filterUnits="userSpaceOnUse"
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur stdDeviation={m.blur} />
                  <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
                </filter>
              </defs>
              <g filter={`url(#${goo})`} className="fill-(--miyuki-drip-button-fill) transition-[fill] duration-150">
                <rect ref={strip} rx={4} />
                {SLOT_KEYS.map((i) => (
                  <g key={i}>
                    <ellipse
                      ref={(el) => {
                        slots.current[i].mound = el;
                      }}
                      rx={0}
                      ry={0}
                    />
                    <ellipse
                      ref={(el) => {
                        slots.current[i].bead = el;
                      }}
                      rx={0}
                      ry={0}
                    />
                  </g>
                ))}
              </g>
              <g className="fill-(--miyuki-drip-button-fill) stroke-(--miyuki-drip-button-fill)">
                {SLOT_KEYS.map((i) => (
                  <g key={i}>
                    <ellipse
                      ref={(el) => {
                        slots.current[i].splat = el;
                      }}
                      rx={0}
                      ry={0}
                      stroke="none"
                    />
                    <ellipse
                      ref={(el) => {
                        slots.current[i].ring = el;
                      }}
                      rx={0}
                      ry={0}
                      fill="none"
                      opacity={0}
                    />
                  </g>
                ))}
              </g>
            </svg>
            <span className="absolute inset-0 rounded-[inherit] bg-(--miyuki-drip-button-fill) shadow-xs transition-[background-color] duration-150" />
          </span>
          {iconStart}
          {label != null && label !== false ? <span className="truncate">{label}</span> : null}
          {iconEnd}
        </>
      ))}
    </AriaButton>
  );
}
