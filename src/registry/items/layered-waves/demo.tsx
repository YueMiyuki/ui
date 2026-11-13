"use client";

import { Button } from "@/components/miyuki-ui/button";
import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";

export default function LayeredWavesDemo() {
  return (
    <LayeredWaves className="flex size-full flex-col items-center px-6 pt-10 text-center md:pt-14">
      <h2 className="max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance md:text-5xl">
        Tide tables for the whole coast
      </h2>
      <p className="mt-4 text-base text-muted-foreground">High water at Otaru, 06:42.</p>
      <Button size="lg" className="mt-7">
        Open today&apos;s tables
      </Button>
    </LayeredWaves>
  );
}
