"use client";

import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type TatamiSpan = "half" | "full";
export type TatamiShape = "wide" | "tall" | "square";

export interface TatamiMatProps extends ComponentProps<"div"> {
  span?: TatamiSpan;
}

export interface TatamiGridProps extends ComponentProps<"div"> {
  columns?: number;
  gap?: number;
  children?: ReactNode;
}

interface Rect {
  item: number;
  r: number;
  c: number;
  w: number;
  h: number;
}

interface Layout {
  rows: number;
  mats: Rect[];
  floor: { r: number; c: number; w: number }[];
}

const EMPTY = -1;
const FLOOR = -2;
const LOOKAHEAD = 3;
const BUDGET = 6000;
const MIN_CELL = 104;

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const LAYOUT: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 32,
  mass: 0.9,
};

type Hint = ({ r: number; c: number; w: number; h: number } | undefined)[];

function search(spans: TatamiSpan[], cols: number, rows: number, blanks: number, hint: Hint): Layout | null {
  const total = rows * cols;
  const grid = new Int16Array(total).fill(EMPTY);
  const used = new Uint8Array(spans.length);
  const stack: Rect[] = [];
  let best: { score: number; mats: Rect[]; grid: Int16Array } | null = null;
  let budget = BUDGET;

  const corner = (pr: number, pc: number) => {
    if (pr <= 0 || pc <= 0 || pr >= rows || pc >= cols) return true;
    const a = grid[(pr - 1) * cols + pc - 1];
    const b = grid[(pr - 1) * cols + pc];
    const c = grid[pr * cols + pc - 1];
    const d = grid[pr * cols + pc];
    if (a === EMPTY || b === EMPTY || c === EMPTY || d === EMPTY) return true;
    return a === b || b === d || d === c || c === a;
  };
  const fits = (r: number, c: number, w: number, h: number) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (grid[y * cols + x] !== EMPTY) return false;
    return true;
  };
  const fill = (r: number, c: number, w: number, h: number, id: number) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y * cols + x] = id;
  };
  const valid = (r: number, c: number, w: number, h: number) => {
    for (let y = r; y <= r + h; y++) for (let x = c; x <= c + w; x++) if (!corner(y, x)) return false;
    return true;
  };

  const step = (from: number, left: number, blanksLeft: number, score: number): boolean => {
    if (--budget < 0) return true;
    if (best && score >= best.score) return false;
    let cell = from;
    while (cell < total && grid[cell] !== EMPTY) cell++;
    if (cell >= total) {
      if (left !== 0) return false;
      best = { score, mats: stack.slice(), grid: grid.slice() };
      return score === 0;
    }
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    let seen = 0;
    for (let item = 0; item < spans.length && seen < LOOKAHEAD; item++) {
      if (used[item]) continue;
      seen++;
      let late = 0;
      for (let k = item + 1; k < spans.length; k++) if (used[k]) late++;
      const was = hint[item];
      const shapes: [number, number][] =
        spans[item] === "half"
          ? [[1, 1]]
          : (was && was.r === r && was.c === c ? was.h > was.w : (r + c) % 2)
            ? [
                [1, 2],
                [2, 1],
              ]
            : [
                [2, 1],
                [1, 2],
              ];
      for (const [w, h] of shapes) {
        if (c + w > cols || r + h > rows || !fits(r, c, w, h)) continue;
        fill(r, c, w, h, item);
        if (valid(r, c, w, h)) {
          used[item] = 1;
          stack.push({ item, r, c, w, h });
          const moved = was && (was.r !== r || was.c !== c || was.w !== w || was.h !== h) ? 4 : 0;
          if (step(cell + 1, left - 1, blanksLeft, score + (seen - 1) * 3 + late * 3 + moved)) return true;
          stack.pop();
          used[item] = 0;
        }
        fill(r, c, w, h, EMPTY);
      }
    }
    if (blanksLeft > 0) {
      grid[cell] = FLOOR;
      if (valid(r, c, 1, 1) && step(cell + 1, left, blanksLeft - 1, score + (cell < total - blanks ? 10 : 0)))
        return true;
      grid[cell] = EMPTY;
    }
    return false;
  };

  step(0, spans.length, blanks, 0);
  const found = best as {
    score: number;
    mats: Rect[];
    grid: Int16Array;
  } | null;
  if (!found) return null;
  const floor: Layout["floor"] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (found.grid[r * cols + c] !== FLOOR) continue;
      const run = floor[floor.length - 1];
      if (run && run.r === r && run.c + run.w === c) run.w++;
      else floor.push({ r, c, w: 1 });
    }
  }
  return { rows, mats: found.mats.sort((a, b) => a.item - b.item), floor };
}

function layTatami(spans: TatamiSpan[], cols: number, hint: Hint): Layout {
  const area = spans.reduce((sum, s) => sum + (s === "full" ? 2 : 1), 0);
  const base = Math.max(1, Math.ceil(area / cols));
  for (let rows = base; rows < base + 16; rows++) {
    const found = search(spans, cols, rows, rows * cols - area, hint);
    if (found) return found;
  }
  const mats: Rect[] = [];
  let at = 0;
  spans.forEach((s, item) => {
    const h = s === "full" ? 2 : 1;
    mats.push({ item, r: at, c: 0, w: 1, h });
    at += h;
  });
  return { rows: Math.max(1, at), mats, floor: [] };
}

export function TatamiMat({ span = "full", className, ...props }: TatamiMatProps) {
  return <div {...props} data-span={span} className={cn("relative size-full min-h-0 min-w-0", className)} />;
}

function shapeOf(rect: Rect): TatamiShape {
  if (rect.w > rect.h) return "wide";
  if (rect.h > rect.w) return "tall";
  return "square";
}

export function TatamiGrid({ columns = 4, gap = 6, className, style, children, ...props }: TatamiGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const wanted = Math.max(1, Math.round(columns));
  const [fit, setFit] = useState(wanted);
  const cols = Math.min(wanted, fit);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const width = root.clientWidth - gap * 2;
      setFit(Math.max(1, Math.floor((width + gap) / (MIN_CELL + gap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [gap]);

  const items = Children.toArray(children).filter(isValidElement) as ReactElement<TatamiMatProps>[];
  const keys = items.map((child, i) => String(child.key ?? i));
  const spans = items.map((child): TatamiSpan => (child.props.span === "half" ? "half" : "full"));
  const signature = `${cols}|${keys.map((k, i) => `${k}:${spans[i]}`).join(",")}`;
  const [plan, setPlan] = useState<{
    signature: string;
    keys: string[];
    layout: Layout;
  } | null>(null);
  let layout = plan?.layout;
  if (!plan || plan.signature !== signature) {
    const before = new Map<string, Rect>();
    if (plan) plan.keys.forEach((k, i) => plan.layout.mats[i] && before.set(k, plan.layout.mats[i]));
    layout = layTatami(
      spans,
      cols,
      keys.map((k) => before.get(k)),
    );
    setPlan({ signature, keys, layout });
  }
  if (!layout) return null;

  const transition = reduced ? { duration: 0 } : LAYOUT;

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative",
        "[--miyuki-tatami-grid-heri:color-mix(in_oklab,var(--primary)_82%,var(--brand))]",
        "dark:[--miyuki-tatami-grid-heri:color-mix(in_oklab,var(--brand)_34%,var(--background))]",
        "[--miyuki-tatami-grid-mat:color-mix(in_oklab,var(--card)_93%,var(--success))]",
        "dark:[--miyuki-tatami-grid-mat:color-mix(in_oklab,var(--card)_90%,var(--success))]",
        className,
      )}
      style={style}
    >
      <motion.div
        layout={!reduced}
        transition={transition}
        className="rounded-2xl bg-muted ring-1 ring-border ring-inset"
        style={{ padding: gap, borderRadius: 18 }}
      >
        <div className="@container">
          <div
            className="grid"
            style={
              {
                gap,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridAutoRows: `calc((100cqw - ${(cols - 1) * gap}px) / ${cols})`,
              } as CSSProperties
            }
          >
            <LayoutGroup>
              <AnimatePresence mode="popLayout" initial={false}>
                {layout.floor.map((run) => (
                  <motion.div
                    key={`floor-${run.r}-${run.c}-${run.w}`}
                    aria-hidden="true"
                    layout={!reduced}
                    transition={transition}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: { duration: 0.2, delay: reduced ? 0 : 0.12 },
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="rounded-[3px] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(25%-1px),color-mix(in_oklab,var(--foreground)_9%,transparent)_calc(25%-1px),color-mix(in_oklab,var(--foreground)_9%,transparent)_25%)] ring-1 ring-border ring-inset"
                    style={{
                      gridColumn: `${run.c + 1} / span ${run.w}`,
                      gridRow: `${run.r + 1}`,
                    }}
                  />
                ))}
                {items.map((child, i) => {
                  const rect = layout.mats[i];
                  if (!rect) return null;
                  const shape = shapeOf(rect);
                  const across = shape === "tall";
                  return (
                    <motion.div
                      key={child.key ?? i}
                      layout={!reduced}
                      transition={transition}
                      data-shape={shape}
                      initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: reduced ? { duration: 0.15 } : SETTLE,
                      }}
                      exit={{
                        opacity: 0,
                        scale: reduced ? 1 : 0.94,
                        transition: { duration: 0.12 },
                      }}
                      className="group/tatami relative isolate min-h-0 min-w-0 overflow-clip rounded-[3px] bg-(--miyuki-tatami-grid-mat) shadow-xs"
                      style={{
                        gridColumn: `${rect.c + 1} / span ${rect.w}`,
                        gridRow: `${rect.r + 1} / span ${rect.h}`,
                      }}
                    >
                      <motion.span
                        aria-hidden="true"
                        layout={!reduced}
                        transition={transition}
                        className={cn(
                          "pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-45",
                          across
                            ? "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_3px,color-mix(in_oklab,var(--foreground)_5%,transparent)_3px,color-mix(in_oklab,var(--foreground)_5%,transparent)_4px)]"
                            : "bg-[repeating-linear-gradient(to_right,transparent_0,transparent_3px,color-mix(in_oklab,var(--foreground)_5%,transparent)_3px,color-mix(in_oklab,var(--foreground)_5%,transparent)_4px)]",
                        )}
                      />
                      <Heri key={across ? "left" : "top"} side={across ? "left" : "top"} reduced={reduced} />
                      <Heri key={across ? "right" : "bottom"} side={across ? "right" : "bottom"} reduced={reduced} />
                      <motion.div
                        layout={reduced ? false : "position"}
                        transition={transition}
                        className={cn("absolute", across ? "inset-y-2 inset-x-[13px]" : "inset-x-2 inset-y-[13px]")}
                      >
                        {child}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Heri({ side, reduced }: { side: "top" | "bottom" | "left" | "right"; reduced: boolean }) {
  const horizontal = side === "top" || side === "bottom";
  return (
    <motion.span
      aria-hidden="true"
      layout={!reduced}
      transition={reduced ? { duration: 0 } : LAYOUT}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18, delay: reduced ? 0 : 0.14 } }}
      className={cn(
        "pointer-events-none absolute bg-(--miyuki-tatami-grid-heri)",
        horizontal ? "inset-x-0 h-[5px]" : "inset-y-0 w-[5px]",
        side === "top" && "top-0",
        side === "bottom" && "bottom-0",
        side === "left" && "left-0",
        side === "right" && "right-0",
        side === "top" && "shadow-[inset_0_-1px_0_oklch(1_0_0/0.16)]",
        side === "bottom" && "shadow-[inset_0_1px_0_oklch(1_0_0/0.16)]",
        side === "left" && "shadow-[inset_-1px_0_0_oklch(1_0_0/0.16)]",
        side === "right" && "shadow-[inset_1px_0_0_oklch(1_0_0/0.16)]",
      )}
    />
  );
}
