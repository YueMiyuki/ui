"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button as AriaButton } from "react-aria-components";
import { SlideTitle, useClock, useSettings } from "@/components/miyuki-ui/coding-assistant-shared";
import { ThinkingGlyph } from "@/components/miyuki-ui/thinking-glyph";
import { cn } from "@/lib/utils";

export interface ReasoningStep {
  title: string;
  text: string;
}

export interface Reasoning {
  steps: ReasoningStep[];
  durationMs?: number;
}

export interface ReasoningLive {
  startedAt: number;
  done: number;
  stepStartedAt: number;
  stepMs: number;
  planAt: number;
  stopped?: boolean;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

export function formatSeconds(ms: number) {
  return `${(Math.max(0, ms) / 1000).toFixed(1)} s`;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function ReasoningBlock({ reasoning, live }: { reasoning: Reasoning; live?: ReasoningLive }) {
  const { settings } = useSettings();
  const reduce = useReducedMotion();
  const panel = useId();
  const body = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const total = reasoning.steps.length;
  const finished = reasoning.durationMs !== undefined;
  const stopped = Boolean(live?.stopped);
  const running = !finished && live != null;
  const now = useClock(running, 100);
  const [open, setOpen] = useState(running && settings.keepReasoningOpen);
  const [wasFinished, setWasFinished] = useState(finished);
  if (finished !== wasFinished) {
    setWasFinished(finished);
    if (finished && !settings.keepReasoningOpen) setOpen(false);
  }

  const done = finished && !stopped ? total : Math.min(total, live?.done ?? total);
  const current = Math.min(done, total - 1);
  const title = finished
    ? stopped
      ? `Stopped while reasoning · ${done} of ${total} steps`
      : `Reasoned for ${formatSeconds(reasoning.durationMs ?? 0)} · ${plural(total, "step")}`
    : (reasoning.steps[current]?.title ?? "Thinking");
  const elapsed = running && live && now != null ? `${Math.max(0, Math.floor((now - live.startedAt) / 1000))} s` : "";
  const visible = finished ? (stopped ? done : total) : current + 1;
  const reveal = (index: number, text: string) => {
    if (!running || !live || index < done || now == null) return text;
    const words = text.split(" ");
    const share = Math.min(1, Math.max(0, (now - live.stepStartedAt) / Math.max(1, live.stepMs)));
    return words.slice(0, Math.max(1, Math.ceil(words.length * share))).join(" ");
  };

  useLayoutEffect(() => {
    const el = body.current;
    if (!el || !open || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  });

  if (settings.reasoning === "off") {
    if (!running || stopped || !live || live.done >= live.planAt) return null;
    return <ThinkingGlyph variant="thinking" label="Working" showElapsed startedAt={live.startedAt} />;
  }

  const full = settings.reasoning === "full";

  return (
    <div data-reasoning="" className="flex w-full max-w-xl flex-col">
      <span aria-live="polite" className="sr-only">
        {title}
      </span>
      <AriaButton
        aria-expanded={open}
        aria-controls={panel}
        onPress={() => setOpen((value) => !value)}
        className={({ isHovered, isFocusVisible }) =>
          cn(
            "-mx-2 flex h-8 min-w-0 cursor-default items-center gap-2 rounded-lg px-2 text-start text-sm leading-5 outline-none select-none",
            "transition-[background-color,color] duration-150 ease-settle",
            isHovered ? "bg-accent/60 text-foreground" : "text-muted-foreground",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        <ThinkingGlyph
          role="none"
          aria-hidden="true"
          label=""
          className={cn(
            "shrink-0 gap-0",
            !running &&
              "[&_*]:animate-none! [&_svg]:text-muted-foreground [&_svg]:transition-colors [&_svg]:duration-300",
          )}
        />
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <SlideTitle title={title} className={running ? "text-foreground" : undefined} />
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 text-[13px] text-muted-foreground tabular-nums transition-opacity duration-200",
              elapsed ? "opacity-100" : "opacity-0",
            )}
          >
            {elapsed}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-transform duration-200 ease-settle motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </AriaButton>
      <div aria-hidden="true" className="mt-1 flex h-0.5 gap-1">
        {reasoning.steps.map((step, i) => (
          <span
            key={step.title}
            className="h-full flex-1 overflow-hidden rounded-full bg-muted ring-1 ring-border/60 ring-inset"
          >
            <span
              className={cn(
                "block h-full origin-left rounded-full transition-[transform,background-color] duration-300 ease-settle rtl:origin-right",
                finished && !stopped ? "bg-success/70" : "bg-brand",
              )}
              style={{ transform: `scaleX(${i < done ? 1 : 0})` }}
            />
          </span>
        ))}
      </div>
      <motion.div
        id={panel}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={
          reduce
            ? { duration: 0.12 }
            : open
              ? { height: SETTLE, opacity: { duration: 0.2, delay: 0.04 } }
              : { height: { duration: 0.2, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.12 } }
        }
        inert={!open}
        className="overflow-hidden"
      >
        <div
          ref={body}
          onScroll={(event) => {
            const el = event.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 16;
          }}
          className="max-h-72 overflow-y-auto overscroll-contain pt-3 pb-1 [scrollbar-width:thin]"
        >
          <ol aria-label="Reasoning steps" className="flex flex-col gap-3 border-s border-border ps-3.5">
            {reasoning.steps.slice(0, visible).map((step, i) => (
              <li key={step.title} className="flex flex-col gap-0.5">
                <p
                  className={cn(
                    "text-[13px] leading-5 font-medium",
                    running && i === current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                {full && (
                  <p className="text-[13px] leading-5 text-pretty text-muted-foreground">{reveal(i, step.text)}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </div>
  );
}
