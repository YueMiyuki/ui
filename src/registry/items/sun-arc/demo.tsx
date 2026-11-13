"use client";

import { useState } from "react";
import { SunArc } from "@/components/miyuki-ui/sun-arc";

export default function SunArcDemo() {
  const [time, setTime] = useState("13:05");

  return (
    <div className="w-full max-w-xl">
      <SunArc label="Hakuba, 14 February" sunrise="06:38" sunset="17:29" time={time} onTimeChange={setTime} />
    </div>
  );
}
