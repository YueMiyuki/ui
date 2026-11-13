"use client";

import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { ProgressBar } from "@/components/miyuki-ui/progress";
import { cn } from "@/lib/utils";

export interface ContextSegment {
  label: string;
  value: number;
  color?: string;
}

export interface AgentContext {
  used: number;
  total: number;
  segments: ContextSegment[];
}

export interface PlanLimit {
  label: ReactNode;
  resetsIn: ReactNode;
  value: number;
}

export interface ContextMeterProps extends Omit<ComponentProps<"section">, "children"> {
  context: AgentContext;
  limits?: PlanLimit[];
  warnAt?: number;
  criticalAt?: number;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-6)", "var(--chart-4)"];

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, "");
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${trim(n / 1000)}k`;
  return String(Math.round(n));
}

export function ContextMeter({
  context,
  limits = [],
  warnAt = 75,
  criticalAt = 90,
  className,
  ...props
}: ContextMeterProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const total = Math.max(1, context.total);
  const percent = Math.round((context.used / total) * 100);

  const parts = context.segments.map((s, i) => ({
    ...s,
    color: s.color ?? palette[i % palette.length],
    share: (s.value / total) * 100,
  }));
  const free = Math.max(0, total - parts.reduce((sum, p) => sum + p.value, 0));
  const summary = [...parts.map((p) => `${p.label} ${formatTokens(p.value)}`), `free ${formatTokens(free)}`].join(", ");
  const shown = active != null ? parts[active] : null;

  return (
    <section
      {...props}
      className={cn("w-full rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm leading-5 font-medium text-foreground">Context window</h3>
        <div className="relative flex min-w-0 justify-end text-sm leading-5 tabular-nums">
          <AnimatePresence initial={false} mode="popLayout">
            {shown ? (
              <motion.p
                key={shown.label}
                aria-hidden="true"
                className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={reduce ? { duration: 0.1 } : { ...SETTLE, opacity: { duration: 0.14 } }}
              >
                <span className="size-2 rounded-[2px]" style={{ backgroundColor: shown.color }} />
                <span className="text-foreground">{shown.label}</span>
                {formatTokens(shown.value)} ({Math.round(shown.share)}%)
              </motion.p>
            ) : (
              <motion.p
                key="total"
                className="whitespace-nowrap text-muted-foreground"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={reduce ? { duration: 0.1 } : { ...SETTLE, opacity: { duration: 0.14 } }}
              >
                <span className="text-foreground">{formatTokens(context.used)}</span> / {formatTokens(context.total)} (
                {percent}%)
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-3">
        <div
          role="img"
          aria-label={`Context window: ${summary}`}
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
          onPointerLeave={() => setActive(null)}
        >
          {parts.map((p, i) => (
            <span
              key={p.label}
              className={cn(
                "h-full min-w-1 shrink-0 rounded-[2px] transition-[opacity,flex-basis] duration-300 ease-settle",
                active != null && active !== i && "opacity-35",
              )}
              style={{ flexBasis: `${p.share}%`, backgroundColor: p.color }}
              onPointerEnter={() => setActive(i)}
            />
          ))}
          <span className="h-full min-w-1 flex-1 rounded-[2px] bg-muted ring-1 ring-border ring-inset" />
        </div>
      </div>
      <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-4 text-muted-foreground">
        {parts.map((p, i) => (
          <li
            key={p.label}
            className={cn(
              "flex items-center gap-1.5 transition-colors duration-150",
              active === i && "text-foreground",
            )}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
            {p.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-muted ring-1 ring-border-strong ring-inset" />
          Free
        </li>
      </ul>
      {limits.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm leading-5 font-medium text-foreground">Plan limits</h3>
          <ul className="@container mt-1">
            {limits.map((limit, i) => {
              const value = Math.min(100, Math.max(0, limit.value));
              const tone = value >= criticalAt ? "critical" : value >= warnAt ? "warn" : "calm";
              return (
                <li
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0 last:pb-0 @sm:grid-cols-[minmax(0,1fr)_9rem_2.75rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-5 text-foreground">{limit.label}</p>
                    <p className="truncate text-[13px] leading-5 text-muted-foreground">Resets {limit.resetsIn}</p>
                  </div>
                  <ProgressBar
                    size="sm"
                    value={value}
                    showValue={false}
                    aria-label={typeof limit.label === "string" ? limit.label : "Usage"}
                    tone={tone === "critical" ? "destructive" : tone === "warn" ? "warning" : "brand"}
                    className="col-span-2 row-start-2 @sm:col-span-1 @sm:row-start-auto"
                  />
                  <p
                    className={cn(
                      "text-end text-sm leading-5 tabular-nums transition-colors duration-300",
                      tone === "calm" && "text-muted-foreground",
                      tone === "warn" && "font-medium text-warning-strong",
                      tone === "critical" && "font-medium text-destructive",
                    )}
                  >
                    {Math.round(value)}%
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
