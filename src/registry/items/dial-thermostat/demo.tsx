"use client";

import { useState } from "react";
import { DialThermostat } from "@/components/miyuki-ui/dial-thermostat";

export default function DialThermostatDemo() {
  const [value, setValue] = useState(41);
  return (
    <div className="flex flex-col items-center gap-2">
      <DialThermostat
        label="Bath temperature"
        minValue={36}
        maxValue={44}
        step={0.5}
        value={value}
        onChange={setValue}
      />
      <p className="text-[13px] text-muted-foreground tabular-nums">
        {value >= 42 ? "Hot spring, ten minutes at most" : value >= 39 ? "A long soak" : "Warm enough for children"}
      </p>
    </div>
  );
}
