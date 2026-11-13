"use client";

import { SnowReport } from "@/components/miyuki-ui/snow-report";
import { people } from "@/registry/lib/data";

const yuna = people.find((p) => p.name === "Yuna Sato") ?? people[0];

export default function SnowReportDemo() {
  return (
    <div className="w-full max-w-2xl">
      <SnowReport
        report={{
          resort: "Nozawa Onsen",
          date: "Saturday 13 February 2027",
          time: "06:00",
          status: "Open",
          new24: 38,
          new7: 112,
          base: 215,
          summit: 340,
          baseAltitude: 565,
          summitAltitude: 1650,
          temperature: { summit: -9, base: -4 },
          wind: { speed: 24, direction: "NW" },
          lifts: { open: 18, total: 21 },
          runs: { open: 36, total: 44 },
          note: "Snow eases by mid-morning as the wind backs to the west. Deep, settled powder off the Yamabiko lift; the upper Skyline run stays closed until patrol finishes control work around ten.",
          forecaster: { name: yuna.name, role: yuna.role, avatar: yuna.avatar },
          next: "Next report at 12:00",
        }}
      />
    </div>
  );
}
