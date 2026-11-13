"use client";

import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightBeamsProps extends ComponentProps<"div"> {
  colors?: [string, string];
  duration?: number;
  spread?: number;
  width?: number;
  height?: number;
}

const DEFAULT_COLORS: [string, string] = ["var(--brand)", "var(--chart-2)"];
const AXIS = 122;
const DROP = AXIS - 90;

const DAY = `
  --miyuki-spotlight-beams-outer: 20%;
  --miyuki-spotlight-beams-core: 22%;
  --miyuki-spotlight-beams-tint: 70%;`;
const NIGHT = `
  --miyuki-spotlight-beams-outer: 26%;
  --miyuki-spotlight-beams-core: 44%;
  --miyuki-spotlight-beams-tint: 35%;`;

const STYLES = `
.miyuki-spotlight-beams {${DAY}
}
.dark .miyuki-spotlight-beams, .miyuki-spotlight-beams.dark, .light .dark .miyuki-spotlight-beams, .light .miyuki-spotlight-beams.dark {${NIGHT}
}
.dark .light .miyuki-spotlight-beams, .dark .miyuki-spotlight-beams.light {${DAY}
}
@keyframes miyuki-spotlight-beams-sway {
  from { transform: translate3d(calc(var(--miyuki-spotlight-beams-spread) * -0.5), 0, 0) rotate(-4deg); }
  to { transform: translate3d(calc(var(--miyuki-spotlight-beams-spread) * 0.5), 0, 0) rotate(3deg); }
}
.miyuki-spotlight-beams-sway {
  animation: miyuki-spotlight-beams-sway var(--miyuki-spotlight-beams-half) cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-spotlight-beams-sway { animation-play-state: paused; animation-delay: calc(var(--miyuki-spotlight-beams-half) * -0.5); }
}
`;

function fan(color: string, width: number, height: number) {
  const half = (Math.atan2(width / 2, height) * 180) / Math.PI;
  const wedge = (center: number, reach: number, tint: string) => {
    const from = center - reach;
    return `conic-gradient(from ${from.toFixed(2)}deg at 0 0, transparent 0deg, color-mix(in oklab, ${tint} 40%, transparent) ${(reach * 0.5).toFixed(2)}deg, ${tint} ${reach.toFixed(2)}deg, color-mix(in oklab, ${tint} 40%, transparent) ${(reach * 1.5).toFixed(2)}deg, transparent ${(reach * 2).toFixed(2)}deg, transparent 360deg)`;
  };
  const outer = `color-mix(in oklab, ${color} var(--miyuki-spotlight-beams-outer), transparent)`;
  const core = `color-mix(in oklab, color-mix(in oklab, ${color} var(--miyuki-spotlight-beams-tint), var(--foreground)) var(--miyuki-spotlight-beams-core), transparent)`;
  return [
    wedge(AXIS, half * 0.22, core),
    wedge(AXIS - half * 0.5, half * 0.5, outer),
    wedge(AXIS + half * 0.5, half * 0.5, outer),
  ].join(", ");
}

export function SpotlightBeams({
  colors = DEFAULT_COLORS,
  duration = 7,
  spread = 100,
  width = 560,
  height = 820,
  className,
  style,
  children,
  ...props
}: SpotlightBeamsProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(0);
  const left = colors[0] ?? DEFAULT_COLORS[0];
  const right = colors[1] ?? colors[0] ?? DEFAULT_COLORS[1];
  const reach = Math.max(80, height);
  const breadth = Math.max(20, width);
  const fade = `radial-gradient(circle ${reach}px at 0 0, #000 0%, rgb(0 0 0 / 0.7) 32%, rgb(0 0 0 / 0.25) 64%, transparent 100%)`;
  const side = (color: string, mirrored: boolean) => (
    <div
      className={cn("absolute -top-6 size-0", mirrored ? "-right-6 -scale-x-100" : "-left-6")}
      style={{ rotate: `${(mirrored ? -tilt : tilt).toFixed(1)}deg` }}
    >
      <div
        className="miyuki-spotlight-beams-sway absolute top-0 left-0 origin-top-left blur-[1.5px]"
        style={{
          width: reach,
          height: reach,
          backgroundImage: fan(color, breadth, reach),
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
    </div>
  );

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const aim = (Math.atan2(h * 0.95, w * 0.62) * 180) / Math.PI;
      setTilt(Math.max(-12, Math.min(40, aim - DROP)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn("miyuki-spotlight-beams relative isolate overflow-hidden", className)}
      style={
        {
          ...style,
          "--miyuki-spotlight-beams-spread": `${Math.max(0, spread)}px`,
          "--miyuki-spotlight-beams-half": `${(Math.max(0.5, duration) / 2).toFixed(2)}s`,
        } as CSSProperties
      }
      {...props}
    >
      <style href="miyuki-spotlight-beams" precedence="miyuki">
        {STYLES}
      </style>
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {side(left, false)}
        {side(right, true)}
      </div>
      {children}
    </div>
  );
}
