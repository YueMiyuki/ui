"use client";

import { StationNav } from "@/components/miyuki-ui/station-nav";
import { landscape } from "@/registry/lib/art";

const stops = [
  {
    id: "stop-otaru",
    label: "Otaru",
    detail: "06:12",
    title: "Otaru, platform 2",
    body: [
      "The first train of the day waits under the station's old glass lamps with its heaters already ticking. Buy a ticket from the machine by the north exit; the window does not open until seven.",
      "Sit on the right. For the next forty minutes the line runs so close to the shore that spray freezes on the windows when the wind comes in from the sea.",
    ],
    image: landscape("otaru-platform", { width: 1200, height: 600, mood: "dawn" }),
  },
  {
    id: "stop-asari",
    label: "Asari",
    detail: "06:21",
    title: "Asari and the breakwater",
    body: [
      "Past Asari the tracks drop onto a ledge between the cliffs and the water. Gulls sit along the breakwater in a line, all facing into the wind.",
      "In February the sea here is a dull pewter until the sun clears the hills behind Zenibako, and then for about four minutes it turns the colour of tea.",
    ],
  },
  {
    id: "stop-zenibako",
    label: "Zenibako",
    detail: "06:29",
    title: "Zenibako, the old herring town",
    body: [
      "Zenibako was built on herring. The fish left in the 1950s; the warehouses stayed, and a few still have the merchants' names painted on their doors in faded white.",
      "The train stops for one minute. If the doors open on the sea side you can hear the waves over the sound of the engine.",
    ],
    image: landscape("zenibako-shore", { width: 1200, height: 600, mood: "snow" }),
  },
  {
    id: "stop-teine",
    label: "Teine",
    detail: "06:38",
    title: "Teine and the first commuters",
    body: [
      "At Teine the train fills with people in long coats and ski jackets heading in to work, and the windows fog over from the inside.",
      "Look back to the west before the line curves inland: on a clear morning the slopes above Teine are lit long before the city is.",
    ],
  },
  {
    id: "stop-sapporo",
    label: "Sapporo",
    detail: "06:52",
    title: "Sapporo",
    body: [
      "The train ends on platform 5. The underground walk to Ōdōri takes eight minutes and is warm the whole way.",
    ],
  },
];

export default function StationNavDemo() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-24 sm:px-8">
      <header className="pl-12 sm:pl-[15rem]">
        <p className="text-[13px] text-muted-foreground">Rail notes, February</p>
        <h1 className="mt-2 font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          The shore line from Otaru to Sapporo
        </h1>
      </header>
      <div className="mt-10 grid grid-cols-[2rem_minmax(0,1fr)] gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
        <aside className="sticky top-6 self-start">
          <StationNav items={stops.map(({ id, label, detail }) => ({ id, label, detail }))} />
        </aside>
        <article className="space-y-14">
          {stops.map((stop) => (
            <section key={stop.id} id={stop.id} className="scroll-mt-6">
              <h2 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">{stop.title}</h2>
              {stop.body.map((text) => (
                <p key={text.slice(0, 24)} className="mt-3 text-base leading-relaxed text-foreground/85">
                  {text}
                </p>
              ))}
              {stop.image && (
                <img src={stop.image} alt="" className="mt-6 aspect-[2/1] w-full rounded-xl object-cover" />
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
