"use client";

import { CalendarDate } from "@internationalized/date";
import { Calendar } from "@/components/miyuki-ui/date-calendar";

export default function DateCalendarDemo() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <Calendar aria-label="Departure date" defaultValue={new CalendarDate(2027, 2, 14)} />
    </div>
  );
}
