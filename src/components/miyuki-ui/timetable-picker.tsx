"use client";

import {
  type ComponentProps,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type TrainKind = "local" | "rapid" | "express";

export interface Departure {
  time: string;
  kind: TrainKind;
  arrives: string;
  to?: string;
  platform?: string;
}

export interface TimetablePickerProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  departures: readonly Departure[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (time: string, departure: Departure) => void;
  now?: string;
  allowPast?: boolean;
  from?: string;
  to?: string;
  label?: ReactNode;
  description?: ReactNode;
  kindLabels?: Partial<Record<TrainKind, string>>;
}

const defaultKindLabels: Record<TrainKind, string> = { local: "Local", rapid: "Rapid", express: "Express" };

function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function KindMark({ kind, className }: { kind: TrainKind; className?: string }) {
  if (kind === "local") return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 8 8" className={cn("size-2 shrink-0", className)}>
      {kind === "express" ? (
        <path d="M4 0.3 7.7 4 4 7.7 0.3 4Z" fill="currentColor" />
      ) : (
        <circle cx={4} cy={4} r={3.4} fill="currentColor" />
      )}
    </svg>
  );
}

const markColor: Record<TrainKind, string> = {
  local: "",
  rapid: "text-chart-2",
  express: "text-chart-3",
};

function formatDuration(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function TimetablePicker({
  departures,
  value,
  defaultValue = null,
  onChange,
  now,
  allowPast = false,
  from,
  to,
  label = "Departures",
  description,
  kindLabels,
  className,
  ...props
}: TimetablePickerProps) {
  const id = useId();
  const labels = { ...defaultKindLabels, ...kindLabels };
  const [inner, setInner] = useState<string | null>(defaultValue);
  const selected = value !== undefined ? value : inner;
  const [focusTime, setFocusTime] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => [...departures].sort((a, b) => minutes(a.time) - minutes(b.time)), [departures]);
  const hours = useMemo(() => {
    const map = new Map<number, Departure[]>();
    for (const d of sorted) {
      const h = Math.floor(minutes(d.time) / 60);
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(d);
    }
    if (map.size === 0) return [];
    const keys = [...map.keys()];
    const out: { hour: number; items: Departure[] }[] = [];
    for (let h = Math.min(...keys); h <= Math.max(...keys); h++) out.push({ hour: h, items: map.get(h) ?? [] });
    return out;
  }, [sorted]);

  const nowMin = now != null ? minutes(now) : null;
  const next = nowMin != null ? sorted.find((d) => minutes(d.time) >= nowMin) : undefined;
  const nowHour = nowMin != null ? Math.floor(nowMin / 60) : null;
  const chosen = sorted.find((d) => d.time === selected) ?? null;
  const tabTime =
    (focusTime && sorted.some((d) => d.time === focusTime) ? focusTime : null) ??
    chosen?.time ??
    next?.time ??
    sorted[0]?.time;

  const closed = (d: Departure) => !allowPast && nowMin != null && minutes(d.time) < nowMin;

  const choose = (d: Departure) => {
    if (closed(d)) return;
    if (value === undefined) setInner(d.time);
    onChange?.(d.time, d);
  };

  const focusCell = (time: string) => {
    setFocusTime(time);
    gridRef.current?.querySelector<HTMLElement>(`[data-time="${time}"]`)?.focus();
  };

  const onCellKey = (event: KeyboardEvent<HTMLDivElement>, d: Departure) => {
    const rows = hours.filter((r) => r.items.length > 0);
    const ri = rows.findIndex((r) => r.items.includes(d));
    const row = rows[ri];
    const ci = row.items.indexOf(d);
    const nearestIn = (target: (typeof rows)[number]) => {
      const here = event.currentTarget.getBoundingClientRect();
      const cx = here.left + here.width / 2;
      let best = target.items[0];
      let bestDist = Infinity;
      for (const item of target.items) {
        const el = gridRef.current?.querySelector<HTMLElement>(`[data-time="${item.time}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - cx) + Math.abs(r.top - here.top) * 0.01;
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
      return best;
    };
    let target: Departure | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = row.items[ci + 1] ?? rows[ri + 1]?.items[0];
        break;
      case "ArrowLeft":
        target = row.items[ci - 1] ?? rows[ri - 1]?.items.at(-1);
        break;
      case "ArrowDown":
        if (rows[ri + 1]) target = nearestIn(rows[ri + 1]);
        break;
      case "ArrowUp":
        if (rows[ri - 1]) target = nearestIn(rows[ri - 1]);
        break;
      case "Home":
        target = event.ctrlKey || event.metaKey ? rows[0].items[0] : row.items[0];
        break;
      case "End":
        target = event.ctrlKey || event.metaKey ? rows.at(-1)?.items.at(-1) : row.items.at(-1);
        break;
      case "PageDown":
        target = rows[Math.min(rows.length - 1, ri + 3)]?.items[0];
        break;
      case "PageUp":
        target = rows[Math.max(0, ri - 3)]?.items[0];
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(d);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (target) focusCell(target.time);
  };

  const describe = (d: Departure) => {
    const parts = [d.time, labels[d.kind]];
    if (d.to) parts.push(`to ${d.to}`);
    parts.push(`arrives ${d.arrives}`);
    if (next === d) parts.push("next departure");
    else if (nowMin != null && minutes(d.time) < nowMin) parts.push("departed");
    return parts.join(", ");
  };

  const duration = chosen ? (minutes(chosen.arrives) - minutes(chosen.time) + 1440) % 1440 : 0;
  const wait = next && nowMin != null ? minutes(next.time) - nowMin : null;

  return (
    <div
      {...props}
      className={cn(
        "flex w-full max-w-[560px] flex-col overflow-clip rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-5 pb-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={`${id}-label`} className="text-base leading-6 font-semibold tracking-[-0.01em]">
            {label}
          </span>
          {description != null && <span className="text-[13px] text-muted-foreground">{description}</span>}
        </div>
        <ul aria-label="Key" className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground">
          {now != null && (
            <li className="flex items-center gap-1.5 text-brand-strong tabular-nums">
              <span aria-hidden="true" className="relative h-3 w-0.5 rounded-full bg-brand">
                <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand" />
              </span>
              Now {now}
            </li>
          )}
          {(["express", "rapid", "local"] as const).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              {k === "local" ? (
                <span aria-hidden="true" className="size-2 rounded-full ring-1 ring-border-strong ring-inset" />
              ) : (
                <KindMark kind={k} className={markColor[k]} />
              )}
              {labels[k]}
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        aria-rowcount={hours.length}
        className="flex flex-col border-t border-border"
      >
        {hours.map(({ hour, items }, ri) => {
          const current = hour === nowHour;
          return (
            <div
              key={hour}
              role="row"
              aria-rowindex={ri + 1}
              className={cn("flex min-h-11 border-b border-border last:border-b-0", current && "bg-brand-soft/35")}
            >
              <div
                role="rowheader"
                aria-label={`${pad(hour)}:00`}
                className={cn(
                  "flex w-14 shrink-0 items-center justify-end border-e border-border pe-3.5 text-base font-semibold tabular-nums",
                  current ? "text-brand-strong" : "text-foreground",
                )}
              >
                {hour}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0.5 gap-y-1 px-2 py-1">
                {items.length === 0 && (
                  <span aria-hidden="true" className="px-2 text-sm text-muted-foreground/60">
                    –
                  </span>
                )}
                {items.map((d) => {
                  const tick = d === next && current && nowMin != null && minutes(d.time) > nowMin;
                  const isSelected = d.time === selected;
                  const isNext = d === next;
                  const gone = nowMin != null && minutes(d.time) < nowMin;
                  return (
                    <Fragment key={d.time}>
                      {tick && (
                        <span
                          aria-hidden="true"
                          className="relative mx-1 flex h-7 w-0.5 flex-col items-center rounded-full bg-brand"
                        >
                          <span className="absolute -top-1 size-1.5 rounded-full bg-brand" />
                        </span>
                      )}
                      <div
                        role="gridcell"
                        data-time={d.time}
                        aria-selected={isSelected}
                        aria-disabled={closed(d) || undefined}
                        aria-label={describe(d)}
                        tabIndex={d.time === tabTime ? 0 : -1}
                        onClick={() => {
                          setFocusTime(d.time);
                          choose(d);
                        }}
                        onFocus={() => setFocusTime(d.time)}
                        onKeyDown={(event) => onCellKey(event, d)}
                        className={cn(
                          "group/cell relative flex h-9 w-11 cursor-default items-center justify-center rounded-md text-[15px] tabular-nums outline-none select-none",
                          "transition-[transform,color] duration-150 ease-settle active:scale-[0.94]",
                          "focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring",
                          d.kind === "express" && "font-semibold",
                          isSelected ? "text-brand-foreground" : gone ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-0 rounded-md transition-[transform,opacity,background-color] duration-200 ease-settle motion-reduce:transition-none",
                            isSelected
                              ? "scale-100 bg-brand opacity-100"
                              : "scale-75 opacity-0 group-hover/cell:scale-100 group-hover/cell:bg-accent group-hover/cell:opacity-100",
                          )}
                        />
                        {isNext && !isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-md ring-[1.5px] ring-brand ring-inset"
                          />
                        )}
                        <span className="relative">
                          {d.kind !== "local" && (
                            <KindMark
                              kind={d.kind}
                              className={cn(
                                "absolute top-0.5 -left-2.5",
                                isSelected ? "text-brand-foreground" : markColor[d.kind],
                                gone && !isSelected && "opacity-60",
                              )}
                            />
                          )}
                          {d.time.slice(-2)}
                        </span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <span id={`${id}-help`} className="sr-only">
        Arrow keys move between departures. Enter chooses one.
      </span>

      <div className="border-t border-border bg-muted/60 px-5 py-4" aria-live="polite">
        {chosen ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
              <span className="me-0.5 flex items-center gap-1.5 font-medium text-foreground">
                {chosen.kind === "local" ? (
                  <span aria-hidden="true" className="size-2 rounded-full ring-1 ring-border-strong ring-inset" />
                ) : (
                  <KindMark kind={chosen.kind} className={markColor[chosen.kind]} />
                )}
                {labels[chosen.kind]}
              </span>
              {chosen.to && <span>for {chosen.to}</span>}
              {chosen.platform && <span>· Platform {chosen.platform}</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-display text-2xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                  {chosen.time}
                </span>
                {from && <span className="mt-1 text-xs text-muted-foreground">{from}</span>}
              </div>
              <div className="flex min-w-12 flex-1 flex-col items-center gap-1 self-start pt-1.5">
                <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(duration)}</span>
                <span aria-hidden="true" className="relative h-px w-full bg-border-strong">
                  <span className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 rounded-full bg-foreground" />
                  <span className="absolute top-1/2 right-0 size-1.5 -translate-y-1/2 rounded-full bg-foreground" />
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-display text-2xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                  {chosen.arrives}
                </span>
                {to && <span className="mt-1 text-xs text-muted-foreground">{to}</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {next && wait != null ? (
              <>
                Next departure <span className="font-medium text-foreground tabular-nums">{next.time}</span>,{" "}
                {wait === 0 ? "leaving now" : `in ${formatDuration(wait)}`}. Choose a time to see when you arrive.
              </>
            ) : (
              "Choose a time to see when you arrive."
            )}
          </p>
        )}
      </div>
    </div>
  );
}
