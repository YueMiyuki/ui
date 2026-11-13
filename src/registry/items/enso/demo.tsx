"use client";

import { Enso } from "@/components/miyuki-ui/enso";

const STAGES = [
  { name: "Steaming", value: 30 },
  { name: "Rolling", value: 60 },
  { name: "Drying", value: 100 },
];

export default function EnsoDemo() {
  return (
    <div className="flex flex-col items-center gap-12">
      <Enso size={120} />
      <ul className="flex gap-10 sm:gap-14">
        {STAGES.map((stage) => (
          <li key={stage.name} className="flex flex-col items-center gap-3">
            <Enso size={56} value={stage.value} label={stage.name} />
            <span className="flex flex-col items-center text-center">
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{stage.value}%</span>
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Enso size={20} label="" />
        Saving
      </p>
    </div>
  );
}
