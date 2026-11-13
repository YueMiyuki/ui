"use client";

import { TideTab, TideTabList, TideTabPanel, TideTabs } from "@/components/miyuki-ui/tide-tabs";

const forecast = [
  {
    id: "today",
    label: "Today",
    text: "Snow until early afternoon, then clearing from the west.",
    stats: [
      ["High", "−4°"],
      ["Low", "−11°"],
      ["New snow", "18 cm"],
    ],
  },
  {
    id: "tomorrow",
    label: "Tomorrow",
    text: "Clear and cold. First lift at 08:00, wind below 20 km/h all day.",
    stats: [
      ["High", "−6°"],
      ["Low", "−14°"],
      ["New snow", "0 cm"],
    ],
  },
  {
    id: "week",
    label: "Week",
    text: "Two more storms, on Wednesday night and again on Saturday.",
    stats: [
      ["Storms", "2"],
      ["Coldest", "−17°"],
      ["New snow", "46 cm"],
    ],
  },
  {
    id: "season",
    label: "Season",
    text: "Deeper than usual for mid February at the top station.",
    stats: [
      ["Base", "284 cm"],
      ["Average", "+31 cm"],
      ["Powder days", "23"],
    ],
  },
];

export default function TideTabsDemo() {
  return (
    <TideTabs className="w-full max-w-md" defaultSelectedKey="today">
      <TideTabList aria-label="Hakuba forecast">
        {forecast.map((day) => (
          <TideTab key={day.id} id={day.id}>
            {day.label}
          </TideTab>
        ))}
      </TideTabList>
      {forecast.map((day) => (
        <TideTabPanel key={day.id} id={day.id} className="min-h-28">
          <p className="text-muted-foreground">{day.text}</p>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            {day.stats.map(([term, value]) => (
              <div key={term}>
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="mt-1 font-display text-2xl leading-none font-semibold tracking-[-0.02em] tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </TideTabPanel>
      ))}
    </TideTabs>
  );
}
