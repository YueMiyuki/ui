"use client";

import { Waves } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { TideSheet, TideSheetTitle, TideSheetTrigger } from "@/components/miyuki-ui/tide-sheet";

const turns = [
  { kind: "Low", time: "03:12", height: 0.08 },
  { kind: "High", time: "09:47", height: 0.36 },
  { kind: "Low", time: "15:58", height: 0.11 },
  { kind: "High", time: "21:34", height: 0.31 },
];

const details = [
  ["Sunrise", "06:31"],
  ["Sunset", "17:12"],
  ["Water", "3.4°C"],
  ["Wind", "NW 6 m/s"],
  ["Swell", "0.8 m"],
  ["Moonrise", "13:05"],
];

function hours(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function level(t: number) {
  const points = [
    { t: hours("21:34") - 24, h: 0.29 },
    ...turns.map((p) => ({ t: hours(p.time), h: p.height })),
    { t: hours("03:12") + 24, h: 0.1 },
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) return a.h + ((b.h - a.h) * (1 - Math.cos((Math.PI * (t - a.t)) / (b.t - a.t)))) / 2;
  }
  return 0.2;
}

const W = 520;
const H = 120;
const y = (h: number) => H - 14 - (h / 0.4) * (H - 30);
const curve = Array.from({ length: 97 }, (_, i) => {
  const t = i / 4;
  return `${((t / 24) * W).toFixed(1)} ${y(level(t)).toFixed(1)}`;
});
const now = hours("11:20");

export default function TideSheetDemo() {
  return (
    <TideSheetTrigger>
      <Button variant="secondary" iconStart={<Waves />}>
        Show tide times
      </Button>
      <TideSheet>
        <div className="flex flex-col gap-5 px-5 pb-8">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <TideSheetTitle>Otaru Port</TideSheetTitle>
              <p className="text-[13px] text-muted-foreground">Friday 14 February · heights above chart datum</p>
            </div>
            <span className="shrink-0 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">Now 11:20</span>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {turns.map((turn) => (
              <li key={turn.time} className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2.5">
                <span className="text-xs text-muted-foreground">{turn.kind} water</span>
                <span className="text-lg leading-6 font-semibold tracking-[-0.01em] tabular-nums">{turn.time}</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">{turn.height.toFixed(2)} m</span>
              </li>
            ))}
          </ul>
          <figure className="flex flex-col gap-2">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label="Tide height through the day"
            >
              <path d={`M${curve.join("L")}L${W} ${H}L0 ${H}Z`} className="fill-brand/12" />
              <path d={`M${curve.join("L")}`} fill="none" className="stroke-brand" strokeWidth={2} />
              <line
                x1={(now / 24) * W}
                x2={(now / 24) * W}
                y1={8}
                y2={H}
                className="stroke-foreground/40"
                strokeDasharray="3 3"
              />
              <circle
                cx={(now / 24) * W}
                cy={y(level(now))}
                r={4.5}
                className="fill-brand stroke-popover"
                strokeWidth={2}
              />
            </svg>
            <figcaption className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </figcaption>
          </figure>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
            {details.map(([term, value]) => (
              <div key={term} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="text-sm font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] leading-5 text-pretty text-muted-foreground">
            The tidal range on this coast is small, rarely more than 40 centimetres. Strong north-westerly winds in
            winter can hold the water higher than the table shows.
          </p>
        </div>
      </TideSheet>
    </TideSheetTrigger>
  );
}
