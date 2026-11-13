"use client";

import { MeanderTimeline, type MeanderTimelineItem } from "@/components/miyuki-ui/meander-timeline";

const year: MeanderTimelineItem[] = [
  {
    date: "6 January",
    title: "Shelf ice at Ueda",
    content: "Ice reaches halfway across the Chikuma below the bridge, the first time in four winters.",
  },
  {
    date: "18 March",
    title: "Snowmelt in the gorge",
    content: "The river rises 1.4 m in a week as the high ground thaws. Kayak trips from Kotaki open on the 25th.",
  },
  {
    date: "9 May",
    title: "Paddies fill at Iiyama",
    content: "The irrigation gates open and the valley floor turns to mirrors for a fortnight.",
  },
  {
    date: "2 August",
    title: "Fireworks at Nagaoka",
    content: "Two nights of fireworks over the widest stretch of the river, with 340,000 people on the banks.",
  },
  {
    date: "14 October",
    title: "The salmon come back",
    content: "The first chum salmon pass the weir at Ojiya, 210 km from the sea.",
  },
  {
    date: "11 December",
    title: "Snow on the estuary",
    content: "Snow on the dunes at Niigata, and the first swans settle at the river mouth.",
  },
];

export default function MeanderTimelineDemo() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 pt-16 pb-[40vh] sm:px-8">
      <header className="max-w-xl">
        <p className="text-sm text-muted-foreground">Field notes, 2025</p>
        <h1 className="mt-1 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          A year on the Shinano river
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Six days from Ueda to the sea, written down as the river changed.
        </p>
      </header>
      <MeanderTimeline items={year} className="mt-8" />
    </main>
  );
}
