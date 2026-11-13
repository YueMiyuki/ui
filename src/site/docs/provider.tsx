import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { DOCS_HOME, sectionHref } from "@/site/docs/urls";

const settle = "cubic-bezier(0.22,1,0.36,1)";

const transitions = [
  "::view-transition{pointer-events:none}",
  "::view-transition-old(root),::view-transition-old(site-header){display:none}",
  "::view-transition-new(root),::view-transition-new(site-header){animation:none}",
  "::view-transition-group(site-header){animation:none;z-index:100}",
  "::view-transition-old(.page-out){animation:miyuki-site-fade-out 120ms ease-out both}",
  `::view-transition-new(.page-in){animation:miyuki-site-fade-in 220ms ${settle} 80ms both,miyuki-site-rise 260ms ${settle} 80ms both}`,
  "@keyframes miyuki-site-fade-out{to{opacity:0}}",
  "@keyframes miyuki-site-fade-in{from{opacity:0}}",
  "@keyframes miyuki-site-rise{from{transform:translateY(8px)}}",
  "@keyframes miyuki-site-skeleton-in{from{opacity:0}}",
  "@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:0s!important;animation-delay:0s!important}}",
].join("");

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
      <style href="miyuki-site-transitions" precedence="miyuki">
        {transitions}
      </style>
      {children}
    </RootProvider>
  );
}
