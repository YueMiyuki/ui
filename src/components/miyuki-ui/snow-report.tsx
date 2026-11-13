"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Meter } from "@/components/miyuki-ui/meter";
import { cn } from "@/lib/utils";

export interface SnowReportData {
  resort: string;
  date: string;
  time: string;
  title?: string;
  status?: string;
  new24: number;
  new7: number;
  base: number;
  summit: number;
  baseAltitude?: number;
  summitAltitude?: number;
  temperature: { summit: number; base: number };
  wind: { speed: number; direction: string };
  lifts: { open: number; total: number };
  runs: { open: number; total: number };
  note?: ReactNode;
  forecaster?: { name: string; role?: string; avatar?: string };
  next?: string;
}

export interface SnowReportProps extends Omit<ComponentProps<"article">, "children"> {
  report: SnowReportData;
}

const DURATION = 1100;

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const COMPASS_WORDS = [
  "north",
  "north-north-east",
  "north-east",
  "east-north-east",
  "east",
  "east-south-east",
  "south-east",
  "south-south-east",
  "south",
  "south-south-west",
  "south-west",
  "west-south-west",
  "west",
  "west-north-west",
  "north-west",
  "north-north-west",
];

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function whole(n: number) {
  const r = Math.round(n);
  return `${r < 0 ? "−" : ""}${grouped.format(Math.abs(r))}`;
}

function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function useCount(value: number, play: boolean, delay: number) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (!play) return;
    const from = current.current;
    const duration = reduce ? 0 : DURATION;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.max(0, now - start - (reduce ? 0 : delay));
      const p = duration ? Math.min(1, t / duration) : 1;
      const v = from + (value - from) * (1 - (1 - p) ** 3);
      current.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play, delay, reduce]);
  return reduce ? value : n;
}

function Count({
  value,
  play,
  delay = 0,
  align = "start",
}: {
  value: number;
  play: boolean;
  delay?: number;
  align?: "start" | "end";
}) {
  const n = useCount(value, play, delay);
  return (
    <span className="inline-grid tabular-nums">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {whole(value)}
      </span>
      <span aria-hidden="true" className={cn("col-start-1 row-start-1", align === "end" && "justify-self-end")}>
        {whole(n)}
      </span>
      <span className="sr-only">{whole(value)}</span>
    </span>
  );
}

function drift(x0: number, x1: number, ground: number, depth: number) {
  const steps = 18;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave = 0.035 * Math.sin(t * 9 + 0.8) * (1 - t);
    const h = depth * ((1 - t) ** 0.32 * (1 - 0.42 * t) + wave);
    pts.push([x0 + (x1 - x0) * t, ground - Math.max(0, h)]);
  }
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const mx = (px + x) / 2;
    d += `Q${px.toFixed(2)} ${py.toFixed(2)} ${mx.toFixed(2)} ${((py + y) / 2).toFixed(2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  d += `L${lx.toFixed(2)} ${ly.toFixed(2)}`;
  return d;
}

function Stake({ value, play }: { value: number; play: boolean }) {
  const n = useCount(value, play, 0);
  const uid = useId().replace(/[^\w-]/g, "");
  const top = Math.max(30, Math.ceil((value + 8) / 10) * 10);
  const W = 132;
  const H = 98;
  const post = 30;
  const pw = 5;
  const ground = H - 12;
  const scale = (ground - 8) / top;
  const y = (cm: number) => ground - cm * scale;
  const depth = Math.max(0, n) * scale;
  const x0 = post + pw;
  const x1 = W - 2;
  const surface = drift(x0, x1, ground, depth);
  const newSnow = `${surface}L${x1} ${ground}L${x0} ${ground}Z`;
  const old = `M2 ${H}C2 ${ground + 4} 8 ${ground + 0.5} 18 ${ground + 0.5}C${post} ${ground + 0.5} ${post + 20} ${ground} ${W / 2} ${ground}S${W - 14} ${ground + 0.5} ${W - 8} ${ground + 1.5}C${W - 3} ${ground + 3} ${W - 1} ${ground + 6} ${W - 1} ${H}Z`;
  const ticks = Array.from({ length: top / 10 }, (_, i) => (i + 1) * 10);
  const labelled = (cm: number) => cm % 20 === 0;
  return (
    <svg
      aria-hidden="true"
      width={W}
      height={H}
      className={cn(
        "shrink-0 overflow-visible",
        "[--miyuki-snow-report-new:var(--card)] [--miyuki-snow-report-under:color-mix(in_oklab,var(--brand)_20%,var(--card))] [--miyuki-snow-report-old:color-mix(in_oklab,var(--brand)_13%,var(--card))] [--miyuki-snow-report-deep:color-mix(in_oklab,var(--brand)_28%,var(--card))] [--miyuki-snow-report-edge:color-mix(in_oklab,var(--brand)_55%,var(--card))]",
        "dark:[--miyuki-snow-report-new:color-mix(in_oklab,var(--foreground)_94%,var(--brand))] dark:[--miyuki-snow-report-under:color-mix(in_oklab,var(--foreground)_64%,var(--brand))] dark:[--miyuki-snow-report-old:color-mix(in_oklab,var(--brand)_30%,var(--card))] dark:[--miyuki-snow-report-deep:color-mix(in_oklab,var(--brand)_12%,var(--card))] dark:[--miyuki-snow-report-edge:color-mix(in_oklab,var(--brand)_70%,var(--foreground))]",
      )}
    >
      <defs>
        <linearGradient id={`${uid}-new`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--miyuki-snow-report-new)" }} />
          <stop offset="0.45" style={{ stopColor: "var(--miyuki-snow-report-new)" }} />
          <stop offset="1" style={{ stopColor: "var(--miyuki-snow-report-under)" }} />
        </linearGradient>
        <linearGradient id={`${uid}-old`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--miyuki-snow-report-old)" }} />
          <stop offset="1" style={{ stopColor: "var(--miyuki-snow-report-deep)" }} />
        </linearGradient>
      </defs>
      <rect x={post} y={2} width={pw} height={ground + 6} rx={pw / 2} className="fill-muted-foreground/45" />
      {ticks.map((cm) => (
        <g key={cm}>
          <line
            x1={labelled(cm) ? post - 6 : post - 3}
            x2={post + (labelled(cm) ? pw : 2.5)}
            y1={Math.round(y(cm)) + 0.5}
            y2={Math.round(y(cm)) + 0.5}
            strokeWidth={1}
            className="stroke-foreground/55"
          />
          {labelled(cm) && (
            <text
              x={post - 10}
              y={y(cm)}
              dy="0.34em"
              textAnchor="end"
              className="fill-muted-foreground tabular-nums"
              style={{ fontSize: 10 }}
            >
              {cm}
            </text>
          )}
        </g>
      ))}
      <path d={old} fill={`url(#${uid}-old)`} />
      <path
        d={newSnow}
        fill={`url(#${uid}-new)`}
        className="dark:[filter:drop-shadow(0_0_5px_color-mix(in_oklab,var(--brand)_35%,transparent))]"
      />
      <path
        d={surface}
        fill="none"
        strokeWidth={1}
        strokeLinecap="round"
        style={{ stroke: "var(--miyuki-snow-report-edge)" }}
        opacity={depth > 0.5 ? 0.8 : 0}
      />
      <line
        x1={x0}
        x2={x1}
        y1={ground + 0.5}
        y2={ground + 0.5}
        strokeWidth={1}
        style={{ stroke: "var(--miyuki-snow-report-edge)" }}
        opacity={0.75}
      />
    </svg>
  );
}

function WindArrow({ direction, play }: { direction: number; play: boolean }) {
  const reduce = useReducedMotion();
  const turn = play || reduce ? direction : direction - 140;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 text-brand-strong transition-transform duration-[1200ms] ease-settle motion-reduce:transition-none"
      style={{ transform: `rotate(${turn}deg)` }}
    >
      <path
        d="M8 2.25v11.5M4.25 10 8 13.75 11.75 10"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Figure({ label, sub, children }: { label: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] leading-5 text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1 text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
        {children}
      </p>
      {sub != null && <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

const unit = "text-sm font-normal tracking-normal text-muted-foreground";

export function SnowReport({ report, className, ...props }: SnowReportProps) {
  const headingId = useId();
  const [ref, seen] = useSeen<HTMLElement>();
  const liftsOpen = useCount(report.lifts.open, seen, 0);
  const runsOpen = useCount(report.runs.open, seen, 0);
  const index = Math.max(0, COMPASS.indexOf(report.wind.direction.toUpperCase()));
  const step = 40;

  return (
    <article
      ref={ref}
      aria-labelledby={headingId}
      {...props}
      className={cn(
        "@container w-full overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5 @[34rem]:px-6 @[34rem]:pt-6">
        <div className="min-w-0">
          <h3 id={headingId} className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground">
            {report.resort}
          </h3>
          <p className="text-[13px] leading-5 text-muted-foreground">
            {report.title ?? "Morning report"} ·{" "}
            <span className="whitespace-nowrap">
              {report.date}, <span className="tabular-nums">{report.time}</span>
            </span>
          </p>
        </div>
        {report.status != null && (
          <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-xs font-medium text-success-strong">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {report.status}
          </span>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-5 px-5 pt-6 pb-6 @[34rem]:px-6">
        <div className="min-w-0">
          <p className="text-sm leading-5 text-muted-foreground">New snow, last 24 hours</p>
          <div className="mt-1 flex items-end gap-4 @[34rem]:gap-5">
            <p className="flex items-baseline gap-2 font-display text-6xl leading-[0.9] font-semibold tracking-[-0.045em] text-foreground @[34rem]:text-7xl">
              <Count value={report.new24} play={seen} />
              <span className="text-2xl leading-none font-medium tracking-[-0.01em] text-muted-foreground">cm</span>
            </p>
            <Stake value={report.new24} play={seen} />
          </div>
        </div>
        <div className="border-border @[34rem]:ml-auto @[34rem]:border-l @[34rem]:pl-6">
          <p className="text-sm leading-5 text-muted-foreground">Last 7 days</p>
          <p className="mt-1 flex items-baseline gap-1 text-3xl leading-9 font-semibold tracking-[-0.02em] text-foreground">
            <Count value={report.new7} play={seen} delay={step} />
            <span className={cn(unit, "text-base")}>cm</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border px-5 py-5 @[34rem]:grid-cols-4 @[34rem]:px-6">
        <Figure
          label="Base depth"
          sub={report.baseAltitude != null ? `Village, ${whole(report.baseAltitude)} m` : undefined}
        >
          <Count value={report.base} play={seen} delay={step * 2} />
          <span className={unit}>cm</span>
        </Figure>
        <Figure
          label="Summit depth"
          sub={report.summitAltitude != null ? `Top station, ${whole(report.summitAltitude)} m` : undefined}
        >
          <Count value={report.summit} play={seen} delay={step * 3} />
          <span className={unit}>cm</span>
        </Figure>
        <Figure label="Temperature" sub="Summit / base">
          <span>
            <Count value={report.temperature.summit} play={seen} delay={step * 4} align="end" />°
          </span>
          <span className="sr-only">at the summit, </span>
          <span aria-hidden="true" className="font-normal text-muted-foreground">
            /
          </span>
          <span>
            <Count value={report.temperature.base} play={seen} delay={step * 5} align="end" />°
          </span>
          <span className="sr-only">at the base</span>
        </Figure>
        <Figure label="Wind" sub={`From the ${COMPASS_WORDS[index]}`}>
          <span className="self-center">
            <WindArrow direction={index * 22.5} play={seen} />
          </span>
          <Count value={report.wind.speed} play={seen} delay={step * 6} />
          <span className={unit}>km/h</span>
        </Figure>
      </div>

      <div className="grid gap-x-8 gap-y-4 border-t border-border px-5 py-5 @[34rem]:grid-cols-2 @[34rem]:px-6">
        <Meter
          label="Lifts open"
          value={liftsOpen}
          maxValue={report.lifts.total}
          valueLabel={`${report.lifts.open} of ${report.lifts.total}`}
          thresholds={{ warning: 101, danger: 101 }}
        />
        <Meter
          label="Runs open"
          value={runsOpen}
          maxValue={report.runs.total}
          valueLabel={`${report.runs.open} of ${report.runs.total}`}
          thresholds={{ warning: 101, danger: 101 }}
        />
      </div>

      {(report.note != null || report.forecaster != null) && (
        <footer className="border-t border-border bg-muted/50 px-5 py-5 @[34rem]:px-6">
          {report.note != null && <p className="text-sm leading-6 text-pretty text-foreground">{report.note}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {report.forecaster != null && (
              <div className="flex min-w-0 items-center gap-2.5">
                {report.forecaster.avatar != null && (
                  <img
                    src={report.forecaster.avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                )}
                <p className="min-w-0 text-[13px] leading-4">
                  <span className="block font-medium text-foreground">{report.forecaster.name}</span>
                  {report.forecaster.role != null && (
                    <span className="block text-muted-foreground">{report.forecaster.role}</span>
                  )}
                </p>
              </div>
            )}
            {report.next != null && <p className="text-xs leading-4 text-muted-foreground">{report.next}</p>}
          </div>
        </footer>
      )}
    </article>
  );
}
