"use client";

import { CornerDownLeft, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { type ButtonEffect, EffectButton } from "@/components/miyuki-ui/button-collection";
import { landscape } from "@/registry/lib/art";

const backdrop = landscape("toya-north-shore", { width: 360, height: 112, mood: "dusk" });

const items: { effect: ButtonEffect; label: ReactNode; alt?: string }[] = [
  { effect: "lift", label: "Book a seat" },
  { effect: "fill", label: "Add to route" },
  { effect: "draw", label: "Mark the trail" },
  { effect: "frost", label: "Open the map" },
  {
    effect: "ripple",
    label: (
      <>
        <MapPin />
        Drop a pin
      </>
    ),
  },
  { effect: "sheen", label: "Get the pass" },
  { effect: "underline", label: "Read the bulletin" },
  { effect: "reveal", label: "Continue" },
  {
    effect: "keycap",
    label: (
      <>
        Confirm
        <CornerDownLeft />
      </>
    ),
  },
  { effect: "halo", label: "Reserve a hut" },
  { effect: "swap", label: "Next train 06:42", alt: "Reserve a seat" },
  { effect: "march", label: "Add a stop" },
];

export default function ButtonCollectionDemo() {
  return (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
      {items.map(({ effect, label, alt }) => (
        <div key={effect} className="flex flex-col items-center gap-2.5">
          <div className="relative grid h-14 w-full place-items-center">
            {effect === "frost" && (
              <img
                src={backdrop}
                alt=""
                className="absolute inset-y-0 left-1/2 h-full w-full max-w-44 -translate-x-1/2 rounded-xl object-cover"
              />
            )}
            <EffectButton effect={effect} altLabel={alt}>
              {label}
            </EffectButton>
          </div>
          <span className="text-xs text-muted-foreground">{effect}</span>
        </div>
      ))}
    </div>
  );
}
