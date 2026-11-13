"use client";

import { TideTab, TideTabList, TideTabPanel, TideTabs } from "@/components/miyuki-ui/tide-tabs";

const lifts = [
  {
    id: "gondola",
    label: "Gondola",
    status: "Running",
    text: "Every 40 seconds from the base station. Last ride up at 16:30.",
  },
  {
    id: "chair-4",
    label: "Chair 4",
    status: "Wind hold",
    text: "Stopped for gusts above 60 km/h at the top station. Next check at 11:00.",
  },
  {
    id: "summit",
    label: "Summit T-bar",
    status: "Closed",
    text: "Closed for avalanche control this morning. Patrol expects to open it after lunch.",
  },
];

export default function TideTabsVerticalDemo() {
  return (
    <TideTabs orientation="vertical" className="w-full max-w-lg">
      <TideTabList aria-label="Lifts">
        {lifts.map((lift) => (
          <TideTab key={lift.id} id={lift.id}>
            {lift.label}
          </TideTab>
        ))}
      </TideTabList>
      {lifts.map((lift) => (
        <TideTabPanel key={lift.id} id={lift.id} className="pt-1">
          <p className="font-medium">{lift.status}</p>
          <p className="mt-1 text-muted-foreground">{lift.text}</p>
        </TideTabPanel>
      ))}
    </TideTabs>
  );
}
