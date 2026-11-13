"use client";

import { Icicles } from "@/components/miyuki-ui/icicles";

const HOURS = [
  { days: "Monday to Friday", time: "09:00–17:30" },
  { days: "Saturday", time: "10:00–16:00" },
  { days: "Sunday", time: "Closed" },
];

export default function IciclesDemo() {
  return (
    <Icicles className="w-full max-w-sm rounded-2xl border border-border bg-card px-6 pt-28 pb-6 shadow-sm">
      <h3 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">Mind the eaves</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Ice falls from the roof on sunny afternoons. Please use the side entrance on Funabashi Street.
      </p>
      <dl className="mt-5 divide-y divide-border border-t border-border text-sm">
        {HOURS.map((row) => (
          <div key={row.days} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{row.days}</dt>
            <dd className="font-medium tabular-nums">{row.time}</dd>
          </div>
        ))}
      </dl>
    </Icicles>
  );
}
