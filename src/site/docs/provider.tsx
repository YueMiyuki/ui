import { RootProvider } from "fumadocs-ui/provider/base";
import type { ReactNode } from "react";
import { docsPath, sectionHref } from "@/site/docs/urls";
import { LOCALE_NAMES, LOCALES } from "@/site/i18n/config";
import { SiteFramework } from "@/site/i18n/framework";
import { getI18n } from "@/site/i18n/server";
import { SiteIntent } from "@/site/intent";
import { SiteSearchDialog } from "@/site/search-dialog";
import { ThemeSync } from "@/site/theme-toggle";

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

export async function SiteProvider({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <SiteFramework>
      <RootProvider
        theme={{ enabled: false }}
        i18n={{
          locale,
          defaultLanguage: "en",
          hideLocale: "default-locale",
          translations: t.fumadocs,
          locales: LOCALES.map((code) => ({ locale: code, name: LOCALE_NAMES[code].label ?? LOCALE_NAMES[code].text })),
        }}
        search={{
          SearchDialog: SiteSearchDialog,
          links: [
            [t.search.components, sectionHref("components", locale)],
            [t.search.templates, sectionHref("templates", locale)],
            [t.search.installation, docsPath(locale, "/installation")],
            [t.search.theming, docsPath(locale, "/theming")],
          ],
        }}
      >
        <style href="miyuki-site-scroll" precedence="miyuki">
          {"@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}"}
        </style>
        <style href="miyuki-site-transitions" precedence="miyuki">
          {transitions}
        </style>
        <SiteIntent />
        <ThemeSync />
        {children}
      </RootProvider>
    </SiteFramework>
  );
}
