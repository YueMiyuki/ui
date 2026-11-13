"use client";

import { WordChip } from "@/components/miyuki-ui/word-chip";

export default function WordChipDemo() {
  return (
    <h2 className="text-center font-display text-[34px] leading-[1.3] font-semibold tracking-[-0.015em] text-foreground sm:text-5xl sm:leading-[1.25]">
      <WordChip text="Forecasts for" words={["skiers", "anglers", "farmers", "bus drivers"]} />
    </h2>
  );
}
