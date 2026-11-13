"use client";

import { ChannelBars } from "@/components/miyuki-ui/channel-bars";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNames = [
  "Monday 9 Nov",
  "Tuesday 10 Nov",
  "Wednesday 11 Nov",
  "Thursday 12 Nov",
  "Friday 13 Nov",
  "Saturday 14 Nov",
  "Sunday 15 Nov",
];

const rng = createRng("orders");
const shape = [0.86, 0.9, 0.82, 0.98, 1.1, 1.24, 0.92].map((s) => s * rng.range(0.96, 1.04));
const sum = shape.reduce((a, b) => a + b, 0);
const totals = shape.map((s) => Math.round((s / sum) * 1284));
totals[6] += 1284 - totals.reduce((a, b) => a + b, 0);
const app = totals.map((t) => Math.round(t * rng.range(0.58, 0.68)));
const web = totals.map((t, i) => t - app[i]);

export default function ChannelBarsDemo() {
  return (
    <ChannelBars
      className="w-full max-w-[440px]"
      label="Orders"
      value="1,284"
      caption="this week"
      labels={days}
      titles={dayNames}
      series={[
        { name: "App", data: app },
        { name: "Web", data: web },
      ]}
      goal={200}
    />
  );
}
