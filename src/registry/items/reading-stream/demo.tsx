"use client";

import { ReadingStream, ReadingStreamSection } from "@/components/miyuki-ui/reading-stream";
import { landscape } from "@/registry/lib/art";

const sections = [
  {
    title: "Magome before the snowplough",
    text: "The bus from Nakatsugawa drops you at the bottom of the stone lane at 8:40. The lane climbs 600 metres past shuttered inns and a water wheel that keeps turning under a skin of ice. By nine the first shop has its shutters up and the smell of chestnut sweets is the only warm thing on the street.",
    image: landscape("kiso-magome", { width: 1200, height: 640, mood: "dawn" }),
    alt: "Pale dawn light over snowy ridges above the valley",
  },
  {
    title: "Over the pass to Tsumago",
    text: "The old road leaves the village through cedar forest and reaches Magome Pass at 801 metres. In February the path is packed snow for most of the 7.8 kilometres, and the tea house at Ichikokutochi keeps a fire going for walkers. Bear bells hang at every bend; ring them as you pass.",
    image: landscape("kiso-pass", { width: 1200, height: 640, mood: "snow" }),
    alt: "Snow falling on a forested pass between two valleys",
  },
  {
    title: "Down to Nagiso station",
    text: "Tsumago is quieter than Magome, and darker earlier. From the lower end of the village a road follows the river for 3.5 kilometres to Nagiso, where the 16:52 local runs back toward Nakatsugawa. Buy a ticket from the machine; the window closes at four.",
    image: landscape("kiso-river", { width: 1200, height: 640, mood: "dusk" }),
    alt: "Dusk over the river valley with the hills in shadow",
  },
];

export default function ReadingStreamDemo() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-14 pb-28 sm:px-8">
      <header className="pl-10 sm:pl-16">
        <p className="text-[13px] text-muted-foreground">Walking notes, February</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
          Crossing the Kiso valley in February
        </h1>
      </header>
      <ReadingStream className="mt-10">
        <div className="space-y-14">
          {sections.map((section) => (
            <ReadingStreamSection key={section.title}>
              <h2 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">{section.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-foreground/85">{section.text}</p>
              <img
                src={section.image}
                alt={section.alt}
                className="mt-6 aspect-[15/8] w-full rounded-xl object-cover"
              />
            </ReadingStreamSection>
          ))}
        </div>
      </ReadingStream>
    </div>
  );
}
