"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type DecodeTextTrigger = "mount" | "view" | "hover";

export interface DecodeTextProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  revealDelayMs?: number;
  flipDelayMs?: number;
  charset?: string;
  trigger?: DecodeTextTrigger;
  encryptedClassName?: string;
  revealedClassName?: string;
  onDone?: () => void;
  ref?: Ref<HTMLSpanElement>;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>";
const SPACE = /\s/;

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

function hashString(value: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function glyph(set: string[], seed: number, i: number, tick: number) {
  let h = seed ^ Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(tick + 7, 0x85ebca6b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return set[(h >>> 0) % set.length];
}

interface Frame {
  revealed: number;
  tick: number;
}

export function DecodeText({
  text,
  revealDelayMs = 50,
  flipDelayMs = 40,
  charset = DEFAULT_CHARSET,
  trigger = "view",
  encryptedClassName,
  revealedClassName,
  onDone,
  className,
  onPointerEnter,
  ref,
  ...props
}: DecodeTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const onDoneRef = useRef(onDone);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.5 });
  const [frame, setFrame] = useState<Frame | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const chars = Array.from(text);
  const total = chars.filter((c) => !SPACE.test(c)).length;
  const set = Array.from(charset.length > 0 ? charset : DEFAULT_CHARSET);

  const start = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = () => {
      const elapsed = performance.now() - t0;
      const revealed = Math.floor(elapsed / Math.max(1, revealDelayMs));
      if (revealed >= total) {
        setFrame(null);
        setSettled(true);
        onDoneRef.current?.();
        return;
      }
      const tick = Math.floor(elapsed / Math.max(16, flipDelayMs));
      setFrame((f) => (f && f.revealed === revealed && f.tick === tick ? f : { revealed, tick }));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [revealDelayMs, flipDelayMs, total]);

  useEffect(() => {
    if (reduced || settled || trigger === "hover") return;
    if (trigger === "mount" || inView) start();
    return () => cancelAnimationFrame(raf.current);
  }, [trigger, inView, reduced, settled, start]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const armed = hydrated && !reduced && !settled && trigger !== "hover";
  const revealed = frame ? frame.revealed : armed ? 0 : total;
  const tick = frame?.tick ?? 0;

  const seed = hashString(text);
  let slot = 0;
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);

  return (
    <span
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (trigger === "hover" && !reduced && !frame) start();
      }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {tokens.map((token, t) => {
          if (SPACE.test(token[0])) return token;
          return (
            <span key={t} className="whitespace-nowrap">
              {Array.from(token, (ch, c) => {
                const i = slot++;
                if (i < revealed) {
                  return (
                    <span key={c} className={revealedClassName}>
                      {ch}
                    </span>
                  );
                }
                return (
                  <span key={c} className="relative">
                    <span className="text-transparent">{ch}</span>
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center text-muted-foreground",
                        encryptedClassName,
                      )}
                    >
                      {glyph(set, seed, i, tick)}
                    </span>
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
