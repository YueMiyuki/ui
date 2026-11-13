import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export type DropletBorderProps<T extends ElementType = "button"> = {
  as?: T;
  duration?: number;
  borderRadius?: number;
  color?: string;
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "color">;

const RING = 2;
const TAIL = Array.from({ length: 8 }, (_, i) => 2 + i * 2);

const styles = `
@keyframes miyuki-droplet-border-run { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }
.miyuki-droplet-border-run {
  animation: miyuki-droplet-border-run var(--miyuki-droplet-border-lap) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-droplet-border-run { animation-play-state: paused; }
}
`;

function Lap({
  length,
  lead = 0,
  className,
  style,
}: {
  length: number;
  lead?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <rect
      x={RING / 2}
      y={RING / 2}
      pathLength={100}
      strokeDasharray={`${length} ${100 - length}`}
      className={cn("miyuki-droplet-border-run", className)}
      style={
        {
          width: `calc(100% - ${RING}px)`,
          height: `calc(100% - ${RING}px)`,
          rx: "var(--miyuki-droplet-border-rx)",
          animationDelay: `calc(var(--miyuki-droplet-border-lap) * ${-(1 - (length - lead) / 100).toFixed(4)})`,
          ...style,
        } as CSSProperties
      }
    />
  );
}

export function DropletBorder<T extends ElementType = "button">({
  as,
  duration = 3,
  borderRadius = 10,
  color = "var(--brand)",
  className,
  containerClassName,
  style,
  children,
  ...props
}: DropletBorderProps<T>) {
  const Comp: ElementType = as ?? "button";
  const radius = Math.max(0, borderRadius);

  return (
    <Comp
      {...(Comp === "button" ? { type: "button" } : null)}
      {...props}
      className={cn(
        "group relative isolate inline-flex h-9 shrink-0 cursor-default overflow-hidden bg-border-strong text-sm font-medium text-foreground outline-none select-none",
        "transition-[scale] duration-150 ease-settle active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        containerClassName,
      )}
      style={
        {
          padding: RING,
          borderRadius: radius,
          ...style,
          "--miyuki-droplet-border-lap": `${duration > 0 ? duration : 3}s`,
          "--miyuki-droplet-border-rx": `${Math.max(0, radius - RING / 2)}px`,
          "--miyuki-droplet-border-color": color,
        } as CSSProperties
      }
    >
      <style href="miyuki-droplet-border" precedence="miyuki">
        {styles}
      </style>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" fill="none">
        <g
          className="blur-[1.5px]"
          stroke="var(--miyuki-droplet-border-color)"
          strokeWidth={RING * 3}
          strokeOpacity={0.26}
        >
          {TAIL.map((length) => (
            <Lap key={length} length={length} />
          ))}
        </g>
        <g
          strokeWidth={RING * 3}
          strokeLinecap="round"
          className="[stroke:color-mix(in_oklab,var(--miyuki-droplet-border-color)_70%,var(--foreground))] dark:[stroke:color-mix(in_oklab,var(--miyuki-droplet-border-color)_40%,white)]"
        >
          <Lap length={2.4} lead={1} className="blur-[2.5px]" />
          <Lap length={0.8} />
        </g>
      </svg>
      <span
        className={cn(
          "relative inline-flex size-full items-center justify-center gap-2 bg-card px-3.5 whitespace-nowrap",
          "transition-[background-color] duration-150 ease-settle group-hover:bg-accent",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
        style={{ borderRadius: Math.max(0, radius - RING) }}
      >
        {children}
      </span>
    </Comp>
  );
}
