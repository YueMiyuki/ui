"use client";

import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RadarChart } from "@/components/miyuki-ui/radar-chart";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const titles = ["January", "February", "March", "April", "May", "June"];

const rng = createRng("radar-visitors");
const raw = [1.24, 1.16, 1.02, 0.78, 0.86, 0.94].map((s) => s * rng.range(0.96, 1.04));
const visitors = raw.map((v) => Math.round((v / raw.reduce((a, b) => a + b, 0)) * 1424 * 6));

export default function RadarChartDemo() {
  return (
    <RadarChart
      className="w-full max-w-[440px]"
      label="Visitors"
      value="1,424"
      delta={0.052}
      caption="a month"
      labels={months}
      titles={titles}
      series={[{ name: "Visitors", data: visitors }]}
    />
  );
}
