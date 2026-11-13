"use client";

import { Button } from "@/components/miyuki-ui/button";
import { Snowfall } from "@/components/miyuki-ui/snowfall";

const forecast = [
  { label: "New snow", value: "38–42 cm" },
  { label: "Low", value: "−11 °C" },
  { label: "Wind", value: "NW 3 m/s" },
];

export default function SnowfallDemo() {
  return (
    <Snowfall className="flex size-full flex-col items-center justify-center gap-8 px-6 py-10">
      <h2 className="text-center font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Forty centimetres by morning
      </h2>
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <div data-snow-ledge className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">Niseko Hirafu, overnight</p>
            <p className="text-[13px] text-muted-foreground">Issued 17:40</p>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {forecast.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="mt-1 text-sm font-medium tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button data-snow-ledge>Set a powder alert</Button>
          <Button data-snow-ledge variant="secondary">
            Hourly forecast
          </Button>
        </div>
      </div>
    </Snowfall>
  );
}
