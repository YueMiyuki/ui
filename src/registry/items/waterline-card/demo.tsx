"use client";

import { WaterlineCard } from "@/components/miyuki-ui/waterline-card";

export default function WaterlineCardDemo() {
  return (
    <WaterlineCard className="max-w-xl" text="The lake looks frozen." revealText="It is only resting.">
      <h3 className="text-base font-semibold text-foreground">Lake Tōya never freezes</h3>
      <p className="mt-1 text-sm text-muted-foreground">Move across the card to see why.</p>
    </WaterlineCard>
  );
}
