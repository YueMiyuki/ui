"use client";

import { useState } from "react";
import { MoonPhase, MoonStrip } from "@/components/miyuki-ui/moon-phase";

const format = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function MoonPhaseDemo() {
  const [date, setDate] = useState("2027-02-14");

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">Lake Tōya · {format.format(new Date(`${date}T12:00:00Z`))}</p>
        <MoonPhase date={date} size={184} showLabel />
      </div>
      <MoonStrip from="2027-02-08" days={14} value={date} onChange={setDate} label="Night" className="w-full" />
    </div>
  );
}
