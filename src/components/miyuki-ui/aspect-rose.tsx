"use client";

import { arc } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  chartMotion,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface AspectRoseProps extends Omit<ChartCardProps, "children"> {
  levels: number[][];
  bands?: string[];
  elevations?: string[];
  levelNames?: string[];
  aspects?: string[];
  size?: number;
  legend?: boolean;
  summary?: string;
}

const ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ASPECT_NAMES: Record<string, string> = {
  N: "North",
  NE: "North-east",
  E: "East",
  SE: "South-east",
  S: "South",
  SW: "South-west",
  W: "West",
  NW: "North-west",
};
const BANDS = ["Alpine", "Treeline", "Below treeline"];
const LEVEL_NAMES = ["Low", "Moderate", "Considerable", "High", "Very high"];
const EDGES = [0.13, 0.43, 0.72, 1];
const GAP = 2.5;
const KEY_WIDTH = 188;

const fill = (level: number) => `var(--miyuki-aspect-rose-${level})`;
const ink = (level: number) => (level >= 4 ? "var(--miyuki-aspect-rose-on-strong)" : "var(--foreground)");

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function RingGlyph({ band, count, className }: { band: number; count: number; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={cn("shrink-0", className)}>
      {Array.from({ length: count }, (_, k) => count - 1 - k).map((k) => {
        const r = 2.4 + (5.2 * (k + 1)) / count;
        return (
          <circle
            key={k}
            cx="8"
            cy="8"
            r={r}
            strokeWidth={1}
            className={k === band ? "fill-foreground/70 stroke-foreground/70" : "fill-card stroke-border-strong"}
          />
        );
      })}
    </svg>
  );
}

export function AspectRose({
  levels,
  bands = BANDS,
  elevations,
  levelNames = LEVEL_NAMES,
  aspects = ASPECTS,
  size = 264,
  legend = true,
  summary,
  label,
  value,
  caption,
  footer,
  className,
  ...props
}: AspectRoseProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width: room } = useChartSize(boxRef);
  const inView = useInViewOnce(boxRef);
  const reduce = useReducedMotion();
  const play = inView || !!reduce;

  const na = aspects.length;
  const nb = bands.length;
  const levelAt = (a: number, b: number) => Math.max(1, Math.min(5, Math.round(levels[a]?.[b] ?? 1)));
  const aspectName = (a: number) => ASPECT_NAMES[aspects[a]] ?? aspects[a];
  const levelName = (l: number) => levelNames[l - 1] ?? String(l);

  const row = legend && room >= size * 0.86 + KEY_WIDTH + 24;
  const S = Math.max(160, Math.min(size, row ? room - KEY_WIDTH - 24 : room));
  const width = room > 0 ? S : 0;
  const R = S / 2 - 20;
  const cx = S / 2;
  const cy = S / 2;
  const edges =
    nb === 3 ? EDGES.map((e) => R * e) : Array.from({ length: nb + 1 }, (_, k) => R * (0.13 + (0.87 * k) / nb));
  const step = (Math.PI * 2) / Math.max(na, 1);

  const cellPath = arc<{ a: number; b: number }>()
    .innerRadius(({ b }) => edges[b] + GAP / 2)
    .outerRadius(({ b }) => edges[b + 1] - GAP / 2)
    .startAngle(({ a }) => a * step - step / 2)
    .endAngle(({ a }) => a * step + step / 2)
    .padAngle(GAP / R)
    .padRadius(R)
    .cornerRadius(3);

  const cells = Array.from({ length: na * nb }, (_, i) => ({ a: Math.floor(i / nb), b: i % nb }));
  const maxLevel = Math.max(1, ...cells.map(({ a, b }) => levelAt(a, b)));
  const focusIndex = cells.findIndex(({ a, b }) => levelAt(a, b) === maxLevel);

  const { active, setActive, bind } = useNearestIndex({
    count: na * nb,
    focusIndex,
    locate: (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      if (d < edges[0] || d > edges[nb]) return null;
      let b = 0;
      while (b < nb - 1 && d > edges[b + 1]) b++;
      const turn = Math.atan2(px - cx, cy - py);
      const a = ((Math.round(turn / step) % na) + na) % na;
      return a * nb + b;
    },
  });
  const current = active != null ? cells[active] : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const base = current ?? cells[focusIndex] ?? { a: 0, b: 0 };
    let next = base;
    switch (event.key) {
      case "ArrowRight":
        next = { a: (base.a + 1) % na, b: base.b };
        break;
      case "ArrowLeft":
        next = { a: (base.a - 1 + na) % na, b: base.b };
        break;
      case "ArrowUp":
        next = { a: base.a, b: Math.max(0, base.b - 1) };
        break;
      case "ArrowDown":
        next = { a: base.a, b: Math.min(nb - 1, base.b + 1) };
        break;
      default:
        bind.onKeyDown(event);
        return;
    }
    event.preventDefault();
    setActive(next.a * nb + next.b);
  };

  const at = (turn: number, r: number) => [cx + r * Math.sin(turn), cy - r * Math.cos(turn)] as const;
  const groups: string[] = [];
  for (let l = 5; l >= 1; l--) {
    const parts = bands
      .map((band, b) => {
        const hit = Array.from({ length: na }, (_, a) => a).filter((a) => levelAt(a, b) === l);
        if (hit.length === 0) return null;
        return hit.length === na
          ? `all aspects ${band.toLowerCase()}`
          : `${list(hit.map((a) => aspectName(a).toLowerCase()))} ${band.toLowerCase()}`;
      })
      .filter((p): p is string => p != null);
    if (parts.length) groups.push(`${levelName(l)} (${l}) on ${list(parts)}`);
  }
  const description =
    summary ??
    `Avalanche danger by aspect and elevation, ${nb} bands from ${bands[0]?.toLowerCase()} in the centre to ${bands[nb - 1]?.toLowerCase()} at the rim. ${groups.join("; ")}.`;

  const worst = cells.filter(({ a, b }) => levelAt(a, b) === maxLevel);
  const worstBands = [...new Set(worst.map((c) => c.b))];
  const restText =
    worstBands.length === 1
      ? `${list(worst.map((c) => aspectName(c.a).toLowerCase()))} aspects, ${bands[worstBands[0]].toLowerCase()}`
      : `${worst.length} of ${na * nb} slopes`;
  const readout = current
    ? { place: `${aspectName(current.a)}, ${bands[current.b].toLowerCase()}`, level: levelAt(current.a, current.b) }
    : null;
  const activeLevel = readout?.level ?? null;

  const rose = (
    <ChartPlot
      summary={description}
      height={S}
      {...bind}
      onKeyDown={onKeyDown}
      className="shrink-0 rounded-full"
      style={{ width: S }}
    >
      {width > 0 && (
        <svg width={S} height={S} aria-hidden="true" className="block overflow-visible">
          <circle cx={cx} cy={cy} r={edges[nb] + 3} fill="none" strokeWidth={1} className="stroke-border" />
          <g transform={`translate(${cx} ${cy})`}>
            {cells.map((c, i) => {
              const level = levelAt(c.a, c.b);
              return (
                <motion.path
                  key={i}
                  d={cellPath(c) ?? ""}
                  strokeWidth={1}
                  initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: play ? 1 : 0, scale: play ? 1 : 0.7 }}
                  transition={reduce ? { duration: 0 } : { ...chartMotion.settle, delay: c.b * 0.09 + c.a * 0.022 }}
                  className="transition-[fill] duration-200 ease-settle"
                  style={{
                    fill: fill(level),
                    stroke: "color-mix(in oklab, var(--foreground) 9%, transparent)",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                />
              );
            })}
          </g>
          <g
            textAnchor="middle"
            style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
            className="pointer-events-none font-medium"
          >
            {cells.map((c, i) => {
              const level = levelAt(c.a, c.b);
              const [x, y] = at(c.a * step, (edges[c.b] + edges[c.b + 1]) / 2);
              return (
                <motion.text
                  key={i}
                  x={x}
                  y={y}
                  dy="0.35em"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: play ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.2, delay: c.b * 0.09 + c.a * 0.022 + 0.12 }}
                  style={{ fill: ink(level) }}
                >
                  {level}
                </motion.text>
              );
            })}
          </g>
          <path
            d={`M${cx},${cy - 4.6}L${cx + 5},${cy + 3.4}L${cx - 5},${cy + 3.4}Z`}
            strokeLinejoin="round"
            strokeWidth={1}
            className="fill-foreground/35 stroke-foreground/35"
          />
          {current && (
            <path
              d={cellPath(current) ?? ""}
              transform={`translate(${cx} ${cy})`}
              fill="none"
              strokeWidth={1.75}
              className="pointer-events-none stroke-foreground"
            />
          )}
          <g textAnchor="middle">
            {aspects.map((name, a) => {
              const [x, y] = at(a * step, edges[nb] + 12);
              const cardinal = a % 2 === 0 && na === 8;
              const on = current?.a === a;
              return (
                <text
                  key={a}
                  x={x}
                  y={y}
                  dy="0.35em"
                  style={{ fontSize: cardinal ? 12 : 11 }}
                  className={cn(
                    "transition-[fill] duration-150",
                    on || cardinal ? "fill-foreground font-medium" : "fill-muted-foreground",
                  )}
                >
                  {name}
                </text>
              );
            })}
          </g>
        </svg>
      )}
    </ChartPlot>
  );

  const key = legend ? (
    <div
      className={cn(
        "grid shrink-0 gap-x-6 gap-y-5 text-[13px] leading-5",
        row ? "grid-cols-1" : room >= 300 ? "w-full grid-cols-2" : "w-full grid-cols-1",
      )}
      style={row ? { width: KEY_WIDTH } : undefined}
    >
      <div>
        <p className="mb-1.5 text-muted-foreground">Danger level</p>
        <ul className="flex flex-col gap-0.5">
          {[5, 4, 3, 2, 1].map((l) => (
            <li
              key={l}
              className={cn(
                "-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors duration-150",
                activeLevel === l && "bg-accent",
              )}
            >
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-[5px] text-xs font-medium tabular-nums ring-1 ring-foreground/10 ring-inset"
                style={{ background: fill(l), color: ink(l) }}
              >
                {l}
              </span>
              <span className={cn(activeLevel === l ? "font-medium text-foreground" : "text-foreground")}>
                {levelName(l)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 text-muted-foreground">Elevation, centre outward</p>
        <ul className="flex flex-col gap-1">
          {bands.map((band, b) => (
            <li
              key={b}
              className={cn(
                "-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors duration-150",
                current?.b === b && "bg-accent",
              )}
            >
              <RingGlyph band={b} count={nb} className="self-start mt-0.5" />
              <span className="flex min-w-0 flex-col">
                <span className="text-foreground">{band}</span>
                {elevations?.[b] && (
                  <span className="text-xs leading-4 text-muted-foreground tabular-nums">{elevations[b]}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <ChartCard
      label={label}
      value={value ?? levelName(maxLevel)}
      caption={caption ?? `level ${maxLevel} of 5 at worst`}
      footer={
        footer ?? (
          <p aria-live="polite" className="min-h-5 text-[13px] leading-5 text-muted-foreground">
            {readout ? (
              <>
                <span className="font-medium text-foreground">{readout.place}</span>:{" "}
                {levelName(readout.level).toLowerCase()}, level {readout.level}
              </>
            ) : (
              <>
                Worst on <span className="text-foreground">{restText}</span>
              </>
            )}
          </p>
        )
      }
      {...props}
      className={cn(
        "[--miyuki-aspect-rose-1:color-mix(in_oklab,var(--destructive)_9%,var(--card))] [--miyuki-aspect-rose-2:color-mix(in_oklab,var(--destructive)_24%,var(--card))] [--miyuki-aspect-rose-3:color-mix(in_oklab,var(--destructive)_46%,var(--card))] [--miyuki-aspect-rose-4:var(--destructive)] [--miyuki-aspect-rose-5:color-mix(in_oklab,var(--destructive-strong)_70%,var(--foreground))] [--miyuki-aspect-rose-on-strong:var(--card)]",
        "dark:[--miyuki-aspect-rose-1:color-mix(in_oklab,var(--destructive)_13%,var(--card))] dark:[--miyuki-aspect-rose-2:color-mix(in_oklab,var(--destructive)_27%,var(--card))] dark:[--miyuki-aspect-rose-3:color-mix(in_oklab,var(--destructive)_48%,var(--card))] dark:[--miyuki-aspect-rose-5:var(--destructive-strong)] dark:[--miyuki-aspect-rose-on-strong:var(--background)]",
        className,
      )}
    >
      <div ref={boxRef} className={cn("flex min-w-0 items-center gap-6", row ? "flex-row justify-center" : "flex-col")}>
        {room > 0 && rose}
        {room > 0 && key}
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : "Avalanche danger by aspect and elevation"}
        columns={["Aspect", ...bands]}
        rows={aspects.map((_, a) => [
          aspectName(a),
          ...bands.map((__, b) => `${levelAt(a, b)}, ${levelName(levelAt(a, b)).toLowerCase()}`),
        ])}
      />
    </ChartCard>
  );
}
