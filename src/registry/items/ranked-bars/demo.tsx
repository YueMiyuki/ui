"use client";

import { AppWindow, Globe, Mail, PanelTop } from "lucide-react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RankedBars, type RankedBarsItem } from "@/components/miyuki-ui/ranked-bars";

const TOTAL = 48_920;

function split(seed: string, rows: [name: string, share: number][]): RankedBarsItem[] {
  const rng = createRng(seed);
  const counts = rows.map(([, share]) => Math.round(TOTAL * share * rng.range(0.992, 1.008)));
  counts[counts.length - 1] += TOTAL - counts.reduce((a, b) => a + b, 0);
  return rows.map(([name], i) => ({ name, value: counts[i] }));
}

const resorts = split("resorts", [
  ["Hakuba", 0.284],
  ["Niseko", 0.231],
  ["Nozawa Onsen", 0.146],
  ["Furano", 0.118],
  ["Myōkō", 0.087],
  ["Zaō", 0.064],
  ["Other areas", 0.07],
]);

const channels = split("channels", [
  ["App", 0.468],
  ["Web", 0.302],
  ["Email bulletin", 0.157],
  ["Widget", 0.073],
]).map((item, i) => ({
  ...item,
  icon: [<AppWindow key="a" />, <Globe key="w" />, <Mail key="e" />, <PanelTop key="g" />][i],
}));

const hours = split("hours", [
  ["Before 7 am", 0.392],
  ["7 to 10 am", 0.247],
  ["Evening", 0.147],
  ["Midday", 0.118],
  ["Afternoon", 0.096],
]);

export default function RankedBarsDemo() {
  return (
    <RankedBars
      className="w-full max-w-[440px]"
      label="Forecast readers"
      value="48,920"
      delta={0.068}
      caption="last 30 days"
      groups={[
        { id: "resorts", name: "Resorts", data: resorts },
        { id: "channels", name: "Channels", data: channels },
        { id: "hours", name: "Time of day", data: hours },
      ]}
    />
  );
}
