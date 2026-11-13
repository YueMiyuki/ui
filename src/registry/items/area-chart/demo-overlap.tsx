"use client";

import { AreaChart } from "@/components/miyuki-ui/area-chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const season = [1.3, 1.24, 1.0, 0.76, 0.64, 0.74, 0.98, 1.04, 0.86, 0.78, 0.94, 1.4];

function channel(seed: string, total: number, growth: number) {
  const rng = createRng(seed);
  const raw = season.map((s, m) => s * (1 + growth * m) * rng.range(0.93, 1.07));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.round((v / sum) * total));
  out[11] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

const series = [
  { name: "Phone app", data: channel("app", 98420, 0.02) },
  { name: "Station screens", data: channel("screens", 71260, 0.045) },
  { name: "Website", data: channel("web", 44700, -0.01) },
];

export default function AreaChartOverlapDemo() {
  return (
    <AreaChart
      className="w-full max-w-[440px]"
      mode="overlap"
      label="Forecast checks"
      value="214,380"
      delta={0.056}
      labels={months}
      series={series}
    />
  );
}
