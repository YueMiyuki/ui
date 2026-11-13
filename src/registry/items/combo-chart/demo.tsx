"use client";

import { ComboChart } from "@/components/miyuki-ui/combo-chart";
import { formatPercent } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const rng = createRng("sessions");
const shape = [1.26, 1.2, 1.0, 0.76, 0.6, 0.68, 0.9, 0.96, 0.82, 0.84, 1.06, 1.4];
const raw = shape.map((s, m) => s * (1 + 0.02 * m) * rng.range(0.95, 1.05));
const sum = raw.reduce((a, b) => a + b, 0);
const sessions = raw.map((v) => Math.round((v / sum) * 83_200));
sessions[11] += 83_200 - sessions.reduce((a, b) => a + b, 0);
const conversion = [0.042, 0.044, 0.039, 0.031, 0.027, 0.029, 0.034, 0.035, 0.03, 0.033, 0.041, 0.046];
const converted = sessions.reduce((sum, s, i) => sum + s * conversion[i], 0) / 83_200;

export default function ComboChartDemo() {
  return (
    <ComboChart
      className="w-full max-w-[440px]"
      label="Sessions"
      value="83,200"
      delta={0.094}
      note={`${formatPercent(converted)} converted to a paid plan`}
      labels={months}
      bars={sessions}
      line={conversion}
      barName="Sessions"
      lineName="Conversion rate"
    />
  );
}
