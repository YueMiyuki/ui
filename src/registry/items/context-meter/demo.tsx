"use client";

import { ContextMeter } from "@/components/miyuki-ui/context-meter";

export default function ContextMeterDemo() {
  return (
    <ContextMeter
      className="max-w-[460px]"
      context={{
        used: 820_000,
        total: 1_000_000,
        segments: [
          { label: "System", value: 14_000 },
          { label: "Tools", value: 61_000 },
          { label: "Messages", value: 488_000 },
          { label: "Files", value: 257_000 },
        ],
      }}
      limits={[
        { label: "Five-hour limit", resetsIn: "in 2 h 46 min", value: 38 },
        { label: "Weekly, all models", resetsIn: "Tuesday 15:00", value: 3 },
        { label: "Weekly, large model", resetsIn: "Tuesday 15:00", value: 5 },
      ]}
    />
  );
}
