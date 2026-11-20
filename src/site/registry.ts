import { inkThumbs } from "@/registry/__generated__/ink-thumbs";
import { items } from "@/registry/__generated__/items";
import { thumbs } from "@/registry/__generated__/thumbs";
import { CATEGORIES, type Category, type RegistryItem } from "@/registry/schema";
import type { Locale } from "@/site/i18n/config";
import { dictionaries } from "@/site/i18n/dictionaries";
import { localizeItem, sortByName } from "@/site/i18n/items";

export { items };

export const SITE_URL = (
  process.env.MIYUKI_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://ui.miyuki-yue.dev" : "http://localhost:3210")
).replace(/\/+$/, "");

export const REGISTRY_NAMESPACE = "@miyuki-ui";
export const REGISTRY_URL_TEMPLATE = `${SITE_URL}/r/{name}.json`;

export const installCommand = (slug: string) => `npx shadcn@latest add ${REGISTRY_NAMESPACE}/${slug}`;

export const installUrlCommand = (slug: string) => `npx shadcn@latest add ${SITE_URL}/r/${slug}.json`;

export interface ItemSummary {
  slug: string;
  name: string;
  description: string;
  category: RegistryItem["category"];
  preview: RegistryItem["preview"];
  firstDemo: string;
  demos: string[];
  picture: string | null;
  inkPicture: string | null;
}

export interface CategoryGroup {
  id: Category["id"];
  label: string;
  blurb: string;
  items: ItemSummary[];
}

export function summarize(item: RegistryItem, locale: Locale): ItemSummary {
  const localized = localizeItem(item, locale);
  return {
    slug: item.slug,
    name: localized.name,
    description: localized.description,
    category: item.category,
    preview: item.preview,
    firstDemo: item.demos[0]?.name ?? "default",
    demos: item.demos.map((demo) => demo.name),
    picture: thumbs[item.slug] ?? null,
    inkPicture: inkThumbs[item.slug] ?? null,
  };
}

export function getItem(slug: string): RegistryItem | undefined {
  return items.find((item) => item.slug === slug);
}

export function categoryGroups(locale: Locale): CategoryGroup[] {
  const names = dictionaries[locale].categories;
  return CATEGORIES.map((c) => ({
    id: c.id,
    label: names[c.id].label,
    blurb: names[c.id].blurb,
    items: sortByName(
      items.filter((item) => item.category === c.id).map((item) => summarize(item, locale)),
      locale,
    ),
  })).filter((group) => group.items.length > 0);
}

export function catalogueCounts() {
  let components = 0;
  let templates = 0;
  for (const item of items) {
    if (item.category === "templates") templates++;
    else if (item.category !== "foundations") components++;
  }
  return { components, templates };
}

export const PLACEHOLDER_SLUG = "__none__";
