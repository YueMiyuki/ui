import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Hero } from "@/site/home/hero";
import { Install } from "@/site/home/install";
import { Backgrounds, Cards, Charts, Controls, Index, Pickers, Text } from "@/site/home/showcase";
import { Wall } from "@/site/home/wall";
import { Waterline } from "@/site/home/waterline";
import { localeAlternates } from "@/site/i18n/href";
import { getI18n, getLocale } from "@/site/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localeAlternates(await getLocale(), "/") };
}

export default async function HomePage() {
  const { locale, t } = await getI18n();
  const groups = categoryGroups(locale);
  const count = (id: string) => groups.find((group) => group.id === id)?.items.length ?? 0;
  const wall = wallOrder
    .map((slug) => getItem(slug))
    .filter((item) => item !== undefined)
    .filter((item) => item.preview.thumb !== false && !item.preview.iframe)
    .map((item) => summarize(item, locale));
  const slugs = installSlugs.filter((slug) => getItem(slug));

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <main>
        <Hero total={catalogueCounts().components} command={installCommand(slugs[0] ?? "button")} />
        <Wall items={wall} locale={locale} t={t} />
        <Backgrounds count={count("backgrounds")} locale={locale} t={t} />
        <Controls count={count("inputs")} locale={locale} t={t} />
        <Cards count={count("cards")} locale={locale} t={t} />
        <Text count={count("text")} locale={locale} t={t} />
        <Pickers count={count("pickers")} locale={locale} t={t} />
        <Charts count={count("charts")} locale={locale} t={t} />
        <Index
          groups={groups.map((group) => ({
            id: group.id,
            label: group.label,
            blurb: group.blurb,
            count: group.items.length,
          }))}
          locale={locale}
          t={t}
        />
        <Install slugs={slugs.length > 0 ? slugs : ["button"]} namespace={REGISTRY_NAMESPACE} />
        <Waterline />
      </main>
    </ViewTransition>
  );
}
