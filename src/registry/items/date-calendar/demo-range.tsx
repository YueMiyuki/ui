"use client";

import { CalendarDate } from "@internationalized/date";
import { RangeCalendar } from "@/components/miyuki-ui/date-calendar";

export default function DateCalendarRangeDemo() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <RangeCalendar
        aria-label="Nights at the inn"
        defaultValue={{ start: new CalendarDate(2027, 2, 10), end: new CalendarDate(2027, 2, 14) }}
      />
    </div>
  );
}
