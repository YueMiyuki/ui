"use client";

import {
  BellLoader,
  CupLoader,
  LockLoader,
  PlaneLoader,
  PulseLoader,
  SkyLoader,
} from "@/components/miyuki-ui/object-loaders";

const items = [
  { name: "Cup", node: <CupLoader size={32} label="Steeping the tea" /> },
  { name: "Plane", node: <PlaneLoader size={32} label="Sending your itinerary" /> },
  { name: "Bell", node: <BellLoader size={32} label="Checking for notices" /> },
  { name: "Sky", node: <SkyLoader size={32} label="Loading the forecast" /> },
  { name: "Pulse", node: <PulseLoader size={32} label="Reading the summit station" /> },
  { name: "Lock", node: <LockLoader size={32} label="Securing your booking" /> },
];

export default function ObjectLoadersDemo() {
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
