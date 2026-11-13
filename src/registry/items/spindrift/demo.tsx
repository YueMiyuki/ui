"use client";

import { Spindrift } from "@/components/miyuki-ui/spindrift";

export default function SpindriftDemo() {
  return (
    <Spindrift className="flex size-full flex-col px-6 pt-12 sm:px-12 sm:pt-16">
      <h2 className="font-display text-4xl leading-[1.04] font-semibold tracking-[-0.03em] sm:text-6xl">
        Summit wind <span className="whitespace-nowrap tabular-nums">68 km/h</span>
      </h2>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">Lifts above 1,800 m are on hold.</p>
    </Spindrift>
  );
}
