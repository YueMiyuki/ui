"use client";

import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RadarChart } from "@/components/miyuki-ui/radar-chart";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const titles = ["January", "February", "March", "April", "May", "June"];

function half(seed: string, shape: number[], average: number) {
  const rng = createRng(seed);
  const raw = shape.map((s) => s * rng.range(0.96, 1.04));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round((v / sum) * average * shape.length));
}

const thisYear = half("radar-this-year", [1.24, 1.16, 1.02, 0.78, 0.86, 0.94], 1424);
const lastYear = half("radar-last-year", [1.08, 1.2, 1.12, 0.84, 0.76, 0.8], 1354);

export default function RadarChartLinesDemo() {
  return (
    <RadarChart
      className="w-full max-w-[440px]"
      variant="lines"
      label="Visitors"
      value="1,424"
      delta={0.052}
      caption="a month"
      labels={months}
      titles={titles}
      series={[
        { name: "This year", data: thisYear },
        { name: "Last year", data: lastYear },
      ]}
    />
  );
}
