"use client";

import { WorldMap, type WorldMapPlace } from "@/components/miyuki-ui/world-map";

const sapporo: WorldMapPlace = { lat: 43.06, lng: 141.35, label: "Sapporo" };

const routes = [
  { from: sapporo, to: { lat: 59.91, lng: 10.75, label: "Oslo" } },
  { from: sapporo, to: { lat: 49.28, lng: -123.12, label: "Vancouver" } },
  { from: sapporo, to: { lat: 47.38, lng: 8.54, label: "Zürich" } },
  { from: sapporo, to: { lat: -45.03, lng: 168.66, label: "Queenstown" } },
  { from: sapporo, to: { lat: -33.45, lng: -70.67, label: "Santiago" } },
];

export default function WorldMapDemo() {
  return (
    <WorldMap routes={routes} centerLng={150} className="size-full">
      <p className="absolute bottom-5 left-6 text-sm font-medium text-muted-foreground">Sister resorts, 2027</p>
    </WorldMap>
  );
}
