"use client";

import { DiamondDust } from "@/components/miyuki-ui/diamond-dust";

export default function DiamondDustSnowfallDemo() {
  return (
    <DiamondDust
      direction="down"
      interactive
      density={110}
      maxSize={2}
      className="flex size-full flex-col items-center justify-center px-6 py-12 text-center"
    >
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        First snow in the Kiso valley
      </h2>
      <p className="mt-4 text-base text-balance text-muted-foreground">From 22:00 tonight, 4 to 7 cm by morning.</p>
    </DiamondDust>
  );
}
