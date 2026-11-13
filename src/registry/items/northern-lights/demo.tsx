"use client";

import { Button } from "@/components/miyuki-ui/button";
import { NorthernLights } from "@/components/miyuki-ui/northern-lights";

export default function NorthernLightsDemo() {
  return (
    <NorthernLights className="flex size-full flex-col items-center justify-center px-6 pt-20 pb-10 text-center">
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        Clear skies over Lake Tōya tonight
      </h2>
      <p className="mt-4 text-base text-muted-foreground">Aurora activity is high until 02:00.</p>
      <Button size="lg" className="mt-7">
        See the forecast
      </Button>
    </NorthernLights>
  );
}
