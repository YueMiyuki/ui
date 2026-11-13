"use client";

import { SpotlightBeams } from "@/components/miyuki-ui/spotlight-beams";

export default function SpotlightBeamsDemo() {
  return (
    <SpotlightBeams className="dark flex size-full flex-col items-center justify-center bg-background px-6 pt-20 pb-12 text-center text-foreground">
      <h2 className="max-w-xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Two lighthouses, one strait
      </h2>
      <p className="mt-4 text-base text-balance text-muted-foreground">Crossing forecasts for the Tsugaru channel.</p>
    </SpotlightBeams>
  );
}
