"use client";

import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LowSunOrigin = "top-left" | "top-right" | "top";

export interface LowSunProps extends ComponentProps<"div"> {
  from?: LowSunOrigin;
  color?: string;
  size?: number;
  delay?: number;
  follow?: boolean;
}

const SETTLE = [0.22, 1, 0.36, 1] as const;
const SWEEP = 20;
const LEAN = 14;

const LAYERS = [
  { start: 0.02, length: 1.8, width: 0.78, blur: 32, fill: "var(--miyuki-low-sun-wash)" },
  { start: -0.04, length: 1.32, width: 0.3, blur: 18, fill: "var(--miyuki-low-sun-beam)" },
  { start: -0.02, length: 0.86, width: 0.08, blur: 6, fill: "var(--miyuki-low-sun-core)" },
];

const DAY = `
  --miyuki-low-sun-wash: color-mix(in oklab, var(--miyuki-low-sun-color) 13%, transparent);
  --miyuki-low-sun-beam: color-mix(in oklab, var(--miyuki-low-sun-color) 17%, transparent);
  --miyuki-low-sun-core: color-mix(in oklab, var(--miyuki-low-sun-color) 26%, transparent);`;
const NIGHT = `
  --miyuki-low-sun-wash: color-mix(in oklab, var(--miyuki-low-sun-color) 30%, transparent);
  --miyuki-low-sun-beam: color-mix(in oklab, color-mix(in oklab, var(--miyuki-low-sun-color) 62%, var(--foreground)) 30%, transparent);
  --miyuki-low-sun-core: color-mix(in oklab, color-mix(in oklab, var(--miyuki-low-sun-color) 22%, var(--foreground)) 62%, transparent);`;

const STYLES = `
.miyuki-low-sun {${DAY}
}
.dark .miyuki-low-sun, .miyuki-low-sun.dark, .light .dark .miyuki-low-sun, .light .miyuki-low-sun.dark {${NIGHT}
}
.dark .light .miyuki-low-sun, .dark .miyuki-low-sun.light {${DAY}
}
@keyframes miyuki-low-sun-breathe {
  from { transform: scale(1, 1); opacity: 0.88; }
  to { transform: scale(1.04, 1.08); opacity: 1; }
}
.miyuki-low-sun-breathe {
  animation: miyuki-low-sun-breathe 9s cubic-bezier(0.45, 0.05, 0.25, 1) infinite alternate;
  transform-origin: 0 0;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-low-sun-breathe { animation: none; }
}
`;

function aim(from: LowSunOrigin, w: number, h: number) {
  const ox = from === "top" ? w / 2 : from === "top-left" ? -w * 0.04 : w * 1.04;
  const oy = from === "top" ? -h * 0.22 : -h * 0.16;
  const tx = w / 2;
  const ty = h * 0.55;
  const angle = (Math.atan2(ty - oy, tx - ox) * 180) / Math.PI;
  return { ox, oy, angle, reach: Math.hypot(tx - ox, ty - oy) };
}

export function LowSun({
  from = "top-left",
  color = "var(--brand)",
  size = 1,
  delay = 0.3,
  follow = false,
  className,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: LowSunProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const base = useMotionValue(0);
  const sweep = useMotionValue(reduce ? 0 : -SWEEP);
  const reach = useMotionValue(reduce ? 1 : 0.72);
  const opacity = useMotionValue(0);
  const lean = useSpring(0, { stiffness: 70, damping: 18, mass: 1.1 });
  const rotate = useTransform(() => base.get() + sweep.get() + lean.get());
  const geometry = box ? aim(from, box.w, box.h) : null;
  const ready = geometry !== null;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const angle = geometry?.angle;
  useEffect(() => {
    if (angle !== undefined) base.set(angle);
  }, [angle, base]);

  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      sweep.set(0);
      reach.set(1);
      const fade = animate(opacity, 1, { duration: 0.2 });
      return () => fade.stop();
    }
    const runs = [
      animate(opacity, 1, { duration: 1.1, delay, ease: "easeOut" }),
      animate(sweep, 0, { duration: 1.5, delay, ease: SETTLE }),
      animate(reach, 1, { duration: 1.5, delay, ease: SETTLE }),
    ];
    return () => runs.forEach((run) => run.stop());
  }, [ready, reduce, delay, opacity, sweep, reach]);

  const scale = Math.max(0.2, size);
  const d = geometry ? geometry.reach * scale : 0;

  return (
    <div
      ref={rootRef}
      className={cn("miyuki-low-sun relative isolate overflow-hidden", className)}
      style={{ ...style, "--miyuki-low-sun-color": color } as CSSProperties}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!follow || reduce || !geometry) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const toward = (Math.atan2(y - geometry.oy, x - geometry.ox) * 180) / Math.PI;
        const delta = ((toward - geometry.angle + 540) % 360) - 180;
        lean.set(Math.max(-LEAN, Math.min(LEAN, delta * 0.75)));
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        lean.set(0);
      }}
      {...props}
    >
      <style href="miyuki-low-sun" precedence="miyuki">
        {STYLES}
      </style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {geometry ? (
          <motion.div
            className="absolute size-0"
            style={{ left: geometry.ox, top: geometry.oy, rotate, opacity, scaleX: reach, originX: 0, originY: 0 }}
          >
            <div className="miyuki-low-sun-breathe absolute top-0 left-0 size-0">
              {LAYERS.map((layer, i) => (
                <div
                  key={i}
                  className="absolute rounded-[50%]"
                  style={{
                    left: layer.start * d,
                    top: (-layer.width * d) / 2,
                    width: layer.length * d,
                    height: layer.width * d,
                    background: `radial-gradient(closest-side, ${layer.fill}, color-mix(in oklab, ${layer.fill} 55%, transparent) 45%, transparent)`,
                    filter: `blur(${layer.blur * scale}px)`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
