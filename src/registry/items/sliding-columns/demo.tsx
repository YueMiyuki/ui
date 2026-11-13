"use client";

import { SlidingColumns } from "@/components/miyuki-ui/sliding-columns";
import { landscape, moods } from "@/registry/lib/art";

const images = Array.from({ length: 18 }, (_, i) =>
  landscape(`wall-${i}`, { mood: moods[(i * 5) % moods.length], width: 480, height: 600 }),
);

export default function SlidingColumnsDemo() {
  return (
    <div className="relative size-full">
      <SlidingColumns images={images} height="100%" className="absolute inset-0" />
    </div>
  );
}
