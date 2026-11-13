"use client";

import { ComparisonArea } from "@/components/miyuki-ui/comparison-area";
import { formatCompact, formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function year(seed: string, shape: number[], total: number) {
  const rng = createRng(seed);
  const raw = shape.map((s) => s * rng.range(0.96, 1.04));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.round(((v / sum) * total) / 100) * 100);
  out[11] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

const current = year("this-year", [1.34, 1.24, 1.02, 0.76, 0.62, 0.68, 0.86, 0.92, 0.8, 0.9, 1.22, 1.5], 15_231_400);
const previous = year("last-year", [0.98, 1.18, 1.06, 0.8, 0.66, 0.7, 0.84, 0.88, 0.78, 0.86, 1.14, 1.42], 13_130_400);

const yen = (v: number) => `¥${formatNumber(v)}`;

export default function ComparisonAreaDemo() {
  return (
    <ComparisonArea
      className="w-full max-w-[440px]"
      label="Revenue"
      value="¥15,231,400"
      delta={0.16}
      note="¥13,130,400 last year"
      labels={months}
      titles={monthNames}
      current={current}
      previous={previous}
      format={yen}
      formatAxis={(v) => `¥${formatCompact(v)}`}
    />
  );
}
