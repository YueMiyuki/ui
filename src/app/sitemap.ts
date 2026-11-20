import type { MetadataRoute } from "next";
import { source } from "@/site/docs/source";
import { localeHref } from "@/site/i18n/href";
import { SITE_URL } from "@/site/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...source.getPages("en").map((page) => page.url)];
  const entries = paths.map((path) => {
    const en = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    const zh = `${SITE_URL}${localeHref("zh", path)}`;
    return { en, zh, alternates: { languages: { en, "zh-CN": zh, "x-default": en } } };
  });
  return [
    ...entries.map(({ en, alternates }) => ({ url: en, alternates })),
    ...entries.map(({ zh, alternates }) => ({ url: zh, alternates })),
  ];
}
