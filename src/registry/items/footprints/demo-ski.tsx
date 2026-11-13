"use client";

import { Footprints } from "@/components/miyuki-ui/footprints";

export default function FootprintsSkiDemo() {
  return (
    <Footprints mode="ski" className="flex size-full flex-col items-start px-7 pt-9 sm:px-12 sm:pt-12">
      <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] sm:text-5xl">
        Nozawa forest loop
      </h2>
      <p className="mt-3 text-base text-muted-foreground">7.4 km, groomed at 05:40.</p>
    </Footprints>
  );
}
