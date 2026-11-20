"use client";

import { useMemo } from "react";
import { ImageWall } from "@/components/miyuki-ui/image-wall";
import { landscape, moods } from "@/registry/lib/art";

export default function ImageWallDemo() {
  const images = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        landscape(`wall-${i}`, { mood: moods[(i * 5) % moods.length], width: 480, height: 360 }),
      ),
    [],
  );
  return <ImageWall images={images} className="size-full" />;
}
