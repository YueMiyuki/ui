"use client";

import { useState } from "react";
import { DayNightToggle } from "@/components/miyuki-ui/day-night-toggle";
import { cn } from "@/lib/utils";

const views = {
  day: {
    when: "Lake Tōya, this afternoon",
    temp: "2 °C",
    rows: [
      ["Sky", "Light cloud"],
      ["Sunset", "16:21"],
    ],
  },
  night: {
    when: "Lake Tōya, tonight",
    temp: "−6 °C",
    rows: [
      ["Sky", "Clear"],
      ["Moonrise", "19:12"],
    ],
  },
};

export default function DayNightToggleDemo() {
  const [night, setNight] = useState(false);
  const view = views[night ? "night" : "day"];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
      <DayNightToggle size="lg" label="Night view" isSelected={night} onChange={setNight} />
      <div
        className={cn(
          night ? "dark" : "light",
          "w-64 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-[background-color,border-color,color] duration-700 motion-reduce:duration-150",
        )}
      >
        <p className="text-[13px] text-muted-foreground">{view.when}</p>
        <p className="mt-1 text-3xl font-semibold tracking-[-0.01em] tabular-nums">{view.temp}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
          {view.rows.map(([term, value]) => (
            <div key={term}>
              <dt className="text-xs text-muted-foreground">{term}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
