"use client";

import { useInView } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ElementType,
  Fragment,
  type Ref,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";

export type ArrivingTextUnit = "word" | "char" | "line";

export interface ArrivingTextProps extends Omit<ComponentProps<"p">, "children" | "ref"> {
  text: string;
  by?: ArrivingTextUnit;
  stagger?: number;
  duration?: number;
  blur?: boolean;
  startOnView?: boolean;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

const keyframes = `
@keyframes miyuki-arriving-text-in {
  from { opacity: 0; transform: translateY(0.32em); filter: blur(var(--miyuki-arriving-text-blur)); }
  to { opacity: 1; transform: none; filter: none; }
}
`;

const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export function ArrivingText({
  text,
  by = "word",
  stagger = 0.07,
  duration = 0.5,
  blur = true,
  startOnView = true,
  as: Tag = "p",
  className,
  style,
  ref,
  ...props
}: ArrivingTextProps) {
  const own = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const inView = useInView(own, { once: true, amount: 0.35 });
  const started = startOnView ? inView : hydrated;
  const [lineOf, setLineOf] = useState<number[] | null>(null);

  useEffect(() => {
    const root = own.current;
    if (by !== "line" || !root) return;
    const read = () => {
      const units = Array.from(root.querySelectorAll<HTMLElement>("[data-unit]"));
      const lines: number[] = [];
      let line = -1;
      let top = -Infinity;
      for (const el of units) {
        if (el.offsetTop > top + 1) {
          line++;
          top = el.offsetTop;
        }
        lines.push(line);
      }
      setLineOf(lines);
    };
    const observer = new ResizeObserver(read);
    observer.observe(root);
    return () => observer.disconnect();
  }, [by, text]);

  let slot = 0;
  const unitStyle = (order: number): CSSProperties | undefined =>
    started
      ? {
          animation: `miyuki-arriving-text-in ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${(order * stagger).toFixed(3)}s both`,
        }
      : undefined;
  const unitClass = cn(
    "inline-block",
    !started && "opacity-0",
    "motion-reduce:animate-none! motion-reduce:opacity-100",
  );

  const lines = text.split("\n");

  return (
    <Tag
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative", className)}
      style={{ ...style, "--miyuki-arriving-text-blur": blur ? "0.22em" : "0px" } as CSSProperties}
    >
      <style href="miyuki-arriving-text" precedence="miyuki">
        {keyframes}
      </style>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {lines.map((line, l) => (
          <Fragment key={l}>
            {l > 0 && <br />}
            {line
              .split(/(\s+)/)
              .filter((t) => t.length > 0)
              .map((token, t) => {
                if (/^\s/.test(token)) return token;
                if (by === "char") {
                  return (
                    <span key={t} className="whitespace-nowrap">
                      {Array.from(token, (ch, c) => (
                        <span key={c} data-unit="" className={unitClass} style={unitStyle(slot++)}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  );
                }
                const i = slot++;
                const order = by === "line" ? (lineOf?.[i] ?? 0) : i;
                return (
                  <span key={t} data-unit="" className={unitClass} style={unitStyle(order)}>
                    {token}
                  </span>
                );
              })}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
