"use client";

import { Button } from "@/components/miyuki-ui/button";
import { DriftingClouds } from "@/components/miyuki-ui/drifting-clouds";

export default function DriftingCloudsDemo() {
  return (
    <DriftingClouds className="flex size-full flex-col items-center justify-center px-6 pb-16 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_44%_38%_at_50%_42%,color-mix(in_oklab,var(--background)_40%,transparent),transparent)] dark:bg-[radial-gradient(ellipse_44%_38%_at_50%_42%,color-mix(in_oklab,var(--background)_68%,transparent),transparent)]" />
      <div className="relative flex flex-col items-center">
        <h2 className="max-w-2xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
          Snow from the north-west by evening
        </h2>
        <p className="mt-4 text-base text-foreground/80">40 cm expected above 1,200 m.</p>
        <Button size="lg" className="mt-7">
          Read the full forecast
        </Button>
      </div>
    </DriftingClouds>
  );
}
