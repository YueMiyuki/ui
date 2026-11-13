"use client";

import { MapPinCard } from "@/components/miyuki-ui/map-pin-card";
import { landscape } from "@/registry/lib/art";

export default function MapPinCardDemo() {
  return (
    <MapPinCard title="Open in maps" href="#nozawa-onsen" containerClassName="mt-16 w-[300px] max-w-full">
      <img
        src={landscape("nozawa", { mood: "snow", width: 600, height: 440 })}
        alt="Snow on the roofs of Nozawa Onsen below the ski slopes"
        className="aspect-[15/11] w-full rounded-md object-cover"
      />
      <div className="px-1.5 pt-3.5 pb-1.5">
        <h3 className="text-base font-semibold tracking-[-0.01em]">Nozawa Onsen</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Thirteen public baths, one village.</p>
      </div>
    </MapPinCard>
  );
}
