"use client";

import { WaveLines } from "@/components/miyuki-ui/wave-lines";

export default function WaveLinesDemo() {
  return (
    <WaveLines className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        Read the water before you cross it
      </h2>
      <p className="mt-4 text-base text-muted-foreground">River levels for 214 crossings, updated hourly.</p>
    </WaveLines>
  );
}
