"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useId, useState } from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { ProgressRing } from "@/components/miyuki-ui/progress";
import { cn } from "@/lib/utils";

export type RunStepStatus = "done" | "running" | "pending";

export interface RunStep {
  id: string;
  label: ReactNode;
  status: RunStepStatus;
}

export interface RunChecklistProps extends Omit<ComponentProps<"section">, "title" | "children"> {
  steps: RunStep[];
  title?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const FILL: Transition = { type: "spring", stiffness: 500, damping: 30 };

const keyframes = `
@keyframes miyuki-run-checklist-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-run-checklist-shine { from { background-position: 100% 0; } to { background-position: 0% 0; } }
`;

const band: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--muted-foreground) 38%, var(--foreground) 47%, var(--foreground) 53%, var(--muted-foreground) 62%)",
  backgroundSize: "300% 100%",
};

function StepMark({ status }: { status: RunStepStatus }) {
  const reduce = useReducedMotion();
  const clip = useId();
  const running = status === "running";
  const done = status === "done";
  const [spinning, setSpinning] = useState(running);
  if (running && !spinning) setSpinning(true);

  useEffect(() => {
    if (running || !spinning) return;
    const id = window.setTimeout(() => setSpinning(false), 420);
    return () => window.clearTimeout(id);
  }, [running, spinning]);

  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 shrink-0 overflow-visible">
      <defs>
        <clipPath id={clip}>
          <circle cx="8" cy="8" r="7.3" />
        </clipPath>
      </defs>
      <circle
        cx="8"
        cy="8"
        r="6.5"
        strokeWidth="1.5"
        className={cn(
          "transition-[stroke] duration-200 ease-settle",
          done ? "stroke-success" : running ? "stroke-brand/20" : "stroke-border-strong",
        )}
      />
      <g
        className={cn(
          "origin-center [transform-box:view-box]",
          spinning && "motion-safe:animate-[miyuki-run-checklist-spin_0.9s_linear_infinite]",
        )}
      >
        <motion.circle
          cx="8"
          cy="8"
          r="6.5"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
          className="stroke-brand"
          initial={false}
          animate={{ pathLength: done ? 1 : running ? 0.3 : 0, opacity: status === "pending" ? 0 : 1 }}
          transition={reduce ? { duration: 0 } : { pathLength: SETTLE, opacity: { duration: 0.15 } }}
        />
      </g>
      <g clipPath={`url(#${clip})`}>
        <motion.rect
          x="0"
          y="0"
          width="16"
          height="16"
          className="fill-success"
          style={{ originY: 1, transformBox: "view-box" }}
          initial={false}
          animate={{ scaleY: done ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : done ? { ...FILL, delay: 0.12 } : { duration: 0.12 }}
        />
      </g>
      <motion.path
        d="M5.1 8.3 7.1 10.25 10.9 6.1"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-success-foreground"
        initial={false}
        animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : done
              ? {
                  pathLength: { duration: 0.24, delay: 0.24, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0, delay: 0.24 },
                }
              : { duration: 0.1 }
        }
      />
    </svg>
  );
}

const statusText: Record<RunStepStatus, string> = {
  done: "done",
  running: "in progress",
  pending: "not started",
};

export function RunChecklist({
  steps,
  title,
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  className,
  ...props
}: RunChecklistProps) {
  const reduce = useReducedMotion();
  const panel = useId();
  const [own, setOwn] = useState(defaultExpanded);
  const open = expanded ?? own;

  const total = steps.length;
  const finished = steps.filter((s) => s.status === "done").length;
  const left = total - finished;
  const complete = total > 0 && left === 0;
  const pending = steps.filter((s) => s.status === "pending");
  const fade = pending.length >= 3;

  function toggle() {
    const next = !open;
    if (expanded === undefined) setOwn(next);
    onExpandedChange?.(next);
  }

  return (
    <section
      {...props}
      className={cn(
        "w-full overflow-clip rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <style href="miyuki-run-checklist" precedence="miyuki">
        {keyframes}
      </style>
      <header className="flex items-center gap-3 py-2.5 ps-4 pe-2.5">
        <ProgressRing
          size="sm"
          value={total ? (finished / total) * 100 : 0}
          aria-label="Steps finished"
          className={cn("transition-colors duration-300", complete && "text-success")}
        />
        <div className="flex min-w-0 flex-1 items-baseline gap-2 text-sm leading-5">
          {title != null && <h3 className="min-w-0 truncate font-medium text-foreground">{title}</h3>}
          <p
            aria-live="polite"
            className={cn(
              "shrink-0 tabular-nums",
              title != null ? "text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            {complete ? "Done" : `${left} ${left === 1 ? "step" : "steps"} left`}
          </p>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={open ? "Hide steps" : "Show steps"}
          aria-expanded={open}
          aria-controls={panel}
          onPress={toggle}
          className="text-muted-foreground data-[hovered]:text-foreground"
        >
          <ChevronDown
            className={cn(
              "transition-transform duration-200 ease-settle motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </IconButton>
      </header>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="steps"
            id={panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{
              height: 0,
              opacity: 0,
              transition: reduce
                ? { duration: 0.12 }
                : { height: { duration: 0.2, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.12 } },
            }}
            transition={reduce ? { duration: 0.12 } : { height: SETTLE, opacity: { duration: 0.2, delay: 0.05 } }}
            className="overflow-hidden"
          >
            <LayoutGroup id={panel}>
              <ol
                aria-label={typeof title === "string" ? title : "Steps"}
                className="isolate flex flex-col px-1.5 pb-1.5"
              >
                {steps.map((step) => {
                  const running = step.status === "running";
                  const k = pending.indexOf(step);
                  const opacity = fade && k > 0 ? Math.max(0.32, 1 - k * 0.2) : 1;
                  return (
                    <li
                      key={step.id}
                      aria-current={running ? "step" : undefined}
                      className="relative flex min-h-10 items-center gap-3 px-3 py-2 text-sm leading-5 transition-opacity duration-300 ease-settle"
                      style={{ opacity }}
                    >
                      {running && (
                        <motion.span
                          layoutId="current"
                          aria-hidden="true"
                          className="absolute inset-0 -z-10 rounded-lg border border-border-strong bg-background shadow-xs dark:bg-accent/45"
                          transition={reduce ? { duration: 0 } : SETTLE}
                        />
                      )}
                      <span className="relative flex">
                        <StepMark status={step.status} />
                      </span>
                      <span
                        className={cn(
                          "relative min-w-0 flex-1 truncate",
                          step.status === "done" && "text-muted-foreground",
                          step.status === "pending" && "text-foreground",
                          running &&
                            "bg-clip-text text-transparent motion-safe:animate-[miyuki-run-checklist-shine_2.6s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:bg-none motion-reduce:text-foreground",
                        )}
                        style={running ? band : undefined}
                      >
                        {step.label}
                      </span>
                      <span className="sr-only">, {statusText[step.status]}</span>
                    </li>
                  );
                })}
              </ol>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
