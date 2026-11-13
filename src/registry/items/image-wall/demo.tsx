"use client";

import { ImageWall } from "@/components/miyuki-ui/image-wall";
import { landscape, moods } from "@/registry/lib/art";

const images = Array.from({ length: 24 }, (_, i) =>
  landscape(`wall-${i}`, { mood: moods[(i * 5) % moods.length], width: 480, height: 360 }),
);

export default function ImageWallDemo() {
  return <ImageWall images={images} className="size-full" />;
}
