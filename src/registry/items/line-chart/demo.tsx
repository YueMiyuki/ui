"use client";

import { useState } from "react";
import { formatCompact, formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { LineChart } from "@/components/miyuki-ui/line-chart";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

type Period = "weekly" | "monthly" | "yearly";

function shaped(seed: string, shape: number[], total: number, step = 100) {
  const rng = createRng(seed);
  const raw = shape.map((s) => s * rng.range(0.96, 1.04));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round(((v / sum) * total) / step) * step);
}

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
const weeks = [
  "6 Oct",
  "13 Oct",
  "20 Oct",
  "27 Oct",
  "3 Nov",
  "10 Nov",
  "17 Nov",
  "24 Nov",
  "1 Dec",
  "8 Dec",
  "15 Dec",
  "22 Dec",
];
const years = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

const monthly = [
  ...shaped("months", [1.06, 1.02, 0.92, 0.78, 0.7, 0.8, 0.94, 0.98, 0.88, 0.96], 14_414_700),
  1_667_300,
  1_824_000,
];
const weekly = [
  ...shaped("weeks", [0.8, 0.82, 0.85, 0.86, 0.9, 0.93, 0.84, 0.95, 0.98, 1.0], 3_281_600),
  418_300,
  431_200,
];
const yearly = [3_120_000, 4_610_000, 4_880_000, 7_420_000, 9_560_000, 11_240_000, 12_930_000, 14_700_000, 17_906_000];

const sets: Record<Period, { data: number[]; labels: string[]; titles: string[] }> = {
  weekly: { data: weekly, labels: weeks, titles: weeks.map((w) => `Week of ${w}`) },
  monthly: { data: monthly, labels: months, titles: monthNames.map((m) => `${m} 2026`) },
  yearly: { data: yearly, labels: years, titles: years },
};

const yen = (v: number) => `¥${formatNumber(v)}`;
const yenCompact = (v: number) => `¥${formatCompact(v)}`;

export default function LineChartDemo() {
  const [period, setPeriod] = useState<Period>("monthly");
  const { data, labels, titles } = sets[period];
  const last = data[data.length - 1];
  const previous = data[data.length - 2];

  return (
    <LineChart
      className="w-full max-w-[440px]"
      label="Revenue"
      value={yen(last)}
      delta={last / previous - 1}
      data={data}
      labels={labels}
      titles={titles}
      format={yen}
      formatAxis={yenCompact}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Period"
          selectedKeys={[period]}
          onSelectionChange={(keys) => {
            const [key] = keys;
            if (key) setPeriod(key as Period);
          }}
        >
          <Segment id="weekly">Weekly</Segment>
          <Segment id="monthly">Monthly</Segment>
          <Segment id="yearly">Yearly</Segment>
        </SegmentedControl>
      }
    />
  );
}
