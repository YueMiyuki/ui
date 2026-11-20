"use client";

import {
  FlipLoader,
  NestLoader,
  RoundingLoader,
  ShuffleLoader,
  SpiralLoader,
  TumbleLoader,
} from "@/components/miyuki-ui/square-loaders";

const items = [
  { name: "Tumble", node: <TumbleLoader size={32} label="Loading snow depths" /> },
  { name: "Shuffle", node: <ShuffleLoader size={32} label="Sorting today's departures" /> },
  { name: "Rounding", node: <RoundingLoader size={32} label="Checking the timetable" /> },
  { name: "Nest", node: <NestLoader size={32} label="Loading the trail map" /> },
  { name: "Spiral", node: <SpiralLoader size={32} label="Finding a room in Nozawa" /> },
  { name: "Flip", node: <FlipLoader size={32} label="Loading the weekend forecast" /> },
];

export default function SquareLoadersDemo() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {items.map(({ name, node }) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div className="grid h-10 place-items-center">{node}</div>
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}
