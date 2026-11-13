"use client";

import { WeatherIcon, type WeatherKind } from "@/components/miyuki-ui/weather-icon";

const FORECAST: { day: string; kind: WeatherKind; summary: string; high: number; low: number }[] = [
  { day: "Thu", kind: "snow", summary: "Snow", high: -2, low: -7 },
  { day: "Fri", kind: "heavy-snow", summary: "Heavy snow", high: -4, low: -9 },
  { day: "Sat", kind: "cloudy", summary: "Cloudy", high: -1, low: -6 },
  { day: "Sun", kind: "partly-cloudy", summary: "Partly cloudy", high: 1, low: -5 },
  { day: "Mon", kind: "clear", summary: "Clear", high: 2, low: -4 },
];

const KINDS: { kind: WeatherKind; name: string }[] = [
  { kind: "clear", name: "Clear" },
  { kind: "partly-cloudy", name: "Partly cloudy" },
  { kind: "cloudy", name: "Cloudy" },
  { kind: "fog", name: "Fog" },
  { kind: "rain", name: "Rain" },
  { kind: "sleet", name: "Sleet" },
  { kind: "snow", name: "Snow" },
  { kind: "heavy-snow", name: "Heavy snow" },
  { kind: "wind", name: "Wind" },
  { kind: "thunder", name: "Thunder" },
  { kind: "clear-night", name: "Clear night" },
];

const degrees = (t: number) => `${t < 0 ? "−" : ""}${Math.abs(t)}°`;

export default function WeatherIconDemo() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-10">
      <section aria-labelledby="weather-icon-demo-place">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h3 id="weather-icon-demo-place" className="text-sm font-medium text-foreground">
            Otaru
          </h3>
          <p className="text-xs text-muted-foreground">Five-day forecast</p>
        </div>
        <ol className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-card shadow-sm">
          {FORECAST.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-2.5 px-1 py-4">
              <span className="text-[13px] text-muted-foreground">{d.day}</span>
              <WeatherIcon kind={d.kind} size={40} label={d.summary} className="text-foreground" />
              <span className="flex gap-1.5 text-sm tabular-nums">
                <span className="font-medium text-foreground">{degrees(d.high)}</span>
                <span className="text-muted-foreground">{degrees(d.low)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <ul className="flex flex-wrap justify-center gap-y-6">
        {KINDS.map(({ kind, name }) => (
          <li key={kind} className="flex w-24 flex-col items-center gap-2">
            <WeatherIcon kind={kind} className="text-foreground" />
            <span className="text-xs text-muted-foreground">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
