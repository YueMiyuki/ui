"use client";

import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartRamp,
  formatNumber,
  textWidth,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { cn } from "@/lib/utils";

export type YearGridGrouping = "weekly" | "monthly" | "yearly";

export interface YearGridProps extends Omit<ChartCardProps, "children"> {
  year: number;
  data: number[];
  grouping?: YearGridGrouping;
  defaultGrouping?: YearGridGrouping;
  onGroupingChange?: (grouping: YearGridGrouping) => void;
  controls?: boolean;
  name?: string;
  colors?: readonly string[];
  thresholds?: number[];
  format?: (value: number) => string;
  stats?: boolean;
  legend?: boolean;
  summary?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const GROUPINGS: { id: YearGridGrouping; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const BASE = 10;
const LABEL_ROW = 18;
const EASE = "var(--ease-settle, cubic-bezier(0.22, 1, 0.36, 1))";
const axisText = { fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;

interface Day {
  month: number;
  date: number;
  dow: number;
}

interface Label {
  key: string;
  text: string;
  x: number;
  y: number;
  shown: boolean;
}

interface Layout {
  cell: number;
  gap: number;
  height: number;
  pos: { x: number; y: number }[];
  labels: Label[];
}

function monthLengths(year: number): number[] {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
}

function weekday(year: number, month: number, date: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 2 ? year - 1 : year;
  const sunday = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month] + date) % 7;
  return (sunday + 6) % 7;
}

function calendar(year: number): { days: Day[]; starts: number[] } {
  const lengths = monthLengths(year);
  const days: Day[] = [];
  const starts: number[] = [];
  lengths.forEach((length, month) => {
    starts.push(days.length);
    const first = weekday(year, month, 1);
    for (let date = 1; date <= length; date++) days.push({ month, date, dow: (first + date - 1) % 7 });
  });
  return { days, starts };
}

function gapFor(pitch: number): number {
  return Math.max(1, Math.min(3, Math.round(pitch * 0.2)));
}

function fit(span: number, count: number, cap: number): { pitch: number; gap: number } {
  let pitch = Math.min(cap, span / count);
  const gap = gapFor(pitch);
  pitch = Math.min(cap, (span + gap) / count);
  return { pitch, gap: gapFor(pitch) };
}

function weeklyLayout(days: Day[], starts: number[], width: number): Layout {
  const offset = days[0]?.dow ?? 0;
  const cols = Math.ceil((days.length + offset) / 7);
  const left = width >= 360 ? textWidth("Wed") + 8 : 0;
  const { pitch, gap } = fit(width - left, cols, 18);
  const cell = pitch - gap;
  const colOf = (i: number) => Math.floor((i + offset) / 7);
  const pos = days.map((_, i) => ({ x: left + colOf(i) * pitch, y: LABEL_ROW + ((i + offset) % 7) * pitch }));
  let edge = -Infinity;
  const labels: Label[] = starts.map((start, m) => {
    const col = m === 0 || days[start].dow === 0 ? colOf(start) : colOf(start) + 1;
    const x = left + col * pitch;
    const shown = x >= edge && x + textWidth(MONTHS[m]) <= width + 2;
    if (shown) edge = x + textWidth(MONTHS[m]) + 6;
    return { key: `m${m}`, text: MONTHS[m], x, y: 11, shown };
  });
  [0, 2, 4].forEach((row) =>
    labels.push({
      key: `w${row}`,
      text: WEEKDAYS[row],
      x: 0,
      y: LABEL_ROW + row * pitch + cell / 2 + 4,
      shown: left > 0,
    }),
  );
  return { cell, gap, height: LABEL_ROW + 7 * pitch - gap, pos, labels };
}

function monthlyLayout(days: Day[], starts: number[], width: number): Layout {
  const ratio = 1.6;
  let across = 2;
  for (const option of [6, 4, 3]) {
    if (width / (7 * option + ratio * (option - 1)) >= 9) {
      across = option;
      break;
    }
  }
  const pitch = Math.min(18, width / (7 * across + ratio * (across - 1)));
  const gap = gapFor(pitch);
  const cell = pitch - gap;
  const blockW = 7 * pitch + ratio * pitch;
  const rowGap = 14;
  const blockH = LABEL_ROW + 6 * pitch - gap + rowGap;
  const blockRows = Math.ceil(12 / across);
  const origin = (m: number) => ({ x: (m % across) * blockW, y: Math.floor(m / across) * blockH });
  const pos = days.map((d) => {
    const o = origin(d.month);
    const first = days[starts[d.month]].dow;
    return { x: o.x + d.dow * pitch, y: o.y + LABEL_ROW + Math.floor((d.date - 1 + first) / 7) * pitch };
  });
  const labels: Label[] = MONTHS.map((text, m) => ({
    key: `m${m}`,
    text,
    x: origin(m).x,
    y: origin(m).y + 11,
    shown: true,
  }));
  return { cell, gap, height: blockRows * blockH - rowGap, pos, labels };
}

function yearlyLayout(days: Day[], width: number): Layout {
  const left = MONTHS.reduce((w, m) => Math.max(w, textWidth(m)), 0) + 10;
  const { pitch, gap } = fit(width - left, 31, 20);
  const cell = pitch - gap;
  const pos = days.map((d) => ({ x: left + (d.date - 1) * pitch, y: LABEL_ROW + d.month * pitch }));
  const every = Math.ceil(13 / pitch);
  const labels: Label[] = MONTHS.map((text, m) => ({
    key: `m${m}`,
    text,
    x: 0,
    y: LABEL_ROW + m * pitch + cell / 2 + 4,
    shown: m % every === 0,
  }));
  const step = pitch * 5 >= 24 ? 5 : 10;
  for (let date = 1; date <= 31; date += date === 1 ? step - 1 : step) {
    const text = String(date);
    labels.push({
      key: `d${date}`,
      text,
      x: left + (date - 1) * pitch + cell / 2 - textWidth(text) / 2,
      y: 11,
      shown: true,
    });
  }
  return { cell, gap, height: LABEL_ROW + 12 * pitch - gap, pos, labels };
}

function defaultBounds(sorted: number[], count: number): number[] {
  const bounds: number[] = [];
  for (let k = 0; k < count; k++) {
    const q = sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.floor(((k + 1) / (count + 1)) * sorted.length))]
      : 0;
    bounds.push(Math.max(q, (bounds[k - 1] ?? 1) + 1));
  }
  return bounds;
}

function longestRun(values: number[]): { length: number; end: number } {
  let best = { length: 0, end: -1 };
  let run = 0;
  values.forEach((v, i) => {
    run = v > 0 ? run + 1 : 0;
    if (run > best.length) best = { length: run, end: i };
  });
  return best;
}

export function YearGrid({
  year,
  data,
  grouping: groupingProp,
  defaultGrouping = "weekly",
  onGroupingChange,
  controls = true,
  name,
  colors = chartRamp,
  thresholds,
  format = (v) => formatNumber(v),
  stats = true,
  legend = true,
  summary,
  action,
  footer,
  label,
  ...props
}: YearGridProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef, { threshold: 0.2 });
  const reduce = useReducedMotion();
  const play = inView || !!reduce;
  const [ownGrouping, setOwnGrouping] = useState(defaultGrouping);
  const grouping = groupingProp ?? ownGrouping;
  const [smooth, setSmooth] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (width <= 0 || smooth) return;
    const frame = requestAnimationFrame(() => setSmooth(true));
    return () => cancelAnimationFrame(frame);
  }, [width, smooth]);

  useEffect(() => {
    if (!play || entered) return;
    const timer = setTimeout(() => setEntered(true), 900);
    return () => clearTimeout(timer);
  }, [play, entered]);

  const seriesName = name ?? (typeof label === "string" ? label : "Count");
  const { days, starts } = useMemo(() => calendar(year), [year]);
  const n = days.length;
  const values = days.map((_, i) => Math.max(0, data[i] ?? 0));
  const last = Math.min(data.length, n) - 1;

  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const bounds = thresholds ?? defaultBounds(sorted, colors.length - 2);
  const levelOf = (v: number) => {
    if (v <= 0) return 0;
    let level = 1;
    for (const t of bounds) if (v >= t) level++;
    return Math.min(colors.length - 1, level);
  };

  const layout = useMemo(() => {
    if (width <= 0) return null;
    if (grouping === "monthly") return monthlyLayout(days, starts, width);
    if (grouping === "yearly") return yearlyLayout(days, width);
    return weeklyLayout(days, starts, width);
  }, [grouping, width, days, starts]);

  const { active, setActive, bind } = useNearestIndex({
    count: n,
    focusIndex: Math.max(0, last),
    locate: (px, py) => {
      if (!layout) return null;
      const { pos, cell, gap } = layout;
      const half = gap / 2;
      for (let i = 0; i < pos.length; i++) {
        const p = pos[i];
        if (px >= p.x - half && px < p.x + cell + half && py >= p.y - half && py < p.y + cell + half) return i;
      }
      return null;
    },
  });

  const move = (key: string, from: number): number | null => {
    const d = days[from];
    switch (key) {
      case "ArrowLeft":
        return from - (grouping === "weekly" ? 7 : 1);
      case "ArrowRight":
        return from + (grouping === "weekly" ? 7 : 1);
      case "ArrowUp":
      case "ArrowDown": {
        const dir = key === "ArrowUp" ? -1 : 1;
        if (grouping === "weekly") return from + dir;
        if (grouping === "monthly") return from + dir * 7;
        const month = d.month + dir;
        if (month < 0 || month > 11) return null;
        return starts[month] + Math.min(d.date, monthLengths(year)[month]) - 1;
      }
      case "Home":
        return 0;
      case "End":
        return n - 1;
      default:
        return null;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      bind.onKeyDown(event);
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (active == null) {
      setActive(Math.max(0, last));
      return;
    }
    const next = move(event.key, active);
    if (next != null && next >= 0 && next < n) setActive(next);
  };

  const changeGrouping = (next: YearGridGrouping) => {
    if (groupingProp == null) setOwnGrouping(next);
    onGroupingChange?.(next);
  };

  const total = values.reduce((a, b) => a + b, 0);
  const activeDays = values.filter((v) => v > 0).length;
  const peak = values.indexOf(Math.max(...values));
  const longest = longestRun(values);
  let current = 0;
  for (let i = last; i >= 0 && values[i] > 0; i--) current++;
  const short = (i: number) => (i >= 0 && i < n ? `${days[i].date} ${MONTHS[days[i].month]}` : "");
  const long = (i: number) => `${WEEKDAY_NAMES[days[i].dow]} ${days[i].date} ${MONTH_NAMES[days[i].month]} ${year}`;
  const plural = (k: number) => `${formatNumber(k)} ${k === 1 ? "day" : "days"}`;

  const monthTotals = starts.map((s, m) => values.slice(s, starts[m + 1] ?? n).reduce((a, b) => a + b, 0));
  const busiest = monthTotals.indexOf(Math.max(...monthTotals));
  const description =
    summary ??
    `${seriesName} in ${year}: ${format(total)} in all, on ${activeDays} of ${n} days. ` +
      `Busiest month ${MONTH_NAMES[busiest]} with ${format(monthTotals[busiest])}. ` +
      `Peak ${format(values[peak] ?? 0)} on ${long(peak)}. Longest streak ${plural(longest.length)}.`;

  const tiles = [
    { label: "Total", value: format(total), note: `${plural(activeDays)} active` },
    {
      label: "Peak day",
      value: format(values[peak] ?? 0),
      note: `${days[peak].date} ${MONTH_NAMES[days[peak].month]}`,
    },
    {
      label: "Longest streak",
      value: plural(longest.length),
      note: longest.length > 0 ? `${short(longest.end - longest.length + 1)} – ${short(longest.end)}` : "No streak yet",
    },
    {
      label: "Current streak",
      value: plural(current),
      note: current > 0 ? `Since ${short(last - current + 1)}` : "None running",
    },
  ];

  const control = controls ? (
    <SegmentedControl
      size="sm"
      aria-label="Group days"
      selectedKeys={[grouping]}
      onSelectionChange={(keys) => {
        const [key] = keys;
        if (key) changeGrouping(key as YearGridGrouping);
      }}
    >
      {GROUPINGS.map((g) => (
        <Segment key={g.id} id={g.id}>
          {g.label}
        </Segment>
      ))}
    </SegmentedControl>
  ) : undefined;

  const legendRow = legend ? (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        1 Jan – {short(Math.max(0, last))} {year}
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        Less
        <span className="flex gap-[3px]">
          {colors.map((color, k) => (
            <span key={k} className="size-2.5 rounded-[3px]" style={{ background: color }} />
          ))}
        </span>
        More
      </span>
    </div>
  ) : undefined;

  const height = layout?.height ?? 120;
  const travel = reduce ? "none" : `transform 320ms ${EASE}, opacity 240ms ${EASE}, fill 200ms ${EASE}`;
  const spread = entered ? 0.1 : 0.4;
  const cells = layout
    ? values.map((v, i) => {
        const p = layout.pos[i];
        const k = play ? layout.cell / BASE : (layout.cell * 0.4) / BASE;
        const shift = play ? 0 : layout.cell * 0.3;
        return (
          <rect
            key={i}
            width={BASE}
            height={BASE}
            rx={2.4}
            style={{
              fill: colors[levelOf(v)],
              opacity: play ? 1 : 0,
              transform: `translate(${p.x + shift}px, ${p.y + shift}px) scale(${k})`,
              transition: travel,
              transitionDelay: reduce ? undefined : `${((i / Math.max(1, n - 1)) * spread).toFixed(3)}s`,
            }}
          />
        );
      })
    : null;

  const activeCell = active != null && layout ? layout.pos[active] : null;
  const activeMonth = active != null ? days[active].month : null;

  return (
    <ChartCard label={label} {...props} action={action ?? control} footer={footer ?? legendRow}>
      <style href="miyuki-year-grid" precedence="miyuki">{`
        @keyframes miyuki-year-grid-in { from { opacity: 0; } }
      `}</style>
      {stats && (
        <div className="@container mb-5">
          <dl className="grid grid-cols-2 gap-2 @md:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="min-w-0 rounded-lg bg-muted px-3 py-2">
                <dt className="truncate text-xs leading-4 text-muted-foreground">{tile.label}</dt>
                <dd className="mt-1 truncate text-[15px] leading-5 font-semibold text-foreground tabular-nums">
                  {tile.value}
                </dd>
                <dd className="truncate text-xs leading-4 text-muted-foreground tabular-nums">{tile.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <ChartPlot
        ref={plotRef}
        summary={description}
        height={height}
        className={cn(smooth && "transition-[height] duration-300 ease-settle motion-reduce:transition-none")}
        {...bind}
        onKeyDown={onKeyDown}
      >
        {layout && (
          <svg width={width} height={height} className="block overflow-visible">
            <g aria-hidden="true" className="fill-muted-foreground" style={axisText}>
              {layout.labels.map((l) => (
                <text
                  key={l.key}
                  className={cn(
                    "motion-safe:animate-[miyuki-year-grid-in_320ms_ease-out_both]",
                    l.key === `m${activeMonth}` && "fill-foreground font-medium",
                  )}
                  style={{
                    transform: `translate(${l.x}px, ${l.y}px)`,
                    opacity: l.shown && play ? 1 : 0,
                    transition: reduce ? "none" : `transform 320ms ${EASE}, opacity 200ms ${EASE}`,
                    transitionDelay:
                      !entered && l.key[0] === "m"
                        ? `${((starts[Number(l.key.slice(1))] / n) * spread).toFixed(3)}s`
                        : undefined,
                  }}
                >
                  {l.text}
                </text>
              ))}
            </g>
            <g aria-hidden="true">{cells}</g>
            {activeCell && (
              <rect
                aria-hidden="true"
                width={layout.cell + 3}
                height={layout.cell + 3}
                rx={(2.4 * layout.cell) / BASE + 1.5}
                fill="none"
                strokeWidth={1.5}
                className="pointer-events-none stroke-foreground transition-transform duration-150 ease-settle motion-reduce:transition-none"
                style={{ transform: `translate(${activeCell.x - 1.5}px, ${activeCell.y - 1.5}px)` }}
              />
            )}
          </svg>
        )}
        {layout && activeCell && active != null && (
          <ChartTooltip
            x={activeCell.x + layout.cell / 2}
            y={activeCell.y + layout.cell / 2}
            offset={layout.cell / 2 + 8}
            placement="top"
            title={long(active)}
            items={[
              {
                label: seriesName,
                value: format(values[active]),
                color: colors[levelOf(values[active])],
                marker: "square",
              },
            ]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : seriesName}
        columns={["Month", seriesName, "Active days", "Peak day"]}
        rows={MONTH_NAMES.map((m, k) => {
          const slice = values.slice(starts[k], starts[k + 1] ?? n);
          const top = slice.indexOf(Math.max(...slice));
          return [
            m,
            format(monthTotals[k]),
            String(slice.filter((v) => v > 0).length),
            `${short(starts[k] + top)}, ${format(slice[top] ?? 0)}`,
          ];
        })}
      />
    </ChartCard>
  );
}
