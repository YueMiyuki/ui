"use client";

import { PeriodButton } from "@/components/miyuki-ui/lib/chart";
import { RadialChart } from "@/components/miyuki-ui/radial-chart";

export default function RadialChartDemo() {
  return (
    <RadialChart
      className="w-full max-w-[440px]"
      variant="stacked"
      label="Visitors"
      value="925"
      delta={0.052}
      action={<PeriodButton>This week</PeriodButton>}
      centerLabel="All sources"
      data={[
        { name: "Search", value: 368 },
        { name: "App", value: 241 },
        { name: "Direct", value: 162 },
        { name: "Social", value: 97 },
        { name: "Email", value: 57 },
      ]}
    />
  );
}
