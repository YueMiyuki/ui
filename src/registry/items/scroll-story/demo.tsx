"use client";

import type { ReactNode } from "react";
import { ScrollStory } from "@/components/miyuki-ui/scroll-story";
import { abstract, landscape } from "@/registry/lib/art";

function Figure({
  value,
  caption,
  image,
  wash = ["", ""],
}: {
  value: string;
  caption: string;
  image?: string;
  wash?: [day: string, night: string];
}) {
  return image ? (
    <div className="relative size-full">
      <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="dark absolute inset-x-0 bottom-0 bg-linear-to-t from-[oklch(0.17_0.03_250/0.8)] to-transparent p-6 pt-24 text-foreground">
        <Value value={value} caption={caption} />
      </div>
    </div>
  ) : (
    <div className="relative size-full">
      <img
        src={abstract(wash[0], { width: 720, height: 600 })}
        alt=""
        className="absolute inset-0 size-full object-cover dark:hidden"
      />
      <img
        src={abstract(wash[1], { width: 720, height: 600 })}
        alt=""
        className="absolute inset-0 hidden size-full object-cover dark:block"
      />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <Value value={value} caption={caption} />
      </div>
    </div>
  );
}

function Value({ value, caption }: { value: ReactNode; caption: string }) {
  return (
    <>
      <p className="font-display text-6xl leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-foreground/80">{caption}</p>
    </>
  );
}

const sections = [
  {
    title: "Stations report",
    description:
      "Every ten minutes, 1,284 stations send temperature, wind and snow depth, from the valley floors to the huts below the summits.",
    content: (
      <Figure
        value="1,284"
        caption="Weather stations reporting"
        image={landscape("forecast-stations", { mood: "snow", width: 720, height: 600 })}
      />
    ),
  },
  {
    title: "Models run",
    description:
      "Four times a day the readings feed 51 runs of the model. Where the runs agree we say so plainly; where they spread, the forecast says that too.",
    content: <Figure value="51" caption="Model runs, four times a day" wash={["ensemble-day", "model-runs-night"]} />,
  },
  {
    title: "Forecasters check",
    description:
      "A forecaster reads each run against the radar and the lift cameras, and fixes what the model misses, like fog pooling in the valley before dawn.",
    content: (
      <Figure
        value="Fog"
        caption="Added by hand at 04:40"
        image={landscape("forecast-valley", { mood: "dawn", width: 720, height: 600 })}
      />
    ),
  },
  {
    title: "You get the bulletin",
    description:
      "The bulletin is out by 05:30, in time for the first lifts, the morning trains and anyone deciding whether to go up today.",
    content: (
      <Figure value="05:30" caption="Mountain bulletin published" wash={["bulletin-day", "forecast-ensemble"]} />
    ),
  },
];

export default function ScrollStoryDemo() {
  return (
    <div className="relative size-full">
      <ScrollStory sections={sections} height="100%" className="absolute inset-0" />
    </div>
  );
}
