"use client";

import { Button } from "@/components/miyuki-ui/button";
import { HeroSnowWater } from "@/components/miyuki-ui/hero-snow-water";

export default function HeroSnowWaterDemo() {
  return (
    <HeroSnowWater title={["Know the mountain", "before you leave the valley."]} className="min-h-svh">
      <p className="max-w-[24rem] text-[17px]/7 text-pretty text-muted-foreground">
        Avalanche bulletins, summit wind and snow depth for 214 peaks, written at 05:30 by forecasters who climb them.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg">Read today’s bulletin</Button>
        <Button size="lg" variant="secondary">
          Find a station
        </Button>
      </div>
    </HeroSnowWater>
  );
}
