import type { MetadataRoute } from "next";
import { source } from "@/site/docs/source";
import { SITE_URL } from "@/site/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, ...source.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` }))];
}
