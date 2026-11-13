"use client";

import { useState } from "react";
import { Moonpath } from "@/components/miyuki-ui/moonpath";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

const PHASES = [
  { id: "crescent", label: "Crescent", value: 0.12, date: "Waxing crescent, 4 March" },
  { id: "quarter", label: "Quarter", value: 0.25, date: "First quarter, 7 March" },
  { id: "gibbous", label: "Gibbous", value: 0.38, date: "Waxing gibbous, 10 March" },
  { id: "full", label: "Full", value: 0.5, date: "Full moon, 14 March" },
  { id: "waning", label: "Waning", value: 0.8, date: "Waning crescent, 23 March" },
] as const;

export default function MoonpathPhasesDemo() {
  const [id, setId] = useState<string>("quarter");
  const phase = PHASES.find((p) => p.id === id) ?? PHASES[1];
  return (
    <Moonpath
      phase={phase.value}
      className="dark flex size-full flex-col items-start justify-between px-7 py-9 text-foreground sm:px-12 sm:py-12"
    >
      <div>
        <h2 className="max-w-[9ch] font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] sm:max-w-none sm:text-5xl">
          Lake Tōya, <span className="tabular-nums">21:00</span>
        </h2>
        <p className="mt-3 text-base text-muted-foreground">{phase.date}.</p>
      </div>
      <SegmentedControl
        aria-label="Moon phase"
        size="sm"
        selectedKeys={[id]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (typeof next === "string") setId(next);
        }}
        className="max-w-full overflow-x-auto bg-background/70 backdrop-blur-sm"
      >
        {PHASES.map((p) => (
          <Segment key={p.id} id={p.id}>
            {p.label}
          </Segment>
        ))}
      </SegmentedControl>
    </Moonpath>
  );
}
