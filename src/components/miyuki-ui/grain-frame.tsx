import type { CSSProperties, HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface GrainFrameProps extends HTMLAttributes<HTMLDivElement> {
  colors?: string[];
  noiseIntensity?: number;
  speed?: number;
  animating?: boolean;
  backdropBlur?: boolean;
  containerClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/></filter><rect width='180' height='180' filter='url(#g)'/></svg>`,
)}")`;

const PATCHES = [
  { left: "12%", top: "30%", size: "105cqmax", orbit: "24cqmax", time: 1, delay: -0.15, reverse: false },
  { left: "88%", top: "70%", size: "95cqmax", orbit: "20cqmax", time: 1.3, delay: -0.55, reverse: true },
  { left: "52%", top: "50%", size: "80cqmax", orbit: "28cqmax", time: 0.85, delay: -0.8, reverse: false },
];

export function GrainFrame({
  colors = DEFAULT_COLORS,
  noiseIntensity = 0.2,
  speed = 0.1,
  animating = true,
  backdropBlur = false,
  className,
  containerClassName,
  style,
  children,
  ...props
}: GrainFrameProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const pick = (i: number) => palette[i % palette.length];
  const period = 2 / Math.max(0.005, speed);

  return (
    <div
      {...props}
      className={cn("relative isolate w-fit overflow-hidden", containerClassName)}
      style={
        {
          ...style,
          "--miyuki-grain-frame-state": animating ? "running" : "paused",
        } as CSSProperties
      }
    >
      <style href="miyuki-grain-frame" precedence="miyuki">{`
@keyframes miyuki-grain-frame-orbit {
  from { transform: translate(-50%, -50%) rotate(0turn) translateX(var(--miyuki-grain-frame-orbit)) rotate(0turn); }
  to { transform: translate(-50%, -50%) rotate(1turn) translateX(var(--miyuki-grain-frame-orbit)) rotate(-1turn); }
}
.miyuki-grain-frame-patch {
  animation: miyuki-grain-frame-orbit var(--miyuki-grain-frame-time) linear infinite;
  animation-play-state: var(--miyuki-grain-frame-state);
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-grain-frame-patch { animation-play-state: paused; }
}
`}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] [container-type:size]"
        style={{ backgroundImage: `linear-gradient(100deg, ${pick(0)}, ${pick(1)} 50%, ${pick(2)})` }}
      >
        {PATCHES.map((p, i) => (
          <div
            key={i}
            className="miyuki-grain-frame-patch absolute rounded-full will-change-transform"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                transform: `translate(-50%, -50%) translateX(${p.orbit})`,
                backgroundImage: `radial-gradient(closest-side, ${pick(i)}, color-mix(in oklab, ${pick(i)} 55%, transparent) 45%, transparent)`,
                animationDelay: `${p.delay * period * p.time}s`,
                animationDirection: p.reverse ? "reverse" : "normal",
                "--miyuki-grain-frame-orbit": p.orbit,
                "--miyuki-grain-frame-time": `${period * p.time}s`,
              } as CSSProperties
            }
          />
        ))}
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage: GRAIN,
            backgroundSize: "180px 180px",
            opacity: Math.min(1, Math.max(0, noiseIntensity)),
          }}
        />
      </div>
      <div className={cn("relative grid", backdropBlur && "backdrop-blur-xl", className)}>{children}</div>
    </div>
  );
}
