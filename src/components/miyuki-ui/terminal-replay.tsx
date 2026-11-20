"use client";

import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TerminalReplayTone = "default" | "muted" | "brand" | "success" | "warning" | "error";

export interface TerminalReplayLine {
  type: "command" | "output";
  text: string;
  tone?: TerminalReplayTone;
}

export interface TerminalReplayProps extends Omit<ComponentProps<"div">, "title" | "children"> {
  lines: TerminalReplayLine[];
  prompt?: string;
  title?: string;
  typingSpeed?: number;
  lineDelay?: number;
  startOnView?: boolean;
  loop?: boolean;
  sound?: boolean;
  startFrom?: number;
}

const TONES: Record<TerminalReplayTone, string> = {
  default: "text-foreground/85",
  muted: "text-muted-foreground",
  brand: "text-brand-strong",
  success: "text-success-strong",
  warning: "text-warning-strong",
  error: "text-destructive-strong",
};

const LOOP_PAUSE = 2600;

function highlight(text: string): ReactNode[] {
  const parts = text.split(/("[^"]*"|'[^']*'|\s+)/).filter(Boolean);
  let named = false;
  return parts.map((part, i) => {
    if (/^\s+$/.test(part)) return part;
    let cls = "text-foreground/80";
    if (!named) {
      named = true;
      cls = "font-medium text-foreground";
    } else if (/^["'].*["']$/.test(part)) cls = "text-success-strong";
    else if (part.startsWith("-")) cls = "text-brand";
    else if (/[/~]/.test(part) || part.startsWith(".")) cls = "text-(--miyuki-terminal-replay-path)";
    return (
      <span key={i} className={cls}>
        {part}
      </span>
    );
  });
}

function createTicker() {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  return {
    play() {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!ctx) {
        ctx = new Ctor();
        const length = Math.floor(ctx.sampleRate * 0.03);
        noise = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
      }
      if (ctx.state === "suspended") void ctx.resume();
      if (!noise) return;
      const t = ctx.currentTime + 0.001;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = 0.9 + Math.random() * 0.25;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.03);
    },
    close() {
      void ctx?.close();
      ctx = null;
    },
  };
}

interface Cursor {
  line: number;
  chars: number;
}

export function TerminalReplay({
  lines,
  prompt = "~ $",
  title = "Terminal",
  typingSpeed = 45,
  lineDelay = 400,
  startOnView = true,
  loop = false,
  sound = false,
  startFrom = 0,
  className,
  ...props
}: TerminalReplayProps) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<ReturnType<typeof createTicker> | null>(null);
  const [inView, setInView] = useState(!startOnView);
  const [run, setRun] = useState(0);
  const [cursor, setCursor] = useState<Cursor>(() => ({
    line: Math.min(Math.max(0, startFrom), lines.length),
    chars: 0,
  }));

  const total = lines.length;
  const started = inView;
  const shown: Cursor = reduced ? { line: total, chars: 0 } : cursor;
  const done = shown.line >= total;

  useEffect(() => {
    if (!startOnView) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [startOnView]);

  useEffect(() => {
    tickerRef.current = createTicker();
    return () => {
      tickerRef.current?.close();
      tickerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!started || reduced) return;
    let timer = 0;
    const at = cursor;
    if (at.line >= total) {
      if (loop) timer = window.setTimeout(() => setCursor({ line: 0, chars: 0 }), LOOP_PAUSE);
      return () => window.clearTimeout(timer);
    }
    const current = lines[at.line];
    if (current.type === "command") {
      if (at.chars < current.text.length) {
        const pause = at.chars === 0 ? lineDelay : typingSpeed * (0.55 + Math.random() * 0.9);
        timer = window.setTimeout(() => {
          if (sound) tickerRef.current?.play();
          setCursor({ line: at.line, chars: at.chars + 1 });
        }, pause);
      } else {
        timer = window.setTimeout(() => setCursor({ line: at.line + 1, chars: 0 }), lineDelay);
      }
    } else {
      const next = lines[at.line + 1];
      const pause = next?.type === "output" ? lineDelay * 0.35 : 0;
      timer = window.setTimeout(() => setCursor({ line: at.line + 1, chars: 0 }), pause);
    }
    return () => window.clearTimeout(timer);
  }, [cursor, started, reduced, lines, total, typingSpeed, lineDelay, loop, sound, run]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [shown.line, shown.chars]);

  const visible = lines.slice(0, Math.min(total, shown.line + 1));
  const typing = !done && lines[shown.line]?.type === "command";
  const waiting = typing && (shown.chars === 0 || shown.chars >= lines[shown.line].text.length);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "flex h-80 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg",
        "[--miyuki-terminal-replay-path:color-mix(in_oklab,var(--chart-2)_55%,var(--foreground))] dark:[--miyuki-terminal-replay-path:var(--chart-2)]",
        className,
      )}
    >
      <style href="miyuki-terminal-replay" precedence="miyuki">{`
        @keyframes miyuki-terminal-replay-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
      `}</style>
      <div className="relative flex h-10 shrink-0 items-center border-b border-border px-4">
        <div aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full border border-border-strong" />
          <span className="size-2.5 rounded-full border border-border-strong" />
          <span className="size-2.5 rounded-full border border-border-strong" />
        </div>
        <p className="pointer-events-none absolute inset-x-20 truncate text-center text-xs font-medium text-muted-foreground">
          {title}
        </p>
        <AnimatePresence>
          {done && started && !reduced ? (
            <motion.button
              type="button"
              aria-label="Replay"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              onClick={() => {
                bodyRef.current?.focus({ preventScroll: true });
                setRun((n) => n + 1);
                setCursor({ line: 0, chars: 0 });
              }}
              className={cn(
                "ml-auto grid size-7 place-items-center rounded-md text-muted-foreground outline-none",
                "transition-[background-color,color] duration-150 hover:bg-accent hover:text-foreground",
                "focus-visible:ring-[3px] focus-visible:ring-ring active:scale-[0.96]",
              )}
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
      <div
        ref={bodyRef}
        tabIndex={0}
        role="region"
        aria-label={title}
        className="min-h-0 flex-1 overflow-auto px-4 py-3.5 font-mono text-[13px] leading-[1.75] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
      >
        {visible.map((line, i) => {
          const isCurrent = i === shown.line;
          if (line.type === "command") {
            const text = isCurrent ? line.text.slice(0, shown.chars) : line.text;
            return (
              <div key={`${run}-${i}`} className="whitespace-pre-wrap break-words">
                <span className="text-brand-strong select-none">{prompt}</span> {highlight(text)}
                {isCurrent && typing ? <Caret blink={waiting} /> : null}
              </div>
            );
          }
          return (
            <motion.div
              key={`${run}-${i}`}
              initial={reduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn("whitespace-pre", TONES[line.tone ?? "default"])}
            >
              {line.text || " "}
            </motion.div>
          );
        })}
        {done ? (
          <div>
            <span className="text-brand-strong select-none">{prompt}</span> <Caret blink />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Caret({ blink }: { blink: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-px inline-block h-[1.15em] w-[0.6em] translate-y-[0.22em] bg-foreground/70",
        blink && "animate-[miyuki-terminal-replay-blink_1.1s_linear_infinite] motion-reduce:animate-none",
      )}
    />
  );
}
