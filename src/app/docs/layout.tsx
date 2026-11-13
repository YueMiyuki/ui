import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { Suspense } from "react";
import { DocsHeader } from "@/site/docs/docs-header";
import { SiteProvider } from "@/site/docs/provider";
import { source } from "@/site/docs/source";
import { SiteHeader } from "@/site/site-header";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <SiteProvider>
      <Suspense fallback={<SiteHeader />}>
        <DocsLayout
          tree={source.getPageTree()}
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
