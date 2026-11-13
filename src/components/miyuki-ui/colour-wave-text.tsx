"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ColourWaveTextProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  colors?: string[];
  interval?: number;
  stagger?: number;
  ref?: Ref<HTMLSpanElement>;
}

const deep = (token: string) => `light-dark(oklch(from ${token} min(l, 0.62) c h), ${token})`;

const DEFAULT_COLORS = [
  "var(--brand)",
  deep("var(--chart-2)"),
  deep("var(--chart-3)"),
  deep("var(--chart-6)"),
  deep("var(--chart-4)"),
  deep("var(--chart-5)"),
];

const DIP = 620;
const TURN = 0.4;

const keyframes = `
@keyframes miyuki-colour-wave-text-dip-a {
  0% { transform: translateY(0); filter: blur(0); animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
  ${TURN * 100}% { transform: translateY(0.07em); filter: blur(0.05em); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
  100% { transform: translateY(0); filter: blur(0); }
}
@keyframes miyuki-colour-wave-text-dip-b {
  0% { transform: translateY(0); filter: blur(0); animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
  ${TURN * 100}% { transform: translateY(0.07em); filter: blur(0.05em); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
  100% { transform: translateY(0); filter: blur(0); }
}
`;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export function ColourWaveText({
  text,
  colors = DEFAULT_COLORS,
  interval = 4000,
  stagger = 45,
  className,
  ref,
  ...props
}: ColourWaveTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const [wave, setWave] = useState(0);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { amount: 0.5 });
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;

  useEffect(() => {
    if (reduced || !inView) return;
    const id = setTimeout(() => setWave((w) => w + 1), Math.max(DIP, interval));
    return () => clearTimeout(id);
  }, [wave, inView, reduced, interval]);

  let slot = 0;
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative", className)}>
      <style href="miyuki-colour-wave-text" precedence="miyuki">
        {keyframes}
      </style>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {tokens.map((token, t) => {
          if (/^\s/.test(token)) return token;
          return (
            <span key={t} className="whitespace-nowrap">
              {Array.from(token, (ch, c) => {
                const i = slot++;
                const delay = i * stagger;
                const style: CSSProperties = {
                  color: palette[(i + wave) % palette.length],
                  transition: `color ${Math.round(DIP * 0.3)}ms linear ${Math.round(delay + DIP * (TURN - 0.15))}ms`,
                  animation:
                    wave === 0
                      ? undefined
                      : `${wave % 2 ? "miyuki-colour-wave-text-dip-a" : "miyuki-colour-wave-text-dip-b"} ${DIP}ms ${delay}ms both`,
                };
                return (
                  <span key={c} className="inline-block" style={style}>
                    {ch}
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </span>
  );
}
