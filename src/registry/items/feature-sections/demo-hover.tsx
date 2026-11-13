"use client";

import { BellRing, House, Map, Route, ScrollText, Snowflake, TrafficCone, Wind } from "lucide-react";
import { FeatureHover } from "@/components/miyuki-ui/feature-sections";

const features = [
  {
    icon: <ScrollText />,
    title: "Morning bulletin",
    description: "A written forecast for each range at 05:30, signed by the forecaster who wrote it.",
    href: "#bulletin",
  },
  {
    icon: <Wind />,
    title: "Summit wind",
    description: "Gusts and direction at the top stations, and a warning when lifts are likely to hold.",
    href: "#wind",
  },
  {
    icon: <Snowflake />,
    title: "Snow depth",
    description: "Measured at 38 stakes rather than modelled, with last night’s snow shown on its own.",
    href: "#snow",
  },
  {
    icon: <TrafficCone />,
    title: "Road closures",
    description: "Pass and access road status from the prefectures, updated as the gates close.",
    href: "#roads",
  },
  {
    icon: <House />,
    title: "Hut availability",
    description: "Beds left tonight in 64 mountain huts, and which are open for emergencies only.",
    href: "#huts",
  },
  {
    icon: <Map />,
    title: "Offline maps",
    description: "Contours, trails and huts saved to your phone for the valleys without signal.",
    href: "#maps",
  },
  {
    icon: <Route />,
    title: "Shared routes",
    description: "Send your line to a partner, who sees the same forecast along the same ridge.",
    href: "#routes",
  },
  {
    icon: <BellRing />,
    title: "Alerts",
    description: "Avalanche and wind warnings for the routes you have saved, and quiet for the rest.",
    href: "#alerts",
  },
];

export default function FeatureSectionsHoverDemo() {
  return (
    <FeatureHover
      title="One pass, every valley"
      description="Everything below comes with a Kitakaze pass, for ¥680 a month or ¥6,800 for the winter."
      features={features}
    />
  );
}
