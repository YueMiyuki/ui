"use client";

import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { SplitFlapBoard } from "@/components/miyuki-ui/split-flap-board";
import { cn } from "@/lib/utils";

export interface Departure {
  time: string;
  destination: string;
  train: string;
  track: string | number;
  delay?: number;
}

export interface DepartureBoardProps extends Omit<ComponentProps<"section">, "children"> {
  departures: Departure[];
  interval?: number;
  rows?: number;
  station?: string;
  caption?: ReactNode;
  time?: string;
}

type FieldKey = "time" | "destination" | "train" | "track" | "status" | "delay";

interface Field {
  key: FieldKey;
  label: string;
  width: number;
}

const WIDE: Field[] = [
  { key: "time", label: "Time", width: 5 },
  { key: "destination", label: "Destination", width: 10 },
  { key: "train", label: "Train", width: 5 },
  { key: "track", label: "Track", width: 2 },
  { key: "status", label: "Status", width: 7 },
];

const COMPACT: Field[] = [
  { key: "time", label: "Time", width: 5 },
  { key: "destination", label: "Destination", width: 9 },
  { key: "track", label: "Track", width: 2 },
  { key: "delay", label: "Delay", width: 3 },
];

const COMPACT_BELOW = 520;
const DELAY = /\+\d+(?: MIN)?/;
const CELL = "--miyuki-departure-board-cell";
const INNER = "2px";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatClock(minutes: number): string {
  const day = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(day / 60)).padStart(2, "0")}:${String(day % 60).padStart(2, "0")}`;
}

function status(d: Departure): string {
  return d.delay && d.delay > 0 ? `+${d.delay} MIN` : "ON TIME";
}

function cell(d: Departure, key: FieldKey): string {
  switch (key) {
    case "time":
      return d.time;
    case "destination":
      return d.destination;
    case "train":
      return d.train;
    case "track":
      return String(d.track);
    case "status":
      return status(d);
    case "delay":
      return d.delay && d.delay > 0 ? `+${d.delay}` : "";
  }
}

function fit(text: string, width: number): string {
  return Array.from(text.toUpperCase()).slice(0, width).join("").padEnd(width);
}

function spoken(d: Departure): string {
  const delay = d.delay && d.delay > 0 ? `, ${d.delay} minutes late` : "";
  return `${d.time} ${d.train.toLowerCase()} to ${d.destination}${delay}`;
}

export function DepartureBoard({
  departures,
  interval = 7000,
  rows = 6,
  station = "Departures",
  caption = "Departures",
  time,
  className,
  ...props
}: DepartureBoardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef(departures);
  const headRef = useRef(0);
  const count = departures.length;
  const firstTarget = count > 0 ? toMinutes(departures[0].time) + (departures[0].delay ?? 0) : 0;
  const start = time != null ? Math.min(toMinutes(time), firstTarget) : null;
  const clockRef = useRef<number | null>(start);

  const [compact, setCompact] = useState(false);
  const [head, setHead] = useState(0);
  const [clock, setClock] = useState<number | null>(start);
  const [now, setNow] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const signature = departures.map((d) => `${d.time}|${d.destination}|${d.train}|${d.track}|${d.delay ?? 0}`).join(";");

  useEffect(() => {
    listRef.current = departures;
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setCompact(el.clientWidth < COMPACT_BELOW));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (time != null) return;
    let timer = 0;
    const tick = () => {
      const date = new Date();
      setNow(date.getHours() * 60 + date.getMinutes());
      timer = window.setTimeout(tick, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()) + 30);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [time]);

  useEffect(() => {
    const list = listRef.current;
    const n = list.length;
    if (n === 0) return;
    const span = Math.max(1000, interval);
    const timeline = start != null;
    let timers: number[] = [];
    let current = headRef.current % n;
    let minutes = clockRef.current ?? start ?? 0;
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const cycle = () => {
      timers = [];
      const top = list[current];
      if (timeline && start != null) {
        const target = toMinutes(top.time) + (top.delay ?? 0);
        if (target < minutes && current === 0) {
          minutes = Math.min(start, target);
          const reset = minutes;
          later(() => {
            clockRef.current = reset;
            setClock(reset);
          }, 0);
        }
        const diff = Math.max(0, target - minutes);
        const steps = Math.min(diff, 10);
        const from = minutes;
        for (let k = 1; k <= steps; k++) {
          const value = k === steps ? target : Math.round(from + (diff * k) / steps);
          later(
            () => {
              clockRef.current = value;
              setClock(value);
            },
            (span * 0.82 * k) / steps,
          );
        }
        minutes = Math.max(minutes, target);
      }
      later(() => {
        current = (current + 1) % n;
        headRef.current = current;
        setHead(current);
        setMessage(`${spoken(top)} has departed.`);
        cycle();
      }, span);
    };

    cycle();
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [signature, interval, start]);

  const fields = compact ? COMPACT : WIDE;
  const flaps = fields.reduce((sum, f) => sum + f.width, 0);
  const top = count > 0 ? head % count : 0;
  const visible = Array.from({ length: Math.max(1, rows) }, (_, r) =>
    r < count ? departures[(top + r) % count] : null,
  );
  const shown = time != null ? clock : now;
  const clockText = shown == null ? "--:--" : formatClock(shown);
  const span = (width: number, scale = 1) => `calc(${width * scale} * var(${CELL}) + ${width - 1} * ${INNER})`;
  const housing = "rounded-none border-0 bg-transparent p-0 shadow-none sm:p-0 dark:bg-transparent";

  return (
    <section
      aria-label={`Departures from ${station}`}
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5",
        className,
      )}
    >
      <div
        ref={rootRef}
        className="@container"
        style={
          {
            [CELL]: `min(40px, calc((100cqi - ${flaps - fields.length} * ${INNER}) / ${flaps + fields.length - 1}))`,
          } as CSSProperties
        }
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">{station}</h3>
            <p className="text-[13px] leading-5 text-pretty text-muted-foreground">{caption}</p>
          </div>
          <div className="shrink-0">
            <p className="sr-only">Time {clockText}</p>
            <div aria-hidden="true" style={{ width: span(5, 1.12) }}>
              <SplitFlapBoard text={clockText} rows={1} cols={5} duration={720} className={housing} />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="mt-5 flex" style={{ columnGap: `var(${CELL})` }}>
          {fields.map((f) => (
            <span
              key={f.key}
              className="flex-none overflow-visible text-xs leading-4 whitespace-nowrap text-muted-foreground"
              style={{ width: span(f.width) }}
            >
              {f.label}
            </span>
          ))}
        </div>

        <div
          key={compact ? "compact" : "wide"}
          aria-hidden="true"
          className="mt-2 flex"
          style={{ columnGap: `var(${CELL})` }}
        >
          {fields.map((f) => (
            <div key={f.key} data-field={f.key} className="flex-none" style={{ width: span(f.width) }}>
              <SplitFlapBoard
                text={visible.map((d) => (d ? fit(cell(d, f.key), f.width) : "")).join("\n")}
                rows={Math.max(1, rows)}
                cols={f.width}
                accent={f.key === "status" || f.key === "delay" ? DELAY : undefined}
                className={housing}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>Departures from {station}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Destination</th>
              <th scope="col">Train</th>
              <th scope="col">Track</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d, i) =>
              d ? (
                <tr key={i}>
                  <th scope="row">{d.time}</th>
                  <td>{d.destination}</td>
                  <td>{d.train}</td>
                  <td>{d.track}</td>
                  <td>{d.delay && d.delay > 0 ? `${d.delay} minutes late` : "On time"}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
