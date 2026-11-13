"use client";

import { buttonStyles } from "@/components/miyuki-ui/button";
import { FloodHover } from "@/components/miyuki-ui/flood-hover";
import { cn } from "@/lib/utils";
import { places } from "@/registry/lib/data";

const picks = ["Otaru", "Nozawa", "Hakuba"].map((name) => places.find((p) => p.name === name)!);

export default function FloodHoverDemo() {
  return (
    <div className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-3">
        {picks.map((place) => (
          <FloodHover
            key={place.name}
            src={place.image}
            alt={`${place.name}, ${place.region}`}
            className="mx-auto aspect-[4/5] w-full max-w-sm"
          >
            <p className="text-[13px] font-medium">{place.region}</p>
            <h3 className="mt-0.5 text-xl font-semibold tracking-[-0.01em]">{place.name}</h3>
            <p className="mt-2 text-sm/5 text-pretty">{place.blurb}</p>
            <a
              href={`#guide-${place.name.toLowerCase()}`}
              className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "mt-4 self-start")}
            >
              Open guide
            </a>
          </FloodHover>
        ))}
      </div>
    </div>
  );
}
