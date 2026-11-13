"use client";

import { type ComponentProps, type CSSProperties, useId } from "react";
import { cn } from "@/lib/utils";

export type HatchingPattern = "diagonal" | "horizontal" | "vertical" | "cross" | "waves";
export type HatchingFade = "none" | "radial" | "top" | "bottom";

export interface HatchingProps extends ComponentProps<"div"> {
  pattern?: HatchingPattern;
  size?: number;
  strokeWidth?: number;
  color?: string;
  fade?: HatchingFade;
  animate?: boolean;
}

export interface HatchingContainerProps extends HatchingProps {
  frame?: number;
}

const RINGS = 4;
const DRIFT = 4;
const ROOT5 = Math.sqrt(5);
const TILT = Math.atan2(1, 2);

const FADES: Record<HatchingFade, string | null> = {
  none: null,
  radial: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 35%, transparent 100%)",
  top: "linear-gradient(to top, #000 30%, transparent)",
  bottom: "linear-gradient(to bottom, #000 30%, transparent)",
};

const f = (n: number) => Number(n.toFixed(2));

function fan(cx: number, cy: number, radius: number) {
  let d = "";
  for (let ring = RINGS; ring >= 1; ring--) {
    const k = ring / RINGS;
    const r = radius * k;
    const t = (k * k + 0.25) / k;
    const side = t >= ROOT5 ? Math.PI : TILT + Math.asin(t / ROOT5);
    const below = Math.acos(-k / 2);
    const a = Math.min(side, below);
    const sx = Math.sin(a) * r;
    const sy = -Math.cos(a) * r;
    d += `M${f(cx - sx)} ${f(cy + sy)}A${f(r)} ${f(r)} 0 ${a > Math.PI / 2 ? 1 : 0} 1 ${f(cx + sx)} ${f(cy + sy)}`;
  }
  return d;
}

interface Tile {
  width: number;
  height: number;
  d: string;
  axis: "x" | "y";
}

function tileFor(pattern: HatchingPattern, size: number, stroke: number): Tile {
  const s = Math.max(2, size);
  const h = stroke / 2;
  if (pattern === "horizontal") return { width: s, height: s, d: `M0 ${f(h)}H${s}`, axis: "y" };
  if (pattern === "vertical") return { width: s, height: s, d: `M${f(h)} 0V${s}`, axis: "x" };
  if (pattern === "waves") {
    const r = s * RINGS;
    const d = [fan(r, r / 2, r), fan(0, r, r), fan(2 * r, r, r), fan(r, r * 1.5, r)].join("");
    return { width: 2 * r, height: r, d, axis: "x" };
  }
  const t = Math.max(3, Math.round(s * Math.SQRT2));
  const rising = `M-1 1L1 -1M0 ${t}L${t} 0M${t - 1} ${t + 1}L${t + 1} ${t - 1}`;
  const falling = `M-1 ${t - 1}L1 ${t + 1}M0 0L${t} ${t}M${t - 1} -1L${t + 1} 1`;
  return { width: t, height: t, d: pattern === "cross" ? rising + falling : rising, axis: "x" };
}

export function Hatching({
  pattern = "diagonal",
  size = 10,
  strokeWidth = 1,
  color = "var(--border-strong)",
  fade = "none",
  animate = false,
  className,
  style,
  ...props
}: HatchingProps) {
  const id = `miyuki-hatching-${useId().replace(/[^\w-]/g, "")}`;
  const tile = tileFor(pattern, size, strokeWidth);
  const period = tile.axis === "x" ? tile.width : tile.height;
  const mask = FADES[fade];
  const extend: CSSProperties =
    tile.axis === "x"
      ? { left: -period, width: `calc(100% + ${period}px)` }
      : { top: -period, height: `calc(100% + ${period}px)` };
  const drift = animate
    ? ({
        ...extend,
        "--miyuki-hatching-shift": tile.axis === "x" ? `${period}px, 0` : `0, ${period}px`,
        "--miyuki-hatching-duration": `${(period / DRIFT).toFixed(2)}s`,
      } as CSSProperties)
    : {};

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={{ ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : null), ...style }}
      {...props}
    >
      {animate ? (
        <style href="miyuki-hatching" precedence="miyuki">{`
@keyframes miyuki-hatching-drift {
  to { transform: translate3d(var(--miyuki-hatching-shift), 0); }
}
.miyuki-hatching-drift {
  animation: miyuki-hatching-drift var(--miyuki-hatching-duration) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-hatching-drift { animation: none; }
}
`}</style>
      ) : null}
      <svg
        className={cn("absolute inset-0 block size-full", animate && "miyuki-hatching-drift will-change-transform")}
        style={{ color, ...drift }}
      >
        <defs>
          <pattern id={id} width={tile.width} height={tile.height} patternUnits="userSpaceOnUse">
            <path
              d={tile.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap={pattern === "waves" ? "round" : "butt"}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

export function HatchingContainer({
  pattern,
  size,
  strokeWidth = 1,
  color = "var(--border-strong)",
  fade = "none",
  animate,
  frame = 0,
  className,
  style,
  children,
  ...props
}: HatchingContainerProps) {
  const band = Math.max(0, frame);
  const fadeMask = FADES[fade] ?? "linear-gradient(#000 0 0)";
  const layer: CSSProperties | undefined =
    band > 0
      ? {
          maskImage: `${fadeMask}, linear-gradient(#000 0 0)`,
          WebkitMaskImage: `${fadeMask}, linear-gradient(#000 0 0)`,
          maskSize: `100% 100%, calc(100% - ${band * 2}px) calc(100% - ${band * 2}px)`,
          WebkitMaskSize: `100% 100%, calc(100% - ${band * 2}px) calc(100% - ${band * 2}px)`,
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskComposite: "subtract",
          WebkitMaskComposite: "source-out",
        }
      : undefined;

  return (
    <div
      className={cn("relative isolate", className)}
      style={band > 0 ? { padding: band, ...style } : style}
      {...props}
    >
      <Hatching
        pattern={pattern}
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        fade={band > 0 ? "none" : fade}
        animate={animate}
        style={layer}
      />
      {band > 0 ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 border-solid" style={{ borderWidth: strokeWidth, borderColor: color }} />
          <div
            className="absolute border-solid"
            style={{ inset: band, borderWidth: strokeWidth, borderColor: color }}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}
