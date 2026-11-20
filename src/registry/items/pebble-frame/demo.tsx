"use client";

import { PebbleFrame } from "@/components/miyuki-ui/pebble-frame";
import { cn } from "@/lib/utils";
import { places } from "@/registry/lib/data";

const stones = [
  {
    place: "Otaru",
    note: "Stone warehouses along the canal",
    size: "w-[136px] sm:w-[200px]",
    lift: "mb-8 sm:mb-11 sm:-mr-3",
  },
  {
    place: "Lake Tōya",
    note: "A caldera lake that never freezes",
    size: "w-[176px] sm:w-[264px]",
    lift: "mb-0",
  },
  {
    place: "Nozawa",
    note: "Thirteen baths at the end of the lane",
    size: "w-[124px] sm:w-[148px]",
    lift: "sm:mb-4 sm:-ml-1",
  },
];

export default function PebbleFrameDemo() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-x-0">
      {stones.map((stone) => {
        const place = places.find((p) => p.name === stone.place);
        return (
          <figure key={stone.place} className={cn("flex flex-col items-center", stone.size, stone.lift)}>
            <PebbleFrame seed={stone.place} shadow className="w-full">
              <a href={`#${stone.place.toLowerCase().replace(/\W+/g, "-")}`}>
                <img src={place?.image} alt={stone.place} draggable={false} className="size-full object-cover" />
              </a>
            </PebbleFrame>
            <figcaption className="mt-4 text-center">
              <div className="text-sm font-medium text-foreground">{stone.place}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-balance text-muted-foreground">{stone.note}</div>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
