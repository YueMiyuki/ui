"use client";

import { Button } from "@/components/miyuki-ui/button";
import { PondGrid } from "@/components/miyuki-ui/pond-grid";

export default function PondGridDemo() {
  return (
    <PondGrid className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        Tap the water
      </h2>
      <p className="mt-4 text-base text-balance text-muted-foreground">Every reading starts a ripple downstream.</p>
      <Button size="lg" className="mt-7">
        View river levels
      </Button>
    </PondGrid>
  );
}
