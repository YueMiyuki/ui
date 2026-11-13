"use client";

import { CloudSnow, Map, Mountain, Thermometer, Waves, Wind } from "lucide-react";
import { HoverGrid } from "@/components/miyuki-ui/hover-grid";

const services = [
  {
    title: "Snowfall forecasts",
    description: "Hourly totals for 214 resorts, updated as each new radar pass comes in.",
    icon: CloudSnow,
    href: "#snowfall",
  },
  {
    title: "River levels",
    description: "Gauge readings from 86 stations, with alerts before a river leaves its banks.",
    icon: Waves,
    href: "#rivers",
  },
  {
    title: "Summit conditions",
    description: "Visibility, wind chill and fresh snow on 41 peaks across the northern ranges.",
    icon: Mountain,
    href: "#summits",
  },
  {
    title: "Wind warnings",
    description: "Gusts above 60 km/h on ridges and lifts, flagged six hours ahead.",
    icon: Wind,
    href: "#wind",
  },
  {
    title: "Freezing level",
    description: "Where rain turns to snow today, and how it moves through the week.",
    icon: Thermometer,
    href: "#freezing-level",
  },
  {
    title: "Route maps",
    description: "Ski touring and winter hiking routes, shaded by avalanche terrain class.",
    icon: Map,
    href: "#routes",
  },
];

export default function HoverGridDemo() {
  return <HoverGrid items={services} className="max-w-4xl" />;
}
