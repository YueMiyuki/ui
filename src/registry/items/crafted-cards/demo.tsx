"use client";

import { FeatureDeck } from "@/components/miyuki-ui/crafted-cards";
import { landscape, type Mood } from "@/registry/lib/art";

const huts: {
  id: string;
  title: string;
  summary: string;
  mood: Mood;
  about: string;
  facts: [string, string][];
}[] = [
  {
    id: "kumonotaira",
    title: "Kumonotaira hut",
    summary: "A plateau of pools and stone gardens, two days from any road.",
    mood: "day",
    about:
      "The most remote hut in the Northern Alps sits on a lava plateau at the head of the Kurobe valley. Water comes from the snowfield above, and the warden radios the forecast in at six.",
    facts: [
      ["Altitude", "2,464 m"],
      ["Beds", "40"],
      ["Open", "Jul – Sep"],
    ],
  },
  {
    id: "hoken",
    title: "Hōken lodge",
    summary: "Ten minutes from the ropeway, under the Senjōjiki cirque.",
    mood: "dawn",
    about:
      "Most guests come up on the last car, watch the cirque turn pink, and take the first car down. In winter the lodge stays open for ski tourers heading to the ridge.",
    facts: [
      ["Altitude", "2,750 m"],
      ["Beds", "56"],
      ["Open", "All year"],
    ],
  },
  {
    id: "yakushi",
    title: "Yakushi saddle hut",
    summary: "A stone hut on the pass, with a drying room that runs all night.",
    mood: "snow",
    about:
      "Built low against the wind on the saddle below Yakushi-dake. The kitchen serves dinner at 17:00 and breakfast at 04:30, so walkers can reach the summit before the cloud comes up.",
    facts: [
      ["Altitude", "2,700 m"],
      ["Beds", "72"],
      ["Open", "Jul – Oct"],
    ],
  },
  {
    id: "nishihotaka",
    title: "Nishi-Hotaka hut",
    summary: "The last roof before the knife-edge ridge to Oku-Hotaka.",
    mood: "dusk",
    about:
      "A small hut on a shoulder of rock, reached by the Shinhotaka ropeway and a two-hour climb. Guides meet their parties here before the ridge, and turn back here when the wind is up.",
    facts: [
      ["Altitude", "2,385 m"],
      ["Beds", "48"],
      ["Open", "Jun – Oct"],
    ],
  },
];

const cards = huts.map((hut) => ({
  id: hut.id,
  title: hut.title,
  summary: hut.summary,
  src: landscape(`deck-${hut.id}`, { mood: hut.mood, width: 1200, height: 760 }),
  content: (
    <>
      <p className="text-pretty">{hut.about}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-foreground/15 pt-4">
        {hut.facts.map(([term, value]) => (
          <div key={term}>
            <dt className="text-xs text-foreground/70">{term}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  ),
}));

export default function CraftedCardsDemo() {
  return (
    <div className="size-full p-4 sm:p-6">
      <FeatureDeck cards={cards} backLabel="All huts" className="mx-auto size-full max-w-4xl" />
    </div>
  );
}
