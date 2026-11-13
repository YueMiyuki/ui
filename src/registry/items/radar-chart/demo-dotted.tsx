"use client";

import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RadarChart } from "@/components/miyuki-ui/radar-chart";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const titles = ["January", "February", "March", "April", "May", "June"];

const rng = createRng("radar-app");
const raw = [0.92, 0.88, 1.04, 1.18, 1.1, 0.88].map((s) => s * rng.range(0.96, 1.04));
const sessions = raw.map((v) => Math.round((v / raw.reduce((a, b) => a + b, 0)) * 1424 * 6));

export default function RadarChartDottedDemo() {
  return (
    <RadarChart
      className="w-full max-w-[440px]"
      variant="dotted"
      label="Visitors in the app"
      value="1,424"
      delta={0.052}
      caption="a month"
      labels={months}
      titles={titles}
      series={[{ name: "Visitors", data: sessions }]}
    />
  );
}
