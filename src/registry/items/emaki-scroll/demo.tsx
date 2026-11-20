"use client";

import { EmakiPanel, EmakiScroll } from "@/components/miyuki-ui/emaki-scroll";
import { landscape } from "@/registry/lib/art";

const views = [
  {
    seed: "kiso-narai",
    mood: "dawn",
    title: "Narai at first light",
    text: "Lanterns still burn along the longest post town on the road. The first tea house opens at 6:10.",
    alt: "A valley at dawn, pale ridges fading into mist",
  },
  {
    seed: "kiso-torii",
    mood: "snow",
    title: "Over the Torii pass",
    text: "A stone path through cedar and beech, 1,197 m at the top. Snow lies here into April.",
    alt: "Snow-covered ridges under a low winter sky",
  },
  {
    seed: "kiso-agematsu",
    mood: "day",
    title: "The river at Agematsu",
    text: "The road follows the Kiso south for 38 km and crosses it twice on footbridges.",
    alt: "Green hills and blue ridges on a clear day",
  },
  {
    seed: "kiso-tsumago",
    mood: "dusk",
    title: "Tsumago at dusk",
    text: "Wooden inns with paper windows and no wires overhead. Cars stay out after ten.",
    alt: "Ridges in warm evening light under a fading sky",
  },
  {
    seed: "kiso-magome",
    mood: "night",
    title: "The climb to Magome",
    text: "The last 8 km over the hill. Inn signs stay lit until the final walkers arrive.",
    alt: "Dark mountains under a starry night sky",
  },
] as const;

export default function EmakiScrollDemo() {
  return (
    <div>
      <header className="mx-auto w-full max-w-3xl px-6 pt-12 pb-2">
        <h2
          id="emaki-scroll-demo-title"
          className="font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
        >
          The Kiso road in five views
        </h2>
        <p className="mt-3 text-base text-muted-foreground">Narai to Magome on foot, 68 km over four days.</p>
      </header>

      <EmakiScroll aria-labelledby="emaki-scroll-demo-title">
        {views.map((view) => (
          <EmakiPanel
            key={view.seed}
            title={view.title}
            src={landscape(view.seed, { mood: view.mood, width: 720, height: 480 })}
            alt={view.alt}
          >
            {view.text}
          </EmakiPanel>
        ))}
      </EmakiScroll>

      <section className="mx-auto w-full max-w-2xl px-6 pt-8 pb-24">
        <h3 className="text-base font-semibold">Walking it yourself</h3>
        <p className="mt-2 text-sm/6 text-muted-foreground">
          The route runs from late April to the first heavy snow in November. Bags travel ahead of you between inns each
          morning, and every stage ends at a hot bath and a dinner served at 18:30.
        </p>
      </section>
    </div>
  );
}
