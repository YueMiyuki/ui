"use client";

import { LineChart } from "@/components/miyuki-ui/line-chart";

const weeks = ["1 Dec", "8 Dec", "15 Dec", "22 Dec", "29 Dec", "5 Jan", "12 Jan", "19 Jan", "26 Jan", "2 Feb", "9 Feb"];
const depth = [12, 31, 47, 78, 96, 118, 141, 156, 171, 166, 187];

export default function LineChartAxisTitlesDemo() {
  return (
    <LineChart
      className="w-full max-w-[440px]"
      label="Snow base, Hakuba upper slopes"
      value="187 cm"
      name="Snow depth"
      data={depth}
      labels={weeks}
      titles={weeks.map((w) => `Week of ${w}`)}
      format={(v) => `${v} cm`}
      xLabel="Week starting"
      yLabel="Snow depth (cm)"
    />
  );
}
