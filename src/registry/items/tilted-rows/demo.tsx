"use client";

import { TiltedRows } from "@/components/miyuki-ui/tilted-rows";
import { landscape, type Mood } from "@/registry/lib/art";

const photos: [string, Mood][] = [
  ["Otaru", "dusk"],
  ["Hakuba", "day"],
  ["Nozawa", "snow"],
  ["Shirakawa", "night"],
  ["Aomori", "dawn"],
  ["Lake Tōya", "day"],
  ["Niseko", "aurora"],
  ["Kiso", "snow"],
  ["Matsumoto", "dawn"],
  ["Yakushima", "dusk"],
  ["Furano", "snow"],
  ["Zaō", "day"],
  ["Ginzan", "night"],
  ["Tateyama", "dawn"],
  ["Shiretoko", "aurora"],
];

const items = photos.map(([title, mood]) => ({
  title,
  src: landscape(`archive-${title}`, { mood, width: 640, height: 480 }),
}));

export default function TiltedRowsDemo() {
  return (
    <div>
      <TiltedRows
        items={items}
        header={
          <>
            <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-[-0.03em] sm:text-7xl">
              The archive
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Fifteen winters of photographs, sorted by valley.
            </p>
          </>
        }
      />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:px-10">
          <span>2,416 photographs from 38 valleys</span>
          <span>Mateo Álvarez, photographer</span>
        </div>
      </footer>
    </div>
  );
}
