"use client";

import { useState } from "react";
import { formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { WeekdayRings } from "@/components/miyuki-ui/weekday-rings";

const months = [
  { name: "July", days: 31, first: 2, total: 264_590 },
  { name: "June", days: 30, first: 0, total: 241_120 },
  { name: "May", days: 31, first: 4, total: 227_640 },
];

const rhythm = [0.84, 0.9, 0.82, 0.92, 1.0, 1.56, 1.34];

function month(offset: number) {
  const { name, days, first, total } = months[offset];
  const rng = createRng(`active-days-${name}`);
  const rainy = rng.int(6, days - 6);
  const raw = Array.from({ length: days }, (_, i) => {
    const wet = Math.abs(i - rainy) <= 1 ? 0.45 : 1;
    return rhythm[(first + i) % 7] * rng.range(0.8, 1.2) * wet;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const data = raw.map((v) => Math.round((v / sum) * total));
  data[days - 1] += total - data.reduce((a, b) => a + b, 0);
  return { name, first, total, data };
}

export default function WeekdayRingsDemo() {
  const [offset, setOffset] = useState(0);
  const { name, first, total, data } = month(offset);

  return (
    <WeekdayRings
      className="w-full max-w-[440px]"
      label="Most active days"
      value={formatNumber(total)}
      caption="total steps"
      data={data}
      goal={8000}
      firstWeekday={first}
      month={name}
      action={
        <PeriodStepper
          previousLabel="Previous month"
          nextLabel="Next month"
          onPrevious={() => setOffset((o) => o + 1)}
          onNext={() => setOffset((o) => o - 1)}
          isPreviousDisabled={offset >= months.length - 1}
          isNextDisabled={offset === 0}
          labelClassName="min-w-[5.5rem]"
        >
          {name} 2026
        </PeriodStepper>
      }
    />
  );
}
