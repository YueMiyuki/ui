"use client";

import { ContentCard } from "@/components/miyuki-ui/card-sections";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const author = people.find((p) => p.name === "Yuna Sato")!;

export default function CardSectionsContentDemo() {
  return (
    <ContentCard
      src={landscape("journal-ridge", { mood: "day", width: 960, height: 600 })}
      alt="A clear ridge line above the clouds"
      title="Reading a ridge forecast the way a guide does"
      excerpt="Most people look at the temperature first. Guides look at the freezing level and the wind, then decide whether the temperature matters at all."
      author={{ name: author.name, avatar: author.avatar }}
      readingTime="7 min read"
      href="#ridge-forecast"
    />
  );
}
