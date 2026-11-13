"use client";

import { DotPaper } from "@/components/miyuki-ui/graph-paper";
import { LowSun } from "@/components/miyuki-ui/low-sun";

export default function LowSunDemo() {
  return (
    <DotPaper className="dark size-full bg-background text-foreground">
      <LowSun follow className="flex size-full flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
        <h2 className="max-w-xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
          First light on the north face
        </h2>
        <p className="mt-4 text-base text-muted-foreground tabular-nums">Sunrise 06:41. Summit wind 12 km/h.</p>
      </LowSun>
    </DotPaper>
  );
}
