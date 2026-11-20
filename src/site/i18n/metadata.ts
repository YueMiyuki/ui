import type { Metadata } from "next";
import type { Locale } from "@/site/i18n/config";
import { dictionaries } from "@/site/i18n/dictionaries";
import { SITE_URL } from "@/site/registry";

const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "miyuki-ui: components with the stillness of snow and the motion of water",
};

export function siteMetadata(locale: Locale): Metadata {
  const t = dictionaries[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: "%s — miyuki-ui" },
    description: t.meta.description,
    openGraph: { type: "website", siteName: "miyuki-ui", images: [shareImage] },
    twitter: { card: "summary_large_image", images: [shareImage] },
  };
}
