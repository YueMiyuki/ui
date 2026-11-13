"use client";

import { RiverLanterns } from "@/components/miyuki-ui/river-lanterns";

export default function RiverLanternsDemo() {
  return (
    <RiverLanterns className="dark flex size-full flex-col items-start px-7 pt-9 text-foreground sm:px-12 sm:pt-12">
      <h2 className="max-w-md font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Lantern night on the Asano river
      </h2>
      <p className="mt-3 text-base text-muted-foreground">First Friday of June, from dusk.</p>
    </RiverLanterns>
  );
}
