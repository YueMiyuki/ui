"use client";

import { FileText, type LucideIcon, PenLine, Search, Snowflake, SquareTerminal } from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ActionKind = "search" | "read" | "write" | "run" | "think";
export type ActionStatus = "running" | "done" | "failed" | "skipped";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  label: ReactNode;
  detail?: ReactNode;
  status: ActionStatus;
}

export interface ActionLogProps extends Omit<ComponentProps<"ol">, "children"> {
  items: ActionItem[];
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

const icons: Record<ActionKind, LucideIcon> = {
  search: Search,
  read: FileText,
  write: PenLine,
  run: SquareTerminal,
  think: Snowflake,
};

const kindText: Record<ActionKind, string> = {
  search: "Search",
  read: "Read",
  write: "Write",
  run: "Run",
  think: "Think",
};

const keyframes = `
@keyframes miyuki-action-log-shine { from { background-position: 100% 0; } to { background-position: 0% 0; } }
`;

const band: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--muted-foreground) 38%, var(--foreground) 47%, var(--foreground) 53%, var(--muted-foreground) 62%)",
  backgroundSize: "300% 100%",
};

function formatTime(ms: number) {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function Timer({ running }: { running: boolean }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const id = window.setInterval(() => setMs(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, [running]);
  if (ms == null) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 text-xs leading-6 tabular-nums transition-colors duration-300",
        running ? "text-muted-foreground" : "text-muted-foreground/70",
      )}
    >
      {formatTime(ms)}
    </span>
  );
}

export function ActionLog({ items, className, ...props }: ActionLogProps) {
  const reduce = useReducedMotion();
  return (
    <ol aria-live="polite" aria-relevant="additions" {...props} className={cn("flex w-full flex-col", className)}>
      <style href="miyuki-action-log" precedence="miyuki">
        {keyframes}
      </style>
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const Icon = icons[item.kind];
          const running = item.status === "running";
          const failed = item.status === "failed";
          const skipped = item.status === "skipped";
          const last = i === items.length - 1;
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={reduce ? { duration: 0.12 } : SETTLE}
              className={cn("relative flex items-start gap-3", !last && "pb-3")}
            >
              {!last && (
                <motion.span
                  aria-hidden="true"
                  className="absolute start-3 top-[27px] bottom-[3px] w-px -translate-x-1/2 bg-border-strong rtl:translate-x-1/2"
                  style={{ originY: 0 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={reduce ? { duration: 0 } : { ...SETTLE, delay: 0.05 }}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ease-settle",
                  running && "bg-brand-soft text-brand-strong",
                  failed && "bg-destructive-soft text-destructive-strong",
                  skipped && "bg-muted text-muted-foreground/60",
                  item.status === "done" && "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm leading-6">
                <span className="sr-only">{kindText[item.kind]}: </span>
                <span
                  className={cn(
                    "shrink-0",
                    running
                      ? "bg-clip-text text-transparent motion-safe:animate-[miyuki-action-log-shine_2.6s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:bg-none motion-reduce:text-foreground"
                      : failed
                        ? "text-foreground"
                        : skipped
                          ? "text-muted-foreground line-through decoration-border-strong"
                          : "text-muted-foreground",
                  )}
                  style={running ? band : undefined}
                >
                  {item.label}
                </span>
                {item.detail != null && (
                  <span
                    className={cn(
                      "min-w-0 truncate rounded-sm border border-border bg-muted/60 px-1.5 font-mono text-xs leading-5 transition-colors duration-300",
                      running ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.detail}
                  </span>
                )}
                {running && <span className="sr-only">, in progress</span>}
              </div>
              {failed || skipped ? (
                <span
                  className={cn(
                    "shrink-0 text-xs leading-6 font-medium",
                    failed ? "text-destructive-strong" : "text-muted-foreground",
                  )}
                >
                  {failed ? "Failed" : "Skipped"}
                </span>
              ) : (
                <Timer running={running} />
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
