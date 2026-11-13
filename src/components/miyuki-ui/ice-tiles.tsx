import type { ComponentProps, CSSProperties } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface IceTilesProps extends ComponentProps<"div"> {
  rows?: number;
  cols?: number;
  cellSize?: number;
  colors?: string[];
  fadeMs?: number;
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];
const MAX_TINTS = 8;
const MASK = "radial-gradient(ellipse 72% 80% at 50% 46%, #000 28%, rgb(0 0 0 / 0.5) 58%, transparent 88%)";

const tintRules = Array.from(
  { length: MAX_TINTS },
  (_, i) =>
    `.miyuki-ice-tiles-t${i}:hover { background-color: var(--miyuki-ice-tiles-c${i}); transition-duration: 0s; }`,
).join("\n");

export function IceTiles({
  rows = 24,
  cols = 40,
  cellSize = 48,
  colors = DEFAULT_COLORS,
  fadeMs = 1800,
  className,
  style,
  children,
  ...props
}: IceTilesProps) {
  const palette = (colors.length > 0 ? colors : DEFAULT_COLORS).slice(0, MAX_TINTS);
  const r = Math.max(1, Math.round(rows));
  const c = Math.max(1, Math.round(cols));
  const rng = createRng(`ice-tiles:${r}x${c}:${palette.length}`);
  const tints = Array.from({ length: r * c }, () => rng.int(0, palette.length - 1));
  const vars: Record<string, string> = {};
  palette.forEach((color, i) => {
    vars[`--miyuki-ice-tiles-c${i}`] = `color-mix(in oklab, ${color} var(--miyuki-ice-tiles-strength), transparent)`;
  });

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-ice-tiles-strength:46%] dark:[--miyuki-ice-tiles-strength:64%]",
        className,
      )}
      style={{ ...style, ...vars, "--miyuki-ice-tiles-fade": `${Math.max(0, fadeMs)}ms` } as CSSProperties}
      {...props}
    >
      <style href="miyuki-ice-tiles" precedence="miyuki">{`
.miyuki-ice-tiles-cell {
  transition: background-color var(--miyuki-ice-tiles-fade) cubic-bezier(0.45, 0.05, 0.4, 1);
}
${tintRules}
@media (prefers-reduced-motion: reduce) {
  .miyuki-ice-tiles-cell { transition-duration: calc(var(--miyuki-ice-tiles-fade) * 0.4); }
}
`}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden [perspective:1100px] [perspective-origin:50%_30%]"
        style={{ maskImage: MASK, WebkitMaskImage: MASK }}
      >
        <div
          className="absolute top-1/2 left-1/2 grid border-t border-l border-border-strong/80 dark:border-border-strong/70"
          style={{
            gridTemplateColumns: `repeat(${c}, ${cellSize}px)`,
            gridAutoRows: `${cellSize}px`,
            transform: "translate(-50%, -54%) rotateX(52deg) rotateZ(-18deg)",
          }}
        >
          {tints.map((tint, i) => (
            <div
              key={i}
              className={cn(
                "miyuki-ice-tiles-cell border-r border-b border-border-strong/80 dark:border-border-strong/70",
                `miyuki-ice-tiles-t${tint}`,
              )}
            />
          ))}
        </div>
      </div>
      <div className="contents pointer-events-none">{children}</div>
    </div>
  );
}
