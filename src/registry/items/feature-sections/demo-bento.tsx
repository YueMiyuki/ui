"use client";

import { Button } from "@/components/miyuki-ui/button";
import {
  FeatureBento,
  FeatureBentoAlerts,
  FeatureBentoPicture,
  FeatureBentoSparkline,
  FeatureBentoStations,
} from "@/components/miyuki-ui/feature-sections";
import { landscape, topo } from "@/registry/lib/art";

const alerts = [
  { title: "Wind hold, Happō gondola", detail: "Gusts to 72 km/h at the top station", tone: "warning" as const },
  { title: "18 cm of new snow at Tsugaike", detail: "Since midnight, still falling lightly", tone: "brand" as const },
  { title: "Route 148 closed north of Otari", detail: "Snow clearing until 10:30", tone: "destructive" as const },
  { title: "Avalanche rating raised to 3", detail: "Northern Alps, above 2,000 m", tone: "destructive" as const },
  { title: "Gondola running again", detail: "Happō-one, after the morning hold", tone: "success" as const },
];

const depth = [104, 103, 101, 108, 117, 116, 114, 112, 111, 119, 126, 125, 122, 121, 120, 128, 131, 130, 136, 142];
const days = depth.map((_, i) => `${((24 + i) % 31) + 1} ${i < 7 ? "Jan" : "Feb"}`);

const stations = [
  { name: "Tsugaike", x: 12, y: 50 },
  { name: "Iwatake", x: 31, y: 34 },
  { name: "Happō-one", x: 50, y: 52 },
  { name: "Goryū", x: 69, y: 36 },
  { name: "Kashimayari", x: 87, y: 48 },
];

export default function FeatureSectionsBentoDemo() {
  return (
    <FeatureBento
      title="Everything above the tree line"
      description="Station readings, written bulletins and road reports for the Northern Alps, gathered every ten minutes and set out in plain words before you have finished breakfast."
      action={<Button variant="secondary">Read today’s bulletin</Button>}
      tiles={[
        {
          surface: "picture",
          title: "Summit readings, not valley guesses",
          description:
            "Temperature, wind and visibility from 38 stations above 1,800 metres, refreshed every ten minutes.",
          visual: (
            <FeatureBentoPicture
              src={landscape("bento-summit", { mood: "dawn", width: 1200, height: 960 })}
              alt="Snow-covered ridges at first light"
              place="Happō summit, 1,831 m"
              temperature={-7.4}
            />
          ),
        },
        {
          surface: "well",
          title: "Alerts for the routes you saved",
          description: "Wind holds, road closures and avalanche ratings, sent only when they touch your plans.",
          visual: <FeatureBentoAlerts alerts={alerts} />,
        },
        {
          title: "Snow depth, measured",
          description: "Read from a stake at every station, so settling shows up as well as new snow.",
          visual: (
            <FeatureBentoSparkline
              values={depth}
              value="142 cm"
              change="+22 cm this week"
              label="Snow depth at Happō-one"
              points={days}
              format={(cm) => `${cm} cm`}
              from={days[0]}
              to={days[days.length - 1]}
            />
          ),
        },
        {
          title: "A station on every ridge",
          description: "From Tsugaike to Kashimayari, five valleys report on the same ten-minute clock.",
          visual: <FeatureBentoStations map={topo("bento-ridge", { width: 900, height: 420 })} stations={stations} />,
        },
      ]}
    />
  );
}
