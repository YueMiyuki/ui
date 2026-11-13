"use client";

import { type ForecastDay, type ForecastHour, ForecastStrip } from "@/components/miyuki-ui/forecast-strip";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const days: ForecastDay[] = [
  {
    id: "sun",
    label: "Sun",
    date: "14",
    title: "Sunday 14 February",
    kind: "snow",
    summary: "Light snow",
    high: -3,
    low: -9,
    snow: 70,
  },
  {
    id: "mon",
    label: "Mon",
    date: "15",
    title: "Monday 15 February",
    kind: "cloudy",
    summary: "Cloudy",
    high: -2,
    low: -8,
    snow: 25,
  },
  {
    id: "tue",
    label: "Tue",
    date: "16",
    title: "Tuesday 16 February",
    kind: "heavy-snow",
    summary: "Heavy snow",
    high: -5,
    low: -11,
    snow: 95,
  },
  {
    id: "wed",
    label: "Wed",
    date: "17",
    title: "Wednesday 17 February",
    kind: "snow",
    summary: "Snow showers",
    high: -6,
    low: -14,
    snow: 80,
  },
  {
    id: "thu",
    label: "Thu",
    date: "18",
    title: "Thursday 18 February",
    kind: "partly-cloudy",
    summary: "Sunny spells",
    high: -4,
    low: -13,
    snow: 15,
  },
  {
    id: "fri",
    label: "Fri",
    date: "19",
    title: "Friday 19 February",
    kind: "clear",
    summary: "Clear",
    high: 1,
    low: -10,
    snow: 5,
  },
  {
    id: "sat",
    label: "Sat",
    date: "20",
    title: "Saturday 20 February",
    kind: "wind",
    summary: "Windy",
    high: -1,
    low: -7,
    snow: 40,
  },
];

function hoursFor(day: ForecastDay): ForecastHour[] {
  const rng = createRng(`hakuba-${day.id}`);
  return Array.from({ length: 24 }, (_, h) => {
    const rise =
      h < 5 ? 0 : h <= 14 ? (1 - Math.cos((Math.PI * (h - 5)) / 9)) / 2 : (1 + Math.cos((Math.PI * (h - 14)) / 15)) / 2;
    const temp = Math.round(day.low + (day.high - day.low) * rise + rng.range(-0.4, 0.4));
    const snow = Math.max(0, Math.min(100, Math.round((day.snow + rng.range(-18, 14)) / 5) * 5));
    const night = h < 7 || h >= 18;
    let kind = day.kind;
    if (snow < 25) kind = night ? "clear-night" : day.kind === "clear" ? "clear" : "partly-cloudy";
    else if (day.kind === "heavy-snow" && snow < 80) kind = "snow";
    else if (day.kind === "wind" && h < 12) kind = "cloudy";
    else if (day.kind === "wind") kind = snow >= 45 ? "snow" : "wind";
    return { time: `${String(h).padStart(2, "0")}:00`, kind, temp, snow };
  });
}

const hours = Object.fromEntries(days.map((d) => [d.id, hoursFor(d)]));

export default function ForecastStripDemo() {
  return (
    <div className="w-full max-w-3xl">
      <ForecastStrip label="Hakuba" caption="Village, 760 m" days={days} hours={hours} defaultValue="sun" />
    </div>
  );
}
