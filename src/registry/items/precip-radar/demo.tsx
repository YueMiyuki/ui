"use client";

import { PrecipRadar } from "@/components/miyuki-ui/precip-radar";
import { topo } from "@/registry/lib/art";

const times = [
  "12:10",
  "12:20",
  "12:30",
  "12:40",
  "12:50",
  "13:00",
  "13:10",
  "13:20",
  "13:30",
  "13:40",
  "13:50",
  "14:00",
];

const towns = [
  { name: "Otaru", x: 42, y: 38 },
  { name: "Sapporo", x: 63, y: 56 },
  { name: "Yoichi", x: 24, y: 30 },
  { name: "Niseko", x: 18, y: 74 },
];

export default function PrecipRadarDemo() {
  return (
    <PrecipRadar
      className="w-full max-w-[560px]"
      label="Rain and snow, last two hours"
      note="Ishikari radar, every 10 minutes"
      frames={12}
      times={times}
      wind={{ from: 300, speed: 0.026 }}
      seed="ishikari"
      overlay={towns.map((t) => (
        <span
          key={t.name}
          className="absolute flex -translate-x-1 -translate-y-1/2 items-center gap-1 text-[11px] font-medium text-foreground [text-shadow:0_0_3px_var(--card),0_0_6px_var(--card)]"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          <span className="size-1.5 rounded-full bg-foreground ring-2 ring-card/80" />
          {t.name}
        </span>
      ))}
    >
      <img
        src={topo("ishikari", { width: 1120, height: 600 })}
        alt=""
        className="size-full object-cover opacity-60 dark:opacity-35"
      />
    </PrecipRadar>
  );
}
