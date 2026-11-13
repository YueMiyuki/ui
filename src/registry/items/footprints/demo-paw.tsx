"use client";

import { Footprints } from "@/components/miyuki-ui/footprints";

export default function FootprintsPawDemo() {
  return (
    <Footprints mode="paw" fill={20} className="flex size-full flex-col items-start px-7 pt-9 sm:px-12 sm:pt-12">
      <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] sm:text-5xl">
        Something passed in the night
      </h2>
      <p className="mt-3 text-base text-muted-foreground">A fox, by the look of the prints.</p>
    </Footprints>
  );
}
