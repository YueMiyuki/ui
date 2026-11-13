"use client";

import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@/components/miyuki-ui/date-picker";

export default function DatePickerDemo() {
  return (
    <DatePicker
      className="w-full max-w-[15rem]"
      label="Check-in"
      defaultValue={new CalendarDate(2027, 2, 12)}
      description="From 3 pm. The bath opens at 4."
    />
  );
}
