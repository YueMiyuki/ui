"use client";

import { Time } from "@internationalized/date";
import { useState } from "react";
import { ClockFacePicker } from "@/components/miyuki-ui/clock-face-picker";

export default function ClockFacePickerDemo() {
  const [time, setTime] = useState(new Time(8, 30));
  return (
    <div className="flex flex-col items-center gap-3">
      <ClockFacePicker label="First lift" value={time} onChange={setTime} hourCycle={12} />
      <p className="text-[13px] text-muted-foreground">Lifts run every ten minutes until 16:30.</p>
    </div>
  );
}
