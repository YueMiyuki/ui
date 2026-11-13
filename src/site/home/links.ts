import { categoryHref as docsCategoryHref, docsHref } from "@/site/docs/urls";
import { getItem } from "@/site/registry";

export const componentHref = (slug: string) => docsHref(getItem(slug) ?? { slug, category: "components" });
export const categoryHref = (id: string) => docsCategoryHref(id);
