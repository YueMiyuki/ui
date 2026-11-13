"use client";

import { CalendarDate } from "@internationalized/date";
import { DateRangePicker } from "@/components/miyuki-ui/date-picker";

export default function DatePickerRangeDemo() {
  return (
    <DateRangePicker
      className="w-full max-w-[18rem]"
      label="Stay"
      defaultValue={{ start: new CalendarDate(2027, 2, 12), end: new CalendarDate(2027, 2, 15) }}
      description="Three nights at Ryokan Shizuku."
    />
  );
}
