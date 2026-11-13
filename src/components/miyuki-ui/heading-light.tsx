"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useRef } from "react";
import { cn } from "@/lib/utils";

export interface HeadingLightProps extends ComponentProps<"div"> {
  color?: string;
  width?: string;
  delay?: number;
  duration?: number;
}

const SETTLE = [0.22, 1, 0.36, 1] as const;
const APEX = "-26.6%";
const CONE_FADE = "linear-gradient(to bottom, #000, rgb(0 0 0 / 0.55) 30%, rgb(0 0 0 / 0.18) 62%, transparent 92%)";

const left = `conic-gradient(from 170deg at 50% ${APEX}, transparent 0deg, var(--miyuki-heading-light-cone) 20deg, var(--miyuki-heading-light-cone) 26deg, color-mix(in oklab, var(--miyuki-heading-light-cone) 40%, transparent) 50deg, transparent 72deg, transparent 360deg)`;
const right = `conic-gradient(from 118deg at 50% ${APEX}, transparent 0deg, color-mix(in oklab, var(--miyuki-heading-light-cone) 40%, transparent) 22deg, var(--miyuki-heading-light-cone) 46deg, var(--miyuki-heading-light-cone) 52deg, transparent 72deg, transparent 360deg)`;

const DAY = `
  --miyuki-heading-light-cone: color-mix(in oklab, var(--miyuki-heading-light-color) 15%, transparent);
  --miyuki-heading-light-pool: color-mix(in oklab, var(--miyuki-heading-light-color) 12%, transparent);
  --miyuki-heading-light-core: color-mix(in oklab, var(--miyuki-heading-light-color) 78%, var(--foreground));
  --miyuki-heading-light-edge: color-mix(in oklab, var(--miyuki-heading-light-color) 75%, transparent);
  --miyuki-heading-light-bloom: color-mix(in oklab, var(--miyuki-heading-light-color) 22%, transparent);
  --miyuki-heading-light-bar: 1px;`;
const NIGHT = `
  --miyuki-heading-light-cone: color-mix(in oklab, var(--miyuki-heading-light-color) 30%, transparent);
  --miyuki-heading-light-pool: color-mix(in oklab, var(--miyuki-heading-light-color) 20%, transparent);
  --miyuki-heading-light-core: color-mix(in oklab, var(--miyuki-heading-light-color) 12%, var(--foreground));
  --miyuki-heading-light-edge: var(--miyuki-heading-light-color);
  --miyuki-heading-light-bloom: color-mix(in oklab, var(--miyuki-heading-light-color) 50%, transparent);
  --miyuki-heading-light-bar: 2px;`;

const SCOPES = `
.miyuki-heading-light {${DAY}
}
.dark .miyuki-heading-light, .miyuki-heading-light.dark, .light .dark .miyuki-heading-light, .light .miyuki-heading-light.dark {${NIGHT}
}
.dark .light .miyuki-heading-light, .dark .miyuki-heading-light.light {${DAY}
}
`;

export function HeadingLight({
  color = "var(--brand)",
  width = "60%",
  delay = 0.2,
  duration = 0.9,
  className,
  style,
  children,
  ...props
}: HeadingLightProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const open = useInView(rootRef, { once: true, amount: 0.35 });
  const timing = reduce ? { duration: 0.2 } : { duration, delay, ease: SETTLE };

  return (
    <div
      ref={rootRef}
      className={cn("miyuki-heading-light relative isolate flex flex-col items-center overflow-hidden", className)}
      style={{ ...style, "--miyuki-heading-light-color": color } as CSSProperties}
      {...props}
    >
      <style href="miyuki-heading-light" precedence="miyuki">
        {SCOPES}
      </style>
      <div aria-hidden="true" className="pointer-events-none relative -z-10 h-0 w-full shrink-0">
        <motion.div
          className="absolute top-0 left-1/2 -ml-[calc(var(--miyuki-heading-light-width)/2)] h-0 w-[var(--miyuki-heading-light-width)]"
          style={{ "--miyuki-heading-light-width": width } as CSSProperties}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.5 }}
          animate={open ? { opacity: 1, scaleX: 1 } : undefined}
          transition={timing}
        >
          <div
            className="absolute top-0 left-1/2 aspect-[1.9/1] w-[190%] -translate-x-1/2"
            style={{ backgroundImage: `${left}, ${right}`, maskImage: CONE_FADE, WebkitMaskImage: CONE_FADE }}
          />
          <div className="absolute top-4 left-1/2 h-56 w-[110%] -translate-x-1/2 bg-[radial-gradient(closest-side,var(--miyuki-heading-light-pool),transparent)]" />
          <div className="absolute bottom-0 left-1/2 h-16 w-[92%] -translate-x-1/2 translate-y-1/2 bg-[radial-gradient(closest-side,var(--miyuki-heading-light-bloom),transparent)]" />
          <div className="absolute top-0 left-1/2 h-(--miyuki-heading-light-bar) w-[96%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--miyuki-heading-light-edge)_14%,var(--miyuki-heading-light-core)_50%,var(--miyuki-heading-light-edge)_86%,transparent)] [box-shadow:0_0_10px_1px_var(--miyuki-heading-light-bloom)]" />
        </motion.div>
      </div>
      <motion.div
        className="relative mt-11 flex flex-col items-center"
        initial={reduce ? false : { y: 10 }}
        animate={open ? { y: 0 } : undefined}
        transition={timing}
      >
        {children}
      </motion.div>
    </div>
  );
}
