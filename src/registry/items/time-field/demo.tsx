"use client";

import { Time } from "@internationalized/date";
import { TimeField } from "@/components/miyuki-ui/time-field";

export default function TimeFieldDemo() {
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-6">
      <TimeField label="Opens" hourCycle={12} defaultValue={new Time(9, 0)} />
      <TimeField label="Closes" hourCycle={12} defaultValue={new Time(18, 0)} />
      <TimeField
        label="First lift"
        hourCycle={24}
        shouldForceLeadingZeros
        defaultValue={new Time(8, 30)}
        description="24-hour clock"
      />
    </div>
  );
}
