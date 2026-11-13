"use client";

import { Accessibility, ChevronDown, CloudSnow, Construction, Ticket } from "lucide-react";
import { type ComponentProps, Fragment, startTransition, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { type Departure, DepartureBoard } from "@/components/miyuki-ui/departure-board";
import { DotMatrixDisplay } from "@/components/miyuki-ui/dot-matrix-display";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { StationClock } from "@/components/miyuki-ui/station-clock";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/miyuki-ui/table";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { cn } from "@/lib/utils";

type Kind = "local" | "rapid" | "express";
type Dir = "east" | "west";
type DayType = "weekday" | "weekend";

interface Station {
  id: string;
  code: string;
  name: string;
  km: number;
  at: Record<Kind, number | null>;
}

interface Service {
  no: number;
  kind: Kind;
  dir: Dir;
  start: number;
  end: number;
}

interface Stop {
  service: Service;
  minute: number;
}

const STATIONS: Station[] = [
  { id: "otaru", code: "S01", name: "Otaru", km: 0, at: { local: 0, rapid: 0, express: 0 } },
  { id: "chikko", code: "S02", name: "Otaru-Chikkō", km: 2.0, at: { local: 3, rapid: 3, express: 3 } },
  { id: "asari", code: "S03", name: "Asari", km: 5.8, at: { local: 8, rapid: 7, express: null } },
  { id: "zenibako", code: "S04", name: "Zenibako", km: 13.6, at: { local: 17, rapid: 15, express: null } },
  { id: "hoshimi", code: "S05", name: "Hoshimi", km: 15.6, at: { local: 20, rapid: null, express: null } },
  { id: "inazumi", code: "S06", name: "Inazumi-Kōen", km: 19.3, at: { local: 24, rapid: null, express: null } },
  { id: "teine", code: "S07", name: "Teine", km: 21.6, at: { local: 27, rapid: 23, express: 20 } },
  { id: "kotoni", code: "S08", name: "Kotoni", km: 30.5, at: { local: 38, rapid: 31, express: null } },
  { id: "sapporo", code: "S09", name: "Sapporo", km: 33.8, at: { local: 43, rapid: 35, express: 30 } },
];

const LAST = STATIONS.length - 1;
const TEINE = 6;
const ZENIBAKO = 3;
const KINDS: Kind[] = ["express", "rapid", "local"];
const KIND_NAME: Record<Kind, string> = { local: "Local", rapid: "Rapid", express: "Liner" };
const LETTER: Record<string, Kind> = { L: "local", R: "rapid", X: "express" };
const NUMBER_BASE: Record<Kind, number> = { local: 2400, rapid: 3700, express: 5000 };

const every = (from: number, to: number, pattern: string) =>
  Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, pattern]));

const PLAN: Record<DayType, Record<Dir, Record<number, string>>> = {
  weekday: {
    east: {
      5: "L32 L51",
      6: "L05 R18 L29 X41 L53",
      7: "R02 L12 X21 L29 R38 L44 X58",
      8: "L05 R15 L26 X34 L46 R55",
      9: "L02 X17 L28 R39 L51",
      ...every(10, 14, "L06 R19 L36 R49"),
      15: "L06 R19 L32 R44 L55",
      16: "R07 L18 X29 L38 R49 L58",
      17: "R08 L17 X26 L35 R44 L53",
      18: "R04 L14 X25 L36 R47 L58",
      19: "R11 L24 R39 L53",
      20: "R10 L28 R46",
      21: "L04 R22 L41",
      22: "R02 L26 L52",
      23: "L10",
    },
    west: {
      5: "L45",
      6: "L08 L26 R40 L52",
      7: "L06 R17 L28 R43 L54",
      8: "L09 R22 L35 R48 L58",
      9: "R11 L24 R37 L52",
      ...every(10, 14, "L05 R21 L35 R51"),
      15: "L05 R21 L33 R46 L57",
      16: "R08 L18 X27 L36 R45 L54",
      17: "L03t X12 L16 R26 L33t X41 L49 R58",
      18: "L07t X15 L22 R31 L40t X48 L57",
      19: "R06 L16 X25 L35 R47",
      20: "L02 R18 L36 R53",
      21: "L12 R31 L52",
      22: "R14 L35",
      23: "L12",
    },
  },
  weekend: {
    east: { 5: "L41", ...every(6, 21, "L12 R27 L42 R57"), 22: "L12 R33 L52", 23: "L10" },
    west: { 5: "L58", ...every(6, 21, "L03 R18 L33 R48"), 22: "L10 R30 L50", 23: "L12" },
  },
};

function buildServices(day: DayType): Service[] {
  const out: Service[] = [];
  for (const dir of ["east", "west"] as const) {
    const count: Record<Kind, number> = { local: 0, rapid: 0, express: 0 };
    const hours = Object.keys(PLAN[day][dir])
      .map(Number)
      .sort((a, b) => a - b);
    for (const hour of hours) {
      for (const token of PLAN[day][dir][hour].split(" ")) {
        const kind = LETTER[token[0]];
        const no = NUMBER_BASE[kind] + (day === "weekend" ? 100 : 0) + (dir === "east" ? 1 : 2) + 2 * count[kind]++;
        const end = dir === "east" ? LAST : token.endsWith("t") ? TEINE : 0;
        out.push({ no, kind, dir, start: hour * 60 + Number(token.slice(1, 3)), end });
      }
    }
  }
  return out;
}

const SERVICES: Record<DayType, Service[]> = { weekday: buildServices("weekday"), weekend: buildServices("weekend") };

function timeAt(service: Service, index: number): number | null {
  const offset = STATIONS[index].at[service.kind];
  if (offset == null) return null;
  if (service.dir === "east") return index > service.end ? null : service.start + offset;
  if (index < service.end) return null;
  return service.start + (STATIONS[LAST].at[service.kind] ?? 0) - offset;
}

function stopsAt(index: number, day: DayType): Stop[] {
  const out: Stop[] = [];
  for (const service of SERVICES[day]) {
    if (index === service.end) continue;
    const minute = timeAt(service, index);
    if (minute != null) out.push({ service, minute });
  }
  return out.sort((a, b) => a.minute - b.minute);
}

function delayOf(service: Service, index: number) {
  if (service.dir !== "east" || index < ZENIBAKO) return 0;
  return service.kind === "local" ? 2 + (service.no % 3) : 4 + (service.no % 4);
}

function platform(service: Service, index: number) {
  if (index === 0) return service.kind === "local" ? "2" : "1";
  if (index === LAST) return service.kind === "local" ? "6" : "5";
  return service.dir === "east" ? "1" : "2";
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (minute: number) => `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`;

const FARE_STEPS: [number, number][] = [
  [3, 210],
  [6, 260],
  [10, 300],
  [15, 380],
  [20, 470],
  [25, 560],
  [30, 650],
  [35, 750],
];

function fare(km: number) {
  for (const [limit, yen] of FARE_STEPS) if (km <= limit) return yen;
  return 840;
}

const childFare = (adult: number) => Math.floor(adult / 20) * 10;
const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;

function fastest(a: number, b: number) {
  let best: { minutes: number; kind: Kind } | null = null;
  for (const kind of KINDS) {
    const x = STATIONS[a].at[kind];
    const y = STATIONS[b].at[kind];
    if (x == null || y == null) continue;
    const minutes = Math.abs(y - x);
    if (!best || minutes < best.minutes) best = { minutes, kind };
  }
  return best;
}

interface BoardRow extends Departure {
  key: string;
  dir: Dir;
  due: number;
  tomorrow: boolean;
}

function boardFor(index: number, now: number): BoardRow[] {
  const today = stopsAt(index, "weekday")
    .map((stop) => ({ stop, delay: delayOf(stop.service, index), tomorrow: false }))
    .filter(({ stop, delay }) => stop.minute + delay >= now);
  const next = stopsAt(index, "weekend").map((stop) => ({ stop, delay: 0, tomorrow: true }));
  return [...today, ...next].map(({ stop, delay, tomorrow }) => ({
    key: `${tomorrow ? "t" : "d"}${stop.service.no}`,
    dir: stop.service.dir,
    due: stop.minute + delay + (tomorrow ? 1440 : 0),
    tomorrow,
    time: clock(stop.minute),
    destination: STATIONS[stop.service.end].name,
    train: KIND_NAME[stop.service.kind],
    track: platform(stop.service, index),
    delay,
  }));
}

const ACCESS: Record<string, string> = {
  otaru: "Lifts to all platforms",
  chikko: "Level paths to both platforms",
  asari: "Ramp on request at the gate",
  zenibako: "Lifts to both platforms",
  hoshimi: "Ramps to both platforms",
  inazumi: "Lifts to both platforms",
  teine: "Lifts to both platforms",
  kotoni: "Lifts to both platforms",
  sapporo: "Lifts to all platforms",
};

const OFFICE: Record<string, string> = {
  otaru: "05:30 to 23:00",
  sapporo: "05:30 to 23:30",
};

type NoticeTone = "warning" | "brand" | "neutral";

interface Notice {
  id: string;
  tone: NoticeTone;
  label: string;
  icon: typeof CloudSnow;
  title: string;
  body: string;
  posted: string;
  stations: string[];
}

const NOTICES: Notice[] = [
  {
    id: "snow",
    tone: "warning",
    label: "Delays",
    icon: CloudSnow,
    title: "Trains towards Sapporo are running late",
    body: "Heavy snow fell overnight at Zenibako. From Zenibako onwards, trains towards Sapporo are up to 7 minutes late. Trains towards Otaru are on time.",
    posted: "Today, 06:10",
    stations: ["zenibako", "hoshimi", "inazumi", "teine", "kotoni", "sapporo"],
  },
  {
    id: "works",
    tone: "brand",
    label: "Planned works",
    icon: Construction,
    title: "Buses replace trains on 20 and 21 February",
    body: "We are renewing track between Teine and Kotoni. After 21:30 on Saturday 20 and Sunday 21 February, buses run between the two stations every 20 minutes and take about 25 minutes.",
    posted: "3 February",
    stations: ["teine", "kotoni"],
  },
  {
    id: "lift",
    tone: "neutral",
    label: "Step-free access",
    icon: Accessibility,
    title: "The lift to platform 2 at Asari is out of service",
    body: "The lift is being replaced until Friday 26 February. Ask at the ticket gate and staff will set out the ramp to the crossing path.",
    posted: "8 February",
    stations: ["asari"],
  },
  {
    id: "office",
    tone: "neutral",
    label: "Tickets",
    icon: Ticket,
    title: "Shorter ticket office hours at Otaru-Chikkō",
    body: "The office is open from 07:00 to 18:00 this month. Use the machines by the north entrance, or pay the conductor on board.",
    posted: "1 February",
    stations: ["chikko"],
  },
];

function KindMark({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "local") {
    return (
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full ring-1 ring-border-strong ring-inset", className)}
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className={cn("size-2 shrink-0", kind === "express" ? "text-chart-3" : "text-chart-2", className)}
    >
      {kind === "express" ? (
        <path d="M4 0.3 7.7 4 4 7.7 0.3 4Z" fill="currentColor" />
      ) : (
        <circle cx={4} cy={4} r={3.4} fill="currentColor" />
      )}
    </svg>
  );
}

function useMinute() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const date = new Date();
      setNow(date.getHours() * 60 + date.getMinutes());
      timer = window.setTimeout(tick, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()) + 40);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

function LineMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={cn("size-10 shrink-0", className)}>
      <circle cx={20} cy={20} r={18} className="fill-brand" />
      <circle cx={20} cy={20} r={12.5} className="fill-card" />
      <path
        d="M11.5 22.2c2.1-2.2 4.1-2.2 6.2 0s4.1 2.2 6.2 0 4.1-2.2 6.2 0"
        fill="none"
        strokeWidth={2.4}
        strokeLinecap="round"
        className="stroke-brand"
      />
      <path
        d="M13.5 17.4c1.7-1.6 3.4-1.6 5.1 0s3.4 1.6 5.1 0"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-brand/55"
      />
    </svg>
  );
}

function StripMap({ index, onSelect }: { index: number; onSelect: (id: string) => void }) {
  const cols = { gridTemplateColumns: `4.75rem repeat(${STATIONS.length}, minmax(0, 1fr))` };
  const stops = (kind: Kind, i: number) => STATIONS[i].at[kind] != null;

  return (
    <div className="@container">
      <div className="hidden @min-[46rem]:block">
        <div className="grid" style={cols}>
          <div />
          {STATIONS.map((s, i) => {
            const chosen = i === index;
            const end = i === 0 || i === LAST;
            return (
              <div key={s.id} className={cn("relative rounded-t-xl pt-3", chosen && "bg-brand-soft/45")}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={chosen}
                  aria-label={`${s.name}, ${s.code}, ${s.km.toFixed(1)} km from Otaru`}
                  className="group/station flex w-full cursor-default flex-col items-center gap-2 rounded-lg px-1 pb-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "rounded-[5px] px-1.5 py-px text-[11px] leading-4 font-medium tabular-nums transition-colors duration-200",
                      chosen
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted text-muted-foreground group-hover/station:text-foreground",
                    )}
                  >
                    {s.code}
                  </span>
                  <span className="relative flex h-7 w-full items-center justify-center">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1/2 h-1.5 -translate-y-1/2 bg-brand",
                        i === 0 ? "right-0 left-1/2" : i === LAST ? "right-1/2 left-0" : "inset-x-0",
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative border-[2.5px] transition-[width,height,background-color,border-color] duration-300 ease-settle",
                        end ? "rounded-[6px]" : "rounded-full",
                        chosen
                          ? "size-6 border-brand bg-card"
                          : "size-4 border-foreground/80 bg-card group-hover/station:border-brand",
                      )}
                    >
                      {chosen && <span className="absolute inset-[3px] rounded-full bg-brand" />}
                    </span>
                    {chosen && (
                      <span
                        aria-hidden="true"
                        className="absolute size-6 animate-[miyuki-rail-line-ping_2.4s_cubic-bezier(0.22,1,0.36,1)_infinite] rounded-full border-2 border-brand motion-reduce:hidden"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-center text-[13px] leading-4 text-balance",
                      chosen ? "font-semibold text-brand-strong" : "font-medium text-foreground",
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{s.km.toFixed(1)} km</span>
                </button>
              </div>
            );
          })}
          {KINDS.map((kind, row) => (
            <Fragment key={kind}>
              <div
                className={cn(
                  "flex items-center gap-2 pe-3 text-[13px] text-muted-foreground",
                  row === 0 && "border-t border-border",
                )}
              >
                <KindMark kind={kind} />
                {KIND_NAME[kind]}
              </div>
              {STATIONS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "relative flex h-9 items-center justify-center",
                    row === 0 && "border-t border-border",
                    i === index && "bg-brand-soft/45",
                    i === index && row === KINDS.length - 1 && "rounded-b-xl",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1/2 h-0.5 -translate-y-1/2",
                      kind === "express" ? "bg-chart-3/60" : kind === "rapid" ? "bg-chart-2/60" : "bg-border-strong",
                      i === 0 ? "right-0 left-1/2" : i === LAST ? "right-1/2 left-0" : "inset-x-0",
                    )}
                  />
                  {stops(kind, i) ? (
                    <span
                      className={cn(
                        "relative size-2.5 rounded-full ring-2 ring-card",
                        kind === "express" ? "bg-chart-3" : kind === "rapid" ? "bg-chart-2" : "bg-foreground/70",
                      )}
                    >
                      <span className="sr-only">
                        {KIND_NAME[kind]} trains stop at {s.name}
                      </span>
                    </span>
                  ) : null}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="@min-[46rem]:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,2.25rem)] items-end pb-2 text-xs text-muted-foreground">
          <span>Station</span>
          {KINDS.map((kind) => (
            <span key={kind} className="text-center">
              {KIND_NAME[kind]}
            </span>
          ))}
        </div>
        <ol className="border-t border-border">
          {STATIONS.map((s, i) => {
            const chosen = i === index;
            const end = i === 0 || i === LAST;
            return (
              <li
                key={s.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_repeat(3,2.25rem)] items-stretch rounded-lg",
                  chosen && "bg-brand-soft/45",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={chosen}
                  aria-label={`${s.name}, ${s.code}, ${s.km.toFixed(1)} km from Otaru`}
                  className="flex min-h-12 cursor-default items-center gap-3 rounded-lg ps-2 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span className="relative flex w-6 self-stretch items-center justify-center">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-1/2 w-1.5 -translate-x-1/2 bg-brand",
                        i === 0 ? "top-1/2 bottom-0" : i === LAST ? "top-0 bottom-1/2" : "inset-y-0",
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative border-[2.5px] bg-card",
                        end ? "rounded-[5px]" : "rounded-full",
                        chosen ? "size-5 border-brand" : "size-3.5 border-foreground/80",
                      )}
                    >
                      {chosen && <span className="absolute inset-[3px] rounded-full bg-brand" />}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        chosen ? "font-semibold text-brand-strong" : "font-medium text-foreground",
                      )}
                    >
                      {s.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {s.code} · {s.km.toFixed(1)} km
                    </span>
                  </span>
                </button>
                {KINDS.map((kind) => (
                  <span key={kind} className="relative flex items-center justify-center">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-1/2 w-0.5 -translate-x-1/2",
                        kind === "express" ? "bg-chart-3/60" : kind === "rapid" ? "bg-chart-2/60" : "bg-border-strong",
                        i === 0 ? "top-1/2 bottom-0" : i === LAST ? "top-0 bottom-1/2" : "inset-y-0",
                      )}
                    />
                    {stops(kind, i) ? (
                      <span
                        className={cn(
                          "relative size-2.5 rounded-full ring-2 ring-background",
                          chosen && "ring-[color-mix(in_oklab,var(--brand-soft)_45%,var(--background))]",
                          kind === "express" ? "bg-chart-3" : kind === "rapid" ? "bg-chart-2" : "bg-foreground/70",
                        )}
                      >
                        <span className="sr-only">
                          {KIND_NAME[kind]} trains stop at {s.name}
                        </span>
                      </span>
                    ) : null}
                  </span>
                ))}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function HourTimetable({ index, day, now }: { index: number; day: DayType; now: number | null }) {
  const stops = useMemo(() => stopsAt(index, day), [index, day]);
  const east = index < LAST;
  const both = index > 0 && east;
  const hours = useMemo(() => {
    const set = new Set(stops.map((s) => Math.floor(s.minute / 60)));
    const list = [...set];
    const lo = Math.min(...list);
    const hi = Math.max(...list);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [stops]);
  const nextOf = (dir: Dir) => (now == null ? undefined : stops.find((s) => s.service.dir === dir && s.minute >= now));
  const next = { east: nextOf("east"), west: nextOf("west") };
  const nowHour = now == null ? null : Math.floor(now / 60);

  const cell = (stop: Stop) => {
    const { service } = stop;
    const isNext = next[service.dir] === stop;
    const gone = now != null && stop.minute < now;
    const short = service.end === TEINE && service.dir === "west";
    const spoken = `${clock(stop.minute)}, ${KIND_NAME[service.kind]} to ${STATIONS[service.end].name}${isNext ? ", next departure" : gone ? ", departed" : ""}`;
    return (
      <li
        key={service.no}
        className={cn(
          "relative flex h-8 w-[30px] items-center justify-center rounded-md text-sm tabular-nums sm:w-9 sm:text-[15px]",
          service.kind === "express" && "font-semibold",
          gone ? "text-muted-foreground" : "text-foreground",
          isNext && "bg-card ring-[1.5px] ring-brand ring-inset",
        )}
      >
        <span className="sr-only">{spoken}</span>
        <span aria-hidden="true" className="relative">
          {service.kind !== "local" && (
            <KindMark kind={service.kind} className={cn("absolute top-0.5 -left-2.5", gone && "opacity-60")} />
          )}
          {pad(stop.minute % 60)}
          {short && (
            <span className="absolute -right-1.5 -bottom-1 text-[10px] leading-none font-semibold text-brand-strong">
              T
            </span>
          )}
        </span>
      </li>
    );
  };

  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">
        {STATIONS[index].name}, {day === "weekday" ? "weekday" : "weekend and holiday"} departures
      </caption>
      <thead>
        <tr className="border-b border-border text-start text-[13px] text-muted-foreground">
          {both && (
            <th scope="col" className="pe-3 pb-2.5 text-end font-normal">
              Towards Otaru
            </th>
          )}
          <th scope="col" className="w-10 pb-2.5 text-center font-normal sm:w-14">
            <span className="sr-only">Hour</span>
          </th>
          <th scope="col" className="ps-3 pb-2.5 text-start font-normal">
            Towards {east ? "Sapporo" : "Otaru"}
          </th>
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => {
          const current = hour === nowHour && day === "weekday";
          const list = (dir: Dir) => stops.filter((s) => s.service.dir === dir && Math.floor(s.minute / 60) === hour);
          return (
            <tr key={hour} className={cn("border-b border-border last:border-b-0", current && "bg-brand-soft/35")}>
              {both && (
                <td className="py-1.5 pe-1 align-middle sm:pe-2">
                  <ul className="flex flex-wrap justify-end gap-x-1 gap-y-0.5 sm:gap-x-1.5">
                    {list("west").map(cell)}
                  </ul>
                </td>
              )}
              <th
                scope="row"
                className={cn(
                  "border-e border-border text-center text-base font-semibold tabular-nums",
                  both && "border-s",
                  current ? "text-brand-strong" : "text-foreground",
                )}
              >
                {hour}
              </th>
              <td className="py-1.5 ps-2.5 align-middle">
                <ul className="flex flex-wrap gap-x-1 gap-y-0.5 sm:gap-x-1.5">
                  {list(east ? "east" : "west").map(cell)}
                </ul>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NoticeItem({ notice, station, defaultOpen }: { notice: Notice; station: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = notice.icon;
  const bodyId = `miyuki-rail-line-notice-${notice.id}`;
  return (
    <li className="flex gap-3 py-4 sm:max-lg:border-b sm:max-lg:border-border">
      <span
        aria-hidden="true"
        className={cn("grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4", TONE_ICON[notice.tone])}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium">{notice.label}</span>
          <span aria-hidden="true">·</span>
          <span>{notice.posted}</span>
          {defaultOpen && (
            <span className="font-medium text-brand-strong">
              <span aria-hidden="true">· </span>
              Affects {station}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm leading-5 font-medium text-pretty text-foreground">{notice.title}</p>
        {open ? (
          <p id={bodyId} className="mt-1 text-[13px] leading-5 text-pretty text-muted-foreground">
            {notice.body}
          </p>
        ) : null}
        {!defaultOpen && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? bodyId : undefined}
            onClick={() => setOpen((o) => !o)}
            className="-ms-1 mt-1 inline-flex h-7 cursor-default items-center gap-1 rounded-md px-1 text-[13px] font-medium text-brand-strong outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {open ? "Show less" : "Read more"}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-3.5 transition-transform duration-200 ease-settle", open && "rotate-180")}
            />
          </button>
        )}
      </div>
    </li>
  );
}

const TONE_ICON: Record<NoticeTone, string> = {
  warning: "bg-warning-soft text-warning-strong",
  brand: "bg-brand-soft text-brand-strong",
  neutral: "bg-muted text-muted-foreground",
};

export interface RailLineProps extends ComponentProps<"div"> {
  defaultStation?: string;
}

export function RailLine({ defaultStation = "teine", className, ...props }: RailLineProps) {
  const [stationId, setStationId] = useState(() =>
    STATIONS.some((s) => s.id === defaultStation) ? defaultStation : "teine",
  );
  const [day, setDay] = useState<DayType>("weekday");
  const now = useMinute();
  const index = STATIONS.findIndex((s) => s.id === stationId);
  const station = STATIONS[index];
  const all = useMemo(() => (now == null ? [] : boardFor(index, now)), [index, now]);
  const rows = all.slice(0, 6);
  const departures: Departure[] = rows.map(({ time, destination, train, track, delay }) => ({
    time,
    destination,
    train,
    track,
    delay,
  }));
  const firstTomorrow = rows.length > 0 && rows[0].tomorrow;
  const caption = firstTomorrow
    ? "No more trains tonight. First trains on Saturday 13 February."
    : "Departures, Friday 12 February";
  const notices = [...NOTICES].sort(
    (a, b) => Number(b.stations.includes(station.id)) - Number(a.stations.includes(station.id)),
  );
  const late = rows.filter((r) => (r.delay ?? 0) > 0);
  const ticker = late.length
    ? `${station.name}: the ${late[0].time} ${late[0].train.toLowerCase()} to ${late[0].destination} is ${late[0].delay} minutes late after snow at Zenibako. We are sorry for the wait.`
    : index < ZENIBAKO
      ? `${station.name}: trains towards Sapporo are running late beyond Zenibako after overnight snow. Allow extra time for your journey.`
      : `${station.name}: trains towards Otaru are on time. Please stand behind the yellow line as trains arrive.`;

  const nextTo = (dir: Dir) => {
    const row = all.find((r) => r.dir === dir);
    const label = `Next to ${dir === "east" ? "Sapporo" : "Otaru"}`;
    if (!row || now == null) return { label, value: "--:--", note: "Waiting for the clock", late: false };
    const wait = row.due - now;
    const when = wait <= 0 ? "leaving now" : wait < 60 ? `in ${wait} min` : `at ${clock(row.due)}`;
    const late = (row.delay ?? 0) > 0;
    return {
      label,
      value: `${row.time} ${row.train}`,
      note: late ? `${row.delay} min late, ${when}` : `Platform ${row.track}, ${when}`,
      late,
    };
  };
  const glance = [
    ...(index > 0 ? [nextTo("west")] : []),
    ...(index < LAST ? [nextTo("east")] : []),
    {
      label: "Step-free access",
      value: ACCESS[station.id],
      note: index === 2 ? "Lift closed until 26 February" : "",
      late: false,
    },
    ...(OFFICE[station.id]
      ? [{ label: "Ticket office", value: OFFICE[station.id], note: "Machines open for every train", late: false }]
      : []),
  ].slice(0, 3);

  const fares = STATIONS.map((s, i) => ({ s, i }))
    .filter(({ i }) => i !== index)
    .map(({ s, i }) => {
      const km = Math.abs(s.km - station.km);
      const adult = fare(km);
      return { s, km, adult, child: childFare(adult), quick: fastest(index, i) };
    });

  const select = (id: string) => startTransition(() => setStationId(id));

  return (
    <div {...props} className={cn("min-h-dvh w-full bg-background text-foreground", className)}>
      <style href="miyuki-rail-line" precedence="miyuki">{`
@keyframes miyuki-rail-line-ping { 0% { transform: scale(1); opacity: 0.8; } 70%, 100% { transform: scale(2.2); opacity: 0; } }
`}</style>
      <header className="z-30 border-b border-border bg-background sm:sticky sm:top-0">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <LineMark />
            <div className="min-w-0">
              <h1 className="truncate text-xl leading-7 font-semibold tracking-[-0.02em]">Shiokaze Line</h1>
              <p className="truncate text-[13px] leading-5 text-muted-foreground">
                Otaru to Sapporo, run by Northline Rail
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-4 sm:w-auto">
            <Select
              aria-label="Station"
              value={stationId}
              onChange={(key) => key && select(String(key))}
              className="min-w-0 flex-1 sm:w-56 sm:flex-none"
            >
              {STATIONS.map((s) => (
                <SelectItem
                  key={s.id}
                  id={s.id}
                  textValue={s.name}
                  icon={<span className="w-7 text-xs font-medium tabular-nums">{s.code}</span>}
                >
                  {s.name}
                </SelectItem>
              ))}
            </Select>
            <StationClock size={52} seconds className="shrink-0" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6 lg:px-10">
        <section aria-labelledby="miyuki-rail-line-now" className="grid gap-6 pt-6 sm:pt-8 lg:grid-cols-12 lg:gap-8">
          <h2 id="miyuki-rail-line-now" className="sr-only">
            Departures and service notices
          </h2>
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-8">
            <DepartureBoard
              station={station.name}
              caption={caption}
              departures={departures}
              rows={6}
              interval={1_000_000_000}
              className="shadow-md"
            />
            <DotMatrixDisplay
              key={station.id}
              aria-label={ticker}
              cols={180}
              text={[
                {
                  text: ticker,
                  mode: "scroll",
                  color: late.length || index < ZENIBAKO ? "var(--chart-4)" : "var(--brand)",
                },
              ]}
              speed={18}
            />
            <dl className="mt-2 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {glance.map((g) => (
                <div
                  key={g.label}
                  className="flex items-baseline justify-between gap-4 py-3 sm:flex-col sm:justify-start sm:gap-1 sm:px-4 sm:py-4 sm:first:ps-1"
                >
                  <dt className="shrink-0 text-[13px] leading-5 text-muted-foreground">{g.label}</dt>
                  <dd className="min-w-0 text-end sm:text-start">
                    <span className="text-base leading-6 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                      {g.value}
                    </span>
                    {g.note ? (
                      <span
                        className={cn(
                          "block text-[13px] leading-5 tabular-nums",
                          g.late ? "text-warning-strong" : "text-muted-foreground",
                        )}
                      >
                        {g.note}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside aria-labelledby="miyuki-rail-line-notices" className="flex min-w-0 flex-col lg:col-span-4">
            <div className="flex items-center justify-between gap-3 pb-3">
              <h3 id="miyuki-rail-line-notices" className="text-base leading-6 font-semibold tracking-[-0.01em]">
                Service notices
              </h3>
              <Badge tone="warning" dot>
                Minor delays
              </Badge>
            </div>
            <ul className="flex flex-col divide-y divide-border border-t border-border sm:max-lg:grid sm:max-lg:grid-cols-2 sm:max-lg:gap-x-8 sm:max-lg:divide-y-0">
              {notices.map((n) => (
                <NoticeItem
                  key={`${station.id}-${n.id}`}
                  notice={n}
                  station={station.name}
                  defaultOpen={n.stations.includes(station.id)}
                />
              ))}
            </ul>
          </aside>
        </section>

        <section aria-labelledby="miyuki-rail-line-map" className="mt-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h2 id="miyuki-rail-line-map" className="text-xl leading-7 font-semibold tracking-[-0.02em]">
                The line
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nine stations along the shore, 33.8 km from Otaru to Sapporo. Choose a station to see its trains.
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <KindMark kind="express" />
              Liner trains run on weekdays only.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
            <StripMap index={index} onSelect={select} />
          </div>
        </section>

        <div className="mt-16 grid gap-x-8 gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
          <section aria-labelledby="miyuki-rail-line-timetable" className="min-w-0">
            <div className="mb-4">
              <h2 id="miyuki-rail-line-timetable" className="text-xl leading-7 font-semibold tracking-[-0.02em]">
                Timetable at {station.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Valid from 1 February 2027. Times are departures from this station.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-3 pt-3 pb-2 shadow-sm sm:px-5 sm:pt-4">
              <Tabs selectedKey={day} onSelectionChange={(key) => setDay(key as DayType)}>
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <TabList aria-label="Timetable" className="min-w-0">
                    <Tab id="weekday">Weekdays</Tab>
                    <Tab id="weekend">Weekends and holidays</Tab>
                  </TabList>
                  <ul
                    aria-label="Key"
                    className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 pb-2 text-xs text-muted-foreground"
                  >
                    {KINDS.map((kind) => (
                      <li key={kind} className="flex items-center gap-1.5">
                        <KindMark kind={kind} />
                        {KIND_NAME[kind]}
                      </li>
                    ))}
                    {index > TEINE && day === "weekday" && (
                      <li className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="text-[11px] font-semibold text-brand-strong">
                          T
                        </span>
                        Ends at Teine
                      </li>
                    )}
                  </ul>
                </div>
                {(["weekday", "weekend"] as const).map((d) => (
                  <TabPanel key={d} id={d} className="pt-1">
                    <HourTimetable index={index} day={d} now={d === "weekday" ? now : null} />
                  </TabPanel>
                ))}
              </Tabs>
            </div>
          </section>

          <section aria-labelledby="miyuki-rail-line-fares" className="min-w-0">
            <div className="mb-4">
              <h2 id="miyuki-rail-line-fares" className="text-xl leading-7 font-semibold tracking-[-0.02em]">
                Fares from {station.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Single journeys, the same by ticket or IC card.</p>
            </div>
            <Table aria-label={`Fares from ${station.name}`} density="compact" className="shadow-sm">
              <TableHeader>
                <Column isRowHeader>To</Column>
                <Column className="text-end">Fastest</Column>
                <Column className="text-end">Adult</Column>
                <Column className="text-end">Child</Column>
              </TableHeader>
              <TableBody items={fares}>
                {(f) => (
                  <Row id={f.s.id}>
                    <Cell>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{f.s.name}</span>
                        <span className="text-xs text-muted-foreground">{f.km.toFixed(1)} km</span>
                      </span>
                    </Cell>
                    <Cell className="text-end whitespace-nowrap text-muted-foreground">
                      {f.quick && (
                        <span className="inline-flex items-center gap-1.5">
                          <KindMark kind={f.quick.kind} />
                          {f.quick.minutes} min
                        </span>
                      )}
                    </Cell>
                    <Cell className="text-end font-medium">{yen(f.adult)}</Cell>
                    <Cell className="text-end text-muted-foreground">{yen(f.child)}</Cell>
                  </Row>
                )}
              </TableBody>
            </Table>
            <p className="mt-3 text-[13px] leading-5 text-pretty text-muted-foreground">
              Children aged 6 to 11 pay half the adult fare, rounded down to the nearest ¥10. Up to two children under 6
              travel free with each adult.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-4 py-8 text-[13px] leading-5 text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-10">
          <p>The Shiokaze Line is run by Northline Rail.</p>
          <p className="tabular-nums">Lost property: Otaru station, 0134-22-4810, 07:00 to 21:00 daily.</p>
        </div>
      </footer>
    </div>
  );
}
