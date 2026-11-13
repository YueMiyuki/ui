"use client";

import { TideRange } from "@/components/miyuki-ui/tide-range";

export default function TideRangeDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <TideRange
        label="Depth range"
        minValue={0}
        maxValue={40}
        defaultValue={[6, 18]}
        formatOptions={{ style: "unit", unit: "meter" }}
        thumbLabels={["Shallowest", "Deepest"]}
      />
      <p className="text-[13px] text-muted-foreground">Dives off Shakotan stay above 18 m for open-water divers.</p>
    </div>
  );
}
