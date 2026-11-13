"use client";

import { ColourPool } from "@/components/miyuki-ui/colour-pool";

export default function ColourPoolDemo() {
  return (
    <ColourPool className="flex size-full items-center justify-center px-6 py-12 text-center">
      <h2 className="max-w-3xl font-display text-5xl leading-[1.04] font-semibold tracking-[-0.02em] text-balance sm:text-6xl md:text-7xl">
        The first warm day of March
      </h2>
    </ColourPool>
  );
}
