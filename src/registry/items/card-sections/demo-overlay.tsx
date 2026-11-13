"use client";

import { OverlayCard } from "@/components/miyuki-ui/card-sections";
import { landscape } from "@/registry/lib/art";

export default function CardSectionsOverlayDemo() {
  return (
    <OverlayCard
      src={landscape("overlay-daisetsuzan", { mood: "dusk", width: 800, height: 1000 })}
      alt="Ridges at dusk above a still lake"
      meta="Hokkaido · July to September"
      title="Three nights on the Daisetsuzan traverse"
      description="Hut to hut across the roof of Hokkaido, with a guide and a forecast written for the ridge."
      href="#daisetsuzan"
    />
  );
}
