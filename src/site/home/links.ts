import { categoryHref as docsCategoryHref, docsHref } from "@/site/docs/urls";
import type { Locale } from "@/site/i18n/config";
import { getItem } from "@/site/registry";

export const componentHref = (slug: string, locale: Locale) =>
  docsHref(getItem(slug) ?? { slug, category: "components" }, locale);
export const categoryHref = (id: string, locale: Locale) => docsCategoryHref(id, locale);
