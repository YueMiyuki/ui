"use client";

import { GhostBars } from "@/components/miyuki-ui/ghost-bars";
import { formatCompact, formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July"];

function months7(seed: string, shape: number[], total: number) {
  const rng = createRng(seed);
  const raw = shape.map((s) => s * rng.range(0.96, 1.04));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.round(((v / sum) * total) / 100) * 100);
  out[6] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

const thisYear = months7("earned", [1.2, 1.14, 0.98, 0.82, 0.74, 0.92, 1.2], 746_200);
const lastYear = months7("earned-last", [1.12, 1.2, 1.02, 0.84, 0.8, 0.88, 1.06], 650_000);

export default function GhostBarsDemo() {
  return (
    <GhostBars
      className="w-full max-w-[440px]"
      label="Earned so far"
      value="¥746,200"
      delta={0.148}
      labels={months}
      titles={monthNames.map((m) => `${m} 2026`)}
      data={thisYear}
      previous={lastYear}
      format={(v) => `¥${formatNumber(v)}`}
      formatAxis={(v) => `¥${formatCompact(v)}`}
    />
  );
}
