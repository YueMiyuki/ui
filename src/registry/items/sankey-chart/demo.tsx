"use client";

import { SankeyChart } from "@/components/miyuki-ui/sankey-chart";

const nodes = [
  { id: "Focus" },
  { id: "Meetings" },
  { id: "Breaks" },
  { id: "Writing" },
  { id: "Planning" },
  { id: "Messaging" },
  { id: "Browsing" },
];

const links = [
  { source: "Focus", target: "Writing", value: 18 },
  { source: "Focus", target: "Planning", value: 9 },
  { source: "Focus", target: "Browsing", value: 7 },
  { source: "Focus", target: "Messaging", value: 4 },
  { source: "Meetings", target: "Messaging", value: 12 },
  { source: "Meetings", target: "Planning", value: 10 },
  { source: "Meetings", target: "Writing", value: 5 },
  { source: "Meetings", target: "Browsing", value: 4 },
  { source: "Breaks", target: "Browsing", value: 9 },
  { source: "Breaks", target: "Messaging", value: 6 },
  { source: "Breaks", target: "Writing", value: 2 },
];

const hours = (v: number) => `${v} h`;

export default function SankeyChartDemo() {
  return (
    <SankeyChart
      className="w-full max-w-[560px]"
      label="Tracked time"
      value="86 h"
      caption="this week"
      nodes={nodes}
      links={links}
      format={hours}
    />
  );
}
