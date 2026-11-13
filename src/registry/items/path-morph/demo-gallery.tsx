"use client";

import { useState } from "react";
import { Button } from "react-aria-components";
import { MorphIcon, type MorphIconSet, morphIcons } from "@/components/miyuki-ui/path-morph";

function SetTile({ name }: { name: MorphIconSet }) {
  const shapes = morphIcons[name];
  const names = Object.keys(shapes);
  const [index, setIndex] = useState(0);
  const shape = names[index];

  return (
    <Button
      aria-label={`${name}: ${shape}. Press for ${names[(index + 1) % names.length]}`}
      onPress={() => setIndex((i) => (i + 1) % names.length)}
      className="group flex cursor-default flex-col items-center gap-3 rounded-xl px-2 pt-5 pb-3 outline-none transition-colors duration-150 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:bg-accent"
    >
      <MorphIcon shapes={shapes} shape={shape} size={32} className="text-foreground" />
      <span className="flex flex-col items-center gap-0.5">
        <code className="font-mono text-xs text-foreground">{name}</code>
        <span className="text-xs text-muted-foreground">{shape}</span>
      </span>
    </Button>
  );
}

export default function PathMorphGalleryDemo() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1">
      {(Object.keys(morphIcons) as MorphIconSet[]).map((name) => (
        <SetTile key={name} name={name} />
      ))}
    </div>
  );
}
