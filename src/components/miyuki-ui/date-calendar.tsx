"use client";

import type { CalendarDate } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import { type Ref, useContext, useLayoutEffect, useRef } from "react";
import {
  Calendar as AriaCalendar,
  type CalendarProps as AriaCalendarProps,
  RangeCalendar as AriaRangeCalendar,
  type RangeCalendarProps as AriaRangeCalendarProps,
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  CalendarStateContext,
  composeRenderProps,
  type DateValue,
  RangeCalendarStateContext,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type VisibleMonths = 1 | 2;

const EASE_SETTLE = [0.22, 1, 0.36, 1] as const;

function Day({ date, range }: { date: CalendarDate; range: boolean }) {
  const firstOfMonth = date.day === 1;
  const lastOfMonth = date.day === date.calendar.getDaysInMonth(date);

  return (
    <CalendarCell
      date={date}
      className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideMonth }) => {
        const banded = range && isSelected && !isOutsideMonth;
        const middle = banded && !isSelectionStart && !isSelectionEnd;
        const startTail = banded && isSelectionStart && !isSelectionEnd && !lastOfMonth;
        const endTail = banded && isSelectionEnd && !isSelectionStart && !firstOfMonth;
        return cn(
          "relative flex size-9 cursor-default items-center justify-center outline-none",
          "data-[outside-month]:invisible data-[disabled]:cursor-not-allowed",
          middle && "bg-brand-soft [td:first-child>&]:rounded-s-full [td:last-child>&]:rounded-e-full",
          middle && firstOfMonth && "rounded-s-full",
          middle && lastOfMonth && "rounded-e-full",
          (startTail || endTail) && "before:absolute before:inset-y-0 before:bg-brand-soft",
          startTail && "before:start-1/2 before:end-0 [td:last-child>&]:before:hidden",
          endTail && "before:start-0 before:end-1/2 [td:first-child>&]:before:hidden",
        );
      }}
    >
      {({
        formattedDate,
        isSelected,
        isSelectionStart,
        isSelectionEnd,
        isHovered,
        isPressed,
        isFocusVisible,
        isDisabled,
        isUnavailable,
        isToday,
      }) => {
        const end = isSelected && (!range || isSelectionStart || isSelectionEnd);
        const middle = range && isSelected && !end;
        return (
          <span
            key={date.toString()}
            className={cn(
              "relative flex size-9 items-center justify-center rounded-full text-sm tabular-nums",
              "transition-[background-color,color,box-shadow,scale] duration-150 ease-settle motion-reduce:transition-none",
              end
                ? "bg-brand font-medium text-brand-foreground"
                : middle
                  ? cn("text-foreground", isHovered && "bg-brand/15")
                  : cn("text-foreground", isHovered && !isUnavailable && !isDisabled && "bg-accent"),
              isToday && !end && "ring-1 ring-brand ring-inset",
              isUnavailable && "text-muted-foreground line-through decoration-1",
              isDisabled && "text-muted-foreground opacity-50",
              isPressed && !isUnavailable && "scale-[0.92]",
              isFocusVisible && "z-10 ring-[3px] ring-ring ring-offset-0",
            )}
          >
            {formattedDate}
          </span>
        );
      }}
    </CalendarCell>
  );
}

const navButton = cn(
  "flex size-9 cursor-default items-center justify-center rounded-full text-muted-foreground outline-none",
  "transition-[background-color,color,scale] duration-150 ease-settle",
  "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:scale-[0.94]",
  "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
);

function Months({ count, range }: { count: VisibleMonths; range: boolean }) {
  const single = useContext(CalendarStateContext);
  const ranged = useContext(RangeCalendarStateContext);
  const state = range ? ranged : single;
  const monthKey = state?.visibleRange.start.toString() ?? "";

  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(monthKey);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = monthKey;
    if (before === monthKey || !root.current) return;
    const bodies = root.current.querySelectorAll("tbody");
    const direction = monthKey > before ? 1 : -1;
    const controls = animate(bodies, reduce ? { opacity: [0.4, 1] } : { opacity: [0, 1], x: [direction * 10, 0] }, {
      duration: reduce ? 0.12 : 0.24,
      ease: EASE_SETTLE,
    });
    return () => controls.stop();
  }, [monthKey, reduce]);

  return (
    <div ref={root} className="flex flex-wrap justify-center gap-x-8 gap-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            {i === 0 ? (
              <Button slot="previous" className={navButton}>
                <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Button>
            ) : (
              <span className="size-9" />
            )}
            <CalendarHeading
              offset={{ months: i }}
              className="flex-1 truncate text-center text-sm font-medium text-foreground"
            />
            {i === count - 1 ? (
              <Button slot="next" className={navButton}>
                <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Button>
            ) : (
              <span className="size-9" />
            )}
          </div>
          <CalendarGrid
            offset={{ months: i }}
            weekdayStyle="narrow"
            className="border-separate border-spacing-x-0 border-spacing-y-0.5"
          >
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="h-8 w-9 p-0 text-xs font-normal text-muted-foreground">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>
            <CalendarGridBody>{(date) => <Day date={date} range={range} />}</CalendarGridBody>
          </CalendarGrid>
        </div>
      ))}
    </div>
  );
}

export interface CalendarProps<T extends DateValue = DateValue>
  extends Omit<AriaCalendarProps<T>, "visibleDuration" | "children"> {
  visibleMonths?: VisibleMonths;
  ref?: Ref<HTMLDivElement>;
}

export function Calendar<T extends DateValue>({ visibleMonths = 1, className, ...props }: CalendarProps<T>) {
  return (
    <AriaCalendar
      {...props}
      visibleDuration={{ months: visibleMonths }}
      className={composeRenderProps(className, (cls) =>
        cn("w-fit max-w-full text-foreground data-[disabled]:opacity-50", cls),
      )}
    >
      <Months count={visibleMonths} range={false} />
    </AriaCalendar>
  );
}

export interface RangeCalendarProps<T extends DateValue = DateValue>
  extends Omit<AriaRangeCalendarProps<T>, "visibleDuration" | "children"> {
  visibleMonths?: VisibleMonths;
  ref?: Ref<HTMLDivElement>;
}

export function RangeCalendar<T extends DateValue>({ visibleMonths = 1, className, ...props }: RangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      {...props}
      visibleDuration={{ months: visibleMonths }}
      className={composeRenderProps(className, (cls) =>
        cn("w-fit max-w-full text-foreground data-[disabled]:opacity-50", cls),
      )}
    >
      <Months count={visibleMonths} range />
    </AriaRangeCalendar>
  );
}
