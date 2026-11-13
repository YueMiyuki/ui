"use client";

import { Footprints } from "@/components/miyuki-ui/footprints";

export default function FootprintsDemo() {
  return (
    <Footprints className="flex size-full flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-5xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl">
        Fresh tracks
      </h2>
      <p className="mt-3 text-base text-muted-foreground">Move across the snow.</p>
    </Footprints>
  );
}
