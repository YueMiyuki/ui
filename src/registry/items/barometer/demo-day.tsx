"use client";

import { useState } from "react";
import { Barometer } from "@/components/miyuki-ui/barometer";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

const readings = [
  { time: "03:00", value: 1019 },
  { time: "06:00", value: 1016 },
  { time: "09:00", value: 1012 },
  { time: "12:00", value: 1008 },
  { time: "15:00", value: 1001 },
  { time: "18:00", value: 996 },
];

export default function BarometerDayDemo() {
  const [index, setIndex] = useState(3);
  const now = readings[index];
  const before = readings[Math.max(0, index - 1)];

  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-4">
      <SegmentedControl
        size="sm"
        aria-label="Reading time"
        selectedKeys={[String(index)]}
        onSelectionChange={(keys) => {
          const [key] = keys;
          if (key != null) setIndex(Number(key));
        }}
      >
        {readings.slice(1).map((r, i) => (
          <Segment key={r.time} id={String(i + 1)}>
            {r.time}
          </Segment>
        ))}
      </SegmentedControl>
      <Barometer
        className="w-full"
        label="Nozawa Onsen weather station"
        note={`Sea-level pressure at ${now.time}`}
        value={now.value}
        previous={before.value}
        settable={false}
      />
    </div>
  );
}
