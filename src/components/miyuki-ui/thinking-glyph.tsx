"use client";

import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ThinkingGlyphVariant = "thinking" | "searching" | "reading" | "writing";

export interface ThinkingGlyphProps extends Omit<ComponentProps<"div">, "children"> {
  variant?: ThinkingGlyphVariant;
  label?: ReactNode;
  showElapsed?: boolean;
  startedAt?: number;
}

const labels: Record<ThinkingGlyphVariant, string> = {
  thinking: "Thinking",
  searching: "Searching",
  reading: "Reading",
  writing: "Writing",
};

const keyframes = `
@keyframes miyuki-thinking-glyph-shine { from { background-position: 100% 0; } to { background-position: 0% 0; } }
@keyframes miyuki-thinking-glyph-arm {
  0% { transform: scale(0.62); opacity: 0.45; }
  17% { transform: scale(1); opacity: 1; }
  45%, 100% { transform: scale(0.62); opacity: 0.45; }
}
@keyframes miyuki-thinking-glyph-ring {
  0% { transform: scale(0.2); opacity: 0; }
  10% { transform: scale(0.34); opacity: 0.95; }
  55% { transform: scale(0.78); opacity: 0.55; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes miyuki-thinking-glyph-dot { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.72); } }
@keyframes miyuki-thinking-glyph-line-1 {
  0% { stroke-dashoffset: 1.1; opacity: 1; }
  20%, 80% { stroke-dashoffset: 0; opacity: 1; }
  92%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes miyuki-thinking-glyph-line-2 {
  0%, 20% { stroke-dashoffset: 1.1; opacity: 1; }
  40%, 80% { stroke-dashoffset: 0; opacity: 1; }
  92%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes miyuki-thinking-glyph-line-3 {
  0%, 40% { stroke-dashoffset: 1.1; opacity: 1; }
  56%, 80% { stroke-dashoffset: 0; opacity: 1; }
  92%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes miyuki-thinking-glyph-write {
  0% { stroke-dashoffset: 1; opacity: 1; }
  60%, 86% { stroke-dashoffset: 0; opacity: 1; }
  97%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
`;

const center = "[transform-box:view-box] origin-center";

function Crystal() {
  return (
    <g strokeWidth={1.3}>
      <circle cx="8" cy="8" r="1.05" fill="currentColor" stroke="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} transform={`rotate(${i * 60} 8 8)`}>
          <g
            className={cn(
              center,
              "motion-safe:animate-[miyuki-thinking-glyph-arm_1.8s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
            )}
            style={{ animationDelay: `${(i * 0.3 - 1.8).toFixed(2)}s` }}
          >
            <path d="M8 5.9V1.6M8 3.7 6.55 2.45M8 3.7l1.45-1.25" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Rings() {
  return (
    <g strokeWidth={1.3}>
      <circle
        cx="8"
        cy="8"
        r="1.9"
        fill="currentColor"
        stroke="none"
        className={cn(center, "motion-safe:animate-[miyuki-thinking-glyph-dot_1.8s_ease-in-out_infinite]")}
      />
      {[0, 1].map((i) => (
        <circle
          key={i}
          cx="8"
          cy="8"
          r="6.6"
          vectorEffect="non-scaling-stroke"
          className={cn(
            center,
            "motion-safe:animate-[miyuki-thinking-glyph-ring_1.8s_linear_infinite]",
            "motion-reduce:opacity-40",
            i === 1 && "motion-reduce:scale-[0.6] motion-reduce:opacity-80",
          )}
          style={{ animationDelay: `${i * 0.9 - 1.8}s` }}
        />
      ))}
    </g>
  );
}

const lines = [
  { d: "M2.25 4h11.5", n: 1 },
  { d: "M2.25 8h11.5", n: 2 },
  { d: "M2.25 12h7", n: 3 },
];

function Lines() {
  return (
    <g strokeWidth={1.5}>
      {lines.map(({ d }) => (
        <path key={d} d={d} strokeOpacity={0.22} />
      ))}
      {lines.map(({ d, n }) => (
        <path
          key={n}
          d={d}
          pathLength={1}
          strokeDasharray="1 2"
          className={cn(
            "motion-safe:[stroke-dashoffset:1.1]",
            n === 1 && "motion-safe:animate-[miyuki-thinking-glyph-line-1_2.6s_ease-in-out_infinite]",
            n === 2 && "motion-safe:animate-[miyuki-thinking-glyph-line-2_2.6s_ease-in-out_infinite]",
            n === 3 && "motion-safe:animate-[miyuki-thinking-glyph-line-3_2.6s_ease-in-out_infinite]",
          )}
        />
      ))}
    </g>
  );
}

const stroke = "M1.75 10.6c1.4 0 2.1-4.3 3.6-4.3 1.6 0 .9 5.2 2.6 5.2 1.6 0 1.4-5.2 3-5.2 1.4 0 1.7 4.3 3.3 4.3";

function Pen() {
  return (
    <g strokeWidth={1.5}>
      <path d="M1.75 14h12.5" strokeOpacity={0.22} />
      <path
        d={stroke}
        pathLength={1}
        strokeDasharray="1 2"
        className="motion-safe:[stroke-dashoffset:1.1] motion-safe:animate-[miyuki-thinking-glyph-write_1.9s_cubic-bezier(0.45,0.05,0.25,1)_infinite]"
      />
    </g>
  );
}

function Glyph({ variant }: { variant: ThinkingGlyphVariant }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0 overflow-visible text-brand"
    >
      {variant === "thinking" && <Crystal />}
      {variant === "searching" && <Rings />}
      {variant === "reading" && <Lines />}
      {variant === "writing" && <Pen />}
    </svg>
  );
}

const band: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--muted-foreground) 38%, var(--foreground) 47%, var(--foreground) 53%, var(--muted-foreground) 62%)",
  backgroundSize: "300% 100%",
};

function formatElapsed(total: number) {
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function Elapsed({ startedAt }: { startedAt?: number }) {
  const [seconds, setSeconds] = useState<number | null>(startedAt === undefined ? 0 : null);
  useEffect(() => {
    const origin = startedAt ?? Date.now();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - origin) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return (
    <span aria-hidden="true" className="text-muted-foreground tabular-nums">
      {seconds === null ? "" : formatElapsed(seconds)}
    </span>
  );
}

export function ThinkingGlyph({
  variant = "thinking",
  label,
  showElapsed = false,
  startedAt,
  className,
  ...props
}: ThinkingGlyphProps) {
  return (
    <div role="status" {...props} className={cn("inline-flex min-w-0 items-center gap-2 text-sm leading-5", className)}>
      <style href="miyuki-thinking-glyph" precedence="miyuki">
        {keyframes}
      </style>
      <Glyph variant={variant} />
      <span
        className={cn(
          "min-w-0 truncate bg-clip-text text-transparent",
          "motion-safe:animate-[miyuki-thinking-glyph-shine_2.6s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
          "motion-reduce:bg-none motion-reduce:text-foreground",
        )}
        style={band}
      >
        {label ?? labels[variant]}
      </span>
      {showElapsed && <Elapsed startedAt={startedAt} />}
    </div>
  );
}
