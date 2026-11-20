import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { Suspense } from "react";
import { DocsHeader } from "@/site/docs/docs-header";
import { SiteProvider } from "@/site/docs/provider";
import { source } from "@/site/docs/source";
import { getLocale } from "@/site/i18n/server";
import { SiteHeader } from "@/site/site-header";

export default async function Layout({ children }: LayoutProps<"/[lang]/docs">) {
  const locale = await getLocale();
  return (
    <SiteProvider>
      <Suspense fallback={<SiteHeader />}>
        <DocsLayout
          tree={source.getPageTree(locale)}
          nav={{ mode: "top" }}
          themeSwitch={{ enabled: false }}
          searchToggle={{ enabled: false }}
          sidebar={{ collapsible: false }}
          slots={{ header: DocsHeader }}
          containerProps={{ className: "[--fd-layout-width:1440px]" }}
        >
          {children}
        </DocsLayout>
      </Suspense>
    </SiteProvider>
  );
}
