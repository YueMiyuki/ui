"use client";

import { type ComponentProps, type CSSProperties, useMemo } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SlipstreamProps extends ComponentProps<"span"> {
  streaks?: number;
  duration?: number;
  color?: string;
}

const TICKS = [
  "-top-1 -left-1 border-t border-l",
  "-top-1 -right-1 border-t border-r",
  "-bottom-1 -left-1 border-b border-l",
  "-bottom-1 -right-1 border-b border-r",
];

export function Slipstream({
  streaks = 12,
  duration = 0.6,
  color = "var(--brand)",
  className,
  style,
  children,
  ...props
}: SlipstreamProps) {
  const count = Math.max(0, Math.round(streaks));
  const lines = useMemo(() => {
    const rng = createRng(`miyuki-slipstream-${count}`);
    return Array.from({ length: count }, (_, i) => ({
      top: ((i + 0.5) / count) * 84 + 8 + rng.range(-3, 3),
      width: rng.range(18, 55),
      speed: rng.range(0.55, 1.45),
      delay: -rng.range(0, 1.5),
      alpha: rng.range(0.35, 0.95),
      thick: rng() < 0.3,
    }));
  }, [count]);

  return (
    <span
      {...props}
      className={cn("group/cover relative inline-block rounded-md bg-secondary px-2 align-baseline", className)}
      style={{ "--miyuki-slipstream-color": color, ...style } as CSSProperties}
    >
      <style href="miyuki-slipstream" precedence="miyuki">{`
        @keyframes miyuki-slipstream-streak {
          from { transform: translate3d(100cqw, 0, 0); }
          to { transform: translate3d(-100%, 0, 0); }
        }
      `}</style>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-clip rounded-[inherit] opacity-0 [container-type:size]",
          "transition-opacity duration-300 ease-settle group-hover/cover:opacity-100 group-hover/cover:duration-150",
        )}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className={cn(
              "absolute left-0 rounded-full",
              "animate-[miyuki-slipstream-streak_1s_linear_infinite] [animation-play-state:paused] group-hover/cover:[animation-play-state:running]",
              "motion-reduce:animate-none motion-reduce:translate-x-[40cqw]",
              line.thick ? "h-[1.5px]" : "h-px",
            )}
            style={{
              top: `${line.top}%`,
              width: `${line.width}%`,
              opacity: line.alpha,
              animationDuration: `${(duration * line.speed).toFixed(3)}s`,
              animationDelay: `${(line.delay * duration).toFixed(3)}s`,
              background: "linear-gradient(to right, var(--miyuki-slipstream-color), transparent)",
            }}
          />
        ))}
      </span>
      {TICKS.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute size-1.5 border-foreground/35 transition-colors duration-200 ease-settle group-hover/cover:border-(--miyuki-slipstream-color)",
            position,
          )}
        />
      ))}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 px-[inherit] text-(--miyuki-slipstream-color) opacity-0 blur-[1px] select-none",
          "origin-bottom transition-[opacity,transform] duration-300 ease-settle",
          "group-hover/cover:translate-x-[-0.22em] group-hover/cover:[transform:skewX(-9deg)_scaleX(0.96)] group-hover/cover:opacity-35",
          "motion-reduce:group-hover/cover:transform-none",
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "relative inline-block origin-bottom transition-transform duration-300 ease-settle",
          "group-hover/cover:[transform:skewX(-9deg)_scaleX(0.96)] motion-reduce:group-hover/cover:transform-none",
        )}
      >
        {children}
      </span>
    </span>
  );
}
