"use client";

import { ColourSplit } from "@/components/miyuki-ui/colour-split";
import { landscape } from "@/registry/lib/art";

export default function ColourSplitDemo() {
  return (
    <ColourSplit
      src={landscape("lake-toya-morning", { width: 1280, height: 800, mood: "dawn" })}
      alt="Dawn over Lake Tōya, with the far shore and the island in silhouette"
      className="aspect-[16/10] w-full max-w-160 rounded-2xl"
    >
      <div className="dark flex h-full items-end bg-linear-to-t from-background/75 via-background/0 via-45% p-5">
        <p className="text-sm font-medium text-foreground tabular-nums">Lake Tōya, 06:10</p>
      </div>
    </ColourSplit>
  );
}
