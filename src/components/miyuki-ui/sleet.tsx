import type { ComponentProps, CSSProperties } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SleetProps extends ComponentProps<"div"> {
  count?: number;
  angle?: number;
  minDuration?: number;
  maxDuration?: number;
  color?: string;
}

const ACTIVE = 0.45;

function buildSleet(count: number, angle: number, min: number, max: number) {
  const rng = createRng(`sleet:${count}:${angle}`);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const lo = Math.max(0.5, Math.min(min, max));
  const hi = Math.max(lo, Math.max(min, max));
  const fromTop = Math.abs(dy) / (Math.abs(dx) + Math.abs(dy) || 1);
  return Array.from({ length: Math.max(0, Math.round(count)) }, () => {
    let x: number;
    let y: number;
    if (rng() < fromTop) {
      x = rng.range(-10, 115);
      y = dy >= 0 ? 0 : 100;
    } else {
      x = dx <= 0 ? 100 : 0;
      y = dy >= 0 ? rng.range(-5, 70) : rng.range(30, 105);
    }
    const duration = rng.range(lo, hi);
    return {
      x,
      y,
      length: rng.range(70, 150),
      reach: rng.range(0.5, 0.95),
      strength: rng.range(0.55, 1),
      duration,
      delay: -rng.range(0, duration),
    };
  });
}

export function Sleet({
  count = 18,
  angle = 215,
  minDuration = 3,
  maxDuration = 9,
  color = "var(--brand)",
  className,
  style,
  children,
  ...props
}: SleetProps) {
  const meteors = buildSleet(count, angle, minDuration, maxDuration);
  const rad = (angle * Math.PI) / 180;
  const ax = Math.max(0.05, Math.abs(Math.sin(rad)));
  const ay = Math.max(0.05, Math.abs(Math.cos(rad)));
  const span = `min(${(100 / ay).toFixed(1)}cqh, ${(100 / ax).toFixed(1)}cqw)`;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-sleet-head:color-mix(in_oklab,var(--miyuki-sleet-color)_40%,var(--foreground))]",
        "dark:[--miyuki-sleet-head:color-mix(in_oklab,var(--miyuki-sleet-color)_22%,white)]",
        className,
      )}
      style={{ ...style, "--miyuki-sleet-color": color } as CSSProperties}
      {...props}
    >
      <style href="miyuki-sleet" precedence="miyuki">{`
@keyframes miyuki-sleet-fall {
  0% { transform: rotate(var(--miyuki-sleet-rotate)) translate3d(0, 0, 0); opacity: 0; }
  ${(ACTIVE * 0.08 * 100).toFixed(1)}% { opacity: var(--miyuki-sleet-strength); }
  ${(ACTIVE * 0.6 * 100).toFixed(1)}% { opacity: var(--miyuki-sleet-strength); }
  ${(ACTIVE * 100).toFixed(1)}%, 100% { transform: rotate(var(--miyuki-sleet-rotate)) translate3d(var(--miyuki-sleet-travel), 0, 0); opacity: 0; }
}
.miyuki-sleet-streak {
  animation: miyuki-sleet-fall var(--miyuki-sleet-duration) linear var(--miyuki-sleet-delay) infinite;
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-sleet-streak { animation-play-state: paused; }
}
`}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
        {meteors.map((meteor, i) => (
          <span
            key={i}
            className="miyuki-sleet-streak absolute size-0"
            style={
              {
                left: `${meteor.x.toFixed(2)}%`,
                top: `${meteor.y.toFixed(2)}%`,
                "--miyuki-sleet-rotate": `${angle - 90}deg`,
                "--miyuki-sleet-travel": `calc(${span} * ${meteor.reach.toFixed(2)} + ${meteor.length.toFixed(0)}px)`,
                "--miyuki-sleet-strength": meteor.strength.toFixed(2),
                "--miyuki-sleet-duration": `${meteor.duration.toFixed(2)}s`,
                "--miyuki-sleet-delay": `${meteor.delay.toFixed(2)}s`,
              } as CSSProperties
            }
          >
            <span
              className="absolute top-[-0.5px] right-0 h-px w-[calc(var(--miyuki-sleet-length)*0.6)] bg-[linear-gradient(to_right,transparent,color-mix(in_oklab,var(--miyuki-sleet-color)_75%,transparent)_75%,var(--miyuki-sleet-head))] opacity-75 dark:w-(--miyuki-sleet-length) dark:opacity-100"
              style={{ "--miyuki-sleet-length": `${meteor.length.toFixed(0)}px` } as CSSProperties}
            />
            <span className="absolute top-0 right-0 size-[2px] translate-x-1/2 -translate-y-1/2 rounded-full bg-(--miyuki-sleet-head) opacity-80 dark:opacity-100 dark:shadow-[0_0_6px_1px_var(--miyuki-sleet-color)]" />
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
