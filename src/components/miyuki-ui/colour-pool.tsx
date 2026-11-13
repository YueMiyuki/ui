"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ComponentProps, CSSProperties, PointerEvent } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ColourPoolProps extends ComponentProps<"div"> {
  colors?: string[];
  interactive?: boolean;
  speed?: number;
  blur?: number;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)", "var(--chart-6)"];

const ANCHORS: [number, number][] = [
  [16, 22],
  [84, 18],
  [22, 86],
  [82, 82],
  [50, 108],
];
const REST: [number, number] = [0.7, 0.66];

function buildBlobs(count: number) {
  const rng = createRng(`colour-pool:${count}`);
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = ANCHORS[i % ANCHORS.length];
    const loop = rng.range(20, 40);
    return {
      x: x + rng.range(-4, 4),
      y: y + rng.range(-4, 4),
      size: rng.range(34, 44),
      aspect: rng.range(1.1, 1.45),
      tilt: rng.range(-30, 30),
      orbit: rng.range(13, 22),
      wobble: rng.range(5, 10),
      loop,
      direction: i % 2 === 0 ? 1 : -1,
      delay: -rng.range(0, loop),
    };
  });
}

export function ColourPool({
  colors = DEFAULT_COLORS,
  interactive = true,
  speed = 1,
  blur = 80,
  className,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: ColourPoolProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const count = Math.min(ANCHORS.length, Math.max(4, palette.length));
  const blobs = buildBlobs(count);
  const rate = speed > 0 ? speed : 1;
  const reduce = useReducedMotion();
  const follow = interactive && !reduce;

  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, { stiffness: 38, damping: 16, mass: 1.2 });
  const y = useSpring(targetY, { stiffness: 38, damping: 16, mass: 1.2 });

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (!follow) return;
    const box = event.currentTarget.getBoundingClientRect();
    targetX.set(event.clientX - box.left - box.width * REST[0]);
    targetY.set(event.clientY - box.top - box.height * REST[1]);
  };
  const handleLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    targetX.set(0);
    targetY.set(0);
  };

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ ...style, "--miyuki-colour-pool-blur": `${Math.max(0, blur)}px` } as CSSProperties}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    >
      <style href="miyuki-colour-pool" precedence="miyuki">{`
@keyframes miyuki-colour-pool-turn {
  to { transform: rotate(360deg); }
}
.miyuki-colour-pool-turn {
  animation: miyuki-colour-pool-turn var(--miyuki-colour-pool-loop) linear var(--miyuki-colour-pool-delay) infinite;
  animation-direction: var(--miyuki-colour-pool-direction);
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-colour-pool-turn { animation-play-state: paused; }
}
`}</style>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 overflow-hidden [container-type:size]",
          "bg-[color-mix(in_oklab,var(--brand)_6%,var(--background))] dark:bg-[color-mix(in_oklab,var(--background)_72%,black)]",
        )}
      >
        {blobs.map((blob, i) => {
          const color = palette[i % palette.length];
          const turn = {
            "--miyuki-colour-pool-loop": `${(blob.loop / rate).toFixed(2)}s`,
            "--miyuki-colour-pool-delay": `${(blob.delay / rate).toFixed(2)}s`,
            "--miyuki-colour-pool-direction": blob.direction > 0 ? "normal" : "reverse",
          } as CSSProperties;
          const counter = {
            "--miyuki-colour-pool-loop": `${(blob.loop / 2 / rate).toFixed(2)}s`,
            "--miyuki-colour-pool-delay": `${(blob.delay / 2 / rate).toFixed(2)}s`,
            "--miyuki-colour-pool-direction": blob.direction > 0 ? "reverse" : "normal",
          } as CSSProperties;
          return (
            <div key={i} className="absolute inset-0 mix-blend-multiply dark:mix-blend-screen">
              <div className="absolute size-0" style={{ left: `${blob.x}%`, top: `${blob.y}%` }}>
                <div className="miyuki-colour-pool-turn absolute size-0" style={turn}>
                  <div className="absolute size-0" style={{ transform: `translateX(${blob.orbit.toFixed(1)}cqmin)` }}>
                    <div className="miyuki-colour-pool-turn absolute size-0" style={counter}>
                      <div
                        className="absolute rounded-[50%] opacity-45 blur-(--miyuki-colour-pool-blur) dark:opacity-60"
                        style={{
                          width: `calc(${(blob.size * blob.aspect * 0.68).toFixed(1)}cqw + ${(blob.size * blob.aspect * 0.68).toFixed(1)}cqh)`,
                          height: `calc(${(blob.size * 0.68).toFixed(1)}cqw + ${(blob.size * 0.68).toFixed(1)}cqh)`,
                          background: color,
                          transform: `translate(-50%, -50%) translateX(${blob.wobble.toFixed(1)}cqmin) rotate(${blob.tilt.toFixed(0)}deg)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {interactive ? (
          <div className="absolute inset-0 mix-blend-multiply dark:mix-blend-screen">
            <motion.div
              className="absolute size-0"
              style={{ left: `${REST[0] * 100}%`, top: `${REST[1] * 100}%`, x, y }}
            >
              <div
                className="absolute size-[calc(20cqw+20cqh)] -translate-1/2 rounded-full opacity-40 blur-(--miyuki-colour-pool-blur) dark:opacity-55"
                style={{ background: palette[0] }}
              />
            </motion.div>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
