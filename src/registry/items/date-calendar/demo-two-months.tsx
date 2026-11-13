"use client";

import { CalendarDate, type DateValue } from "@internationalized/date";
import { RangeCalendar } from "@/components/miyuki-ui/date-calendar";

const booked = ["2027-02-19", "2027-02-20", "2027-03-12", "2027-03-13"];

export default function DateCalendarTwoMonthsDemo() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <RangeCalendar
        aria-label="Nights at the inn"
        visibleMonths={2}
        defaultValue={{ start: new CalendarDate(2027, 2, 25), end: new CalendarDate(2027, 3, 3) }}
        isDateUnavailable={(date: DateValue) => booked.includes(date.toString())}
      />
    </div>
  );
}
