"use client";

import { PinnedGlobe, type PinnedGlobeMarker } from "@/components/miyuki-ui/pinned-globe";
import { people } from "@/registry/lib/data";

const pins: [name: string, city: string, lat: number, lng: number][] = [
  ["Kenji Mori", "Sapporo", 43.06, 141.35],
  ["Ingrid Solberg", "Oslo", 59.91, 10.75],
  ["Élodie Martin", "Zürich", 47.38, 8.54],
  ["Amara Okafor", "Vancouver", 49.28, -123.12],
  ["Lars Eriksen", "Queenstown", -45.03, 168.66],
  ["Mateo Álvarez", "Santiago", -33.45, -70.67],
];

const markers: PinnedGlobeMarker[] = pins.map(([name, city, lat, lng]) => ({
  lat,
  lng,
  label: `${name} · ${city}`,
  src: people.find((p) => p.name === name)?.avatar,
}));

export default function PinnedGlobeDemo() {
  return <PinnedGlobe markers={markers} initialRotation={[150, 22]} className="size-full" />;
}
