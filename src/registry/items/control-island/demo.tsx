"use client";

import { Clock, Layers, Ruler, Snowflake, Thermometer, Wind } from "lucide-react";
import { useState } from "react";
import { ControlIsland } from "@/components/miyuki-ui/control-island";
import { topo } from "@/registry/lib/art";

const map = `url("${topo("hakuba-valley", { width: 1200, height: 660, color: "#000" })}")`;

const tint: Record<string, string> = {
  snow: "var(--brand)",
  wind: "var(--chart-2)",
  temperature: "var(--chart-5)",
};

const places = [
  { name: "Hakuba", x: "34%", y: "38%" },
  { name: "Happo-one", x: "58%", y: "26%" },
  { name: "Tsugaike", x: "70%", y: "54%" },
];

export default function ControlIslandDemo() {
  const [layer, setLayer] = useState("snow");

  return (
    <div className="relative size-full overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: `radial-gradient(40% 55% at 38% 40%, color-mix(in oklab, ${tint[layer]} 22%, transparent), transparent), radial-gradient(30% 40% at 68% 30%, color-mix(in oklab, ${tint[layer]} 16%, transparent), transparent)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/20"
        style={{ maskImage: map, WebkitMaskImage: map, maskSize: "cover", WebkitMaskSize: "cover" }}
      />
      {places.map((place) => (
        <span
          key={place.name}
          className="absolute flex items-center gap-1.5 text-xs font-medium text-foreground/70"
          style={{ left: place.x, top: place.y }}
        >
          <span className="size-1.5 rounded-full bg-foreground/60" />
          {place.name}
        </span>
      ))}
      <ControlIsland
        contained
        aria-label="Map controls"
        items={[
          {
            id: "layer",
            label: "Layer",
            icon: <Layers />,
            value: layer,
            onChange: setLayer,
            options: [
              { id: "snow", label: "Snow depth", icon: <Snowflake /> },
              { id: "wind", label: "Wind", icon: <Wind /> },
              { id: "temperature", label: "Temperature", icon: <Thermometer /> },
            ],
          },
          {
            id: "time",
            label: "Time",
            icon: <Clock />,
            defaultValue: "now",
            options: [
              { id: "now", label: "Now" },
              { id: "6h", label: "+6 h" },
              { id: "24h", label: "+24 h" },
            ],
          },
          {
            id: "units",
            label: "Units",
            icon: <Ruler />,
            defaultValue: "metric",
            options: [
              { id: "metric", label: "Metric" },
              { id: "imperial", label: "Imperial" },
            ],
          },
        ]}
      />
    </div>
  );
}
