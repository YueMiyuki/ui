"use client";

import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";

export default function LayeredWavesLinesDemo() {
  return (
    <LayeredWaves
      variant="lines"
      waveCount={7}
      amplitude={30}
      level={0.48}
      className="flex size-full flex-col items-center px-6 pt-10 text-center md:pt-16"
    >
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance md:text-5xl">
        Swell from the northwest
      </h2>
      <p className="mt-4 text-base text-muted-foreground">1.8 m at 9 seconds off Shakotan by evening.</p>
    </LayeredWaves>
  );
}
