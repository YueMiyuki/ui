import type { Metadata } from "next";
import { Hero } from "@/site/home/hero";
import { Install } from "@/site/home/install";
import { Backgrounds, Cards, Charts, Controls, Index, Pickers, Text } from "@/site/home/showcase";
import { Wall } from "@/site/home/wall";
import { Waterline } from "@/site/home/waterline";
import {
  catalogueCounts,
  categoryGroups,
  getItem,
  installCommand,
  REGISTRY_NAMESPACE,
  summarize,
} from "@/site/registry";

const wallOrder = [
  "northern-lights",
  "date-calendar",
  "tilt-card",
  "comparison-area",
  "layered-waves",
  "switch",
  "sheen-card",
  "wave-lines",
  "ghost-bars",
  "dropdown",
  "whirlpool",
  "checkbox",
  "floating-card",
  "colour-pool",
  "table",
  "typed-phrases",
  "current-lines",
  "slider",
  "card-shuffle",
  "area-chart",
  "splash-line",
  "avatar",
  "depth-of-field",
  "sleet",
];

const installSlugs = ["button", "northern-lights", "date-picker", "area-chart", "tilt-card", "dropdown"];

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  const groups = categoryGroups();
  const count = (id: string) => groups.find((group) => group.id === id)?.items.length ?? 0;
  const wall = wallOrder
    .map((slug) => getItem(slug))
    .filter((item) => item !== undefined)
    .filter((item) => item.preview.thumb !== false && !item.preview.iframe)
    .map(summarize);
  const slugs = installSlugs.filter((slug) => getItem(slug));

  return (
    <main>
      <Hero total={catalogueCounts().components} command={installCommand(slugs[0] ?? "button")} />
      <Wall items={wall} />
      <Backgrounds count={count("backgrounds")} />
      <Controls count={count("inputs")} />
      <Cards count={count("cards")} />
      <Text count={count("text")} />
      <Pickers count={count("pickers")} />
      <Charts count={count("charts")} />
      <Index
        groups={groups.map((group) => ({
          id: group.id,
          label: group.label,
          blurb: group.blurb,
          count: group.items.length,
        }))}
      />
      <Install slugs={slugs.length > 0 ? slugs : ["button"]} namespace={REGISTRY_NAMESPACE} />
      <Waterline />
    </main>
  );
}
