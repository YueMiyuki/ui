"use client";

import {
  type CalendarDate,
  type CalendarDateTime,
  today as currentDate,
  DateFormatter,
  type DateValue,
  type DayOfWeek,
  endOfMonth,
  endOfWeek,
  GregorianCalendar,
  getLocalTimeZone,
  isSameDay,
  isSameMonth,
  parseDate,
  parseDateTime,
  startOfMonth,
  startOfWeek,
  toCalendar,
  toCalendarDate,
  toCalendarDateTime,
} from "@internationalized/date";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { Popover } from "@/components/miyuki-ui/popover";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | DateValue;
  end?: string | DateValue;
  calendar: string;
  location?: string;
  notes?: string;
}

export interface CalendarSource {
  id: string;
  label: string;
  color: string;
}

export interface EventCalendarProps extends Omit<ComponentProps<"div">, "children"> {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;
  today?: CalendarDate;
  firstDayOfWeek?: DayOfWeek;
  onEventClick?: (event: CalendarEvent) => void;
  onCreate?: (date: CalendarDate) => void;
  showNewEvent?: boolean;
}

const SLOTS = 3;
const gregorian = new GregorianCalendar();
const EASE_SETTLE = [0.22, 1, 0.36, 1] as const;

type Moment = CalendarDate | CalendarDateTime;

function toMoment(value: string | DateValue): Moment {
  if (typeof value === "string") return value.includes("T") ? parseDateTime(value) : parseDate(value);
  return "hour" in value ? toCalendarDateTime(value) : value;
}

function clock(moment: CalendarDateTime) {
  return `${String(moment.hour).padStart(2, "0")}:${String(moment.minute).padStart(2, "0")}`;
}

interface Item {
  event: CalendarEvent;
  color: string;
  label: string;
  first: CalendarDate;
  last: CalendarDate;
  from?: string;
  to?: string;
  allDay: boolean;
  bar: boolean;
}

function toItem(event: CalendarEvent, sources: CalendarSource[]): Item {
  const start = toMoment(event.start);
  const end = event.end != null ? toMoment(event.end) : undefined;
  const first = toCalendarDate(start);
  let last = end ? toCalendarDate(end) : first;
  if (end && "hour" in end && end.hour === 0 && end.minute === 0 && last.compare(first) > 0) {
    last = last.subtract({ days: 1 });
  }
  if (last.compare(first) < 0) last = first;
  const source = sources.find((s) => s.id === event.calendar);
  const allDay = !("hour" in start);
  return {
    event,
    color: source?.color ?? "var(--muted-foreground)",
    label: source?.label ?? event.calendar,
    first,
    last,
    from: "hour" in start ? clock(start) : undefined,
    to: end && "hour" in end ? clock(end) : undefined,
    allDay,
    bar: allDay || last.compare(first) > 0,
  };
}

function compareItems(a: Item, b: Item) {
  return (
    a.first.compare(b.first) ||
    Number(b.bar) - Number(a.bar) ||
    b.last.compare(b.first) - a.last.compare(a.first) ||
    (a.from ?? "").localeCompare(b.from ?? "") ||
    a.event.title.localeCompare(b.event.title)
  );
}

interface Segment {
  item: Item;
  col0: number;
  col1: number;
  slot: number;
  head: boolean;
  tail: boolean;
}

interface Week {
  days: CalendarDate[];
  segments: Segment[];
  perDay: Segment[][];
}

function layoutWeek(days: CalendarDate[], items: Item[]): Week {
  const d0 = days[0];
  const d6 = days[6];
  const taken: boolean[][] = [];
  const segments: Segment[] = [];
  for (const item of items) {
    if (item.last.compare(d0) < 0 || item.first.compare(d6) > 0) continue;
    const col0 = Math.max(0, item.first.compare(d0));
    const col1 = Math.min(6, item.last.compare(d0));
    let slot = 0;
    while (taken[slot]?.slice(col0, col1 + 1).some(Boolean)) slot++;
    taken[slot] ??= Array.from({ length: 7 }, () => false);
    for (let c = col0; c <= col1; c++) taken[slot][c] = true;
    segments.push({
      item,
      col0,
      col1,
      slot,
      head: item.first.compare(d0) >= 0,
      tail: item.last.compare(d6) <= 0,
    });
  }
  const perDay = days.map((_, c) => segments.filter((s) => s.col0 <= c && c <= s.col1).sort((a, b) => a.slot - b.slot));
  return { days, segments, perDay };
}

function soft(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, var(--card))`,
    color: `color-mix(in oklab, ${color} 46%, var(--foreground))`,
  };
}

type Open = { kind: "event"; item: Item; back?: CalendarDate } | { kind: "day"; day: CalendarDate };

export function EventCalendar({
  events,
  calendars,
  month,
  defaultMonth,
  onMonthChange,
  today,
  firstDayOfWeek,
  onEventClick,
  onCreate,
  showNewEvent = true,
  className,
  ...props
}: EventCalendarProps) {
  const { locale, direction } = useLocale();
  const reduce = useReducedMotion();
  const titleId = useId();

  const [clockToday, setClockToday] = useState<CalendarDate | null>(null);
  useEffect(() => {
    if (today) return;
    const frame = requestAnimationFrame(() => setClockToday(currentDate(getLocalTimeZone())));
    return () => cancelAnimationFrame(frame);
  }, [today]);
  const now = today ? toCalendarDate(today) : clockToday;

  const [innerMonth, setInnerMonth] = useState<CalendarDate | null>(() => {
    const initial = defaultMonth ?? today;
    return initial ? startOfMonth(toCalendarDate(initial)) : null;
  });
  const visible = month ? startOfMonth(toCalendarDate(month)) : (innerMonth ?? (now ? startOfMonth(now) : null));

  const setMonth = (next: CalendarDate) => {
    const first = startOfMonth(next);
    if (visible && isSameDay(first, visible)) return;
    if (month === undefined) setInnerMonth(first);
    onMonthChange?.(first);
  };

  const formats = useMemo(
    () => ({
      title: new DateFormatter(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      weekday: new DateFormatter(locale, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new DateFormatter(locale, { weekday: "long", timeZone: "UTC" }),
      monthShort: new DateFormatter(locale, { month: "short", timeZone: "UTC" }),
      day: new DateFormatter(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
      dayShort: new DateFormatter(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      full: new DateFormatter(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    }),
    [locale],
  );
  const fmt = (formatter: DateFormatter, date: CalendarDate) => {
    const day = toCalendar(date, gregorian);
    const at = new Date(0);
    at.setUTCFullYear(day.era === "BC" ? 1 - day.year : day.year, day.month - 1, day.day);
    return formatter.format(at);
  };

  const items = useMemo(() => events.map((event) => toItem(event, calendars)).sort(compareItems), [events, calendars]);

  const weeks = useMemo(() => {
    if (!visible) return [];
    const last = endOfMonth(visible);
    const out: Week[] = [];
    let cursor = startOfWeek(visible, locale, firstDayOfWeek);
    while (cursor.compare(last) <= 0) {
      const start = cursor;
      out.push(
        layoutWeek(
          Array.from({ length: 7 }, (_, i) => start.add({ days: i })),
          items,
        ),
      );
      cursor = cursor.add({ weeks: 1 });
    }
    return out;
  }, [visible, locale, firstDayOfWeek, items]);

  const gridStart = weeks[0]?.days[0];
  const gridEnd = weeks.at(-1)?.days[6];
  const inGrid = (day: CalendarDate) =>
    gridStart != null && gridEnd != null && day.compare(gridStart) >= 0 && day.compare(gridEnd) <= 0;

  const [focused, setFocused] = useState<CalendarDate | null>(null);
  const focusDay = focused && inGrid(focused) ? focused : now && visible && isSameMonth(now, visible) ? now : visible;
  const focusKey = focusDay?.toString() ?? "";

  const gridRef = useRef<HTMLDivElement>(null);
  const weeksRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focusKey}"]`)?.focus();
  }, [focusKey]);

  const monthKey = visible?.toString() ?? "";
  const previousMonth = useRef(monthKey);
  useLayoutEffect(() => {
    const before = previousMonth.current;
    previousMonth.current = monthKey;
    if (!before || before === monthKey || !weeksRef.current) return;
    const dir = monthKey > before ? 1 : -1;
    const controls = animate(
      weeksRef.current,
      reduce ? { opacity: [0.4, 1] } : { opacity: [0, 1], x: [dir * (direction === "rtl" ? -12 : 12), 0] },
      { duration: reduce ? 0.12 : 0.24, ease: EASE_SETTLE },
    );
    return () => controls.stop();
  }, [monthKey, reduce, direction]);

  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 672));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [open, setOpen] = useState<Open | null>(null);
  const anchorRef = useRef<Element | null>(null);

  const showEvent = (item: Item, anchor: Element, back?: CalendarDate) => {
    anchorRef.current = anchor;
    setOpen({ kind: "event", item, back });
    onEventClick?.(item.event);
  };
  const showDay = (day: CalendarDate, anchor: Element) => {
    anchorRef.current = anchor;
    setOpen({ kind: "day", day });
  };

  const moveTo = (next: CalendarDate, switchMonth = false) => {
    setFocused(next);
    if (switchMonth || !inGrid(next)) setMonth(next);
    pendingFocus.current = true;
  };

  const onDayKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, day: CalendarDate, count: number) => {
    if (event.target !== event.currentTarget) return;
    const back = direction === "rtl" ? 1 : -1;
    let next: CalendarDate;
    let switchMonth = false;
    switch (event.key) {
      case "ArrowLeft":
        next = day.add({ days: back });
        break;
      case "ArrowRight":
        next = day.add({ days: -back });
        break;
      case "ArrowUp":
        next = day.subtract({ weeks: 1 });
        break;
      case "ArrowDown":
        next = day.add({ weeks: 1 });
        break;
      case "Home":
        next = startOfWeek(day, locale, firstDayOfWeek);
        break;
      case "End":
        next = endOfWeek(day, locale, firstDayOfWeek);
        break;
      case "PageUp":
        next = day.subtract(event.shiftKey ? { years: 1 } : { months: 1 });
        switchMonth = true;
        break;
      case "PageDown":
        next = day.add(event.shiftKey ? { years: 1 } : { months: 1 });
        switchMonth = true;
        break;
      case "Enter":
      case " ":
        if (count > 0) {
          event.preventDefault();
          showDay(day, event.currentTarget);
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    moveTo(next, switchMonth);
  };

  const step = (months: number) => {
    if (!visible) return;
    const next = visible.add({ months });
    setMonth(next);
    setFocused(null);
  };

  const goToday = () => {
    if (!now) return;
    setMonth(now);
    setFocused(now);
  };

  const dayItems = (day: CalendarDate) =>
    items.filter((item) => item.first.compare(day) <= 0 && item.last.compare(day) >= 0);

  const when = (item: Item) => {
    const single = isSameDay(item.first, item.last);
    if (single) {
      const time = item.allDay ? "All day" : item.to ? `${item.from}–${item.to}` : item.from;
      return `${fmt(formats.day, item.first)} · ${time}`;
    }
    const from = fmt(formats.dayShort, item.first) + (item.from ? `, ${item.from}` : "");
    const to = fmt(formats.dayShort, item.last) + (item.to ? `, ${item.to}` : "");
    return `${from} – ${to}`;
  };

  const newEventDay = focusDay ?? now;

  return (
    <div {...props} className={cn("@container flex w-full flex-col gap-4 text-foreground", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2
            id={titleId}
            aria-live="polite"
            className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em] text-foreground"
          >
            {visible ? fmt(formats.title, visible) : " "}
          </h2>
          {calendars.length > 0 && (
            <ul
              aria-label="Calendars"
              className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted-foreground"
            >
              {calendars.map((source) => (
                <li key={source.id} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: source.color }} />
                  {source.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <IconButton aria-label="Previous month" className="rounded-e-none" onPress={() => step(-1)}>
              <ChevronLeft className="rtl:rotate-180" />
            </IconButton>
            <Button
              variant="secondary"
              className="-ms-px rounded-none data-[focus-visible]:z-10"
              isDisabled={!now}
              onPress={goToday}
            >
              Today
            </Button>
            <IconButton
              aria-label="Next month"
              className="-ms-px rounded-s-none data-[focus-visible]:z-10"
              onPress={() => step(1)}
            >
              <ChevronRight className="rtl:rotate-180" />
            </IconButton>
          </div>
          {showNewEvent && (
            <Button iconStart={<Plus />} onPress={() => newEventDay && onCreate?.(newEventDay)}>
              New event
            </Button>
          )}
        </div>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={titleId}
        className="overflow-clip rounded-xl border border-border bg-card"
      >
        <div
          role="row"
          className="grid grid-cols-7 gap-px border-b border-border bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))]"
        >
          {weeks[0]?.days.map((day) => (
            <div
              key={day.toString()}
              role="columnheader"
              aria-label={fmt(formats.weekdayLong, day)}
              className="truncate px-2 py-2 text-xs font-medium text-muted-foreground @max-2xl:text-center"
            >
              {fmt(formats.weekday, day)}
            </div>
          ))}
        </div>

        <div ref={weeksRef} role="rowgroup" className="grid gap-px bg-border">
          {weeks.map((week) => (
            <div key={week.days[0].toString()} className="relative">
              <div role="row" className="grid grid-cols-7 gap-px">
                {week.days.map((day, col) => {
                  const list = week.perDay[col];
                  const hidden = list.filter((s) => s.slot >= SLOTS).length;
                  const outside = !visible || !isSameMonth(day, visible);
                  const isToday = now != null && isSameDay(day, now);
                  const key = day.toString();
                  const count = list.length;
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      data-date={key}
                      tabIndex={key === focusKey ? 0 : -1}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={[
                        fmt(formats.full, day),
                        isToday ? "today" : null,
                        count ? `${count} ${count === 1 ? "event" : "events"}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      onKeyDown={(event) => onDayKeyDown(event, day, count)}
                      onFocus={(event) => {
                        if (event.target === event.currentTarget) setFocused(day);
                      }}
                      onClick={(event) => {
                        if (compact && count > 0) showDay(day, event.currentTarget);
                      }}
                      onDoubleClick={() => onCreate?.(day)}
                      className={cn(
                        "relative flex min-h-16 flex-col outline-none @2xl:min-h-[122px]",
                        "focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                        outside
                          ? "bg-[color-mix(in_oklab,var(--muted)_55%,var(--card))] dark:bg-[color-mix(in_oklab,var(--background)_70%,var(--card))]"
                          : "bg-card",
                        compact && count > 0 && "cursor-default",
                      )}
                    >
                      <div aria-hidden="true" className="flex px-1.5 pt-1.5 @max-2xl:justify-center">
                        <span
                          className={cn(
                            "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] leading-none tabular-nums",
                            isToday
                              ? "bg-brand font-semibold text-brand-foreground"
                              : outside
                                ? "text-muted-foreground"
                                : "font-medium text-foreground",
                          )}
                        >
                          {day.day === 1 && !isToday && (
                            <span className="whitespace-pre @max-2xl:hidden">{`${fmt(formats.monthShort, day)} `}</span>
                          )}
                          {day.day}
                        </span>
                      </div>
                      {count > 0 && (
                        <div aria-hidden="true" className="mt-1.5 flex justify-center gap-1 @2xl:hidden">
                          {list.slice(0, 3).map((s) => (
                            <span
                              key={s.item.event.id}
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: s.item.color }}
                            />
                          ))}
                          {count > 3 && <span className="size-1.5 rounded-full bg-muted-foreground/50" />}
                        </div>
                      )}
                      {hidden > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            showDay(day, event.currentTarget);
                          }}
                          className={cn(
                            "absolute start-1 top-[101px] hidden h-[18px] items-center rounded-md px-1.5 text-xs font-medium text-muted-foreground @2xl:flex",
                            "transition-colors duration-150 hover:bg-accent hover:text-foreground",
                            open?.kind === "day" && isSameDay(open.day, day) && "bg-accent text-foreground",
                          )}
                        >
                          +{hidden} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[35px] hidden grid-cols-7 gap-x-px gap-y-0.5 @2xl:grid"
                style={{ gridTemplateRows: `repeat(${SLOTS}, 20px)` }}
              >
                {week.segments
                  .filter((s) => s.slot < SLOTS)
                  .map((s) => {
                    const { item } = s;
                    const faded =
                      visible != null && week.days.slice(s.col0, s.col1 + 1).every((day) => !isSameMonth(day, visible));
                    const isOpen = open?.kind === "event" && open.item.event.id === item.event.id;
                    const showTime = item.from && (!item.bar || s.head);
                    return (
                      <button
                        key={item.event.id}
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => showEvent(item, event.currentTarget)}
                        style={{
                          gridColumn: `${s.col0 + 1} / ${s.col1 + 2}`,
                          gridRow: s.slot + 1,
                          ...(item.bar ? soft(item.color) : null),
                        }}
                        className={cn(
                          "pointer-events-auto flex h-5 min-w-0 items-center gap-1 rounded-md px-1.5 text-start text-xs leading-none outline-none",
                          "transition-[background-color,filter,box-shadow] duration-150",
                          item.bar
                            ? "font-medium hover:brightness-[0.94] dark:hover:brightness-125"
                            : "text-foreground hover:bg-accent",
                          s.head ? "ms-1" : "rounded-s-none",
                          s.tail ? "me-1" : "rounded-e-none",
                          faded && "opacity-55",
                          isOpen && (item.bar ? "ring-2 ring-ring" : "bg-accent"),
                        )}
                      >
                        {!item.bar && (
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        )}
                        {showTime && (
                          <span
                            className={cn("shrink-0 tabular-nums", item.bar ? "opacity-75" : "text-muted-foreground")}
                          >
                            {item.from}
                          </span>
                        )}
                        <span className={cn("truncate leading-4", !item.bar && "font-medium")}>{item.event.title}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Popover
        triggerRef={anchorRef}
        isOpen={open != null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpen(null);
        }}
        placement="bottom start"
        offset={6}
        aria-label={open?.kind === "event" ? open.item.event.title : open ? fmt(formats.day, open.day) : undefined}
        className={open?.kind === "day" ? "w-72 p-2" : "w-80"}
      >
        {open?.kind === "event" ? (
          <EventDetails
            item={open.item}
            when={when(open.item)}
            onBack={open.back ? () => setOpen({ kind: "day", day: open.back! }) : undefined}
            backLabel={open.back ? `Back to ${fmt(formats.day, open.back)}` : undefined}
          />
        ) : open?.kind === "day" ? (
          <DayList
            title={fmt(formats.day, open.day)}
            items={dayItems(open.day)}
            onPick={(item) => {
              setOpen({ kind: "event", item, back: open.day });
              onEventClick?.(item.event);
            }}
          />
        ) : null}
      </Popover>
    </div>
  );
}

function EventDetails({
  item,
  when,
  onBack,
  backLabel,
}: {
  item: Item;
  when: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const { event } = item;
  return (
    <div className="flex flex-col">
      <div className="flex h-6 items-center gap-1.5">
        {onBack && (
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={backLabel ?? "Back"}
            onPress={onBack}
            className="-ms-1.5 size-6 rounded-md text-muted-foreground data-[hovered]:text-foreground"
          >
            <ChevronLeft className="rtl:rotate-180" />
          </IconButton>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      </div>
      <h3 className="mt-1.5 text-[15px] leading-snug font-semibold text-foreground">{event.title}</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] leading-5 text-foreground">
        <li className="flex gap-2.5">
          <Clock aria-hidden="true" className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" />
          <span className="tabular-nums">{when}</span>
        </li>
        {event.location && (
          <li className="flex gap-2.5">
            <MapPin aria-hidden="true" className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" />
            <span>{event.location}</span>
          </li>
        )}
      </ul>
      {event.notes && (
        <p className="mt-3 border-t border-border pt-3 text-[13px] leading-5 text-muted-foreground">{event.notes}</p>
      )}
    </div>
  );
}

function DayList({ title, items, onPick }: { title: string; items: Item[]; onPick: (item: Item) => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? "event" : "events"}
        </p>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.event.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-start outline-none",
                "transition-colors duration-100 hover:bg-accent focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              <span
                aria-hidden="true"
                className="mt-[7px] size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] leading-5 font-medium text-foreground">{item.event.title}</span>
                <span className="text-xs leading-4 text-muted-foreground tabular-nums">
                  {item.allDay ? "All day" : item.to ? `${item.from}–${item.to}` : item.from}
                  {" · "}
                  {item.label}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
