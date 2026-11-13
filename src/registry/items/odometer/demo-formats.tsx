"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Odometer } from "@/components/miyuki-ui/odometer";

const days = [
  { label: "Friday", fares: 3284500, temp: -4.5, rate: 0.682 },
  { label: "Saturday", fares: 4120750, temp: 1.5, rate: 0.914 },
  { label: "Sunday", fares: 998400, temp: -11.2, rate: 0.457 },
];

export default function OdometerFormatsDemo() {
  const [day, setDay] = useState(0);
  const d = days[day];

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <dl className="grid w-full grid-cols-1 gap-8 text-center sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2">
          <dt className="text-sm text-muted-foreground">Lift tickets sold</dt>
          <dd>
            <Odometer value={d.fares} format={{ style: "currency", currency: "JPY" }} className="text-3xl" />
          </dd>
        </div>
        <div className="flex flex-col items-center gap-2">
          <dt className="text-sm text-muted-foreground">Summit at noon</dt>
          <dd>
            <Odometer
              value={d.temp}
              format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              suffix={<span className="text-xl font-medium text-muted-foreground">°C</span>}
              className="text-3xl"
            />
          </dd>
        </div>
        <div className="flex flex-col items-center gap-2">
          <dt className="text-sm text-muted-foreground">Rooms taken</dt>
          <dd>
            <Odometer
              value={d.rate}
              format={{ style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 1 }}
              className="text-3xl"
            />
          </dd>
        </div>
      </dl>
      <Button variant="secondary" onPress={() => setDay((i) => (i + 1) % days.length)}>
        Show {days[(day + 1) % days.length].label}
      </Button>
    </div>
  );
}
