"use client";

import { AspectRose } from "@/components/miyuki-ui/aspect-rose";

const levels = [
  [3, 2, 1],
  [3, 2, 1],
  [3, 2, 1],
  [2, 2, 1],
  [2, 1, 1],
  [2, 1, 1],
  [2, 1, 1],
  [2, 2, 1],
];

export default function AspectRoseDemo() {
  return (
    <AspectRose
      className="w-full max-w-[520px]"
      label="Northern Alps, 14 February"
      levels={levels}
      bands={["Alpine", "Treeline", "Below treeline"]}
      elevations={["Above 2,400 m", "1,800 to 2,400 m", "Below 1,800 m"]}
    />
  );
}
