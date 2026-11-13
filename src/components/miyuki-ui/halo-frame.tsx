import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface HaloFrameProps extends ComponentProps<"div"> {
  colors?: string[];
  animate?: boolean;
  duration?: number;
  glow?: number;
  borderWidth?: number;
  radius?: number;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)", "var(--chart-6)"];

function Turning({ gradient }: { gradient: string }) {
  return (
    <div
      className="miyuki-halo-frame-turn absolute top-1/2 left-1/2 size-[150cqmax] -translate-1/2"
      style={{ backgroundImage: gradient }}
    />
  );
}

export function HaloFrame({
  colors = DEFAULT_COLORS,
  animate = true,
  duration = 8,
  glow = 0.6,
  borderWidth = 1.5,
  radius = 18,
  className,
  style,
  children,
  ...props
}: HaloFrameProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const gradient = `conic-gradient(from 0deg, ${[...palette, palette[0]].join(", ")})`;
  const width = Math.max(0, borderWidth);
  const outer = Math.max(0, radius);

  return (
    <div
      className={cn(
        "relative isolate",
        "[&>:not([data-miyuki-halo-frame-layer])]:rounded-(--miyuki-halo-frame-inner)",
        className,
      )}
      style={
        {
          ...style,
          padding: width,
          borderRadius: outer,
          "--miyuki-halo-frame-inner": `${Math.max(0, outer - width)}px`,
          "--miyuki-halo-frame-glow": Math.min(1, Math.max(0, glow)),
          "--miyuki-halo-frame-duration": `${duration > 0 ? duration : 8}s`,
          "--miyuki-halo-frame-state": animate ? "running" : "paused",
        } as CSSProperties
      }
      {...props}
    >
      <style href="miyuki-halo-frame" precedence="miyuki">{`
@keyframes miyuki-halo-frame-turn {
  to { transform: rotate(360deg); }
}
.miyuki-halo-frame-turn {
  animation: miyuki-halo-frame-turn var(--miyuki-halo-frame-duration) linear infinite;
  animation-play-state: var(--miyuki-halo-frame-state);
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-halo-frame-turn { animation-play-state: paused; }
}
`}</style>
      <div
        data-miyuki-halo-frame-layer=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-[calc(var(--miyuki-halo-frame-glow)*0.6)] blur-[14px] dark:opacity-[calc(var(--miyuki-halo-frame-glow)*1.05)] dark:blur-[22px]"
      >
        <div className="absolute inset-1 overflow-hidden rounded-[inherit] [container-type:size]">
          <Turning gradient={gradient} />
        </div>
      </div>
      <div
        data-miyuki-halo-frame-layer=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] [container-type:size]"
      >
        <Turning gradient={gradient} />
      </div>
      {children}
    </div>
  );
}
