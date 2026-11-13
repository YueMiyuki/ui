"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { TideProgress } from "@/components/miyuki-ui/tide-progress";

export default function TideProgressDemo() {
  const [value, setValue] = useState(64);
  const nudge = (by: number) => setValue((v) => Math.min(100, Math.max(0, v + by)));
  return (
    <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:gap-14">
      <div className="flex flex-col items-center gap-5">
        <TideProgress value={value} size={160} label="Hōheikyō reservoir" />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" aria-label="Lower by 10" onPress={() => nudge(-10)}>
            −10
          </Button>
          <Button variant="secondary" size="sm" aria-label="Raise by 10" onPress={() => nudge(10)}>
            +10
          </Button>
        </div>
      </div>
      <div className="flex items-end gap-8">
        <TideProgress shape="pill" value={value} size={152} label="Header tank" />
        <TideProgress shape="bar" value={value} size={56} label="Rain barrel" />
      </div>
    </div>
  );
}
