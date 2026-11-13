"use client";

import { Meter } from "@/components/miyuki-ui/meter";

export default function MeterDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Meter label="Storage" value={72} description="7.2 GB of 10 GB" />
      <Meter label="Seats" value={42} maxValue={50} description="42 of 50 seats taken" />
      <Meter label="API requests" value={96140} maxValue={100000} description="96,140 of 100,000 this month" />
      <Meter
        label="Hut capacity"
        variant="segments"
        value={14}
        maxValue={24}
        description="14 of 24 bunks booked for Saturday"
      />
    </div>
  );
}
