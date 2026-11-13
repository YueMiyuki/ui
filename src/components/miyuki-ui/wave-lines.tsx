import type { ComponentProps, CSSProperties } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface WaveLinesProps extends ComponentProps<"div"> {
  lines?: number;
  amplitude?: number;
  duration?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];
const P = 1200;
const STEP = 50;

function smooth(points: [number, number][]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function buildLines(count: number, amplitude: number, duration: number) {
  const rng = createRng(`wave-lines:${count}`);
  const n = Math.max(1, Math.round(count));
  const phase2 = rng.range(0, Math.PI * 2);
  const phase3 = rng.range(0, Math.PI * 2);
  const swell = rng.range(0, Math.PI * 2);
  return Array.from({ length: n }, (_, i) => {
    const a = amplitude * (0.72 + 0.28 * Math.sin(i * 0.55 + swell)) * rng.range(0.92, 1.08);
    const p2 = phase2 + i * 0.3 + rng.range(-0.08, 0.08);
    const p3 = phase3 - i * 0.42 + rng.range(-0.08, 0.08);
    const points: [number, number][] = [];
    for (let x = -STEP; x <= P + STEP; x += STEP) {
      const k = (x / P) * Math.PI * 2;
      points.push([x, a * (0.66 * Math.sin(2 * k + p2) + 0.34 * Math.sin(3 * k + p3))]);
    }
    const d = smooth(points);
    return {
      d,
      opacity: rng.range(0.5, 0.7),
      bob: duration * rng.range(1.1, 1.6),
      bobDelay: -(i / n) * duration * 1.4 - rng.range(0, 1),
      lift: Math.max(2, amplitude * 0.22),
    };
  });
}

const MASK =
  "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent), radial-gradient(ellipse 38% 30% at 50% 50%, rgb(0 0 0 / 0.16), rgb(0 0 0 / 0.5) 55%, #000)";

export function WaveLines({
  lines = 16,
  amplitude = 18,
  duration = 10,
  colors = DEFAULT_COLORS,
  className,
  children,
  ...props
}: WaveLinesProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const amp = Math.max(0, amplitude);
  const seconds = duration > 0 ? duration : 10;
  const set = buildLines(lines, amp, seconds);
  const band = Math.ceil(amp * 2.4 + Math.max(2, amp * 0.22) * 2 + 8);

  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <style href="miyuki-wave-lines" precedence="miyuki">{`
@keyframes miyuki-wave-lines-draw {
  from { clip-path: inset(-2px 100% -2px 0); }
  to { clip-path: inset(-2px 0 -2px 0); }
}
@keyframes miyuki-wave-lines-travel {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes miyuki-wave-lines-bob {
  from { transform: translate3d(0, calc(var(--miyuki-wave-lines-lift) * -1), 0); }
  to { transform: translate3d(0, var(--miyuki-wave-lines-lift), 0); }
}
.miyuki-wave-lines-draw {
  animation: miyuki-wave-lines-draw 1.9s cubic-bezier(0.45, 0, 0.2, 1) var(--miyuki-wave-lines-delay) both;
}
.miyuki-wave-lines-bob {
  animation: miyuki-wave-lines-bob var(--miyuki-wave-lines-bob) cubic-bezier(0.45, 0.05, 0.55, 0.95) var(--miyuki-wave-lines-bob-delay) infinite alternate;
}
.miyuki-wave-lines-travel {
  animation: miyuki-wave-lines-travel var(--miyuki-wave-lines-travel) linear infinite;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-wave-lines-draw { animation: none; }
  .miyuki-wave-lines-bob, .miyuki-wave-lines-travel { animation-play-state: paused; }
}
`}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ maskImage: MASK, WebkitMaskImage: MASK, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
      >
        {set.map((line, i) => (
          <div
            key={i}
            className="miyuki-wave-lines-draw absolute inset-x-0 -translate-y-1/2"
            style={
              {
                top: `${((i + 0.5) / set.length) * 100}%`,
                height: band,
                "--miyuki-wave-lines-delay": `${(0.15 + i * 0.07).toFixed(2)}s`,
              } as CSSProperties
            }
          >
            <div
              className="miyuki-wave-lines-bob absolute inset-0"
              style={
                {
                  "--miyuki-wave-lines-lift": `${line.lift.toFixed(1)}px`,
                  "--miyuki-wave-lines-bob": `${(line.bob / 2).toFixed(2)}s`,
                  "--miyuki-wave-lines-bob-delay": `${line.bobDelay.toFixed(2)}s`,
                } as CSSProperties
              }
            >
              <svg
                viewBox={`0 ${-band / 2} ${P * 2} ${band}`}
                preserveAspectRatio="none"
                fill="none"
                className="miyuki-wave-lines-travel absolute top-0 left-0 h-full w-[200%] opacity-(--miyuki-wave-lines-o) dark:opacity-[min(0.92,calc(var(--miyuki-wave-lines-o)*1.3))]"
                style={
                  {
                    "--miyuki-wave-lines-o": line.opacity.toFixed(2),
                    "--miyuki-wave-lines-travel": `${(seconds * 2).toFixed(2)}s`,
                  } as CSSProperties
                }
              >
                <g stroke={palette[i % palette.length]} strokeWidth="1.25" strokeLinecap="round">
                  <path d={line.d} vectorEffect="non-scaling-stroke" />
                  <path d={line.d} vectorEffect="non-scaling-stroke" transform={`translate(${P} 0)`} />
                </g>
              </svg>
            </div>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
