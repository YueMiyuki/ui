"use client";

import { PulseDots } from "@/components/miyuki-ui/pulse-dots";

export default function PulseDotsDemo() {
  return (
    <PulseDots className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        Every flake is counted
      </h2>
      <p className="mt-4 max-w-sm text-base text-balance text-muted-foreground">
        Snow depth from 1,284 stations, refreshed every ten minutes.
      </p>
    </PulseDots>
  );
}
