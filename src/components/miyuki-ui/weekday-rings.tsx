"use client";

import { scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { type PointerEvent, useRef, useState } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartLegend,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColors,
  chartMotion,
  crisp,
  formatNumber,
  formatPercent,
  staggerDelay,
  Tube,
  TubeFill,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface WeekdayRingsProps extends Omit<ChartCardProps, "children"> {
  data: number[];
  goal: number;
  firstWeekday?: number;
  month?: string;
  weekdays?: string[];
  weekdayNames?: string[];
  name?: string;
  color?: string;
  format?: (value: number) => string;
  legend?: boolean;
  summary?: string;
}

const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BARS = 76;
const AXIS = 26;
const GOAL = "var(--foreground)";

function DayRing({
  x,
  y,
  size,
  stroke,
  share,
  color,
  play,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  stroke: number;
  share: number;
  color: string;
  play: boolean;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const on = play || !!reduce;
  const r = size / 2 - stroke / 2;
  return (
    <g transform={`rotate(-90 ${x} ${y})`} fill="none" strokeWidth={stroke}>
      <circle cx={x} cy={y} r={r} className="stroke-muted" />
      <motion.circle
        cx={x}
        cy={y}
        r={r}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: on ? share : 0, opacity: on && share > 0.005 ? 1 : 0 }}
        transition={
          reduce ? { duration: 0 } : { pathLength: { ...chartMotion.fill, delay }, opacity: { duration: 0.1, delay } }
        }
        style={{ stroke: color }}
      />
    </g>
  );
}

export function WeekdayRings({
  data,
  goal,
  firstWeekday = 0,
  month,
  weekdays = SHORT,
  weekdayNames = LONG,
  name = "Steps",
  color = chartColors[0],
  format = (v) => formatNumber(v),
  legend = true,
  summary,
  footer,
  label,
  ...props
}: WeekdayRingsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const [day, setDay] = useState<number | null>(null);

  const start = ((firstWeekday % 7) + 7) % 7;
  const rows = Math.ceil((start + data.length) / 7);
  const col = (width || 400) / 7;
  const size = Math.max(20, Math.min(34, col - 12));
  const stroke = size >= 30 ? 4 : 3.5;
  const pitch = size + 8;
  const gridH = rows * pitch - 8;
  const barsTop = gridH + 18;
  const barsBottom = barsTop + BARS;
  const height = barsBottom + AXIS;
  const centers = weekdays.map((_, i) => col * i + col / 2);
  const cells = data.map((value, i) => {
    const k = start + i;
    return { value, weekday: k % 7, x: centers[k % 7], y: Math.floor(k / 7) * pitch + size / 2 };
  });

  const totals = weekdays.map(() => ({ sum: 0, count: 0, reached: 0, best: -1 }));
  cells.forEach((c, i) => {
    const t = totals[c.weekday];
    t.sum += c.value;
    t.count += 1;
    if (c.value >= goal) t.reached += 1;
    if (t.best < 0 || c.value > data[t.best]) t.best = i;
  });
  const averages = totals.map((t) => (t.count ? t.sum / t.count : 0));
  const busiest = averages.indexOf(Math.max(...averages));
  const y = scaleLinear()
    .domain([0, Math.max(goal, ...averages) * 1.12])
    .range([barsBottom, barsTop]);
  const tube = Math.min(col * 0.46, 26);
  const goalY = crisp(y(goal));

  const { active, bind } = useNearestIndex({
    count: 7,
    focusIndex: busiest,
    locate: (px) => (width > 0 && px >= 0 && px <= width ? Math.min(6, Math.floor(px / col)) : null),
  });

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    bind.onPointerMove(event);
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (rect.width > 0 ? el.offsetWidth / rect.width : 1);
    const py = (event.clientY - rect.top) * (rect.height > 0 ? el.offsetHeight / rect.height : 1);
    const hit = cells.findIndex((c) => Math.hypot(c.x - px, c.y - py) <= size / 2 + 4);
    setDay(hit >= 0 ? hit : null);
  };

  const shownDay = day != null && active === cells[day].weekday ? day : null;
  const total = data.reduce((a, b) => a + b, 0);
  const of = month ? ` in ${month}` : "";
  const description =
    summary ??
    `${name} per day${of}, ${format(total)} in all over ${data.length} days, against a daily goal of ${format(goal)}. ` +
      `${cells.filter((c) => c.value >= goal).length} days reach it. ` +
      `Most active on ${weekdayNames[busiest]}s, averaging ${format(Math.round(averages[busiest]))}.`;

  return (
    <ChartCard
      label={label}
      {...props}
      footer={
        footer ??
        (legend ? (
          <ChartLegend
            items={[
              { label: "Share of goal", color, marker: "dot" },
              { label: "Weekday average", color, marker: "square" },
              { label: `Goal ${format(goal)}`, color: GOAL, marker: "line" },
            ]}
          />
        ) : undefined)
      }
    >
      <div ref={plotRef} className="min-w-0">
        <ChartPlot
          summary={description}
          height={height}
          {...bind}
          onPointerMove={onPointerMove}
          onPointerLeave={(event) => {
            bind.onPointerLeave(event);
            setDay(null);
          }}
        >
          {width > 0 && (
            <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
              {active != null && (
                <rect
                  x={0}
                  y={-4}
                  width={col - 2}
                  height={height + 2}
                  rx={10}
                  className="fill-accent transition-transform duration-200 ease-settle motion-reduce:transition-none"
                  style={{ transform: `translateX(${centers[active] - col / 2 + 1}px)` }}
                />
              )}
              {centers.map((cx, i) => (
                <Tube key={i} x={cx - tube / 2} width={tube} top={barsTop} bottom={barsBottom} />
              ))}
              {cells.map((c, i) => (
                <g
                  key={i}
                  className={cn(
                    "transition-opacity duration-200 ease-settle",
                    active != null && active !== c.weekday && "opacity-30",
                  )}
                >
                  <DayRing
                    x={c.x}
                    y={c.y}
                    size={size}
                    stroke={stroke}
                    share={Math.min(1, Math.max(0, c.value / goal))}
                    color={color}
                    play={inView}
                    delay={staggerDelay(i, cells.length) * 1.5}
                  />
                  {size >= 26 && (
                    <text
                      x={c.x}
                      y={c.y}
                      dy="0.35em"
                      textAnchor="middle"
                      style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                      className={c.value >= goal ? "fill-foreground font-medium" : "fill-muted-foreground"}
                    >
                      {i + 1}
                    </text>
                  )}
                  {shownDay === i && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={size / 2 + 2.5}
                      fill="none"
                      strokeWidth={1.5}
                      className="stroke-foreground/40"
                    />
                  )}
                </g>
              ))}
              {centers.map((cx, i) => (
                <g
                  key={i}
                  className={cn(
                    "transition-opacity duration-200 ease-settle",
                    active != null && active !== i && "opacity-30",
                  )}
                >
                  <TubeFill
                    x={cx - tube / 2}
                    width={tube}
                    bottom={barsBottom}
                    level={y(averages[i])}
                    color={color}
                    play={inView}
                    delay={0.2 + staggerDelay(i, 7)}
                  />
                  <line
                    x1={cx - tube / 2 - 3}
                    x2={cx + tube / 2 + 3}
                    y1={goalY}
                    y2={goalY}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    opacity={0.7}
                    style={{ stroke: GOAL }}
                  />
                </g>
              ))}
              <g style={{ fontSize: 11 }} textAnchor="middle">
                {centers.map((cx, i) => (
                  <text
                    key={i}
                    x={cx}
                    y={barsBottom + 17}
                    className={cn(
                      "transition-[fill] duration-150",
                      (active ?? busiest) === i ? "fill-foreground font-medium" : "fill-muted-foreground",
                    )}
                  >
                    {weekdays[i]}
                  </text>
                ))}
              </g>
            </svg>
          )}
          {width > 0 && active != null && shownDay != null && (
            <ChartTooltip
              x={cells[shownDay].x}
              y={cells[shownDay].y}
              offset={size / 2 + 8}
              title={`${weekdayNames[active]} ${shownDay + 1}${month ? ` ${month}` : ""}`}
              items={[
                { label: name, value: format(data[shownDay]), color },
                { label: "Of goal", value: formatPercent(data[shownDay] / goal, { digits: 0 }) },
              ]}
            />
          )}
          {width > 0 && active != null && shownDay == null && (
            <ChartTooltip
              x={centers[active]}
              y={Math.min(y(averages[active]), goalY)}
              offset={tube / 2 + 8}
              title={`${weekdayNames[active]}s${of}`}
              items={[
                { label: "Average", value: format(Math.round(averages[active])), color, marker: "square" },
                { label: "Best", value: totals[active].best >= 0 ? format(data[totals[active].best]) : "–" },
              ]}
            >
              <p className="mt-0.5 text-muted-foreground tabular-nums">
                {totals[active].reached} of {totals[active].count} reached the goal
              </p>
            </ChartTooltip>
          )}
        </ChartPlot>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : `${name}${of}`}
        columns={["Day", name, "Share of goal"]}
        rows={cells.map((c, i) => [
          `${weekdayNames[c.weekday]} ${i + 1}${month ? ` ${month}` : ""}`,
          format(c.value),
          formatPercent(c.value / goal, { digits: 0 }),
        ])}
      />
    </ChartCard>
  );
}
