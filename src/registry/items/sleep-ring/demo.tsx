"use client";

import { useState } from "react";
import { PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { SleepRing } from "@/components/miyuki-ui/sleep-ring";

const ranges = ["6 – 12 Jul", "29 Jun – 5 Jul", "22 – 28 Jun", "15 – 21 Jun", "8 – 14 Jun", "1 – 7 Jun"];

function week(offset: number) {
  if (offset === 0) {
    return { score: 98, stages: [102, 118, 231, 21] };
  }
  const rng = createRng(`sleep-${offset}`);
  const deep = Math.round(rng.range(62, 104));
  const rem = Math.round(rng.range(84, 120));
  const light = Math.round(rng.range(196, 248));
  const awake = Math.round(rng.range(18, 64));
  const score = Math.round(Math.min(96, 64 + deep * 0.12 + rem * 0.08 - awake * 0.3 + rng.range(0, 6)));
  return { score, stages: [deep, rem, light, awake] };
}

const names = ["Deep", "REM", "Light", "Awake"];

function hours(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}

export default function SleepRingDemo() {
  const [offset, setOffset] = useState(0);
  const { score, stages } = week(offset);

  return (
    <SleepRing
      className="w-full max-w-[400px]"
      label="Sleep score"
      note={`${hours(stages[0] + stages[1] + stages[2])} asleep a night`}
      score={score}
      stages={stages.map((minutes, i) => ({ name: names[i], minutes }))}
      action={
        <PeriodStepper
          previousLabel="Previous week"
          nextLabel="Next week"
          onPrevious={() => setOffset((o) => o + 1)}
          onNext={() => setOffset((o) => o - 1)}
          isPreviousDisabled={offset >= ranges.length - 1}
          isNextDisabled={offset === 0}
          labelClassName="min-w-[7.25rem]"
        >
          {ranges[offset]}
        </PeriodStepper>
      }
    />
  );
}
