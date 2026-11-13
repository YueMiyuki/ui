"use client";

import { StationClock } from "@/components/miyuki-ui/station-clock";

const cities = [
  { label: "Sapporo", timeZone: "Asia/Tokyo" },
  { label: "Oslo", timeZone: "Europe/Oslo" },
  { label: "Vancouver", timeZone: "America/Vancouver" },
];

export default function StationClockDemo() {
  return (
    <div className="grid w-full max-w-2xl grid-cols-3 gap-4 sm:gap-10">
      {cities.map((city) => (
        <StationClock key={city.label} timeZone={city.timeZone} label={city.label} size={176} className="w-full" />
      ))}
    </div>
  );
}
