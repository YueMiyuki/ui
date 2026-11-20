import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/art/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/components", destination: "/docs/components", permanent: true },
      { source: "/components/:slug", destination: "/docs/components/:slug", permanent: true },
      { source: "/zh/components", destination: "/zh/docs/components", permanent: true },
      { source: "/zh/components/:slug", destination: "/zh/docs/components/:slug", permanent: true },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
