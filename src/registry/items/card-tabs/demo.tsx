"use client";

import { CardTabs } from "@/components/miyuki-ui/card-tabs";
import { landscape, type Mood } from "@/registry/lib/art";

const panels: {
  value: string;
  title: string;
  tone: string;
  label: string;
  headline: string;
  line: string;
  mood: Mood;
  night: Mood;
}[] = [
  {
    value: "today",
    title: "Today",
    tone: "bg-brand-soft [--label:var(--brand-strong)]",
    label: "Hakuba, Thursday 16 January",
    headline: "Light snow, clearing by noon",
    line: "−6 °C at the summit, 12 cm since midnight, wind 18 km/h from the north-west.",
    mood: "snow",
    night: "night",
  },
  {
    value: "week",
    title: "Week",
    tone: "bg-success-soft [--label:var(--success-strong)]",
    label: "Northern Alps, next seven days",
    headline: "34 cm more by Sunday",
    line: "Heaviest on Thursday night, then a clear and very cold weekend.",
    mood: "day",
    night: "aurora",
  },
  {
    value: "season",
    title: "Season",
    tone: "bg-[color-mix(in_oklab,var(--chart-3)_16%,var(--card))] [--label:var(--foreground)]",
    label: "Winter so far",
    headline: "The deepest base since 2018",
    line: "212 cm on the upper slopes, with snow on 61 of the last 78 days.",
    mood: "dusk",
    night: "night",
  },
  {
    value: "archive",
    title: "Archive",
    tone: "bg-[color-mix(in_oklab,var(--chart-3)_16%,var(--card))] [--label:color-mix(in_oklab,var(--chart-3)_62%,var(--foreground))]",
    label: "Records from 1962",
    headline: "Sixty-four winters of snow",
    line: "Daily depth, temperature and wind for every station in the valley.",
    mood: "dawn",
    night: "night",
  },
];

export default function CardTabsDemo() {
  return (
    <CardTabs
      aria-label="Hakuba snow report"
      className="max-w-3xl"
      tabs={panels.map((p) => ({
        value: p.value,
        title: p.title,
        content: (
          <div className={`relative h-[360px] p-6 sm:p-8 ${p.tone}`}>
            <p className="text-[13px] font-medium text-(--label)">{p.label}</p>
            <h3 className="mt-2 max-w-md font-display text-3xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-4xl">
              {p.headline}
            </h3>
            <p className="mt-3 max-w-md text-sm text-pretty text-foreground/80">{p.line}</p>
            {[p.mood, p.night].map((mood, i) => (
              <img
                key={mood}
                src={landscape(`tabs-${p.value}`, { width: 900, height: 315, mood })}
                alt=""
                decoding="async"
                className={`absolute inset-x-0 bottom-0 h-1/2 w-full object-cover [mask-image:linear-gradient(to_bottom,transparent,#000_45%)] ${i ? "hidden dark:block" : "dark:hidden"}`}
              />
            ))}
          </div>
        ),
      }))}
    />
  );
}
