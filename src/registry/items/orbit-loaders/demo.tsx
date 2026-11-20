"use client";

import {
  ArcsLoader,
  AtomLoader,
  BeadsLoader,
  ChaseLoader,
  PlanetLoader,
  RingLoader,
} from "@/components/miyuki-ui/orbit-loaders";

const items = [
  { name: "Planet", node: <PlanetLoader size={32} label="Loading the observatory schedule" /> },
  { name: "Chase", node: <ChaseLoader size={32} label="Syncing ferry times" /> },
  { name: "Arcs", node: <ArcsLoader size={32} label="Loading rain radar" /> },
  { name: "Atom", node: <AtomLoader size={32} label="Measuring snow density" /> },
  { name: "Ring", node: <RingLoader size={32} label="Loading lift status" /> },
  { name: "Beads", node: <BeadsLoader size={32} label="Checking the timetable" /> },
];

export default function OrbitLoadersDemo() {
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
