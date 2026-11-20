import type { CategoryId } from "@/registry/schema";
import type { Locale } from "@/site/i18n/config";
import { localeHref } from "@/site/i18n/href";

export type Section = "components" | "templates";

export const DOCS_HOME = "/docs";
export const GITHUB_URL = "https://github.com/yuemiyuki/ui";

export function sectionOf(item: { category: CategoryId | string }): Section {
  return item.category === "templates" ? "templates" : "components";
}

export function sectionPath(section: Section) {
  return `${DOCS_HOME}/${section}`;
}

export function docsPath(locale: Locale, path = "") {
  return localeHref(locale, `${DOCS_HOME}${path}`);
}

export function sectionHref(section: Section, locale: Locale) {
  return localeHref(locale, sectionPath(section));
}

export function docsHref(item: { slug: string; category: CategoryId | string }, locale: Locale) {
  return localeHref(locale, `${sectionPath(sectionOf(item))}/${item.slug}`);
}

export function categoryHref(id: string, locale: Locale) {
  return id === "templates" ? sectionHref("templates", locale) : `${sectionHref("components", locale)}#${id}`;
}

export function headingId(prefix: string, name: string) {
  const slug = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug}`;
}
