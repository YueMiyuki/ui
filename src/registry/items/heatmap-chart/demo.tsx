"use client";

import { HeatmapChart } from "@/components/miyuki-ui/heatmap-chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const days = ["Sat 7", "Sun 8", "Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13"];
const dayTitles = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
  (d, i) => `${d} ${7 + i} November`,
);
const blocks = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];
const blockTitles = blocks.map((b, i) => `${b}:00–${String(((i + 1) * 2) % 24).padStart(2, "0")}:00`);

const hourly = [18, 7, 34, 148, 116, 58, 86, 52, 78, 124, 138, 56];
const daily = [1.22, 1.14, 0.88, 0.84, 0.97, 1.04, 1.1];

const rng = createRng("active-users");
const data = daily.map((d, r) =>
  hourly.map((h, c) => {
    const morning = c === 3 && r <= 1 ? 1.14 : 1;
    const snowfall = r === 5 && (c === 3 || c === 4) ? 1.3 : 1;
    return Math.round(h * d * morning * snowfall * rng.range(0.9, 1.1));
  }),
);

export default function HeatmapChartDemo() {
  return (
    <HeatmapChart
      className="w-full max-w-[440px]"
      label="Active users"
      value="1,892"
      delta={0.052}
      caption="last 7 days"
      name="Active users"
      rows={days}
      rowTitles={dayTitles}
      columns={blocks}
      columnTitles={blockTitles}
      data={data}
    />
  );
}
