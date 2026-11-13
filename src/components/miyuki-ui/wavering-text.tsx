"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type ElementType, type Ref, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type WaveringTextMode = "boil" | "ripple";

export interface WaveringTextProps extends Omit<ComponentProps<"span">, "ref"> {
  mode?: WaveringTextMode;
  steps?: number;
  stepDuration?: number;
  scale?: number;
  baseFrequency?: number;
  numOctaves?: number;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function rippleFrequency(base: number, seconds: number) {
  const x = base * (0.55 + 0.08 * Math.sin(seconds * 0.9));
  const y = base * (1.9 + 0.35 * Math.sin(seconds * 1.3 + 1.2));
  return `${x.toFixed(5)} ${y.toFixed(5)}`;
}

export function WaveringText({
  mode = "boil",
  steps = 5,
  stepDuration = 110,
  scale: ownScale,
  baseFrequency = 0.02,
  numOctaves: ownOctaves,
  as: Tag = "span",
  className,
  style,
  children,
  ref,
  ...props
}: WaveringTextProps) {
  const scale = ownScale ?? (mode === "ripple" ? 8 : 4);
  const numOctaves = ownOctaves ?? (mode === "ripple" ? 1 : 3);
  const own = useRef<HTMLElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const id = `miyuki-squiggly-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [frame, setFrame] = useState(0);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { margin: "80px" });
  const frames = Math.max(1, Math.round(steps));

  useEffect(() => {
    if (mode !== "boil" || reduced || !inView || frames < 2) return;
    const tick = setTimeout(() => setFrame((f) => (f + 1) % frames), Math.max(16, stepDuration));
    return () => clearTimeout(tick);
  }, [mode, reduced, inView, frames, stepDuration, frame]);

  useEffect(() => {
    const node = turbulence.current;
    if (mode !== "ripple" || reduced || !inView || !node) return;
    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    const loop = () => {
      const now = performance.now();
      if (now - last >= 32) {
        last = now;
        node.setAttribute("baseFrequency", rippleFrequency(baseFrequency, (now - t0) / 1000));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, reduced, inView, baseFrequency]);

  const filter = mode === "boil" ? `${id}-${frame % frames}` : `${id}-ripple`;

  return (
    <Tag
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative", className)}
      style={{ ...style, filter: `url(#${filter})` }}
    >
      <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
        <defs>
          {mode === "boil" ? (
            Array.from({ length: frames }, (_, k) => (
              <filter
                key={k}
                id={`${id}-${k}`}
                x="-10%"
                y="-20%"
                width="120%"
                height="140%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={baseFrequency}
                  numOctaves={numOctaves}
                  seed={k * 7 + 3}
                />
                <feDisplacementMap in="SourceGraphic" scale={scale} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            ))
          ) : (
            <filter id={`${id}-ripple`} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
              <feTurbulence
                ref={turbulence}
                type="fractalNoise"
                baseFrequency={rippleFrequency(baseFrequency, 0)}
                numOctaves={numOctaves}
                seed={11}
              />
              <feDisplacementMap in="SourceGraphic" scale={scale} xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation="0.45" />
            </filter>
          )}
        </defs>
      </svg>
      {children}
    </Tag>
  );
}
