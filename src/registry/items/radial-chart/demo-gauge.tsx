"use client";

import { RadialChart } from "@/components/miyuki-ui/radial-chart";

export default function RadialChartGaugeDemo() {
  return (
    <RadialChart
      className="w-full max-w-[440px]"
      variant="gauge"
      label="Visitors"
      value="925"
      delta={0.052}
      caption="this month"
      data={[{ name: "Visitors", value: 925 }]}
      max={1200}
      centerLabel="of the 1,200 goal"
    />
  );
}
