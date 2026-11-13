"use client";

import { Button } from "@/components/miyuki-ui/button";
import { OpeningRows } from "@/components/miyuki-ui/opening-rows";
import { landscape, type Mood } from "@/registry/lib/art";

const huts: {
  id: string;
  title: string;
  subtitle: string;
  mood: Mood;
  about: string;
  altitude: string;
  beds: string;
  open: string;
}[] = [
  {
    id: "shirouma",
    title: "Shirouma ridge hut",
    subtitle: "Hakuba, Northern Alps",
    mood: "dawn",
    about:
      "A stone hut on the saddle below the summit, two hours above the snow valley. Dinner is at 17:00, and the terrace faces east, so most guests are up for the sunrise without being asked.",
    altitude: "2,730 m",
    beds: "120",
    open: "Late Apr – Oct",
  },
  {
    id: "karasawa",
    title: "Karasawa cirque hut",
    subtitle: "Hotaka range, Northern Alps",
    mood: "day",
    about:
      "Built into the moraine at the foot of a wide glacial bowl, with tents scattered across the slope below it in summer. Rooms are shared; the drying room runs all night.",
    altitude: "2,350 m",
    beds: "96",
    open: "Late Apr – Nov",
  },
  {
    id: "tsubakuro",
    title: "Tsubakuro hut",
    subtitle: "Omote Ginza trail, Azumino",
    mood: "dusk",
    about:
      "The first hut on the long ridge walk, known for granite towers and a cake with the evening tea. The steep climb from Nakabusa takes most walkers five hours.",
    altitude: "2,712 m",
    beds: "150",
    open: "Late Apr – Nov",
  },
  {
    id: "komagatake",
    title: "Kiso-Komagatake lodge",
    subtitle: "Central Alps, Kiso",
    mood: "snow",
    about:
      "A short walk from the top of the ropeway, so it is often the first night out for new hut walkers. In winter only the ground-floor room stays open, for ski tourers.",
    altitude: "2,850 m",
    beds: "64",
    open: "All year",
  },
  {
    id: "yotei",
    title: "Yōtei summit shelter",
    subtitle: "Mount Yōtei, Niseko",
    mood: "aurora",
    about:
      "An unstaffed shelter on the crater rim, with a stove, a radio and twelve bunks. Bring your own food and water; the nearest spring is a long way down.",
    altitude: "1,760 m",
    beds: "12",
    open: "Jun – Oct",
  },
];

const items = huts.map((hut) => ({
  id: hut.id,
  title: hut.title,
  subtitle: hut.subtitle,
  src: landscape(`hut-${hut.id}`, { mood: hut.mood, width: 960, height: 600 }),
  content: (
    <>
      <p className="text-sm/6 text-muted-foreground">{hut.about}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-muted px-4 py-3.5">
        {[
          ["Altitude", hut.altitude],
          ["Beds", hut.beds],
          ["Open", hut.open],
        ].map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  ),
  action: <Button>Book this hut</Button>,
}));

export default function OpeningRowsDemo() {
  return <OpeningRows items={items} className="w-full max-w-xl" />;
}
