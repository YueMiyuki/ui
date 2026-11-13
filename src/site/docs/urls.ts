import type { CategoryId } from "@/registry/schema";

export type Section = "components" | "templates";

export const DOCS_HOME = "/docs";
export const GITHUB_URL = "https://github.com/yuemiyuki/ui";

export function sectionOf(item: { category: CategoryId | string }): Section {
  return item.category === "templates" ? "templates" : "components";
}

export function sectionHref(section: Section) {
  return `${DOCS_HOME}/${section}`;
}

export function docsHref(item: { slug: string; category: CategoryId | string }) {
  return `${sectionHref(sectionOf(item))}/${item.slug}`;
}

export function categoryHref(id: string) {
  return id === "templates" ? sectionHref("templates") : `${sectionHref("components")}#${id}`;
}

export function headingId(prefix: string, name: string) {
  const slug = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug}`;
}
