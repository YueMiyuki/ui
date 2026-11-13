"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

export type RimLightButtonProps<T extends ElementType = "button"> = {
  as?: T;
  duration?: number;
  clockwise?: boolean;
  color?: string;
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "color">;

const styles = `
@property --miyuki-rim-light-button-arc { syntax: "<number>"; inherits: true; initial-value: 0.09; }
@property --miyuki-rim-light-button-far { syntax: "<number>"; inherits: true; initial-value: 0; }
@keyframes miyuki-rim-light-button-turn { to { transform: rotate(1turn); } }
.miyuki-rim-light-button {
  transition: --miyuki-rim-light-button-arc 520ms cubic-bezier(0.22, 1, 0.36, 1), --miyuki-rim-light-button-far 420ms cubic-bezier(0.22, 1, 0.36, 1) 80ms, scale 150ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (hover: hover) {
  .miyuki-rim-light-button:hover { --miyuki-rim-light-button-arc: 0.5; --miyuki-rim-light-button-far: 1; }
}
.miyuki-rim-light-button:focus-visible { --miyuki-rim-light-button-arc: 0.5; --miyuki-rim-light-button-far: 1; }
.miyuki-rim-light-button-turn {
  animation: miyuki-rim-light-button-turn var(--miyuki-rim-light-button-lap) linear infinite;
  animation-direction: var(--miyuki-rim-light-button-way);
}
@media (prefers-reduced-motion: reduce) {
  .miyuki-rim-light-button { transition-duration: 120ms, 120ms, 150ms; transition-delay: 0s; }
  .miyuki-rim-light-button-turn { animation: none; transform: rotate(-0.12turn); }
}
`;

const tone = (color: string) =>
  `color-mix(in oklab, ${color} calc(var(--miyuki-rim-light-button-far) * 100%), transparent)`;

function Light({ color }: { color: string }) {
  return (
    <span
      className="absolute inset-0 grid place-items-center"
      style={{ transform: "scaleX(var(--miyuki-rim-light-button-ratio, 1))" }}
    >
      <span
        className="miyuki-rim-light-button-turn aspect-square h-[150%] shrink-0 rounded-full"
        style={{
          backgroundImage: `conic-gradient(from calc(var(--miyuki-rim-light-button-arc) * -1turn), ${tone(color)} 0turn, ${color} calc(var(--miyuki-rim-light-button-arc) * 0.7turn), ${color} calc(var(--miyuki-rim-light-button-arc) * 1.3turn), ${tone(color)} calc(var(--miyuki-rim-light-button-arc) * 2turn), ${tone(color)} 1turn)`,
        }}
      />
    </span>
  );
}

export function RimLightButton<T extends ElementType = "button">({
  as,
  duration = 4,
  clockwise = true,
  color = "var(--brand)",
  className,
  containerClassName,
  style,
  children,
  ref,
  ...props
}: RimLightButtonProps<T>) {
  const Comp: ElementType = as ?? "button";
  const node = useRef<HTMLElement | null>(null);

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) el.style.setProperty("--miyuki-rim-light-button-ratio", (w / h).toFixed(3));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Comp
      {...(Comp === "button" ? { type: "button" } : null)}
      {...props}
      ref={setRef}
      className={cn(
        "miyuki-rim-light-button group relative isolate inline-flex h-9 shrink-0 cursor-default rounded-full bg-border-strong p-[1.5px] text-sm font-medium text-foreground outline-none select-none",
        "active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        containerClassName,
      )}
      style={
        {
          ...style,
          "--miyuki-rim-light-button-lap": `${duration > 0 ? duration : 4}s`,
          "--miyuki-rim-light-button-way": clockwise ? "normal" : "reverse",
          "--miyuki-rim-light-button-color": color,
        } as CSSProperties
      }
    >
      <style href="miyuki-rim-light-button" precedence="miyuki">
        {styles}
      </style>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-55 blur-[6px] dark:opacity-80 dark:blur-[9px]"
      >
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <Light color={color} />
        </span>
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <Light color={color} />
      </span>
      <span
        className={cn(
          "relative inline-flex size-full items-center justify-center gap-2 rounded-[inherit] bg-card px-4 whitespace-nowrap",
          "transition-[background-color] duration-300 ease-settle",
          "group-hover:bg-[color-mix(in_oklab,var(--miyuki-rim-light-button-color)_7%,var(--card))] group-focus-visible:bg-[color-mix(in_oklab,var(--miyuki-rim-light-button-color)_7%,var(--card))]",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        {children}
      </span>
    </Comp>
  );
}
