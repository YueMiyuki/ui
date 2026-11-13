"use client";

import { useState } from "react";
import { GoalBars } from "@/components/miyuki-ui/goal-bars";
import { formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayOfYear(n: number): [number, number] {
  let month = 0;
  while (n > monthDays[month]) n -= monthDays[month++];
  return [n, month];
}

const LATEST = 180;
const WEEKS_BACK = 8;

function week(offset: number) {
  const start = LATEST - offset * 7;
  const dates = days.map((_, i) => dayOfYear(start + i));
  const [d0, m0] = dates[0];
  const [d6, m6] = dates[6];
  const range = m0 === m6 ? `${d0} – ${d6} ${monthNames[m6]}` : `${d0} ${monthNames[m0]} – ${d6} ${monthNames[m6]}`;

  const rng = createRng(`steps-${offset}`);
  const shape = [0.78, 0.84, 0.72, 0.9, 0.82, 1.62, 1.32].map(
    (s) => s * rng.range(0.82, 1.18) * (rng() < 0.12 ? 0.55 : 1),
  );
  const sum = shape.reduce((a, b) => a + b, 0);
  const total = offset === 0 ? 31_600 : Math.round(rng.range(26_000, 38_000) / 100) * 100;
  const data = shape.map((s) => Math.round((s / sum) * total));
  data[6] += total - data.reduce((a, b) => a + b, 0);

  return {
    range,
    data,
    total,
    titles: dates.map(([d, m], i) => `${dayNames[i]} ${d} ${monthNames[m]}`),
  };
}

export default function GoalBarsDemo() {
  const [offset, setOffset] = useState(0);
  const { range, data, total, titles } = week(offset);

  return (
    <GoalBars
      className="w-full max-w-[440px]"
      label="Steps"
      value={formatNumber(total)}
      caption="total steps"
      labels={days}
      titles={titles}
      data={data}
      goal={5000}
      action={
        <PeriodStepper
          previousLabel="Previous week"
          nextLabel="Next week"
          onPrevious={() => setOffset((o) => o + 1)}
          onNext={() => setOffset((o) => o - 1)}
          isPreviousDisabled={offset >= WEEKS_BACK}
          isNextDisabled={offset === 0}
          labelClassName="min-w-[7.25rem]"
        >
          {range}
        </PeriodStepper>
      }
    />
  );
}
