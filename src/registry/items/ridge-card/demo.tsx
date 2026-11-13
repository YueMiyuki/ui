"use client";

import { RidgeCard } from "@/components/miyuki-ui/ridge-card";

export default function RidgeCardDemo() {
  return (
    <RidgeCard seed="hotaka" mood="dawn" className="max-w-[23.75rem]">
      <p className="text-sm text-foreground/85">Northern Alps, 14 February</p>
      <h3 className="mt-1 font-display text-3xl leading-tight font-semibold tracking-[-0.02em]">Visibility 40 km</h3>
      <p className="mt-2 text-sm text-foreground/85 tabular-nums">Freezing level 1,350 m, wind west 18 km/h</p>
    </RidgeCard>
  );
}
