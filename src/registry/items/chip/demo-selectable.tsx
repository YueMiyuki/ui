"use client";

import { useState } from "react";
import { Chip } from "@/components/miyuki-ui/chip";

const terrain = ["Groomed runs", "Powder bowls", "Tree runs", "Moguls", "Terrain park", "Backcountry gates"];

export default function ChipSelectableDemo() {
  const [picked, setPicked] = useState<string[]>(["Powder bowls", "Tree runs"]);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <p className="text-sm font-medium text-foreground">Terrain you ride</p>
      <div className="flex flex-wrap gap-2">
        {terrain.map((t) => (
          <Chip
            key={t}
            selected={picked.includes(t)}
            onSelectedChange={(on) => setPicked((p) => (on ? [...p, t] : p.filter((x) => x !== t)))}
          >
            {t}
          </Chip>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground tabular-nums">
        {picked.length === 0
          ? "Pick at least one."
          : `${picked.length} of ${terrain.length} chosen. We will tune the morning report to them.`}
      </p>
    </div>
  );
}
