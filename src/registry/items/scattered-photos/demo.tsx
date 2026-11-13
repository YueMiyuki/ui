"use client";

import { Button } from "@/components/miyuki-ui/button";
import { ScatteredPhotos } from "@/components/miyuki-ui/scattered-photos";
import { landscape } from "@/registry/lib/art";

const images = [
  landscape("archive-otaru", { width: 640, height: 460, mood: "dusk" }),
  landscape("archive-hakuba", { width: 560, height: 420, mood: "day" }),
  landscape("archive-kiso", { width: 480, height: 360, mood: "snow" }),
  landscape("archive-niseko", { width: 600, height: 440, mood: "aurora" }),
  landscape("archive-aomori", { width: 520, height: 390, mood: "dawn" }),
  landscape("archive-toya", { width: 640, height: 460, mood: "dusk" }),
  landscape("archive-shirakawa", { width: 480, height: 360, mood: "night" }),
  landscape("archive-nozawa", { width: 560, height: 400, mood: "snow" }),
];

export default function ScatteredPhotosDemo() {
  return (
    <ScatteredPhotos images={images} className="size-full px-6">
      <h2 className="max-w-xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
        Ten winters, one archive
      </h2>
      <p className="mt-4 max-w-sm text-base text-muted-foreground">
        3,184 photographs from Otaru to Kiso, sorted by place and snowfall.
      </p>
      <Button size="lg" className="mt-7">
        Open the archive
      </Button>
    </ScatteredPhotos>
  );
}
