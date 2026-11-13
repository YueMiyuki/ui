import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const keyframes =
  "@keyframes miyuki-reflect{from{transform:translate3d(calc(var(--sway)*-1),0,0)}to{transform:translate3d(var(--sway),0,0)}}";

export function Reflection({
  children,
  strips = 12,
  depth = 0.88,
  className,
}: {
  children: ReactNode;
  strips?: number;
  depth?: number;
  className?: string;
}) {
  const band = depth / strips;
  return (
    <span aria-hidden="true" className={cn("pointer-events-none relative block select-none", className)}>
      <style href="miyuki-home-reflection" precedence="miyuki">
        {keyframes}
      </style>
      <span className="invisible block">{children}</span>
      {Array.from({ length: strips }, (_, k) => {
        const top = (1 - (k + 1) * band) * 100;
        const bottom = k * band * 100;
        const style = {
          clipPath: `inset(${top.toFixed(2)}% -2em calc(${bottom.toFixed(2)}% - 0.5px) -2em)`,
          opacity: Number(((1 - k / strips) ** 1.3).toFixed(3)),
          "--sway": `${(0.01 + (0.05 * k) / strips).toFixed(3)}em`,
          animation: `miyuki-reflect ${(2.6 + (k % 4) * 0.35).toFixed(2)}s ease-in-out ${(-(k * 0.31 + (k % 3) * 0.2)).toFixed(2)}s infinite alternate`,
        } as CSSProperties;
        return (
          <span
            key={k}
            className="absolute inset-0 block will-change-transform motion-reduce:[animation:none]!"
            style={style}
          >
            {children}
          </span>
        );
      })}
    </span>
  );
}
