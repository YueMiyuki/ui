"use client";

import { PhotoPocket } from "@/components/miyuki-ui/photo-pocket";
import { landscape } from "@/registry/lib/art";

const thumb = (seed: string, mood: "dawn" | "day" | "dusk" | "night" | "snow") =>
  landscape(seed, { width: 96, height: 120, mood });

export default function PhotoPocketDemo() {
  return (
    <div className="flex flex-col items-center gap-7 pt-8">
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center font-display text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
        Shot on the Kiso road
        <PhotoPocket
          text="48 photos"
          href="#kiso-road"
          images={[thumb("kiso-1", "snow"), thumb("kiso-2", "dawn"), thumb("kiso-3", "day")]}
        />
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <PhotoPocket
          text="Otaru album"
          images={[thumb("otaru-1", "dusk"), thumb("otaru-2", "night"), thumb("otaru-3", "snow")]}
        />
        <PhotoPocket
          text="Hakuba album"
          images={[thumb("hakuba-1", "day"), thumb("hakuba-2", "dawn"), thumb("hakuba-3", "snow")]}
        />
      </div>
    </div>
  );
}
