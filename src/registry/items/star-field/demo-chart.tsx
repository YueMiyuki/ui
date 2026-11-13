"use client";

import { FallingStars, StarField } from "@/components/miyuki-ui/star-field";

export default function StarFieldChartDemo() {
  return (
    <div className="relative isolate flex size-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <StarField density={110} />
      <FallingStars minDelay={2600} maxDelay={6400} />
      <div className="relative">
        <h2 className="font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
          Geminids over the Kiso valley
        </h2>
        <p className="mt-4 text-base text-muted-foreground">About 120 an hour at the peak, 02:00 on Sunday.</p>
      </div>
    </div>
  );
}
