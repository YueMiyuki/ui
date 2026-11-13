"use client";

import { Timeline } from "@/components/miyuki-ui/timeline";
import { landscape, type Mood } from "@/registry/lib/art";

const months: { title: string; text: string; photos: [string, Mood, string][] }[] = [
  {
    title: "December — first snow",
    text: "The first real fall came on the ninth: 22 cm overnight at the station, and the valley road white by morning. The upper lifts opened a week later, on a base of 64 cm.",
    photos: [
      ["dec-ridge", "snow", "Fresh snow on the ridge above the station"],
      ["dec-valley", "dawn", "First light on the valley after the snowfall"],
    ],
  },
  {
    title: "January — the deep cold",
    text: "Clear skies and still air for most of the month. The summit read −24° on the eighteenth, the coldest morning in eleven winters, and the lake froze from the edges in.",
    photos: [
      ["jan-night", "night", "A clear, cold night over the frozen lake"],
      ["jan-lake", "day", "Blue sky over the lake in January"],
    ],
  },
  {
    title: "February — festival season",
    text: "Snow lanterns along the canal for ten nights, and the valley full of visitors. We added a 05:00 bulletin for the festival trains and kept it until the end of the month.",
    photos: [
      ["feb-lanterns", "dusk", "Dusk over the hills during the lantern festival"],
      ["feb-aurora", "aurora", "Green light over the mountains late in February"],
    ],
  },
  {
    title: "March — the thaw",
    text: "Rain to 1,800 m on the fourth, then a fortnight of warm afternoons. The lower runs closed on the twentieth; the snow at the summit held 2.4 m until April.",
    photos: [
      ["mar-thaw", "dawn", "Soft morning light as the snow begins to melt"],
      ["mar-river", "day", "Meltwater running high under a clear sky"],
    ],
  },
];

const items = months.map((month) => ({
  title: month.title,
  content: (
    <>
      <p className="max-w-prose text-base/7 text-muted-foreground">{month.text}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {month.photos.map(([seed, mood, alt]) => (
          <img
            key={seed}
            src={landscape(seed, { mood, width: 640, height: 480 })}
            alt={alt}
            className="aspect-[4/3] w-full rounded-xl object-cover shadow-xs"
          />
        ))}
      </div>
    </>
  ),
}));

export default function TimelineDemo() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-[62svh] sm:px-10">
      <Timeline
        items={items}
        heading={
          <>
            <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] sm:text-5xl">
              A winter in four parts
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">Notes from the Hakuba weather station, 2025 to 2026.</p>
          </>
        }
      />
    </div>
  );
}
