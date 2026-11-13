"use client";

import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useId, useState } from "react";
import { Button } from "react-aria-components";
import { cn } from "@/lib/utils";

export type TrailSourceStatus = "reading" | "done";

export interface TrailSource {
  title: string;
  domain: string;
  status: TrailSourceStatus;
  href?: string;
}

export interface SourceTrailProps extends Omit<ComponentProps<"section">, "children"> {
  query: string;
  sources: TrailSource[];
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const FILL: Transition = { type: "spring", stiffness: 500, damping: 30 };

const keyframes = `
@keyframes miyuki-source-trail-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-source-trail-shine { from { background-position: 100% 0; } to { background-position: 0% 0; } }
`;

const band: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--muted-foreground) 38%, var(--foreground) 47%, var(--foreground) 53%, var(--muted-foreground) 62%)",
  backgroundSize: "300% 100%",
};

const shine =
  "bg-clip-text text-transparent motion-safe:animate-[miyuki-source-trail-shine_2.6s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:bg-none motion-reduce:text-foreground";

const tints = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-6"];

function tileStyle(domain: string): CSSProperties {
  let h = 0x811c9dc5;
  for (let i = 0; i < domain.length; i++) {
    h ^= domain.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hue = `var(${tints[(h >>> 0) % tints.length]})`;
  return {
    backgroundColor: `color-mix(in oklab, ${hue} 24%, var(--card))`,
    color: `color-mix(in oklab, ${hue} 45%, var(--foreground))`,
  };
}

function Tile({ domain, className, style }: { domain: string; className?: string; style?: CSSProperties }) {
  const letter = domain
    .replace(/^www\./, "")
    .charAt(0)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[5px] text-[11px] leading-none font-semibold ring-1 ring-foreground/8 ring-inset",
        className,
      )}
      style={{ ...tileStyle(domain), ...style }}
    >
      {letter}
    </span>
  );
}

function Mark({ done }: { done: boolean }) {
  const reduce = useReducedMotion();
  const clip = useId();
  const [spinning, setSpinning] = useState(!done);
  if (!done && !spinning) setSpinning(true);

  useEffect(() => {
    if (!done || !spinning) return;
    const id = window.setTimeout(() => setSpinning(false), 420);
    return () => window.clearTimeout(id);
  }, [done, spinning]);

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
        className={cn("transition-[stroke] duration-200", done ? "stroke-success" : "stroke-brand/20")}
      />
      <g
        className={cn(
          "origin-center [transform-box:view-box]",
          spinning && "motion-safe:animate-[miyuki-source-trail-spin_0.9s_linear_infinite]",
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
          animate={{ pathLength: done ? 1 : 0.3 }}
          transition={reduce ? { duration: 0 } : SETTLE}
        />
      </g>
      <g clipPath={`url(#${clip})`}>
        <motion.rect
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

export function SourceTrail({
  query,
  sources,
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  className,
  ...props
}: SourceTrailProps) {
  const reduce = useReducedMotion();
  const panel = useId();
  const [own, setOwn] = useState(defaultExpanded);
  const open = expanded ?? own;
  const reading = sources.some((s) => s.status === "reading");
  const count = sources.length;
  const noun = count === 1 ? "source" : "sources";
  const stack = sources.slice(0, 4);

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
      <style href="miyuki-source-trail" precedence="miyuki">
        {keyframes}
      </style>
      <h3 className="m-0 flex">
        <Button
          aria-expanded={open}
          aria-controls={panel}
          onPress={toggle}
          className={cn(
            "group/head flex min-h-12 min-w-0 flex-1 cursor-default items-center gap-3 rounded-[11px] ps-4 pe-3 text-start text-sm leading-5 outline-none select-none",
            "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
          )}
        >
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            <span className="sr-only">Searched for </span>
            {"“"}
            {query}
            {"”"}
          </span>
          <AnimatePresence initial={false}>
            {!open && count > 0 && (
              <motion.span
                key="stack"
                aria-hidden="true"
                className="flex shrink-0 items-center gap-2"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={reduce ? { duration: 0.12 } : SETTLE}
              >
                <span className="flex">
                  {stack.map((s, i) => (
                    <Tile
                      key={`${s.domain}-${i}`}
                      domain={s.domain}
                      className="not-first:-ms-1"
                      style={{ zIndex: stack.length - i, boxShadow: "0 0 0 2px var(--card)" }}
                    />
                  ))}
                </span>
                <span className="text-[13px] text-muted-foreground tabular-nums">{count}</span>
              </motion.span>
            )}
          </AnimatePresence>
          <span className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-150 group-data-[hovered]/head:bg-accent group-data-[hovered]/head:text-foreground">
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform duration-200 ease-settle motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </span>
        </Button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
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
            <div className="border-t border-border">
              <ol aria-live="polite" aria-relevant="additions" className="flex flex-col px-1.5 py-1.5">
                <AnimatePresence initial={false}>
                  {sources.map((s, i) => {
                    const done = s.status === "done";
                    const Row = s.href ? "a" : "div";
                    return (
                      <motion.li
                        key={`${s.domain}-${s.title}-${i}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
                        transition={
                          reduce ? { duration: 0.12 } : { height: SETTLE, opacity: { duration: 0.24, delay: 0.06 } }
                        }
                      >
                        <motion.div
                          initial={{ y: 6 }}
                          animate={{ y: 0 }}
                          transition={reduce ? { duration: 0 } : SETTLE}
                        >
                          <Row
                            {...(s.href ? { href: s.href, target: "_blank", rel: "noreferrer" } : null)}
                            className={cn(
                              "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm leading-5 outline-none",
                              s.href &&
                                "transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring",
                            )}
                          >
                            <Tile domain={s.domain} />
                            <span className="flex min-w-0 flex-1 items-baseline gap-2">
                              <span
                                className={cn("min-w-0 truncate", done ? "text-foreground" : shine)}
                                style={done ? undefined : band}
                              >
                                {s.title}
                              </span>
                              <span className="shrink-0 text-[13px] text-muted-foreground max-sm:hidden">
                                {s.domain}
                              </span>
                            </span>
                            <Mark done={done} />
                            <span className="sr-only">{done ? ", read" : ", reading"}</span>
                          </Row>
                        </motion.div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
              <p className="border-t border-border px-4 py-2.5 text-[13px] leading-5">
                <span className={reading ? shine : "text-muted-foreground"} style={reading ? band : undefined}>
                  {reading ? `Reading ${count} ${noun}` : `Read ${count} ${noun}`}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
