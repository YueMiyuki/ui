"use client";

import { AvalancheBulletin, type AvalancheBulletinData } from "@/components/miyuki-ui/avalanche-bulletin";
import { people } from "@/registry/lib/data";

const yuna = people.find((p) => p.name === "Yuna Sato")!;

const bulletin: AvalancheBulletinData = {
  region: "Northern Alps",
  areas: "Hakuba, Otari, Tateyama and Tsurugi",
  issued: "Sat 14 Feb 2027, 17:00",
  validUntil: "Sun 15 Feb, 17:00",
  level: 3,
  bands: ["Below 1,600 m", "1,600 to 2,200 m", "Above 2,200 m"],
  levels: [
    [1, 2, 3],
    [1, 3, 3],
    [1, 2, 3],
    [1, 2, 2],
    [1, 1, 2],
    [1, 1, 2],
    [1, 2, 2],
    [1, 2, 3],
  ],
  headline: "Fresh wind slabs on north and east slopes above the tree line are the main danger.",
  tendency: "Tomorrow: steady at 3 high up, easing to 2 below the tree line",
  problems: [
    {
      kind: "wind-slab",
      aspects: ["NW", "N", "NE", "E"],
      bands: [1, 2],
      elevation: "Above 2,200 m, and in gullies below",
      time: "All day",
      description:
        "Friday’s north-west wind built slabs 20 to 40 cm thick under ridgelines and in bowls. A single skier can release them on slopes over 30°.",
    },
    {
      kind: "persistent-weak-layer",
      aspects: ["N", "NE", "E"],
      bands: [1, 2],
      elevation: "Above 1,800 m",
      time: "All day",
      description:
        "Surface hoar buried on 2 February lies 60 to 90 cm down on shaded slopes. Hard to trigger, but slides on it run wide. Stay off thin, rocky ground.",
    },
    {
      kind: "wet-snow",
      aspects: ["E", "SE", "S", "SW", "W"],
      bands: [0, 1],
      elevation: "Below 2,000 m",
      time: "11:00 to 16:00",
      hours: [11, 16],
      description:
        "Sun and +4 °C at 1,500 m will loosen the surface. Expect small wet slides out of rocks; be off steep south slopes by early afternoon.",
    },
  ],
  forecaster: {
    name: yuna.name,
    role: "Forecaster, Hakuba office",
    avatar: yuna.avatar,
    text: (
      <>
        <p>
          Friday’s storm left 35 to 50 cm across the range and the wind did the rest. On the north and east sides above
          the tree line, what looks like good powder is often a slab resting on something weak. Two remote triggers were
          reported near Happo-one today, both from flat ground below steep slopes.
        </p>
        <p>
          Choose slopes under 30° on shaded aspects, keep to ridges rather than gullies, and leave the big north faces
          for later in the week. Read Sunday’s bulletin before you go.
        </p>
      </>
    ),
  },
};

export default function AvalancheBulletinDemo() {
  return <AvalancheBulletin bulletin={bulletin} className="max-w-3xl" />;
}
