"use client";

import { RadialChart } from "@/components/miyuki-ui/radial-chart";

export default function RadialChartRingsDemo() {
  return (
    <RadialChart
      className="w-full max-w-[440px]"
      variant="rings"
      name="Visitors"
      label="Visitors by resort"
      value="925"
      delta={0.052}
      data={[
        { name: "Hakuba", value: 342 },
        { name: "Niseko", value: 268 },
        { name: "Nozawa", value: 186 },
        { name: "Otaru", value: 129 },
      ]}
    />
  );
}
