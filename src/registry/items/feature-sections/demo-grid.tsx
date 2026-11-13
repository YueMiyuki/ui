"use client";

import { FeatureGrid } from "@/components/miyuki-ui/feature-sections";
import { topo } from "@/registry/lib/art";

const features = [
  {
    title: "Morning bulletin",
    description: "A written forecast for each range at 05:30, signed by the forecaster who wrote it.",
  },
  {
    title: "Summit wind",
    description: "Gusts and direction at the top stations, and a warning when lifts are likely to hold.",
  },
  {
    title: "Snow depth",
    description: "Measured at 38 stakes rather than modelled, with last night’s snow shown on its own.",
  },
  {
    title: "Road closures",
    description: "Pass and access road status from the prefectures, updated as the gates close.",
  },
  {
    title: "Hut availability",
    description: "Beds left tonight in 64 mountain huts, and which are open for emergencies only.",
  },
  {
    title: "Offline maps",
    description: "Contours, trails and huts saved to your phone for the valleys without signal.",
  },
  {
    title: "Shared routes",
    description: "Send your line to a partner, who sees the same forecast along the same ridge.",
  },
  {
    title: "Alerts",
    description: "Avalanche and wind warnings for the routes you have saved, and quiet for the rest.",
  },
];

export default function FeatureSectionsGridDemo() {
  return (
    <FeatureGrid
      title="What a guide checks before a four o’clock start"
      description="Eight things, in roughly the order a guide checks them. All of it works offline once your phone has synced."
      features={features}
      texture={topo("feature-grid", { width: 800, height: 600 })}
    />
  );
}
