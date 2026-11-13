"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Key, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type GateTone = "glass" | "ink" | "brand";

export interface GateTransitionProps extends Omit<ComponentProps<"div">, "children"> {
  viewKey: Key;
  children: ReactNode;
  tone?: GateTone;
}

const CLOSE = 230;
const SWAP = 270;
const OPEN_AT = 330;
const OPEN = 270;
const SHUT = "rotateY(0deg)";

const flapTone: Record<GateTone, string> = {
  glass: cn(
    "bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--card)_95%,transparent),color-mix(in_oklab,var(--muted)_95%,transparent))]",
    "dark:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--accent)_96%,transparent),color-mix(in_oklab,var(--muted)_96%,transparent))]",
    "backdrop-blur-md ring-1 ring-border-strong ring-inset shadow-md",
  ),
  ink: "bg-primary shadow-lg",
  brand: "bg-brand shadow-md",
};

const stripTone: Record<GateTone, string> = {
  glass: "border-brand",
  ink: "border-brand",
  brand: "border-brand-foreground/70",
};

const sheenTone: Record<GateTone, string> = {
  glass: "from-white/70 dark:from-white/10",
  ink: "from-primary-foreground/15",
  brand: "from-white/30",
};

export function GateTransition({ viewKey, children, tone = "glass", className, ...props }: GateTransitionProps) {
  const reduce = useReducedMotion() ?? false;
  const [shownKey, setShownKey] = useState<Key>(viewKey);
  const [outgoing, setOutgoing] = useState<ReactNode>(children);
  const [busy, setBusy] = useState(false);
  const latest = useRef<Key>(viewKey);
  const phase = useRef<"idle" | "closing" | "opening">("idle");
  const timers = useRef<number[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLSpanElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);

  if (viewKey === shownKey && outgoing !== children) setOutgoing(children);

  useLayoutEffect(() => {
    latest.current = viewKey;
  });

  useEffect(() => {
    const list = timers.current;
    return () => {
      for (const id of list) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (viewKey === shownKey) return;
    if (phase.current === "closing") return;

    const later = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };
    const content = contentRef.current;
    const swap = () => setShownKey(latest.current);

    phase.current = "closing";
    later(() => setBusy(true), 0);

    if (reduce) {
      content?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in", fill: "forwards" });
      later(() => {
        swap();
        phase.current = "opening";
        content?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out", fill: "forwards" });
        later(() => {
          phase.current = "idle";
          setBusy(false);
        }, 170);
      }, 130);
      return;
    }

    const left = leftRef.current;
    const right = rightRef.current;
    const lamp = lampRef.current;
    const gate = gateRef.current;
    if (gate) gate.style.visibility = "visible";

    const swing = (el: HTMLElement | null, sign: number) =>
      el?.animate(
        [
          { transform: `rotateY(${88 * sign}deg)`, opacity: 0, offset: 0 },
          { transform: `rotateY(${40 * sign}deg)`, opacity: 1, offset: 0.3 },
          { transform: SHUT, opacity: 1, offset: 0.74 },
          { transform: `rotateY(${7 * sign}deg)`, opacity: 1, offset: 0.87 },
          { transform: SHUT, opacity: 1, offset: 1 },
        ],
        { duration: CLOSE, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "forwards" },
      );
    swing(left, -1);
    swing(right, 1);
    content?.animate(
      [
        { opacity: 1, filter: "blur(0px)" },
        { opacity: 0.12, filter: "blur(2px)" },
      ],
      { duration: 200, easing: "ease-in", fill: "forwards" },
    );
    later(() => {
      lamp?.animate(
        [
          { transform: "scale(0.4)", opacity: 0 },
          { transform: "scale(1.15)", opacity: 1, offset: 0.6 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 140, easing: "ease-out", fill: "forwards" },
      );
    }, CLOSE - 50);
    later(swap, SWAP);
    later(() => {
      phase.current = "opening";
      const open = (el: HTMLElement | null, sign: number) =>
        el?.animate(
          [
            { transform: SHUT, opacity: 1 },
            { transform: `rotateY(${50 * sign}deg)`, opacity: 1, offset: 0.55 },
            { transform: `rotateY(${88 * sign}deg)`, opacity: 0 },
          ],
          { duration: OPEN, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" },
        );
      open(left, -1);
      open(right, 1);
      lamp?.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.6)" },
        ],
        { duration: 110, easing: "ease-in", fill: "forwards" },
      );
      content?.animate(
        [
          { opacity: 0.12, filter: "blur(2px)", transform: "translateY(4px)" },
          { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
        ],
        { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
    }, OPEN_AT);
    later(
      () => {
        phase.current = "idle";
        if (gate) gate.style.visibility = "hidden";
        setBusy(false);
      },
      OPEN_AT + OPEN + 10,
    );
  }, [viewKey, shownKey, reduce]);

  return (
    <div {...props} aria-busy={busy || undefined} className={cn("relative isolate", className)}>
      <div ref={contentRef} inert={busy || undefined}>
        {shownKey === viewKey ? children : outgoing}
      </div>
      <div
        ref={gateRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0 z-10 flex items-center [perspective:900px]"
      >
        <div className="relative flex h-[clamp(52px,38%,104px)] w-full items-stretch gap-1 [transform-style:preserve-3d]">
          <div ref={leftRef} className="relative flex-1 origin-left opacity-0" style={{ transform: "rotateY(-88deg)" }}>
            <Flap tone={tone} side="left" />
          </div>
          <div
            ref={rightRef}
            className="relative flex-1 origin-right opacity-0"
            style={{ transform: "rotateY(88deg)" }}
          >
            <Flap tone={tone} side="right" />
          </div>
          <span
            ref={lampRef}
            className={cn(
              "absolute top-1/2 left-1/2 -mt-[5px] -ml-[5px] size-2.5 rounded-full opacity-0",
              "bg-[color-mix(in_oklab,var(--brand)_70%,white)] ring-2 ring-brand",
              "shadow-[0_0_12px_3px_color-mix(in_oklab,var(--brand)_60%,transparent)]",
            )}
          />
        </div>
      </div>
    </div>
  );
}

function Flap({ tone, side }: { tone: GateTone; side: "left" | "right" }) {
  const left = side === "left";
  return (
    <div className={cn("absolute inset-0 overflow-hidden", left ? "rounded-r-full" : "rounded-l-full", flapTone[tone])}>
      <span
        className={cn("absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b to-transparent opacity-80", sheenTone[tone])}
      />
      <span
        className={cn(
          "absolute inset-y-0 aspect-[1/2] border-y-0 border-[2.5px]",
          left ? "right-0 rounded-r-full border-l-0" : "left-0 rounded-l-full border-r-0",
          stripTone[tone],
        )}
      />
      <span
        className={cn(
          "absolute top-1/2 h-px w-[42%] -translate-y-1/2 bg-current opacity-15",
          left ? "left-4" : "right-4",
          tone === "ink" ? "text-primary-foreground" : tone === "brand" ? "text-brand-foreground" : "text-foreground",
        )}
      />
    </div>
  );
}
