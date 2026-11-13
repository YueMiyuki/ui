"use client";

import { Bus, Check, Minus, Ticket } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { Meter } from "@/components/miyuki-ui/meter";
import { SnowReport, type SnowReportData } from "@/components/miyuki-ui/snow-report";
import { SplitFlapBoard } from "@/components/miyuki-ui/split-flap-board";
import { WeatherIcon } from "@/components/miyuki-ui/weather-icon";
import { cn } from "@/lib/utils";

export interface ResortStatusWebcam {
  src: string;
  name: string;
  altitude: string;
  time: string;
}

export interface ResortStatusProps extends Omit<ComponentProps<"div">, "children"> {
  webcams?: ResortStatusWebcam[];
  trailMap?: string;
  forecaster?: { name: string; role?: string; avatar?: string };
  live?: boolean;
}

type LiftStatus = "open" | "hold" | "closed";

interface Lift {
  id: string;
  name: string;
  kind: string;
}

interface LiftState {
  status: LiftStatus;
  wait: number | null;
  note?: string;
}

const LIFTS: Lift[] = [
  { id: "gondola", name: "Kamoshika gondola", kind: "Gondola, 8 seats" },
  { id: "usagi", name: "Usagi express", kind: "Six-seat chair" },
  { id: "tbar", name: "Summit T-bar", kind: "T-bar" },
  { id: "sakura", name: "Sakura quad", kind: "Quad chair" },
  { id: "nakayama", name: "Nakayama pair", kind: "Double chair" },
  { id: "kitsune", name: "Kitsune triple", kind: "Triple chair" },
  { id: "hinoki", name: "Hinoki quad", kind: "Quad chair" },
  { id: "tsubaki", name: "Tsubaki pair", kind: "Double chair" },
  { id: "ridge", name: "Ridge double", kind: "Double chair" },
  { id: "forest", name: "Forest triple", kind: "Triple chair" },
  { id: "carpet", name: "Kodama carpet", kind: "Moving carpet" },
  { id: "tow", name: "Village rope tow", kind: "Rope tow" },
];

const BASE: Record<string, LiftState> = {
  gondola: { status: "open", wait: 6 },
  usagi: { status: "open", wait: 9 },
  tbar: { status: "closed", wait: null, note: "Wind" },
  sakura: { status: "open", wait: 3 },
  nakayama: { status: "open", wait: 0 },
  kitsune: { status: "hold", wait: null, note: "Wind at the top" },
  hinoki: { status: "open", wait: 4 },
  tsubaki: { status: "open", wait: 2 },
  ridge: { status: "closed", wait: null, note: "Avalanche control" },
  forest: { status: "open", wait: 5 },
  carpet: { status: "open", wait: 1 },
  tow: { status: "open", wait: 0 },
};

const SCRIPT: { say: string; set: Record<string, LiftState> }[] = [
  {
    say: "Gondola queue up to 8 minutes",
    set: { gondola: { status: "open", wait: 8 }, usagi: { status: "open", wait: 7 } },
  },
  { say: "Kitsune triple reopened", set: { kitsune: { status: "open", wait: 4 } } },
  {
    say: "Sakura quad queue up to 5 minutes",
    set: {
      sakura: { status: "open", wait: 5 },
      hinoki: { status: "open", wait: 2 },
      gondola: { status: "open", wait: 9 },
    },
  },
  { say: "Usagi express on hold for gusts", set: { usagi: { status: "hold", wait: null, note: "Gusts at the top" } } },
  {
    say: "Gondola queue down to 6 minutes",
    set: {
      gondola: { status: "open", wait: 6 },
      forest: { status: "open", wait: 6 },
      kitsune: { status: "open", wait: 6 },
    },
  },
  { say: "Usagi express running again", set: { usagi: { status: "open", wait: 12 } } },
  {
    say: "Kitsune triple on hold for wind",
    set: { kitsune: { status: "hold", wait: null, note: "Wind at the top" }, gondola: { status: "open", wait: 7 } },
  },
  { say: "Queues shorter across the mountain", set: BASE },
];

function stateAt(tick: number) {
  if (tick === 0) return BASE;
  const step = (tick - 1) % SCRIPT.length;
  const out = { ...BASE };
  for (let i = 0; i <= step; i++) Object.assign(out, SCRIPT[i].set);
  return out;
}

type Level = "beginner" | "intermediate" | "advanced";

const LEVELS: { id: Level; name: string; color: string }[] = [
  { id: "beginner", name: "Beginner", color: "var(--success)" },
  { id: "intermediate", name: "Intermediate", color: "var(--destructive)" },
  { id: "advanced", name: "Advanced", color: "var(--foreground)" },
];

const RUNS: Record<Level, { name: string; open: boolean; note?: string }[]> = {
  beginner: [
    { name: "Usagi meadow", open: true },
    { name: "Village loop", open: true },
    { name: "Sakura trail", open: true },
    { name: "Forest road", open: true },
    { name: "Kodama slope", open: true },
    { name: "Hinoki glade", open: true },
    { name: "Shiro slope", open: true },
    { name: "Tanuki path", open: false, note: "Thin cover" },
  ],
  intermediate: [
    { name: "Kamoshika main", open: true },
    { name: "Nakayama ridge", open: true },
    { name: "Tsubaki bowl", open: true },
    { name: "Gondola run", open: true },
    { name: "Kitsune trail", open: false, note: "Wind" },
    { name: "Shirakaba", open: true },
    { name: "Hoshi run", open: true },
    { name: "Kaede", open: true },
    { name: "Upper traverse", open: false, note: "Wind" },
    { name: "Mid station run", open: true },
    { name: "Kumo", open: true },
    { name: "Yuki", open: false, note: "Grooming" },
  ],
  advanced: [
    { name: "Summit face", open: false, note: "Control work" },
    { name: "North couloir", open: false, note: "Control work" },
    { name: "Usagi wall", open: true },
    { name: "Ridge chute", open: false, note: "Control work" },
    { name: "Kamoshika bumps", open: true },
    { name: "Buna trees", open: true },
    { name: "Tengu", open: true },
    { name: "Tsurugi", open: false, note: "Wind" },
  ],
};

const runTotals = Object.values(RUNS).flat();
const runsOpen = runTotals.filter((r) => r.open).length;

const PASSES = [
  { name: "One day", adult: "¥7,800", child: "¥3,900" },
  { name: "Afternoon", sub: "From 12:30", adult: "¥6,200", child: "¥3,100" },
  { name: "Night", sub: "16:30 to 20:00", adult: "¥3,400", child: "¥1,700" },
  { name: "Two days", adult: "¥14,800", child: "¥7,400" },
  { name: "Season", sub: "To 5 May", adult: "¥96,000", child: "¥48,000" },
];

const PARKING = [
  { name: "Lot A, base", used: 100 },
  { name: "Lot B, Nakayama", used: 64 },
  { name: "Lot C, village", used: 12 },
];

const pad = (n: number) => String(n).padStart(2, "0");

function Shape({ level, className }: { level: Level; className?: string }) {
  const color = LEVELS.find((l) => l.id === level)?.color;
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3 shrink-0", className)} style={{ color }}>
      {level === "beginner" ? (
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      ) : level === "intermediate" ? (
        <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="1.5" fill="currentColor" />
      ) : (
        <path d="M6 .6 11.4 6 6 11.4.6 6Z" fill="currentColor" />
      )}
    </svg>
  );
}

const PILL: Record<LiftStatus, { word: string; tone: string }> = {
  open: { word: "Open", tone: "bg-success-soft text-success-strong" },
  hold: { word: "On hold", tone: "bg-warning-soft text-warning-strong" },
  closed: { word: "Closed", tone: "bg-destructive-soft text-destructive-strong" },
};

function StatusGlyph({ status }: { status: LiftStatus }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
      {status === "open" ? (
        <circle cx="6" cy="6" r="4" fill="currentColor" />
      ) : status === "hold" ? (
        <path d="M4 2.5v7M8 2.5v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

function StatusPill({ status }: { status: LiftStatus }) {
  const reduce = useReducedMotion();
  const pill = PILL[status];
  return (
    <span className="inline-grid w-[5.25rem] justify-items-start [perspective:320px]">
      <AnimatePresence initial={false}>
        <motion.span
          key={status}
          initial={reduce ? { opacity: 0 } : { rotateX: 90 }}
          animate={reduce ? { opacity: 1 } : { rotateX: 0 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : { rotateX: -90, transition: { duration: 0.14, ease: [0.55, 0, 0.9, 0.45] } }
          }
          transition={reduce ? { duration: 0.12 } : { delay: 0.14, type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "col-start-1 row-start-1 inline-flex h-6 origin-center items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap [backface-visibility:hidden]",
            pill.tone,
          )}
        >
          <StatusGlyph status={status} />
          {pill.word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Wait({ state }: { state: LiftState }) {
  const text = state.status === "open" && state.wait != null ? pad(Math.min(99, state.wait)) : "--";
  return (
    <span className="flex items-center justify-end gap-1.5">
      <SplitFlapBoard
        aria-hidden="true"
        text={text}
        rows={1}
        cols={2}
        duration={720}
        charset="-0123456789"
        className="w-8 shrink-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:p-0 dark:bg-transparent"
      />
      <span className="w-6 text-xs text-muted-foreground">min</span>
      <span className="sr-only">
        {state.status === "open" && state.wait != null ? `${state.wait} minute wait` : "No queue"}
      </span>
    </span>
  );
}

const MAP_RUNS: { name: string; level: Level; open: boolean; d: string; label?: [number, number, "start" | "end"] }[] =
  [
    {
      name: "Forest road",
      level: "beginner",
      open: true,
      d: "M246 218C196 280 214 380 174 442",
      label: [190, 336, "end"],
    },
    {
      name: "Shirakaba",
      level: "intermediate",
      open: true,
      d: "M256 218C310 270 286 380 306 442",
      label: [304, 392, "start"],
    },
    { name: "Usagi meadow", level: "beginner", open: true, d: "M366 300C404 340 396 400 424 444" },
    { name: "Sakura trail", level: "beginner", open: true, d: "M354 302C320 350 346 400 330 446" },
    {
      name: "Upper traverse",
      level: "intermediate",
      open: false,
      d: "M594 64C500 74 330 120 262 208",
      label: [404, 96, "start"],
    },
    {
      name: "Usagi wall",
      level: "advanced",
      open: true,
      d: "M598 70C548 112 532 170 556 254",
      label: [540, 160, "end"],
    },
    {
      name: "Kamoshika main",
      level: "intermediate",
      open: true,
      d: "M570 268C526 314 510 392 516 446",
      label: [528, 322, "end"],
    },
    {
      name: "Gondola run",
      level: "intermediate",
      open: true,
      d: "M588 268C640 320 650 392 638 446",
      label: [636, 324, "start"],
    },
    {
      name: "Summit face",
      level: "advanced",
      open: false,
      d: "M618 68C650 130 664 190 646 250",
      label: [664, 238, "start"],
    },
    {
      name: "North couloir",
      level: "advanced",
      open: false,
      d: "M704 50C736 120 728 220 768 300",
      label: [744, 140, "start"],
    },
    {
      name: "Nakayama ridge",
      level: "intermediate",
      open: true,
      d: "M822 178C760 230 770 360 728 444",
      label: [764, 420, "end"],
    },
    { name: "Tengu", level: "advanced", open: true, d: "M838 176C880 240 846 360 866 440", label: [876, 300, "start"] },
  ];

const MAP_LIFTS: { id: string; from: [number, number]; to: [number, number]; label?: boolean }[] = [
  { id: "forest", from: [210, 446], to: [250, 214] },
  { id: "sakura", from: [384, 450], to: [360, 298], label: true },
  { id: "gondola", from: [562, 452], to: [580, 264], label: true },
  { id: "usagi", from: [588, 258], to: [610, 66], label: true },
  { id: "tbar", from: [618, 62], to: [700, 46] },
  { id: "kitsune", from: [792, 446], to: [830, 172], label: true },
];

const halo = { paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 4, strokeLinejoin: "round" } as const;

function RunMark({ level, x, y }: { level: Level; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={7} className="fill-card" />
      <g transform="translate(-4.5 -4.5) scale(0.75)">
        {level === "beginner" ? (
          <circle cx="6" cy="6" r="5" style={{ fill: "var(--success)" }} />
        ) : level === "intermediate" ? (
          <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="1.5" style={{ fill: "var(--destructive)" }} />
        ) : (
          <path d="M6 .6 11.4 6 6 11.4.6 6Z" className="fill-foreground" />
        )}
      </g>
    </g>
  );
}

function TrailMap({ texture, lifts }: { texture?: string; lifts: Record<string, LiftState> }) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:thin] sm:mx-0 sm:px-0">
      <div className="relative min-w-[720px] overflow-clip rounded-lg bg-muted">
        {texture && (
          <img src={texture} alt="" className="absolute inset-0 size-full object-cover opacity-55 dark:opacity-30" />
        )}
        <svg
          viewBox="120 20 800 476"
          className="relative block h-auto w-full"
          role="img"
          aria-label={`Trail map with ${MAP_RUNS.length} main runs and ${MAP_LIFTS.length} lifts. Closed runs and stopped lifts are dashed.`}
        >
          <path d="M150 458H890" strokeWidth={1} strokeDasharray="2 4" className="stroke-foreground/30" fill="none" />
          <g fill="none" strokeLinecap="round">
            {MAP_RUNS.map((r) => (
              <g key={r.name}>
                <title>{`${r.name}, ${r.level}, ${r.open ? "open" : "closed"}`}</title>
                <path d={r.d} strokeWidth={8} className="stroke-card/75" />
                <path
                  d={r.d}
                  strokeWidth={3}
                  strokeDasharray={r.open ? undefined : "1 7"}
                  style={{ stroke: LEVELS.find((l) => l.id === r.level)?.color }}
                />
              </g>
            ))}
          </g>
          {MAP_LIFTS.map((l) => {
            const running = lifts[l.id]?.status === "open";
            const name = LIFTS.find((x) => x.id === l.id)?.name ?? "";
            const [x0, y0] = l.from;
            const [x1, y1] = l.to;
            const ang = Math.atan2(y1 - y0, x1 - x0);
            const tx = -Math.sin(ang) * 5;
            const ty = Math.cos(ang) * 5;
            const deg = (ang * 180) / Math.PI;
            return (
              <g key={l.id}>
                <title>{`${name}, ${PILL[lifts[l.id]?.status ?? "closed"].word.toLowerCase()}`}</title>
                <line
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  strokeWidth={1.5}
                  strokeDasharray={running ? undefined : "5 4"}
                  className="stroke-foreground/85"
                />
                {[l.from, l.to].map(([x, y], i) => (
                  <line
                    key={i}
                    x1={x - tx}
                    y1={y - ty}
                    x2={x + tx}
                    y2={y + ty}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    className="stroke-foreground"
                  />
                ))}
                {l.label && (
                  <text
                    transform={`translate(${(x0 + x1) / 2} ${(y0 + y1) / 2}) rotate(${deg})`}
                    y={-6}
                    textAnchor="middle"
                    className="fill-foreground"
                    style={{ fontSize: 11, fontWeight: 500, ...halo }}
                  >
                    {name}
                  </text>
                )}
              </g>
            );
          })}
          {MAP_RUNS.map((r) => {
            const [x, y] = r.d.slice(1).split("C")[0].split(" ").map(Number);
            return <RunMark key={r.name} level={r.level} x={x} y={y} />;
          })}
          {MAP_RUNS.filter((r) => r.label).map((r) => (
            <text
              key={r.name}
              x={r.label?.[0]}
              y={r.label?.[1]}
              textAnchor={r.label?.[2]}
              className={r.open ? "fill-foreground" : "fill-muted-foreground"}
              style={{ fontSize: 11.5, ...halo }}
            >
              {r.name}
            </text>
          ))}
          <g className="fill-foreground" style={{ fontSize: 12, fontWeight: 600 }}>
            <path d="M610 30l8 13h-16z" />
            <text x="626" y="40" style={halo}>
              Summit, 1,690 m
            </text>
            <text x="562" y="482" textAnchor="middle" style={halo}>
              Village base, 820 m
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function Panel({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={`miyuki-resort-status-${title.toLowerCase()}`}
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id={`miyuki-resort-status-${title.toLowerCase()}`}
          className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
        >
          {title}
        </h2>
        {meta != null && <div className="text-[13px] leading-5 text-muted-foreground tabular-nums">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function ResortStatus({
  webcams = [],
  trailMap,
  forecaster,
  live = true,
  className,
  ...props
}: ResortStatusProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    let id = 0;
    const start = () => {
      window.clearInterval(id);
      if (!document.hidden) id = window.setInterval(() => setTick((t) => t + 1), 4500);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", start);
    };
  }, [live]);

  const lifts = stateAt(tick);
  const liftsOpen = LIFTS.filter((l) => lifts[l.id].status === "open").length;
  const minutes = 10 + tick * 2;
  const updated = `${pad(9 + Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const latest = tick > 0 ? SCRIPT[(tick - 1) % SCRIPT.length].say : null;

  const report: SnowReportData = {
    resort: "Morning report",
    title: "Mid station",
    date: "Saturday 13 February 2027",
    time: "06:30",
    new24: 26,
    new7: 84,
    base: 118,
    summit: 231,
    baseAltitude: 820,
    summitAltitude: 1690,
    temperature: { summit: -12, base: -5 },
    wind: { speed: 22, direction: "NW" },
    lifts: { open: liftsOpen, total: LIFTS.length },
    runs: { open: runsOpen, total: runTotals.length },
    note: "Light snow keeps falling through the morning on top of 26 cm overnight. Patrol is working on the summit face and the north couloir, which stay closed until at least noon. The Summit T-bar is shut for wind, and the Kitsune triple runs only while gusts at the top stay under 60 km/h.",
    forecaster,
    next: "Next report at 12:00",
  };

  return (
    <div {...props} className={cn("min-h-dvh bg-background text-foreground", className)}>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <path d="M2.5 19.5 9 8l3.5 5.5L15 10l6.5 9.5Z" />
                <path d="M7.25 11.25 9 12.5l1.6-1.4" />
              </svg>
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl leading-8 font-semibold tracking-[-0.03em] text-foreground">
                Hakuba Kamoshika
              </h1>
              <p className="text-[13px] leading-5 text-muted-foreground">Saturday 13 February 2027</p>
            </div>
            <Badge tone="success" dot className="ms-1 self-start sm:self-center">
              Open
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground max-sm:order-last max-sm:w-full">
            <WeatherIcon kind="snow" size={20} label="Light snow" className="text-foreground" />
            <span className="tabular-nums">
              Light snow, <span className="text-foreground">−12°</span> at the summit
            </span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="max-sm:hidden">
              Trail map
            </Button>
            <Button variant="primary" size="sm" iconStart={<Ticket aria-hidden="true" />}>
              Buy passes
            </Button>
          </div>
        </div>
      </header>

      <main className="@container/main mx-auto w-full max-w-[1280px] px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 @min-[1000px]/main:grid-cols-12">
          <SnowReport report={report} className="@min-[1000px]/main:col-span-8" />

          <aside className="flex min-w-0 flex-col gap-6 rounded-2xl bg-muted/70 p-5 sm:p-6 @min-[640px]/main:grid @min-[640px]/main:grid-cols-3 @min-[640px]/main:gap-8 @min-[1000px]/main:col-span-4 @min-[1000px]/main:flex @min-[1000px]/main:gap-6 dark:bg-muted/50 dark:ring-1 dark:ring-border dark:ring-inset">
            <div>
              <h2 className="text-[13px] leading-5 text-muted-foreground">Hours today</h2>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-foreground">Lifts</dt>
                <dd className="text-end font-medium text-foreground tabular-nums">08:30 – 16:30</dd>
                <dt className="text-foreground">Night skiing</dt>
                <dd className="text-end font-medium text-foreground tabular-nums">16:30 – 20:00</dd>
                <dt className="text-foreground">Ticket office</dt>
                <dd className="text-end font-medium text-foreground tabular-nums">07:45 – 17:00</dd>
              </dl>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Night skiing on the Sakura quad and Village loop.
              </p>
            </div>
            <div className="border-t border-border pt-5 @min-[640px]/main:border-t-0 @min-[640px]/main:border-s @min-[640px]/main:ps-8 @min-[640px]/main:pt-0 @min-[1000px]/main:border-s-0 @min-[1000px]/main:border-t @min-[1000px]/main:ps-0 @min-[1000px]/main:pt-5">
              <h2 className="text-[13px] leading-5 text-muted-foreground">Parking</h2>
              <div className="mt-3 flex flex-col gap-3">
                {PARKING.map((p) => (
                  <Meter
                    key={p.name}
                    label={<span className="font-normal">{p.name}</span>}
                    value={p.used}
                    valueLabel={p.used >= 100 ? "Full" : `${p.used}% full`}
                    thresholds={{ warning: 85, danger: 100 }}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-5 @min-[640px]/main:border-t-0 @min-[640px]/main:border-s @min-[640px]/main:ps-8 @min-[640px]/main:pt-0 @min-[1000px]/main:border-s-0 @min-[1000px]/main:border-t @min-[1000px]/main:ps-0 @min-[1000px]/main:pt-5">
              <h2 className="text-[13px] leading-5 text-muted-foreground">Shuttle from Hakuba station</h2>
              <div className="mt-2 flex items-start gap-3">
                <Bus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-6 text-foreground">
                  Every 20 minutes. Next at <span className="font-medium tabular-nums">09:20</span>,{" "}
                  <span className="tabular-nums">09:40</span> and <span className="tabular-nums">10:00</span>.
                </p>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Chains are required on route 31 above the Ōami junction.
              </p>
            </div>
          </aside>

          <Panel
            title="Lifts"
            className="@min-[1000px]/main:col-span-7"
            meta={
              <span>
                <span className="font-medium text-foreground">
                  {liftsOpen} of {LIFTS.length}
                </span>{" "}
                open · updated {updated}
              </span>
            }
          >
            <p aria-live="polite" className="mt-1 min-h-5 text-[13px] leading-5 text-muted-foreground">
              {latest ?? "Queues are read from the turnstiles every two minutes."}
            </p>
            <ul aria-hidden="true" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(["open", "hold", "closed"] as const).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={cn("grid size-5 place-items-center rounded-full", PILL[s].tone)}>
                    <StatusGlyph status={s} />
                  </span>
                  {PILL[s].word}
                </li>
              ))}
              <li className="ms-auto">Wait at the bottom station</li>
            </ul>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {LIFTS.map((l) => {
                const s = lifts[l.id];
                return (
                  <li
                    key={l.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 sm:gap-x-5"
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm leading-5 font-medium",
                          s.status === "open" ? "text-foreground" : "text-foreground/80",
                        )}
                      >
                        {l.name}
                      </p>
                      <p className="truncate text-[13px] leading-5 text-muted-foreground">
                        {l.kind}
                        {s.status !== "open" && s.note ? <span className="text-foreground/75"> · {s.note}</span> : null}
                      </p>
                    </div>
                    <StatusPill status={s.status} />
                    <Wait state={s} />
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Runs"
            className="@min-[1000px]/main:col-span-5"
            meta={
              <span>
                <span className="font-medium text-foreground">
                  {runsOpen} of {runTotals.length}
                </span>{" "}
                open
              </span>
            }
          >
            <div className="mt-5 flex flex-col gap-7">
              {LEVELS.map((level) => {
                const list = RUNS[level.id];
                const open = list.filter((r) => r.open).length;
                return (
                  <section key={level.id} aria-label={`${level.name} runs`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Shape level={level.id} />
                        {level.name}
                      </h3>
                      <p className="text-[13px] text-muted-foreground tabular-nums">
                        <span className="font-medium text-foreground">{open}</span> of {list.length} open
                      </p>
                    </div>
                    <Meter
                      aria-label={`${level.name} runs open`}
                      value={open}
                      maxValue={list.length}
                      valueLabel={`${open} of ${list.length}`}
                      showValue={false}
                      thresholds={{ warning: 101, danger: 101 }}
                      className="mt-2"
                    />
                    <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1 min-[380px]:grid-cols-2">
                      {list.map((r) => (
                        <li key={r.name} className="flex min-w-0 items-center gap-2 text-[13px] leading-6">
                          {r.open ? (
                            <Check
                              aria-hidden="true"
                              className="size-3.5 shrink-0 text-success-strong"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <Minus
                              aria-hidden="true"
                              className="size-3.5 shrink-0 text-muted-foreground"
                              strokeWidth={2.5}
                            />
                          )}
                          <span className={cn("truncate", r.open ? "text-foreground" : "text-muted-foreground")}>
                            {r.name}
                            <span className="sr-only">{r.open ? ", open" : `, closed`}</span>
                          </span>
                          {!r.open && r.note && (
                            <span className="ms-auto shrink-0 text-xs text-muted-foreground">{r.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </Panel>
        </div>

        {webcams.length > 0 && (
          <section aria-labelledby="miyuki-resort-status-webcams" className="mt-12">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
              <h2
                id="miyuki-resort-status-webcams"
                className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
              >
                Webcams
              </h2>
              <p className="text-[13px] text-muted-foreground">A new frame every five minutes</p>
            </div>
            <ul className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 @min-[1000px]/main:grid-cols-4">
              {webcams.slice(0, 4).map((cam) => (
                <li key={cam.name}>
                  <figure className="group relative overflow-clip rounded-xl border border-border bg-muted shadow-sm">
                    <img
                      src={cam.src}
                      alt={`Webcam, ${cam.name}, ${cam.time}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <span className="absolute top-2.5 right-2.5 inline-flex h-6 items-center gap-1.5 rounded-full border border-foreground/10 bg-card/70 px-2 text-xs font-medium text-foreground tabular-nums backdrop-blur-xl">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                      {cam.time}
                    </span>
                    <figcaption className="absolute inset-x-2.5 bottom-2.5 flex items-baseline justify-between gap-2 rounded-lg border border-foreground/10 bg-card/70 px-2.5 py-1.5 backdrop-blur-xl">
                      <span className="truncate text-[13px] font-medium text-foreground">{cam.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{cam.altitude}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="miyuki-resort-status-map" className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h2
                id="miyuki-resort-status-map"
                className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
              >
                Trail map
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Main runs and lifts. Closed runs and stopped lifts are dashed.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-foreground">
              {LEVELS.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <Shape level={l.id} />
                  <span aria-hidden="true" className="h-[3px] w-5 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 6" aria-hidden="true" className="h-1.5 w-6">
                  <path
                    d="M1 3h22"
                    strokeWidth="3"
                    strokeDasharray="1 5"
                    strokeLinecap="round"
                    className="stroke-muted-foreground"
                  />
                </svg>
                Closed
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 10" aria-hidden="true" className="h-2.5 w-6">
                  <path d="M2 5h20M2 1.5v7M22 1.5v7" strokeWidth="1.5" className="stroke-foreground" />
                </svg>
                Lift
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
            <TrailMap texture={trailMap} lifts={lifts} />
          </div>
        </section>
      </main>

      <footer
        aria-labelledby="miyuki-resort-status-passes"
        className="border-t border-border bg-muted/60 dark:bg-muted/40"
      >
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2
              id="miyuki-resort-status-passes"
              className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
            >
              Lift passes
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Adult and child, 6 to 12. Under 6 ride free; seniors over 65 pay the child price.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end">
            <ul className="grid flex-1 grid-cols-2 gap-x-6 gap-y-5 min-[640px]:grid-cols-3 lg:grid-cols-5">
              {PASSES.map((p) => (
                <li key={p.name} className="min-w-0 border-s border-border ps-4">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{p.sub ?? " "}</p>
                  <p className="mt-1.5 text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                    {p.adult}
                  </p>
                  <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">Child {p.child}</p>
                </li>
              ))}
            </ul>
            <Button variant="primary" iconStart={<Ticket aria-hidden="true" />} className="lg:mb-1">
              Buy passes
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
