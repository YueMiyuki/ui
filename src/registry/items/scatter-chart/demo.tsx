"use client";

import { formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { ScatterChart, type ScatterChartPoint } from "@/components/miyuki-ui/scatter-chart";

const rng = createRng("accounts");

function plan(count: number, sessions: [number, number], base: number, perSession: number, seats: [number, number]) {
  return Array.from({ length: count }, (): ScatterChartPoint => {
    const x = Math.round(rng.range(sessions[0], sessions[1]));
    const y = base + perSession * x * rng.range(0.75, 1.25);
    const t = (x - sessions[0]) / (sessions[1] - sessions[0]);
    return { x, y, size: Math.max(1, Math.round(seats[0] + (seats[1] - seats[0]) * t * rng.range(0.6, 1.2))) };
  });
}

const starter = plan(42, [4, 30], 160, 11, [1, 3]);
const growth = plan(28, [16, 54], 330, 15, [3, 12]);
const scale = plan(14, [38, 88], 640, 16, [12, 40]);

const everyone = [...starter, ...growth, ...scale];
const k = 742 / (everyone.reduce((sum, p) => sum + p.y, 0) / everyone.length);
for (const p of everyone) p.y = Math.round((p.y * k) / 10) * 10;

export default function ScatterChartDemo() {
  return (
    <ScatterChart
      className="w-full max-w-[440px]"
      label="Revenue per account"
      value="¥742"
      delta={0.068}
      groups={[
        { name: "Starter", points: starter },
        { name: "Growth", points: growth },
        { name: "Scale", points: scale },
      ]}
      xName="Sessions per month"
      yName="Revenue per month"
      sizeName="Seats"
      formatY={(v) => `¥${formatNumber(v)}`}
      formatYAxis={(v) => `¥${formatNumber(v)}`}
    />
  );
}
