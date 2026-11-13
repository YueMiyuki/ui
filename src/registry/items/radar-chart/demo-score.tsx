"use client";

import { RadarChart } from "@/components/miyuki-ui/radar-chart";

export default function RadarChartScoreDemo() {
  return (
    <RadarChart
      className="w-full max-w-[440px]"
      variant="score"
      label="Guest rating, Hakuba"
      value="79"
      delta={0.031}
      caption="out of 100"
      labels={["Snow", "Lifts", "Food", "Lodging", "Access", "Value"]}
      series={[{ name: "Score", data: [92, 84, 77, 81, 69, 71] }]}
      max={100}
      height={272}
    />
  );
}
