"use client";

import { ContextMeter } from "@/components/miyuki-ui/context-meter";

export default function ContextMeterNearLimitDemo() {
  return (
    <ContextMeter
      className="max-w-[460px]"
      context={{
        used: 964_000,
        total: 1_000_000,
        segments: [
          { label: "System", value: 14_000 },
          { label: "Tools", value: 72_000 },
          { label: "Messages", value: 611_000 },
          { label: "Files", value: 267_000 },
        ],
      }}
      limits={[
        { label: "Five-hour limit", resetsIn: "in 38 min", value: 93 },
        { label: "Weekly, all models", resetsIn: "Tuesday 15:00", value: 79 },
        { label: "Weekly, large model", resetsIn: "Tuesday 15:00", value: 41 },
      ]}
    />
  );
}
