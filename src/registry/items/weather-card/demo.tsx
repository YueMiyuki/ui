"use client";

import { useState } from "react";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Switch } from "@/components/miyuki-ui/switch";
import { WeatherCard, type WeatherCondition } from "@/components/miyuki-ui/weather-card";

const forecast: { id: WeatherCondition; label: string; temp: string; detail: string; range: string }[] = [
  {
    id: "clear",
    label: "Clear",
    temp: "−9°",
    detail: "Clear and still, visibility 60 km",
    range: "High −2°, low −14°",
  },
  { id: "cloudy", label: "Cloudy", temp: "−5°", detail: "Overcast, cloud base 1,900 m", range: "High −3°, low −8°" },
  { id: "rain", label: "Rain", temp: "2°", detail: "Rain on the lower slopes, 6 mm", range: "High 4°, low −1°" },
  { id: "snow", label: "Snow", temp: "−6°", detail: "Snow, 14 cm by morning", range: "High −3°, low −9°" },
  { id: "fog", label: "Fog", temp: "−2°", detail: "Valley fog until 10:00", range: "High 1°, low −5°" },
  {
    id: "storm",
    label: "Storm",
    temp: "3°",
    detail: "Thunder over the ridge, lifts on hold",
    range: "High 5°, low 0°",
  },
];

export default function WeatherCardDemo() {
  const [condition, setCondition] = useState<WeatherCondition>("snow");
  const [night, setNight] = useState(false);
  const now = forecast.find((f) => f.id === condition) ?? forecast[3];

  return (
    <div className="flex w-full max-w-[24rem] flex-col items-center gap-5">
      <WeatherCard condition={condition} night={night} className="w-full">
        <p className="text-sm font-medium">Hakuba</p>
        <p className="mt-1 font-display text-7xl leading-none font-semibold tracking-[-0.04em] tabular-nums">
          {now.temp}
        </p>
        <p className="mt-4 text-sm text-foreground/85">{now.detail}</p>
        <p className="mt-0.5 text-sm text-foreground/85 tabular-nums">
          {night ? "Overnight" : "Today"}, {now.range.toLowerCase()}
        </p>
      </WeatherCard>
      <SegmentedControl
        aria-label="Conditions"
        size="sm"
        fullWidth
        selectedKeys={[condition]}
        onSelectionChange={(keys) => {
          const [next] = keys;
          if (next) setCondition(next as WeatherCondition);
        }}
      >
        {forecast.map((f) => (
          <Segment key={f.id} id={f.id} className="px-1">
            {f.label}
          </Segment>
        ))}
      </SegmentedControl>
      <Switch size="sm" isSelected={night} onChange={setNight} className="self-start">
        Night
      </Switch>
    </div>
  );
}
