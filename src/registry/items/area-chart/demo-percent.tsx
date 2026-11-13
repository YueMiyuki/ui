"use client";

import { AreaChart } from "@/components/miyuki-ui/area-chart";
import { formatPercent } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shape = {
  organic: [1.0, 1.0, 1.02, 1.05, 1.08, 1.1, 1.06, 1.04, 0.98, 0.92, 0.9, 0.96],
  referral: [1.0, 1.02, 1.0, 0.98, 0.96, 0.98, 1.04, 1.06, 0.8, 1.02, 1.04, 1.0],
  paid: [0.9, 0.86, 0.8, 0.74, 0.7, 0.72, 0.8, 0.86, 1.1, 1.36, 1.5, 1.2],
};

function channel(seed: string, base: number, factors: number[]) {
  const rng = createRng(seed);
  return factors.map((f) => Math.round(base * f * rng.range(0.95, 1.05)));
}

const series = [
  { name: "Organic", data: channel("organic", 4340, shape.organic) },
  { name: "Referral", data: channel("referral", 2190, shape.referral) },
  { name: "Paid", data: channel("paid", 1350, shape.paid) },
];

const sum = (data: number[]) => data.reduce((a, b) => a + b, 0);
const organicShare = sum(series[0].data) / series.reduce((total, s) => total + sum(s.data), 0);

export default function AreaChartPercentDemo() {
  return (
    <AreaChart
      className="w-full max-w-[440px]"
      mode="percent"
      label="Visitors by channel"
      value={formatPercent(organicShare)}
      caption="organic"
      labels={months}
      series={series}
    />
  );
}
