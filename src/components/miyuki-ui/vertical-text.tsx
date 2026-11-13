"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, type Ref, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type VerticalTextLatin = "upright" | "sideways";

export interface VerticalTextProps extends Omit<ComponentProps<"div">, "children"> {
  children: string | string[];
  latin?: VerticalTextLatin;
  columns?: number;
  reveal?: boolean;
  gap?: number | string;
  ref?: Ref<HTMLDivElement>;
}

const OPEN = /^[“‘„"'([{«‹「『（〔【]+/u;
const CLOSE = /[.,;:!?”’"')\]}»›…、。」』）〕】]+$/u;
const TURN = /([—–\-‐‒―~/|()[\]{}“”‘’"«»‹›…]+)/u;
const PERIOD = /^[.,:;、。]+$/u;
const QUOTE = /([“”‘’„«»‹›…]+)/u;

const keyframes = `
@keyframes miyuki-vertical-text-descend {
  from { mask-size: 100% 0%; -webkit-mask-size: 100% 0%; }
  to { mask-size: 100% calc(100% + 3em); -webkit-mask-size: 100% calc(100% + 3em); }
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

function balance(text: string, count: number): string[] {
  const words = text.trim().split(/\s+/);
  if (count <= 1 || words.length <= 1) return [text.trim()];
  const total = words.reduce((n, w) => n + Array.from(w).length + 1, -1);
  const out: string[] = [];
  let current: string[] = [];
  let used = 0;
  let length = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = length + (current.length ? 1 : 0) + Array.from(w).length;
    const target = ((out.length + 1) * total) / count;
    const remaining = count - out.length;
    const left = words.length - i;
    if (
      current.length &&
      out.length < count - 1 &&
      (used + next > target + Array.from(w).length / 2 || left < remaining)
    ) {
      out.push(current.join(" "));
      used += length + 1;
      current = [w];
      length = Array.from(w).length;
    } else {
      current.push(w);
      length = next;
    }
  }
  if (current.length) out.push(current.join(" "));
  return out;
}

function columnsOf(children: string | string[], columns?: number): string[] {
  const parts = (Array.isArray(children) ? children : [children])
    .flatMap((part) => part.split("\n"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 1 && columns && columns > 1) return balance(parts[0], Math.floor(columns));
  return parts;
}

function pairs(digits: string) {
  const out: string[] = [];
  const lead = digits.length % 2;
  if (lead) out.push(digits.slice(0, 1));
  for (let i = lead; i < digits.length; i += 2) out.push(digits.slice(i, i + 2));
  return out;
}

function setRun(text: string, upright: boolean, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(/(\d+)/).forEach((chunk, i) => {
    if (!chunk) return;
    if (/^\d+$/.test(chunk)) {
      pairs(chunk).forEach((pair, j) =>
        out.push(
          <span key={`${key}-${i}-${j}`} className="tracking-normal [text-combine-upright:all]">
            {pair}
          </span>,
        ),
      );
      return;
    }
    if (!upright) {
      chunk.split(QUOTE).forEach((piece, j) => {
        if (!piece) return;
        out.push(
          QUOTE.test(piece) ? (
            <span key={`${key}-${i}-${j}`} className="tracking-normal [text-orientation:sideways]">
              {piece}
            </span>
          ) : (
            piece
          ),
        );
      });
      return;
    }
    chunk.split(TURN).forEach((piece, j) => {
      if (!piece) return;
      if (TURN.test(piece) && !/^[’']$/u.test(piece)) {
        out.push(
          <span key={`${key}-${i}-${j}`} className="tracking-normal [text-orientation:sideways]">
            {piece}
          </span>,
        );
      } else {
        out.push(
          ...piece.split(/([.,:;、。]+|\s+)/u).map((bit, b) =>
            PERIOD.test(bit) ? (
              <span key={`${key}-${i}-${j}-${b}`} className="relative top-[-0.4em] tracking-[-0.72em]">
                {bit}
              </span>
            ) : /^\s+$/.test(bit) ? (
              <span
                key={`${key}-${i}-${j}-${b}`}
                className="inline-block h-[0.7em] overflow-hidden tracking-normal whitespace-pre"
              >
                {bit}
              </span>
            ) : (
              bit
            ),
          ),
        );
      }
    });
  });
  return out;
}

function setColumn(text: string, upright: boolean, key: string): ReactNode[] {
  const open = text.match(OPEN)?.[0] ?? "";
  const rest = text.slice(open.length);
  const close = rest.match(CLOSE)?.[0] ?? "";
  const body = rest.slice(0, rest.length - close.length);
  const out: ReactNode[] = [];
  if (open) {
    out.push(
      <span key={`${key}-open`} data-hang="start" className="absolute bottom-[calc(100%-1.2em)]">
        {setRun(open, upright, `${key}-o`)}
      </span>,
    );
  }
  out.push(...setRun(body, upright, `${key}-b`));
  if (close) {
    out.push(
      <span
        key={`${key}-close`}
        data-hang="end"
        className={upright ? "absolute top-[calc(100%-1em)]" : "absolute top-[calc(100%-1.2em)]"}
      >
        {setRun(close, upright, `${key}-c`)}
      </span>,
    );
  }
  return out;
}

export function VerticalText({
  children,
  latin = "sideways",
  columns,
  reveal = false,
  gap = "0.9em",
  className,
  style,
  ref,
  ...props
}: VerticalTextProps) {
  const own = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.3 });
  const upright = latin === "upright";
  const list = columnsOf(children, columns);
  const key = list.join("\n");

  useLayoutEffect(() => {
    const root = own.current;
    if (!root) return;
    const check = () => {
      const k = root.offsetWidth > 0 ? root.getBoundingClientRect().width / root.offsetWidth : 1;
      root.querySelectorAll<HTMLElement>("[data-hang=end]").forEach((el) => {
        const column = el.parentElement;
        if (!column) return;
        el.style.position = "";
        const cs = getComputedStyle(column);
        const lead = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
        if (column.getBoundingClientRect().width / (k || 1) > lead * 1.5) el.style.position = "static";
      });
    };
    check();
    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", check);
    fonts?.ready.then(check).catch(() => {});
    const observer = new ResizeObserver(check);
    observer.observe(root);
    return () => {
      fonts?.removeEventListener("loadingdone", check);
      observer.disconnect();
    };
  }, [key, upright]);

  const animate = reveal && !reduced;
  const run = animate && inView;
  const timing = list.reduce<{ at: number; duration: number }[]>((acc, column) => {
    const duration = Math.min(2.4, 0.5 + Array.from(column).length * 0.032);
    const prev = acc[acc.length - 1];
    acc.push({ at: prev ? prev.at + Math.min(1.1, prev.duration * 0.55) : 0, duration });
    return acc;
  }, []);

  return (
    <div
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("flex h-max flex-col items-start", upright && "tracking-[-0.3em]", className)}
      style={{
        ...style,
        writingMode: "vertical-rl",
        textOrientation: upright ? "upright" : "mixed",
        gap: typeof gap === "number" ? `${gap}px` : gap,
      }}
    >
      {reveal ? (
        <style href="miyuki-vertical-text" precedence="miyuki">
          {keyframes}
        </style>
      ) : null}
      {list.map((column, i) => {
        const { at, duration } = timing[i];
        const columnStyle: CSSProperties | undefined = animate
          ? {
              maskImage: "linear-gradient(to bottom, #000 calc(100% - 3em), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 3em), transparent)",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "100% 0%",
              WebkitMaskSize: "100% 0%",
              animation: run
                ? `miyuki-vertical-text-descend ${duration.toFixed(2)}s cubic-bezier(0.33, 0.1, 0.4, 1) ${at.toFixed(2)}s both`
                : undefined,
            }
          : undefined;
        return (
          <span
            key={`${i}-${column}`}
            className="relative block"
            style={{
              paddingTop: "1.2em",
              paddingBottom: "1.2em",
              marginTop: "-1.2em",
              marginBottom: "-1.2em",
              ...columnStyle,
            }}
          >
            {setColumn(column, upright, `c${i}`)}
          </span>
        );
      })}
    </div>
  );
}
