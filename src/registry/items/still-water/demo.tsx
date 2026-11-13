"use client";

import { Button } from "@/components/miyuki-ui/button";
import { StillWater } from "@/components/miyuki-ui/still-water";

export default function StillWaterDemo() {
  return (
    <StillWater className="flex size-full items-center px-6 py-12 sm:px-12 lg:px-20">
      <div className="max-w-[35rem]">
        <h2 className="font-display text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[64px]">
          Still as snow. Moves like water.
        </h2>
        <p className="mt-5 max-w-sm text-base text-pretty text-foreground/70 sm:text-lg">
          Components that keep quiet until you touch them.
        </p>
        <Button size="lg" className="mt-8">
          Browse components
        </Button>
      </div>
    </StillWater>
  );
}
