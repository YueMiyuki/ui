"use client";

import { useState } from "react";
import { RatingCrystals } from "@/components/miyuki-ui/rating-crystals";

const words = ["Not rated", "Wind crust", "Heavy and wet", "Packed but fair", "Soft and light", "Deep and dry"];

export default function RatingCrystalsDemo() {
  const [value, setValue] = useState(5);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <RatingCrystals label="How was the powder?" value={value} onChange={setValue} />
        <p aria-live="polite" className="pb-2 text-sm font-medium text-brand-strong">
          {words[value]}
        </p>
      </div>
      <p className="text-[13px] text-muted-foreground">Happo-one, north face · 9 February</p>
    </div>
  );
}
