"use client";

import { CardDrift } from "@/components/miyuki-ui/card-drift";
import { people, type Quote, quotes } from "@/registry/lib/data";

const more: Quote[] = [
  {
    text: "I check the ridge wind at five and decide by six. It has not been wrong about a closure all winter.",
    name: "Aiko Tanaka",
    role: "Mountain guide",
  },
  {
    text: "The radar loop loads before the kettle boils. That is most of what I need from a morning.",
    name: "Yuna Sato",
    role: "Weather forecaster",
  },
  {
    text: "Two nights in Nozawa took four taps. I counted, because I design these for a living.",
    name: "Mei Watanabe",
    role: "Product designer",
  },
  {
    text: "Sunrise times are right to the minute, which matters when you have climbed in the dark for it.",
    name: "Mateo Álvarez",
    role: "Photographer",
  },
  {
    text: "Snow depth by valley, not by prefecture. It took someone long enough.",
    name: "Amara Okafor",
    role: "Hydrologist",
  },
  {
    text: "I plan buying trips around the ten-day outlook now. It is honest about what it does not know.",
    name: "Priya Raman",
    role: "Tea buyer",
  },
];

function Review({ quote }: { quote: Quote }) {
  const person = people.find((p) => p.name === quote.name);
  return (
    <figure className="flex w-80 flex-col justify-between gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <blockquote className="text-sm/6 text-pretty">{quote.text}</blockquote>
      <figcaption className="flex items-center gap-3">
        {person ? <img src={person.avatar} alt="" className="size-8 rounded-full" /> : null}
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-medium">{quote.name}</span>
          <span className="block text-[13px] text-muted-foreground">{quote.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function CardDriftDemo() {
  return (
    <div className="flex size-full flex-col justify-center gap-2">
      <CardDrift aria-label="Reviews" items={quotes} renderItem={(quote) => <Review quote={quote} />} duration={46} />
      <CardDrift
        aria-label="More reviews"
        items={more}
        renderItem={(quote) => <Review quote={quote} />}
        direction="right"
        duration={58}
      />
    </div>
  );
}
