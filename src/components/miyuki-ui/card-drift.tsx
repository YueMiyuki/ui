"use client";

import { Children, type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface CardDriftProps<T> extends Omit<ComponentProps<"div">, "children"> {
  items?: readonly T[];
  renderItem?: (item: T, index: number) => ReactNode;
  children?: ReactNode;
  direction?: "left" | "right";
  duration?: number;
  pauseOnHover?: boolean;
  gap?: number;
}

export function CardDrift<T>({
  items,
  renderItem,
  children,
  direction = "left",
  duration = 40,
  pauseOnHover = true,
  gap = 16,
  className,
  style,
  ...props
}: CardDriftProps<T>) {
  const nodes: ReactNode[] =
    children != null ? Children.toArray(children) : (items ?? []).map((item, i) => renderItem?.(item, i));

  const root = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLUListElement>(null);
  const [copies, setCopies] = useState(2);

  useEffect(() => {
    const el = root.current;
    const first = group.current;
    if (!el || !first) return;
    const ro = new ResizeObserver(() => {
      const need = first.offsetWidth > 0 ? Math.ceil(el.clientWidth / first.offsetWidth) + 1 : 2;
      setCopies(Math.max(2, Math.min(need, 8)));
    });
    ro.observe(el);
    ro.observe(first);
    return () => ro.disconnect();
  }, []);

  const rng = createRng(`miyuki-card-drift-${nodes.length}`);
  const bobs = nodes.map(() => ({ period: rng.range(5.5, 8.5), delay: rng.range(0, 8) }));

  const pause = pauseOnHover
    ? "group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused]"
    : "";

  return (
    <div
      ref={root}
      {...props}
      className={cn(
        "group/row overflow-x-clip py-3 motion-reduce:overflow-x-auto motion-reduce:px-[8%]",
        "[mask-image:linear-gradient(to_right,transparent,#000_9%,#000_91%,transparent)]",
        className,
      )}
      style={
        {
          "--miyuki-card-drift-duration": `${duration}s`,
          "--miyuki-card-drift-copies": copies,
          ...style,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "flex w-max animate-[miyuki-card-drift-scroll_var(--miyuki-card-drift-duration)_linear_infinite] motion-reduce:animate-none",
          direction === "right" && "[animation-direction:reverse]",
          pause,
        )}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <ul
            key={copy}
            ref={copy === 0 ? group : undefined}
            aria-hidden={copy > 0 || undefined}
            inert={copy > 0}
            className={cn("flex shrink-0 items-stretch", copy > 0 && "motion-reduce:hidden")}
            style={{ gap, paddingRight: gap }}
          >
            {nodes.map((node, i) => (
              <li
                key={i}
                className={cn(
                  "flex shrink-0 animate-[miyuki-card-drift-bob_ease-in-out_infinite] motion-reduce:animate-none",
                  pause,
                )}
                style={{
                  animationDuration: `${bobs[i].period.toFixed(2)}s`,
                  animationDelay: `-${bobs[i].delay.toFixed(2)}s`,
                }}
              >
                {node}
              </li>
            ))}
          </ul>
        ))}
      </div>
      <style href="miyuki-card-drift" precedence="miyuki">{`
        @keyframes miyuki-card-drift-scroll {
          to { transform: translateX(calc(-100% / var(--miyuki-card-drift-copies))); }
        }
        @keyframes miyuki-card-drift-bob {
          0%, 100% { transform: translateY(2px); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
