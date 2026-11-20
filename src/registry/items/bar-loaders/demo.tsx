"use client";

import {
  ChargeLoader,
  CrossLoader,
  EqualizerLoader,
  SlideLoader,
  StackLoader,
  SweepLoader,
} from "@/components/miyuki-ui/bar-loaders";

const items = [
  { name: "Equalizer", node: <EqualizerLoader size={32} label="Buffering the harbour radio" /> },
  { name: "Sweep", node: <SweepLoader size={32} label="Reading the wind on the ridge" /> },
  { name: "Slide", node: <SlideLoader size={32} label="Loading the next departure" /> },
  { name: "Stack", node: <StackLoader size={32} label="Sorting the arrivals board" /> },
  { name: "Cross", node: <CrossLoader size={32} label="Adding the stop to your route" /> },
  { name: "Charge", node: <ChargeLoader size={32} label="Charging the trail camera" /> },
];

export default function BarLoadersDemo() {
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
