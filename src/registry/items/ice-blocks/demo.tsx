"use client";

import { IceBlocks } from "@/components/miyuki-ui/ice-blocks";

export default function IceBlocksDemo() {
  return (
    <IceBlocks className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative px-10 py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--background)_82%,transparent),transparent)]"
        />
        <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
          Pack ice, <span className="tabular-nums">68°</span> north
        </h2>
        <p className="mt-4 text-base text-balance text-muted-foreground">Move the pointer to break the surface.</p>
      </div>
    </IceBlocks>
  );
}
