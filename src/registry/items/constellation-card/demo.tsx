"use client";

import { ConstellationCard } from "@/components/miyuki-ui/constellation-card";

export default function ConstellationCardDemo() {
  return (
    <ConstellationCard className="w-full max-w-sm">
      <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.01em]">Winter hexagon</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Six bright stars visible from Matsumoto after 21:00.</p>
      <a
        href="#star-map"
        onClick={(event) => event.preventDefault()}
        className="mt-4 inline-flex rounded-sm text-sm font-medium text-brand-strong underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        Open star map
      </a>
    </ConstellationCard>
  );
}
