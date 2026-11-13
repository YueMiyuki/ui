"use client";

import { useState } from "react";
import { SeasonWheel } from "@/components/miyuki-ui/season-wheel";

export default function SeasonWheelDemo() {
  const [month, setMonth] = useState(2);
  return (
    <div className="flex flex-col items-center gap-2">
      <SeasonWheel label="Best month to visit" value={month} onChange={setMonth} />
      <p className="text-[13px] text-muted-foreground">
        {month === 2 ? "Snow festival in Otaru, lanterns along the canal." : "We will plan around it."}
      </p>
    </div>
  );
}
