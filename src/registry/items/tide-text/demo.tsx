"use client";

import { useState } from "react";
import { Slider } from "@/components/miyuki-ui/slider";
import { TideText } from "@/components/miyuki-ui/tide-text";

export default function TideTextDemo() {
  const [level, setLevel] = useState(62);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-10 text-center">
      <h2 className="font-display text-[52px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-[88px]">
        <TideText value={level}>HIGH TIDE 06:42</TideText>
      </h2>
      <div className="w-full max-w-xs text-left">
        <Slider
          label="Water at Otaru harbour"
          value={level}
          onChange={(v) => setLevel(v as number)}
          formatOptions={{ style: "unit", unit: "percent", maximumFractionDigits: 0 }}
        />
      </div>
    </div>
  );
}
