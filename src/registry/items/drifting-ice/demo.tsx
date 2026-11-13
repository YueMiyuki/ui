"use client";

import { DriftingIce } from "@/components/miyuki-ui/drifting-ice";

export default function DriftingIceDemo() {
  return (
    <DriftingIce className="flex size-full items-center justify-center px-6 text-center">
      <div data-ice-clear className="max-w-2xl">
        <h2 className="font-display text-4xl leading-[1.06] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Shipping lane open as far as Abashiri
        </h2>
        <p className="mt-4 text-base text-foreground/80">Pack ice at four tenths.</p>
      </div>
    </DriftingIce>
  );
}
