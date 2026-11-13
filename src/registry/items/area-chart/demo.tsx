"use client";

import { AreaChart } from "@/components/miyuki-ui/area-chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const titles = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const season = [1.28, 1.22, 1.02, 0.78, 0.62, 0.7, 0.92, 1.0, 0.84, 0.8, 0.96, 1.36];

function channel(seed: string, total: number, growth: number, dip?: [month: number, factor: number]) {
  const rng = createRng(seed);
  const raw = season.map((s, m) => s * (1 + growth * m) * rng.range(0.94, 1.06) * (dip?.[0] === m ? dip[1] : 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.round((v / sum) * total));
  out[11] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

const series = [
  { name: "Organic", data: channel("organic", 52140, 0.025) },
  { name: "Referral", data: channel("referral", 26310, 0.04, [8, 0.72]) },
  { name: "Paid", data: channel("paid", 16250, 0.01) },
];

export default function AreaChartDemo() {
  return (
    <AreaChart
      className="w-full max-w-[440px]"
      label="Visitors"
      value="94,700"
      delta={0.082}
      labels={months}
      titles={titles.map((t) => `${t} 2026`)}
      series={series}
    />
  );
}
