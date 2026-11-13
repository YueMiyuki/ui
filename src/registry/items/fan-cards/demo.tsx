"use client";

import { FanCards } from "@/components/miyuki-ui/fan-cards";
import { landscape, type Mood } from "@/registry/lib/art";

const valleys: { name: string; note: string; mood: Mood }[] = [
  { name: "Kurobe", note: "Toyama, 1,450 m", mood: "dusk" },
  { name: "Azusa", note: "Kamikōchi, 1,500 m", mood: "dawn" },
  { name: "Takase", note: "Ōmachi, 1,320 m", mood: "snow" },
  { name: "Kiso", note: "Nagano, 940 m", mood: "day" },
  { name: "Ina", note: "Nagano, 680 m", mood: "aurora" },
];

export default function FanCardsDemo() {
  return (
    <FanCards
      title="Five valleys, one pass"
      cards={valleys.map((valley) => (
        <figure
          key={valley.name}
          className="relative size-full overflow-clip rounded-2xl bg-muted shadow-lg ring-1 ring-foreground/10"
        >
          <img
            src={landscape(`fan-${valley.name.toLowerCase()}`, { mood: valley.mood, width: 360, height: 480 })}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
          <figcaption className="dark absolute inset-x-0 bottom-0 bg-linear-to-t from-[oklch(0.16_0.03_250/0.82)] to-transparent px-4 pt-14 pb-3.5 text-foreground">
            <span className="block text-[15px] font-semibold tracking-[-0.01em]">{valley.name}</span>
            <span className="mt-0.5 block text-xs text-foreground/75">{valley.note}</span>
          </figcaption>
        </figure>
      ))}
    />
  );
}
