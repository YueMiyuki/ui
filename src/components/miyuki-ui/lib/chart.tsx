"use client";

import { type ScaleBand, type ScaleLinear, type ScalePoint, scaleLinear } from "d3-scale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  isValidElement,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "@/components/miyuki-ui/button";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export function chartColor(index: number): string {
  return chartColors[((index % chartColors.length) + chartColors.length) % chartColors.length];
}

export const chartRamp = [
  "color-mix(in oklab, var(--foreground) 5%, var(--muted))",
  "color-mix(in oklab, var(--brand-strong) 25%, color-mix(in oklab, var(--foreground) 5%, var(--muted)))",
  "color-mix(in oklab, var(--brand-strong) 50%, color-mix(in oklab, var(--foreground) 5%, var(--muted)))",
  "color-mix(in oklab, var(--brand-strong) 75%, color-mix(in oklab, var(--foreground) 5%, var(--muted)))",
  "var(--brand-strong)",
] as const;

const formats = new Map<string, Intl.NumberFormat>();
function numberFormat(key: string, options: Intl.NumberFormatOptions) {
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat("en-US", options);
    formats.set(key, format);
  }
  return format;
}
const minus = (text: string) => text.replace("-", "−");

export function formatNumber(n: number, digits = 0): string {
  return minus(numberFormat(`n${digits}`, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n));
}

export function formatCompact(n: number): string {
  return minus(numberFormat("compact", { notation: "compact", maximumFractionDigits: 1 }).format(n));
}

export function formatPercent(
  n: number,
  { digits = 1, signed = false }: { digits?: number; signed?: boolean } = {},
): string {
  return minus(
    numberFormat(`p${digits}${signed ? "s" : ""}`, {
      style: "percent",
      maximumFractionDigits: digits,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(n),
  );
}

export function summarize(
  values: readonly number[],
  labels: readonly string[],
  format: (n: number) => string = (n) => formatNumber(n),
): string {
  if (values.length === 0) return "No data.";
  let hi = 0;
  let lo = 0;
  values.forEach((v, i) => {
    if (v > values[hi]) hi = i;
    if (v < values[lo]) lo = i;
  });
  const last = values.length - 1;
  return (
    `From ${format(values[0])} in ${labels[0]} to ${format(values[last])} in ${labels[last]}. ` +
    `Highest ${format(values[hi])} in ${labels[hi]}, lowest ${format(values[lo])} in ${labels[lo]}.`
  );
}

export const chartMotion = {
  reveal: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  fill: { type: "spring" as const, stiffness: 300, damping: 26 },
  settle: { type: "spring" as const, stiffness: 420, damping: 34 },
};

export function staggerDelay(index: number, count: number): number {
  if (count <= 1) return 0;
  return index * Math.min(0.04, 0.4 / (count - 1));
}

export function useChartSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export function useInViewOnce(
  ref: RefObject<Element | null>,
  { threshold = 0.3, rootMargin = "0px" }: { threshold?: number; rootMargin?: string } = {},
): boolean {
  const [seen, setSeen] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (seen || !el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, seen, threshold, rootMargin]);
  return seen;
}

export interface NearestIndexOptions {
  count: number;
  locate: (x: number, y: number) => number | null;
  columns?: number;
  focusIndex?: number;
}

export interface NearestIndex {
  active: number | null;
  setActive: (index: number | null) => void;
  bind: {
    tabIndex: number;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onFocus: (event: FocusEvent<HTMLElement>) => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
}

export function useNearestIndex({ count, locate, columns, focusIndex = 0 }: NearestIndexOptions): NearestIndex {
  const [raw, setActive] = useState<number | null>(null);
  const active = raw != null && count > 0 ? Math.min(raw, count - 1) : null;

  const fromPointer = (event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    const sy = rect.height > 0 ? el.offsetHeight / rect.height : 1;
    setActive(locate((event.clientX - rect.left) * sx, (event.clientY - rect.top) * sy));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (count === 0) return;
    const row = columns ?? 1;
    const page = Math.max(1, Math.round(count / 10));
    let next: number | null;
    switch (event.key) {
      case "ArrowRight":
        next = active == null ? 0 : active + 1;
        break;
      case "ArrowLeft":
        next = active == null ? count - 1 : active - 1;
        break;
      case "ArrowDown":
        next = active == null ? 0 : active + row;
        break;
      case "ArrowUp":
        next = active == null ? count - 1 : active - row;
        break;
      case "PageDown":
        next = active == null ? 0 : Math.min(count - 1, active + page);
        break;
      case "PageUp":
        next = active == null ? count - 1 : Math.max(0, active - page);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Escape":
        if (active == null) return;
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next != null && (next < 0 || next >= count)) return;
    setActive(next);
  };

  return {
    active,
    setActive,
    bind: {
      tabIndex: 0,
      onPointerMove: fromPointer,
      onPointerDown: fromPointer,
      onPointerLeave: (event) => {
        if (event.pointerType !== "touch") setActive(null);
      },
      onKeyDown,
      onFocus: (event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          setActive((current) => current ?? Math.max(0, Math.min(focusIndex, count - 1)));
        }
      },
      onBlur: () => setActive(null),
    },
  };
}

export function useChartId(prefix = "chart"): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export interface DeltaChipProps extends ComponentProps<"span"> {
  value: number;
  invert?: boolean;
  digits?: number;
}

export function DeltaChip({ value, invert = false, digits = 1, className, ...props }: DeltaChipProps) {
  const flat = Math.abs(value) < 0.5 * 10 ** -(digits + 2);
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span
      {...props}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full pr-1.5 pl-1 text-xs font-medium whitespace-nowrap tabular-nums",
        "transition-[background-color,color] duration-200 ease-settle",
        flat
          ? "bg-secondary pl-1.5 text-secondary-foreground"
          : good
            ? "bg-success-soft text-success-strong"
            : "bg-destructive-soft text-destructive-strong",
        className,
      )}
    >
      {!flat && (
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={cn(
            "size-3 shrink-0 transition-transform duration-200 ease-settle motion-reduce:transition-none",
            !up && "rotate-180",
          )}
        >
          <path
            d="M6 9.5V2.75M3.25 5.25 6 2.5l2.75 2.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="sr-only">{flat ? "No change" : up ? "Up" : "Down"} </span>
      {formatPercent(Math.abs(value), { digits })}
    </span>
  );
}

export interface ChartCardProps extends Omit<ComponentProps<"div">, "title"> {
  label?: ReactNode;
  value?: ReactNode;
  delta?: number;
  invertDelta?: boolean;
  caption?: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
}

export function ChartCard({
  label,
  value,
  delta,
  invertDelta,
  caption,
  note,
  action,
  footer,
  className,
  children,
  ...props
}: ChartCardProps) {
  const labelId = useId();
  const hasValueRow = value != null || delta != null || caption != null;
  const hasHeader = label != null || hasValueRow || note != null || action != null;
  return (
    <div
      role="group"
      aria-labelledby={label != null ? labelId : undefined}
      {...props}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {label != null && (
              <p id={labelId} className="text-[13px] leading-5 text-muted-foreground">
                {label}
              </p>
            )}
            {hasValueRow && (
              <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", label != null && "mt-0.5")}>
                {value != null && (
                  <p className="text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                    {value}
                  </p>
                )}
                {delta != null && <DeltaChip value={delta} invert={invertDelta} />}
                {caption != null && <span className="text-[13px] text-muted-foreground">{caption}</span>}
              </div>
            )}
            {note != null && <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">{note}</p>}
          </div>
          {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children != null && <div className={cn("min-w-0", hasHeader && "mt-5")}>{children}</div>}
      {footer != null && <div className="mt-4 min-w-0">{footer}</div>}
    </div>
  );
}

export type ChartMarkerShape = "dot" | "square" | "line" | "dashed";

export function ChartMarker({
  color,
  shape = "dot",
  className,
}: {
  color: string;
  shape?: ChartMarkerShape;
  className?: string;
}) {
  if (shape === "dashed") {
    return (
      <svg width="12" height="2" aria-hidden="true" className={cn("shrink-0 overflow-visible", className)}>
        <line
          x1="0"
          x2="12"
          y1="1"
          y2="1"
          strokeWidth="2"
          strokeDasharray="3 2.5"
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0",
        shape === "dot" && "size-2 rounded-full",
        shape === "square" && "size-2 rounded-[2px]",
        shape === "line" && "h-0.5 w-3 rounded-full",
        className,
      )}
      style={{ background: color }}
    />
  );
}

export interface ChartLegendItem {
  label: ReactNode;
  color: string;
  value?: ReactNode;
  marker?: ChartMarkerShape;
}

export interface ChartLegendProps extends ComponentProps<"ul"> {
  items: ChartLegendItem[];
}

export function ChartLegend({ items, className, ...props }: ChartLegendProps) {
  return (
    <ul {...props} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] leading-5", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex min-w-0 items-center gap-1.5">
          <ChartMarker color={item.color} shape={item.marker} />
          <span className="text-muted-foreground">{item.label}</span>
          {item.value != null && <span className="font-medium text-foreground tabular-nums">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export interface ChartTooltipItem {
  label: ReactNode;
  value: ReactNode;
  color?: string;
  marker?: ChartMarkerShape;
}

export interface ChartTooltipProps extends Omit<ComponentProps<"div">, "title"> {
  x: number;
  y: number;
  offset?: number;
  placement?: "side" | "top";
  title?: ReactNode;
  items?: ChartTooltipItem[];
  children?: ReactNode;
}

export function ChartTooltip({
  x,
  y,
  offset = 12,
  placement = "side",
  title,
  items,
  children,
  className,
  ...props
}: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const marked = items?.some((item) => item.color != null) ?? false;

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent;
    if (!el || !(parent instanceof HTMLElement)) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const W = parent.clientWidth;
    const H = parent.clientHeight;
    let left: number;
    let top: number;
    if (placement === "top") {
      left = x - w / 2;
      top = y - offset - h;
      if (top < 0 && y + offset + h <= H) top = y + offset;
    } else {
      top = y - h / 2;
      const right = x + offset;
      const leftSide = x - offset - w;
      left = right + w <= W ? right : leftSide >= 0 ? leftSide : W - x > x ? right : leftSide;
    }
    left = Math.max(0, Math.min(left, W - w));
    top = Math.max(0, Math.min(top, H - h));
    el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    if (!("placed" in el.dataset)) {
      requestAnimationFrame(() => {
        if (ref.current) ref.current.dataset.placed = "";
      });
    }
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      {...props}
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-10 will-change-transform",
        "data-[placed]:transition-transform data-[placed]:duration-200 data-[placed]:ease-settle motion-reduce:transition-none",
        className,
      )}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0.12 } : chartMotion.settle}
        className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs leading-[18px] whitespace-nowrap text-popover-foreground shadow-lg"
      >
        {title != null && <p className="text-muted-foreground">{title}</p>}
        {items && items.length > 0 && (
          <div
            className={cn(
              "grid items-center gap-x-2",
              marked ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[1fr_auto]",
              title != null && "mt-0.5",
            )}
          >
            {items.map((item, i) => (
              <div key={i} className="contents">
                {marked && (item.color ? <ChartMarker color={item.color} shape={item.marker} /> : <span />)}
                <span className="text-muted-foreground">{item.label}</span>
                <span className="pl-2 text-right font-medium text-foreground tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
}

export type PeriodButtonProps = Omit<ButtonProps, "variant" | "size" | "iconStart">;

export function PeriodButton({ children, ...props }: PeriodButtonProps) {
  return (
    <Button variant="secondary" size="sm" iconStart={<CalendarDays aria-hidden="true" />} {...props}>
      {children}
    </Button>
  );
}

export interface PeriodStepperProps extends ComponentProps<"div"> {
  children: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  labelClassName?: string;
}

export function PeriodStepper({
  children,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
  previousLabel = "Previous period",
  nextLabel = "Next period",
  labelClassName,
  className,
  ...props
}: PeriodStepperProps) {
  const button = "size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground";
  return (
    <div
      role="group"
      {...props}
      className={cn(
        "inline-flex h-8 items-center rounded-lg border border-border-strong bg-card p-px shadow-xs",
        className,
      )}
    >
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={previousLabel}
        onPress={onPrevious}
        isDisabled={isPreviousDisabled}
        className={button}
      >
        <ChevronLeft aria-hidden="true" />
      </IconButton>
      <span
        aria-live="polite"
        className={cn(
          "px-1 text-center text-[13px] font-medium whitespace-nowrap text-foreground tabular-nums",
          labelClassName,
        )}
      >
        {children}
      </span>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={nextLabel}
        onPress={onNext}
        isDisabled={isNextDisabled}
        className={button}
      >
        <ChevronRight aria-hidden="true" />
      </IconButton>
    </div>
  );
}

export interface ChartPlotProps extends ComponentProps<"div"> {
  summary: string;
  height: number;
}

export function ChartPlot({ summary, height, className, style, children, ...props }: ChartPlotProps) {
  return (
    <div
      role="img"
      aria-label={summary}
      tabIndex={0}
      {...props}
      className={cn(
        "relative touch-pan-y rounded-md outline-none select-none [-webkit-tap-highlight-color:transparent]",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card",
        className,
      )}
      style={{ height, ...style }}
    >
      {children}
    </div>
  );
}

export interface ChartTableProps {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
}

export function ChartTable({ caption, columns, rows }: ChartTableProps) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={i} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) =>
                c === 0 ? (
                  <th key={c} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={c}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AreaGradient({
  id,
  color,
  from = 0.28,
  to = 0,
}: {
  id: string;
  color: string;
  from?: number;
  to?: number;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style={{ stopColor: color, stopOpacity: from }} />
      <stop offset="0.55" style={{ stopColor: color, stopOpacity: to + (from - to) * 0.38 }} />
      <stop offset="1" style={{ stopColor: color, stopOpacity: to }} />
    </linearGradient>
  );
}

export function ActiveDot({
  cx,
  cy,
  color = chartColors[0],
  r = 4,
}: {
  cx: number;
  cy: number;
  color?: string;
  r?: number;
}) {
  return (
    <g
      aria-hidden="true"
      className="pointer-events-none transition-transform duration-200 ease-settle motion-reduce:transition-none"
      style={{ transform: `translate(${cx}px, ${cy}px)` }}
    >
      <circle r={r + 6} style={{ fill: color }} opacity={0.14} />
      <circle r={r + 1} strokeWidth={2.5} style={{ fill: color, stroke: "var(--background)" }} />
    </g>
  );
}

export interface TubeProps extends Omit<ComponentProps<"rect">, "x" | "width" | "y" | "height"> {
  x: number;
  width: number;
  top: number;
  bottom: number;
  radius?: number;
  active?: boolean;
}

export function Tube({ x, width, top, bottom, radius = 6, active = false, className, ...props }: TubeProps) {
  return (
    <rect
      aria-hidden="true"
      {...props}
      x={x}
      y={top}
      width={Math.max(0, width)}
      height={Math.max(0, bottom - top)}
      rx={Math.min(radius, width / 2)}
      className={cn("fill-muted transition-[fill] duration-150 ease-settle", active && "fill-accent", className)}
    />
  );
}

export interface TubeFillProps {
  x: number;
  width: number;
  bottom: number;
  level: number;
  color?: string;
  radius?: number;
  play?: boolean;
  delay?: number;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function TubeFill({
  x,
  width,
  bottom,
  level,
  color = chartColors[0],
  radius = 6,
  play = true,
  delay = 0,
  dim = false,
  className,
  style,
}: TubeFillProps) {
  const reduce = useReducedMotion();
  const height = play || reduce ? Math.max(0, bottom - level) : 0;
  return (
    <g aria-hidden="true" transform={`translate(${x} ${bottom}) scale(1 -1)`}>
      <motion.rect
        width={Math.max(0, width)}
        rx={Math.min(radius, width / 2)}
        initial={reduce ? false : { height: 0 }}
        animate={{ height }}
        transition={reduce ? { duration: 0 } : { ...chartMotion.fill, delay }}
        className={cn("transition-opacity duration-150 ease-settle", dim && "opacity-45", className)}
        style={{ fill: color, ...style }}
      />
    </g>
  );
}

const axisText = { fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;

export function crisp(value: number): number {
  return Math.round(value - 0.5) + 0.5;
}

export function textWidth(text: string, fontSize = 11): number {
  let em = 0;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") em += 0.57;
    else if (",.: '".includes(ch)) em += 0.27;
    else if (ch === "%") em += 0.8;
    else if ("mwMW".includes(ch)) em += 0.84;
    else if ("ijlft|".includes(ch)) em += 0.3;
    else if (ch >= "A" && ch <= "Z") em += 0.64;
    else if ("¥$€£".includes(ch)) em += 0.6;
    else em += 0.53;
  }
  return Math.ceil(em * fontSize);
}

export function closestIndex(positions: readonly number[], x: number): number {
  if (positions.length === 0) return -1;
  let lo = 0;
  let hi = positions.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (positions[mid] < x) lo = mid;
    else hi = mid;
  }
  return Math.abs(positions[lo] - x) <= Math.abs(positions[hi] - x) ? lo : hi;
}

export function yTicks(scale: ScaleLinear<number, number>, max = 5): number[] {
  for (let count = max; count >= 1; count--) {
    const ticks = scale.ticks(count);
    if (ticks.length <= max) return ticks;
  }
  return scale.domain();
}

export function niceScale(
  max: number,
  range: [number, number],
  { min = 0, maxTicks = 5 }: { min?: number; maxTicks?: number } = {},
): { scale: ScaleLinear<number, number>; ticks: number[] } {
  const top = max > min ? max : min + 1;
  for (let count = maxTicks - 1; count >= 1; count--) {
    const scale = scaleLinear().domain([min, top]).range(range).nice(count);
    const ticks = scale.ticks(count);
    if (ticks.length <= maxTicks) return { scale, ticks };
  }
  const scale = scaleLinear().domain([min, top]).range(range);
  return { scale, ticks: [min, top] };
}

export function axisWidth(ticks: readonly number[], format: (value: number) => string = formatCompact): number {
  return ticks.reduce((w, t) => Math.max(w, textWidth(format(t))), 0);
}

export function barPath(x: number, y: number, width: number, height: number, top = 6, bottom = 0): string {
  if (width <= 0 || height <= 0) return "";
  const rt = Math.max(0, Math.min(top, width / 2, height));
  const rb = Math.max(0, Math.min(bottom, width / 2, height - rt));
  return (
    `M${x},${y + rt}` +
    (rt ? `a${rt},${rt} 0 0 1 ${rt},${-rt}` : "") +
    `h${width - 2 * rt}` +
    (rt ? `a${rt},${rt} 0 0 1 ${rt},${rt}` : "") +
    `v${height - rt - rb}` +
    (rb ? `a${rb},${rb} 0 0 1 ${-rb},${rb}` : "") +
    `h${-(width - 2 * rb)}` +
    (rb ? `a${rb},${rb} 0 0 1 ${-rb},${-rb}` : "") +
    "Z"
  );
}

export interface GridLinesProps {
  scale: ScaleLinear<number, number>;
  width: number;
  ticks?: readonly number[];
  className?: string;
}

export function GridLines({ scale, width, ticks = yTicks(scale), className }: GridLinesProps) {
  return (
    <g aria-hidden="true" className={cn("stroke-border", className)} strokeDasharray="2 4" shapeRendering="crispEdges">
      {ticks.map((t) => {
        const y = crisp(scale(t));
        return <line key={t} x1={0} x2={width} y1={y} y2={y} />;
      })}
    </g>
  );
}

export interface AxisTitles {
  xLabel?: ReactNode;
  yLabel?: ReactNode;
  yRightLabel?: ReactNode;
}

export const axisTitleSpace = { bottom: 28, side: 24 } as const;

const TITLE_TOP = 28;
const TITLE_LINE = 14;

function hasTitle(node: ReactNode): boolean {
  return node != null && node !== false && node !== "";
}

export function axisTitleRoom({ xLabel, yLabel, yRightLabel }: AxisTitles): {
  bottom: number;
  left: number;
  right: number;
} {
  return {
    bottom: hasTitle(xLabel) ? axisTitleSpace.bottom : 0,
    left: hasTitle(yLabel) ? axisTitleSpace.side : 0,
    right: hasTitle(yRightLabel) ? axisTitleSpace.side : 0,
  };
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

export function withAxisTitles(summary: string, { xLabel, yLabel, yRightLabel }: AxisTitles): string {
  const x = nodeText(xLabel).trim();
  const y = nodeText(yLabel).trim();
  const right = nodeText(yRightLabel).trim();
  const parts = [
    x && `Horizontal axis: ${x}.`,
    y && `${right ? "Left axis" : "Vertical axis"}: ${y}.`,
    right && `Right axis: ${right}.`,
  ].filter(Boolean);
  return parts.length > 0 ? `${summary} ${parts.join(" ")}` : summary;
}

export interface AxisTitleProps {
  side: "bottom" | "left" | "right";
  x: number;
  y: number;
  length: number;
  children?: ReactNode;
}

export function AxisTitle({ side, x, y, length, children }: AxisTitleProps) {
  if (!hasTitle(children) || length <= 0) return null;
  const transform =
    side === "bottom"
      ? `translate(${x} ${y + TITLE_TOP})`
      : side === "left"
        ? `translate(${x} ${y + length}) rotate(-90)`
        : `translate(${x} ${y}) rotate(90)`;
  return (
    <g aria-hidden="true" transform={transform}>
      <foreignObject width={length} height={TITLE_LINE}>
        <div className="truncate text-center text-[11px] leading-[14px] font-medium text-muted-foreground">
          {children}
        </div>
      </foreignObject>
    </g>
  );
}

export interface AxisYProps {
  scale: ScaleLinear<number, number>;
  ticks?: readonly number[];
  format?: (value: number) => string;
  gap?: number;
  label?: ReactNode;
  className?: string;
}

export function AxisLeft({
  scale,
  ticks = yTicks(scale),
  format = formatCompact,
  gap = 10,
  label,
  className,
}: AxisYProps) {
  const [r0, r1] = scale.range();
  return (
    <>
      <g aria-hidden="true" className={cn("fill-muted-foreground", className)} style={axisText} textAnchor="end">
        {ticks.map((t) => (
          <text key={t} x={-gap} y={scale(t)} dy="0.34em">
            {format(t)}
          </text>
        ))}
      </g>
      <AxisTitle
        side="left"
        x={-(gap + axisWidth(ticks, format) + axisTitleSpace.side)}
        y={Math.min(r0, r1)}
        length={Math.abs(r1 - r0)}
      >
        {label}
      </AxisTitle>
    </>
  );
}

export function AxisRight({
  scale,
  width,
  ticks = yTicks(scale),
  format = formatCompact,
  gap = 10,
  label,
  className,
}: AxisYProps & { width: number }) {
  const [r0, r1] = scale.range();
  return (
    <>
      <g aria-hidden="true" className={cn("fill-muted-foreground", className)} style={axisText} textAnchor="start">
        {ticks.map((t) => (
          <text key={t} x={width + gap} y={scale(t)} dy="0.34em">
            {format(t)}
          </text>
        ))}
      </g>
      <AxisTitle
        side="right"
        x={width + gap + axisWidth(ticks, format) + axisTitleSpace.side}
        y={Math.min(r0, r1)}
        length={Math.abs(r1 - r0)}
      >
        {label}
      </AxisTitle>
    </>
  );
}

export interface AxisBottomProps {
  scale: ScaleBand<string> | ScalePoint<string> | ScaleLinear<number, number>;
  y: number;
  width: number;
  ticks?: readonly number[];
  format?: (value: string | number, index: number) => string;
  overflow?: [left: number, right: number];
  minGap?: number;
  emphasis?: number;
  label?: ReactNode;
  className?: string;
}

export function AxisBottom({
  scale,
  y,
  width,
  ticks,
  format = (value) => String(value),
  overflow = [0, 0],
  minGap = 6,
  emphasis,
  label,
  className,
}: AxisBottomProps) {
  let entries: { key: string; x: number; text: string; index: number }[];
  let anchorLast = true;
  if ("bandwidth" in scale) {
    const half = scale.bandwidth() / 2;
    entries = scale.domain().map((d, i) => ({ key: d, x: (scale(d) ?? 0) + half, text: format(d, i), index: i }));
  } else {
    anchorLast = false;
    entries = (ticks ?? yTicks(scale, 6)).map((t, i) => ({
      key: String(t),
      x: scale(t),
      text: format(t, i),
      index: i,
    }));
  }
  const n = entries.length;
  const step = n > 1 ? Math.abs(entries[1].x - entries[0].x) : Infinity;
  const widest = entries.reduce((w, e) => Math.max(w, textWidth(e.text)), 0);
  const stride = Math.max(1, Math.ceil((widest + minGap) / step));
  const placed = entries.map((e) => {
    const half = textWidth(e.text) / 2;
    return { ...e, half, x: Math.max(-overflow[0] + half, Math.min(width + overflow[1] - half, e.x)) };
  });
  const shown: typeof placed = [];
  const fits = (c: (typeof placed)[number]) => shown.every((p) => Math.abs(c.x - p.x) >= c.half + p.half + minGap);
  const active = emphasis != null ? placed[emphasis] : undefined;
  if (active) shown.push(active);
  for (const c of anchorLast ? [...placed].reverse() : placed) {
    if (c === active) continue;
    const keep = anchorLast ? (n - 1 - c.index) % stride === 0 : c.index % stride === 0;
    if (keep && fits(c)) shown.push(c);
  }
  return (
    <>
      <g aria-hidden="true" className={cn("fill-muted-foreground", className)} style={axisText} textAnchor="middle">
        {shown.map((e) => (
          <text
            key={e.key}
            x={e.x}
            y={y + 17}
            className={e.index === emphasis ? "fill-foreground font-medium" : undefined}
          >
            {e.text}
          </text>
        ))}
      </g>
      <AxisTitle side="bottom" x={0} y={y} length={width}>
        {label}
      </AxisTitle>
    </>
  );
}

export function Crosshair({
  x,
  top = 0,
  bottom,
  className,
}: {
  x: number;
  top?: number;
  bottom: number;
  className?: string;
}) {
  return (
    <line
      aria-hidden="true"
      x1={0}
      x2={0}
      y1={top}
      y2={bottom}
      strokeWidth={1}
      className={cn(
        "pointer-events-none stroke-foreground/20 transition-transform duration-200 ease-settle motion-reduce:transition-none",
        className,
      )}
      style={{ transform: `translateX(${crisp(x)}px)` }}
    />
  );
}

export interface RevealMaskProps {
  id: string;
  width: number;
  height: number;
  play: boolean;
  pad?: number;
}

const FEATHER = 40;

export function RevealMask({ id, width, height, play, pad = 12 }: RevealMaskProps) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const full = width + pad * 2;
  const open = done || reduce;
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={full} height={height + pad * 2}>
      {open ? (
        <rect x={-pad} y={-pad} width={full} height={height + pad * 2} fill="white" />
      ) : (
        <>
          <linearGradient id={`${id}-edge`}>
            <stop offset={full / (full + FEATHER)} stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <motion.g
            initial={{ x: 0 }}
            animate={{ x: play ? full + FEATHER : 0 }}
            transition={chartMotion.reveal}
            onAnimationComplete={(definition) => {
              const target = (definition as { x?: unknown }).x;
              if (typeof target === "number" && target > 0) setDone(true);
            }}
          >
            <rect
              x={-pad - full - FEATHER}
              y={-pad}
              width={full + FEATHER}
              height={height + pad * 2}
              fill={`url(#${id}-edge)`}
            />
          </motion.g>
        </>
      )}
    </mask>
  );
}
