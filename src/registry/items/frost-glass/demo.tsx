"use client";

import { FrostGlass } from "@/components/miyuki-ui/frost-glass";
import { landscape } from "@/registry/lib/art";

export default function FrostGlassDemo() {
  return (
    <figure className="flex w-full flex-col items-center gap-4">
      <FrostGlass aria-label="Window over Lake Tōya at dawn" className="aspect-[26/17] w-full max-w-[520px]">
        <img
          src={landscape("lake-toya", { width: 1040, height: 680, mood: "dawn" })}
          alt="Ridges above Lake Tōya at dawn"
          className="size-full object-cover"
        />
      </FrostGlass>
      <figcaption className="text-sm text-muted-foreground">Wipe the window.</figcaption>
    </figure>
  );
}
