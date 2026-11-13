import type { MetadataRoute } from "next";
import { SITE_URL } from "@/site/registry";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/review", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
