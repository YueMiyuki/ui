import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { DOCS_HOME, sectionHref } from "@/site/docs/urls";

export function SiteProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{
        links: [
          ["Components", sectionHref("components")],
          ["Templates", sectionHref("templates")],
          ["Installation", `${DOCS_HOME}/installation`],
          ["Theming", `${DOCS_HOME}/theming`],
        ],
      }}
    >
      <style href="miyuki-site-scroll" precedence="miyuki">
        {"@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}"}
      </style>
      {children}
    </RootProvider>
  );
}
