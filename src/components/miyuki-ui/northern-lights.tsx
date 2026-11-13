import type { ComponentProps, CSSProperties } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface NorthernLightsProps extends ComponentProps<"div"> {
  colors?: string[];
  speed?: number;
  intensity?: number;
  position?: "top" | "bottom";
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];

const DEPTHS = [
  {
    period: 980,
    angle: 97,
    blur: 46,
    duration: 88,
    direction: -1,
    width: [0.1, 0.2],
    gap: [0.05, 0.14],
    strength: [62, 100],
    soft: true,
  },
  {
    period: 760,
    angle: 104,
    blur: 30,
    duration: 62,
    direction: 1,
    width: [0.07, 0.14],
    gap: [0.08, 0.2],
    strength: [55, 92],
    soft: true,
  },
  {
    period: 540,
    angle: 100,
    blur: 9,
    duration: 41,
    direction: -1,
    width: [0.018, 0.04],
    gap: [0.09, 0.24],
    strength: [55, 90],
    soft: false,
  },
] as const;

interface Curtain {
  image: string;
  shift: number;
  blur: number;
  duration: number;
  delay: number;
  rays: boolean;
}

const unit = (n: number) => `calc(var(--miyuki-northern-lights-u, 1px) * ${n.toFixed(1)})`;

function buildCurtains(colors: readonly string[]): Curtain[] {
  const rng = createRng(`northern-lights:${colors.join("|")}`);
  return DEPTHS.map((depth, layer) => {
    const P = depth.period;
    const stops: string[] = [];
    let x = rng.range(depth.gap[0], depth.gap[1]) * P * 0.5;
    let i = layer;
    while (true) {
      const w = rng.range(depth.width[0], depth.width[1]) * P;
      const gap = rng.range(depth.gap[0], depth.gap[1]) * P;
      if (x + w + gap * 0.5 > P) break;
      const base = colors[i % colors.length];
      i++;
      const strength = Math.round(rng.range(depth.strength[0], depth.strength[1]));
      const color = depth.soft
        ? `color-mix(in oklab, ${base} ${strength}%, transparent)`
        : `color-mix(in oklab, color-mix(in oklab, ${base} 58%, var(--miyuki-northern-lights-ray)) ${strength}%, transparent)`;
      stops.push(
        `transparent ${unit(x)}`,
        `${color} ${unit(x + w * 0.3)}`,
        `${color} ${unit(x + w * 0.7)}`,
        `transparent ${unit(x + w)}`,
      );
      x += w + gap;
    }
    stops.push(`transparent ${unit(P)}`);
    const angle = depth.angle;
    const shift = (P / Math.sin((angle * Math.PI) / 180)) * depth.direction;
    return {
      image: `repeating-linear-gradient(${angle}deg, ${stops.join(", ")})`,
      shift,
      blur: depth.blur,
      duration: depth.duration,
      delay: -rng.range(0, depth.duration),
      rays: !depth.soft,
    };
  });
}

const MASKS = {
  top: "radial-gradient(ellipse 150% 105% at 50% 0%, #000 22%, rgb(0 0 0 / 0.45) 48%, transparent 74%)",
  bottom: "radial-gradient(ellipse 150% 105% at 50% 100%, #000 22%, rgb(0 0 0 / 0.45) 48%, transparent 74%)",
};

export function NorthernLights({
  colors = DEFAULT_COLORS,
  speed = 1,
  intensity = 0.6,
  position = "top",
  className,
  style,
  children,
  ...props
}: NorthernLightsProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const curtains = buildCurtains(palette);
  const rate = speed > 0 ? speed : 1;
  const strength = Math.min(1, Math.max(0, intensity));
  const mask = MASKS[position];

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ ...style, "--miyuki-northern-lights-intensity": strength } as CSSProperties}
      {...props}
    >
      <style href="miyuki-northern-lights" precedence="miyuki">{`
@keyframes miyuki-northern-lights-drift {
  from { background-position: 0 0; }
  to { background-position: var(--miyuki-northern-lights-shift) 0; }
}
.miyuki-northern-lights-curtain {
  animation: miyuki-northern-lights-drift var(--miyuki-northern-lights-duration) linear var(--miyuki-northern-lights-delay) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-northern-lights-curtain { animation-play-state: paused; }
}
`}</style>
      <div
        aria-hidden="true"
        className={cn(
          "@container pointer-events-none absolute inset-0 -z-10",
          "[--miyuki-northern-lights-ray:transparent] dark:[--miyuki-northern-lights-ray:white]",
          "opacity-[calc(var(--miyuki-northern-lights-intensity)*1.25)] dark:opacity-[calc(var(--miyuki-northern-lights-intensity)*1.55)]",
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div className="absolute inset-0 [--miyuki-northern-lights-u:0.5px] @md:[--miyuki-northern-lights-u:0.72px] @3xl:[--miyuki-northern-lights-u:1px]">
          {curtains.map((curtain, index) => (
            <div
              key={index}
              className={cn(
                "miyuki-northern-lights-curtain absolute -top-[12%] -bottom-[6%] mix-blend-multiply dark:mix-blend-plus-lighter",
                curtain.rays && "opacity-70 dark:opacity-90",
              )}
              style={
                {
                  left: unit(-curtain.blur * 3),
                  right: unit(-curtain.blur * 3),
                  backgroundImage: curtain.image,
                  backgroundSize: `${unit(Math.abs(curtain.shift))} 100%`,
                  backgroundRepeat: "repeat-x",
                  filter: `blur(${unit(curtain.blur)})`,
                  "--miyuki-northern-lights-shift": unit(curtain.shift),
                  "--miyuki-northern-lights-duration": `${(curtain.duration / rate).toFixed(2)}s`,
                  "--miyuki-northern-lights-delay": `${(curtain.delay / rate).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
