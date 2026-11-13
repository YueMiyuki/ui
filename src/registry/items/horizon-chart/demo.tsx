"use client";

import { HorizonChart } from "@/components/miyuki-ui/horizon-chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = [
  { name: "Mar", long: "March", days: 31 },
  { name: "Apr", long: "April", days: 29 },
];
const days = months.flatMap((m) =>
  Array.from({ length: m.days }, (_, d) => ({ short: `${d + 1} ${m.name}`, long: `${d + 1} ${m.long}`, day: d + 1 })),
);
const ticks = days.flatMap((d, j) => (d.day === 1 || d.day === 15 ? [j] : []));

type Gauge = {
  label: string;
  title: string;
  start: number;
  melt: [day: number, rise: number, width: number];
  rain: [day: number, height: number];
  fade: number;
};

const gauges: Gauge[] = [
  { label: "Ishikari", title: "Ishikari at Asahikawa", start: -0.38, melt: [44, 1.12, 5], rain: [14.2, 0.14], fade: 0 },
  { label: "Tokachi", title: "Tokachi at Obihiro", start: -0.46, melt: [50, 0.42, 6], rain: [14.5, 0.09], fade: 0 },
  { label: "Mogami", title: "Mogami at Sakata", start: -0.22, melt: [33, 0.94, 5], rain: [13.4, 0.46], fade: 0.004 },
  { label: "Agano", title: "Agano at Mawatari", start: -0.12, melt: [27, 0.88, 4], rain: [13, 0.58], fade: 0.008 },
  { label: "Shinano", title: "Shinano at Ojiya", start: -0.18, melt: [24, 1.02, 4], rain: [12.6, 0.72], fade: 0.012 },
  { label: "Kiso", title: "Kiso at Inuyama", start: -0.3, melt: [18, 0.56, 4], rain: [12.1, 0.81], fade: 0.016 },
];

const series = gauges.map((g) => {
  const rng = createRng(`gauge-${g.label}`);
  let wobble = 0;
  return {
    label: g.label,
    title: g.title,
    values: days.map((_, t) => {
      wobble = wobble * 0.9 + rng.range(-0.018, 0.018);
      const [at, rise, width] = g.melt;
      const melt = rise / (1 + Math.exp(-(t - at) / width)) - g.fade * Math.max(0, t - at - 8);
      const [day, height] = g.rain;
      const since = t - day;
      const rain = height * (since < 0 ? Math.exp(-((since / 2.4) ** 2)) : Math.exp(-since / 3.4));
      return Math.round((g.start + melt + rain + wobble) * 100) / 100;
    }),
  };
});

const latest = series[4].values[series[4].values.length - 1];

export default function HorizonChartDemo() {
  return (
    <HorizonChart
      className="w-full max-w-[600px]"
      label="River level against normal"
      value={`${latest >= 0 ? "+" : "−"}${Math.abs(latest).toFixed(2)} m`}
      caption="Shinano at Ojiya, 29 April"
      note="Six gauges, 1 March to 29 April"
      series={series}
      labels={days.map((d) => d.short)}
      titles={days.map((d) => d.long)}
      ticks={ticks}
      unit="m"
    />
  );
}
