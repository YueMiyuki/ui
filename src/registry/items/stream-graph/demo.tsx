"use client";

import { formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { StreamGraph } from "@/components/miyuki-ui/stream-graph";

const weeks = [
  "15 Dec",
  "22 Dec",
  "29 Dec",
  "5 Jan",
  "12 Jan",
  "19 Jan",
  "26 Jan",
  "2 Feb",
  "9 Feb",
  "16 Feb",
  "23 Feb",
  "2 Mar",
];
const titles = [
  "Week of 15 December",
  "Week of 22 December",
  "Week of 29 December",
  "Week of 5 January",
  "Week of 12 January",
  "Week of 19 January",
  "Week of 26 January",
  "Week of 2 February",
  "Week of 9 February",
  "Week of 16 February",
  "Week of 23 February",
  "Week of 2 March",
];

type Bump = [week: number, width: number, height: number];

function resort(seed: string, base: number[], bumps: Bump[]) {
  const rng = createRng(seed);
  return weeks.map((_, w) => {
    const trend = base[0] + ((base[1] - base[0]) * w) / (weeks.length - 1);
    const lift = bumps.reduce((sum, [at, width, h]) => sum + h * Math.exp(-(((w - at) / width) ** 2)), 0);
    return Math.round((trend + lift) * rng.range(0.95, 1.05));
  });
}

const series = [
  {
    name: "Niseko",
    data: resort(
      "niseko",
      [3100, 4800],
      [
        [2.4, 1.1, 6400],
        [9.2, 1.2, 8200],
      ],
    ),
  },
  {
    name: "Hakuba",
    data: resort(
      "hakuba",
      [2900, 4200],
      [
        [2.6, 1, 7100],
        [8, 1.5, 3600],
      ],
    ),
  },
  {
    name: "Nozawa",
    data: resort(
      "nozawa",
      [1100, 1600],
      [
        [2.4, 0.9, 2600],
        [4.1, 0.6, 4300],
      ],
    ),
  },
  { name: "Hakkōda", data: resort("hakkoda", [500, 3200], [[9, 1.7, 2900]]) },
  {
    name: "Kiso",
    data: resort(
      "kiso",
      [800, 900],
      [
        [2.5, 1.1, 3300],
        [7.4, 1.3, 1100],
      ],
    ),
  },
];

const total = series.reduce((sum, s) => sum + s.data.reduce((a, b) => a + b, 0), 0);

export default function StreamGraphDemo() {
  return (
    <StreamGraph
      className="w-full max-w-[600px]"
      label="Visitors by resort"
      value={formatNumber(total)}
      delta={0.064}
      caption="twelve weeks"
      labels={weeks}
      titles={titles}
      series={series}
      totalName="All resorts"
      unitName="visitors a week"
    />
  );
}
