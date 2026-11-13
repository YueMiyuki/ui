"use client";

import { TideChart } from "@/components/miyuki-ui/tide-chart";

const at = (h: number, m: number) => h + m / 60;

const turns = [
  { time: at(-6, -10), height: 34, turn: "high" as const },
  { time: at(0, 35), height: 12, turn: "low" as const },
  { time: at(6, 42), height: 37, turn: "high" as const },
  { time: at(13, 4), height: 9, turn: "low" as const },
  { time: at(19, 10), height: 33, turn: "high" as const },
  { time: at(25, 27), height: 13, turn: "low" as const },
];

function heightAt(t: number) {
  const i = turns.findIndex((turn, k) => k < turns.length - 1 && t >= turn.time && t <= turns[k + 1].time);
  const a = turns[i];
  const b = turns[i + 1];
  const u = (t - a.time) / (b.time - a.time);
  return a.height + ((b.height - a.height) * (1 - Math.cos(Math.PI * u))) / 2;
}

const hourly = Array.from({ length: 27 }, (_, i) => i - 1).map((t) => ({
  time: t,
  height: Math.round(heightAt(t) * 10) / 10,
}));
const points = [...hourly, ...turns.filter((t) => t.time > -1 && t.time < 25)].sort((a, b) => a.time - b.time);

export default function TideChartDemo() {
  return (
    <TideChart
      className="w-full max-w-[560px]"
      label="Otaru, 14 February"
      points={points}
      now={at(14, 20)}
      phase={0.89}
      sunrise={at(6, 33)}
      sunset={at(17, 3)}
      format={(v) => `${Math.round(v)} cm`}
    />
  );
}
