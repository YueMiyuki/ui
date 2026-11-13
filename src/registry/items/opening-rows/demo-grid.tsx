"use client";

import { Button } from "@/components/miyuki-ui/button";
import { OpeningRows } from "@/components/miyuki-ui/opening-rows";
import { landscape } from "@/registry/lib/art";

const huts = [
  {
    id: "murodo",
    title: "Murodō plateau hut",
    subtitle: "Tateyama, Northern Alps",
    src: landscape("hut-murodo", { mood: "snow", width: 960, height: 600 }),
    about:
      "At the top of the alpine route, between walls of spring snow that stand taller than the bus. The hut serves breakfast from 05:30 for anyone heading up Ōnanjiyama.",
    facts: ["2,450 m", "80", "Apr – Nov"],
  },
  {
    id: "senjojiki",
    title: "Senjōjiki cirque hut",
    subtitle: "Central Alps, Komagane",
    src: landscape("hut-senjojiki", { mood: "dawn", width: 960, height: 600 }),
    about:
      "Wooden bunks under the cirque wall, ten minutes from the ropeway. Most guests stay for the sunrise over the Southern Alps and are back on the first cable car down.",
    facts: ["2,640 m", "48", "Jun – Oct"],
  },
  {
    id: "asahidake",
    title: "Asahidake hot spring hut",
    subtitle: "Daisetsuzan, Hokkaido",
    src: landscape("hut-asahidake", { mood: "aurora", width: 960, height: 600 }),
    about:
      "A small inn at the foot of the volcano, with an open-air bath that stays at 42 degrees through the winter. Ski tourers leave from the door at first light.",
    facts: ["1,100 m", "36", "All year"],
  },
].map((hut) => ({
  id: hut.id,
  title: hut.title,
  subtitle: hut.subtitle,
  src: hut.src,
  content: (
    <>
      <p className="text-sm/6 text-muted-foreground">{hut.about}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-muted px-4 py-3.5">
        {["Altitude", "Beds", "Open"].map((term, i) => (
          <div key={term} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{hut.facts[i]}</dd>
          </div>
        ))}
      </dl>
    </>
  ),
  action: <Button>Book this hut</Button>,
}));

export default function OpeningRowsGridDemo() {
  return <OpeningRows items={huts} layout="grid" className="w-full max-w-4xl" />;
}
