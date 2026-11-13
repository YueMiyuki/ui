"use client";

import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RidgePlot } from "@/components/miyuki-ui/ridge-plot";

const months = [
  { label: "Nov", title: "November", days: 54, light: [5, 0.55], storm: [0.08, 16, 4] },
  { label: "Dec", title: "December", days: 148, light: [8, 0.58], storm: [0.18, 24, 6] },
  { label: "Jan", title: "January", days: 193, light: [11, 0.55], storm: [0.3, 33, 8] },
  { label: "Feb", title: "February", days: 171, light: [10, 0.55], storm: [0.32, 29, 8] },
  { label: "Mar", title: "March", days: 116, light: [7, 0.58], storm: [0.14, 21, 6] },
  { label: "Apr", title: "April", days: 43, light: [4.5, 0.55], storm: [0, 0, 0] },
];

function snowDays(seed: string, days: number, [median, sigma]: number[], [share, mean, sd]: number[]) {
  const rng = createRng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  return Array.from({ length: days }, () => {
    const value = rng() < share ? mean + sd * normal() : median * Math.exp(sigma * normal());
    return Math.max(1, Math.min(58, Math.round(value)));
  });
}

const series = months.map((m) => ({
  label: m.label,
  title: m.title,
  values: snowDays(`ridge-${m.label}`, m.days, m.light, m.storm),
}));

const total = series.reduce((sum, s) => sum + s.values.length, 0);

export default function RidgePlotDemo() {
  return (
    <RidgePlot
      className="w-full max-w-[560px]"
      label="Daily snowfall by month"
      value={total.toLocaleString("en-US")}
      caption="snow days in ten winters"
      note="Happo-one summit station, 1,830 m"
      series={series}
      unit="cm"
      countName="Snow days"
    />
  );
}
