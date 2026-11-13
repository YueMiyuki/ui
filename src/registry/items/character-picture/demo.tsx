"use client";

import { useState } from "react";
import { CharacterPicture, type CharacterPictureCharset } from "@/components/miyuki-ui/character-picture";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { landscape } from "@/registry/lib/art";

const charsets: { id: CharacterPictureCharset; label: string; columns: number }[] = [
  { id: "blocks", label: "Blocks", columns: 112 },
  { id: "dots", label: "Dots", columns: 140 },
  { id: "standard", label: "Standard", columns: 140 },
];

const src = landscape("asahidake", { mood: "dusk", width: 960, height: 600 });

export default function CharacterPictureDemo() {
  const [charset, setCharset] = useState(charsets[0]);
  return (
    <div className="flex w-full max-w-160 flex-col items-center gap-5">
      <CharacterPicture
        src={src}
        alt="Dusk over a ridge of snow-covered peaks, drawn in characters"
        charset={charset.id}
        columns={charset.columns}
        className="aspect-[16/10] text-foreground"
      />
      <SegmentedControl
        size="sm"
        aria-label="Characters"
        selectedKeys={[charset.id]}
        onSelectionChange={(keys) => {
          const next = charsets.find((c) => c.id === [...keys][0]);
          if (next) setCharset(next);
        }}
        className="max-w-full overflow-x-auto"
      >
        {charsets.map((c) => (
          <Segment key={c.id} id={c.id}>
            {c.label}
          </Segment>
        ))}
      </SegmentedControl>
    </div>
  );
}
