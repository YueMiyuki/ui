"use client";

import { IceTiles } from "@/components/miyuki-ui/ice-tiles";

export default function IceTilesDemo() {
  return (
    <IceTiles className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] sm:text-5xl">
        Leave a trail
      </h2>
      <p className="mt-4 text-base text-muted-foreground">Move across the ice.</p>
    </IceTiles>
  );
}
