"use client";

import { useInView, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";

export type TypedPhrasesMode = "type" | "wipe";

export interface TypedPhrasesProps extends Omit<ComponentProps<"span">, "children" | "prefix"> {
  phrases: string[];
  prefix?: ReactNode;
  mode?: TypedPhrasesMode;
  typeSpeed?: number;
  deleteSpeed?: number;
  pause?: number;
  loop?: boolean;
  caret?: boolean;
  startOnView?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

type Phase = "idle" | "in" | "hold" | "out" | "gap" | "done";

interface State {
  p: number;
  n: number;
  phase: Phase;
}

const keyframes = `
@keyframes miyuki-typed-phrases-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`;

const FEATHER = "0.35em";
const EDGE = `calc(var(--miyuki-typed-phrases-p) * (100% + ${FEATHER}))`;
const WIPE_MASK = `linear-gradient(90deg, #000 calc(${EDGE} - ${FEATHER}), transparent ${EDGE})`;

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

function keyDelay(speed: number, phrase: string, n: number) {
  let h = Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(phrase.length + 3, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  const jitter = 0.75 + ((h >>> 0) % 1000) / 2000;
  const previous = phrase[n - 2] ?? "";
  return speed * jitter * (/[,.;:]/.test(previous) ? 3 : previous === " " ? 1.6 : 1);
}

function readable(list: string[]) {
  return list
    .map((s, i) => {
      const t = s.trim();
      return i === list.length - 1 || /[.!?;:,]$/.test(t) ? t : `${t},`;
    })
    .join(" ");
}

function Glued({ text, caret, rest = "" }: { text: string; caret: ReactNode; rest?: string }) {
  const m = /^([\s\S]*\s)?(\S+\s*)$/.exec(text);
  const head = m ? (m[1] ?? "") : "";
  const tail = m ? m[2] : text;
  return (
    <>
      {head}
      <span className="whitespace-nowrap">
        {tail}
        {caret}
        {rest ? <span className="invisible">{rest}</span> : null}
      </span>
    </>
  );
}

function Caret({ blink }: { blink: boolean }) {
  return (
    <span
      className={cn(
        "ml-[0.06em] inline-block h-[0.94em] w-0.5 translate-y-[0.19em] rounded-full bg-brand align-baseline",
        blink && "animate-[miyuki-typed-phrases-blink_1.1s_steps(1,end)_infinite] motion-reduce:animate-none",
      )}
    />
  );
}

export function TypedPhrases({
  phrases,
  prefix,
  mode = "type",
  typeSpeed = 55,
  deleteSpeed = 30,
  pause = 1600,
  loop = true,
  caret = true,
  startOnView = true,
  className,
  ref,
  ...props
}: TypedPhrasesProps) {
  const own = useRef<HTMLSpanElement>(null);
  const wipe = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.6 });
  const started = startOnView ? inView : hydrated;
  const [state, setState] = useState<State>({ p: 0, n: 0, phase: "idle" });
  const list = phrases;
  const count = list.length;
  const last = count - 1;
  const key = list.join("\u0001");

  useEffect(() => {
    if (reduced || !started || count === 0 || state.phase === "done") return;
    const phrase = key.split("\u0001")[state.p % count] ?? "";
    const length = Array.from(phrase).length;
    const isLast = state.p === last;
    const after = (ms: number, next: State) => {
      const id = setTimeout(() => setState(next), ms);
      return () => clearTimeout(id);
    };

    switch (state.phase) {
      case "idle":
        return after(450, { ...state, phase: "in" });
      case "hold":
        return after(pause, { ...state, phase: "out" });
      case "gap":
        return after(Math.max(220, typeSpeed * 5), { p: (state.p + 1) % count, n: 0, phase: "in" });
    }

    const finished: State = isLast && !loop ? { ...state, phase: "done" } : { ...state, phase: "hold" };

    if (mode === "type") {
      if (state.phase === "in") {
        const n = state.n + 1;
        return after(keyDelay(typeSpeed, phrase, n), n >= length ? { ...finished, n } : { ...state, n });
      }
      const n = state.n - 1;
      return after(deleteSpeed, n <= 0 ? { ...state, n: 0, phase: "gap" } : { ...state, n });
    }

    const el = wipe.current;
    if (!el) return;
    const revealing = state.phase === "in";
    const ms = Math.max(240, length * (revealing ? typeSpeed : deleteSpeed));
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      const eased = revealing ? t : 1 - t;
      el.style.setProperty("--miyuki-typed-phrases-p", eased.toFixed(4));
      if (t < 1) raf = requestAnimationFrame(step);
      else setState(revealing ? finished : { ...state, phase: "gap" });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state, started, reduced, count, last, loop, mode, pause, typeSpeed, deleteSpeed, key]);

  const shownIndex = reduced ? (loop ? 0 : Math.max(0, last)) : state.p % Math.max(1, count);
  const phrase = list[shownIndex] ?? "";
  const moving = !reduced && (state.phase === "in" || state.phase === "out");
  const cursor = caret ? <Caret blink={!moving && !reduced} /> : null;
  const cursorGhost = caret ? <Caret blink={false} /> : null;
  const full = reduced || state.phase === "hold" || state.phase === "done";
  const prefixNode = prefix != null && prefix !== false ? <span data-slot="prefix">{prefix}</span> : null;

  const chars = Array.from(phrase);
  const typed = full ? phrase : chars.slice(0, state.n).join("");
  const rest =
    full || /\s$/.test(typed) || typed.length === 0 ? "" : (/^\S*/.exec(chars.slice(state.n).join(""))?.[0] ?? "");
  const progress = full ? 1 : state.phase === "out" ? 1 : 0;

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative grid", className)}>
      <style href="miyuki-typed-phrases" precedence="miyuki">
        {keyframes}
      </style>
      <span className="sr-only">
        {prefix}
        {prefix ? " " : null}
        {readable(list)}
      </span>

      {list.map((text, i) => (
        <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1">
          {prefixNode}
          {mode === "type" ? (
            <>
              {prefixNode ? " " : null}
              <Glued text={text} caret={cursorGhost} />
            </>
          ) : (
            <>
              {prefixNode ? " " : null}
              <span className="relative inline-block">
                {text}
                {cursorGhost}
              </span>
            </>
          )}
        </span>
      ))}

      <span aria-hidden="true" className="col-start-1 row-start-1">
        {prefixNode}
        {mode === "type" ? (
          typed.length > 0 ? (
            <>
              {prefixNode ? " " : null}
              <Glued text={typed} caret={cursor} rest={rest} />
            </>
          ) : (
            <span className="whitespace-nowrap">
              {prefixNode ? " " : null}
              {cursor}
            </span>
          )
        ) : (
          <>
            {prefixNode ? " " : null}
            <span
              ref={wipe}
              className="relative inline-block"
              style={{ "--miyuki-typed-phrases-p": progress } as CSSProperties}
            >
              <span style={{ maskImage: WIPE_MASK, WebkitMaskImage: WIPE_MASK }}>{phrase}</span>
              {caret ? <span className="invisible">{cursorGhost}</span> : null}
              {caret ? (
                <span className="absolute top-0" style={{ left: `min(100% - 2px - 0.06em, ${EDGE})` }}>
                  {cursor}
                </span>
              ) : null}
            </span>
          </>
        )}
      </span>
    </span>
  );
}
