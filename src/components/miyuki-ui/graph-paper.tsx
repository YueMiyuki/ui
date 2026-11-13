import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface PaperPatternProps extends ComponentProps<"div"> {
  size?: number;
  color?: string;
  fade?: boolean;
}

const FADE_MASK = "radial-gradient(ellipse 70% 70% at 50% 50%, #000 35%, transparent 100%)";

function PatternLayer({ style }: { style: CSSProperties }) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={style} />;
}

export function GridPaper({
  size = 32,
  color = "var(--border-strong)",
  fade = true,
  className,
  children,
  ...props
}: PaperPatternProps) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <PatternLayer
        style={{
          backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
          backgroundSize: `${size}px ${size}px`,
          backgroundPosition: "center",
          maskImage: fade ? FADE_MASK : undefined,
          WebkitMaskImage: fade ? FADE_MASK : undefined,
        }}
      />
      {children}
    </div>
  );
}

export function DotPaper({
  size = 20,
  color = "var(--border-strong)",
  fade = true,
  className,
  children,
  ...props
}: PaperPatternProps) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <PatternLayer
        style={{
          backgroundImage: `radial-gradient(circle at center, ${color} 1.1px, transparent 1.6px)`,
          backgroundSize: `${size}px ${size}px`,
          backgroundPosition: "center",
          maskImage: fade ? FADE_MASK : undefined,
          WebkitMaskImage: fade ? FADE_MASK : undefined,
        }}
      />
      {children}
    </div>
  );
}
