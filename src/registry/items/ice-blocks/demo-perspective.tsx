"use client";

import { IceBlocks } from "@/components/miyuki-ui/ice-blocks";

export default function IceBlocksPerspectiveDemo() {
  return (
    <IceBlocks variant="perspective" className="flex size-full flex-col items-center px-6 pt-16 text-center sm:pt-20">
      <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Fast ice off Abashiri
      </h2>
      <p className="mt-4 text-base text-balance text-muted-foreground">Floes reach the breakwater by mid-February.</p>
    </IceBlocks>
  );
}
