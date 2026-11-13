"use client";

import { CardShuffle } from "@/components/miyuki-ui/card-shuffle";
import { people, quotes } from "@/registry/lib/data";

const items = quotes.slice(0, 4).map((quote) => {
  const person = people.find((p) => p.name === quote.name);
  return {
    id: quote.name,
    content: (
      <figure className="flex h-full flex-col justify-between gap-6">
        <blockquote className="font-display text-lg leading-snug font-semibold text-pretty">{quote.text}</blockquote>
        <figcaption className="flex items-center gap-3">
          {person ? <img src={person.avatar} alt="" className="size-9 rounded-full" /> : null}
          <span className="min-w-0">
            <span className="block text-sm font-medium">{quote.name}</span>
            <span className="block text-[13px] text-muted-foreground">{quote.role}</span>
          </span>
        </figcaption>
      </figure>
    ),
  };
});

export default function CardShuffleDemo() {
  return <CardShuffle items={items} aria-label="What people say" className="w-full max-w-[23.75rem]" />;
}
