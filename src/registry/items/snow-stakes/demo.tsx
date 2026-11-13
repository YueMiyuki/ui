"use client";

import { SnowStakes } from "@/components/miyuki-ui/snow-stakes";

const stations = [
  { label: "760 m", title: "Village, 760 m", depth: 46, fresh: 5, temperature: 1.2 },
  { label: "1,010 m", title: "Forest gate, 1,010 m", depth: 81, fresh: 8, temperature: -1.4 },
  { label: "1,240 m", title: "Mid station, 1,240 m", depth: 118, fresh: 11, temperature: -3.1 },
  { label: "1,480 m", title: "Kamoshika hut, 1,480 m", depth: 142, fresh: 13, temperature: -4.6 },
  { label: "1,720 m", title: "Upper lift, 1,720 m", depth: 177, fresh: 16, temperature: -6.9 },
  { label: "2,010 m", title: "North ridge, 2,010 m", depth: 211, fresh: 19, temperature: -9.2 },
  { label: "2,380 m", title: "Summit, 2,380 m", depth: 248, fresh: 22, temperature: -11.4 },
];

export default function SnowStakesDemo() {
  return (
    <SnowStakes
      className="w-full max-w-[520px]"
      label="Snow depth"
      value="248 cm"
      caption="+22 cm overnight"
      note="Summit station, 2,380 m. Read at 06:00."
      data={stations}
    />
  );
}
