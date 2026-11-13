"use client";

import { DotMosaic } from "@/components/miyuki-ui/dot-mosaic";
import { landscape } from "@/registry/lib/art";

const src = landscape("niseko-first", { mood: "day", width: 960, height: 600 });

export default function DotMosaicDemo() {
  return (
    <DotMosaic
      src={src}
      alt="Morning sun over layered ridges above Niseko, drawn in dots"
      className="aspect-[16/10] w-full max-w-160"
    />
  );
}
