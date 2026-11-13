"use client";

import { Button } from "@/components/miyuki-ui/button";
import { TideSlideshow } from "@/components/miyuki-ui/tide-slideshow";
import { landscape, type Mood } from "@/registry/lib/art";

const mornings: [string, Mood][] = [
  ["otaru-canal", "dawn"],
  ["lake-toya", "day"],
  ["asahidake", "snow"],
  ["shiretoko", "dawn"],
  ["biei-hills", "day"],
];

const images = mornings.map(([seed, mood]) => landscape(seed, { mood, width: 1600, height: 900 }));

export default function TideSlideshowDemo() {
  return (
    <TideSlideshow images={images} aria-label="Five mornings in Hokkaido" className="size-full">
      <div className="max-w-lg">
        <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Five mornings in Hokkaido
        </h2>
        <p className="mt-3 text-base text-foreground/80">
          From first light on the Otaru canal to the drift ice at Shiretoko.
        </p>
        <Button className="mt-6">See the route</Button>
      </div>
    </TideSlideshow>
  );
}
