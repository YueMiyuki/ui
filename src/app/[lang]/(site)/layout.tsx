import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";
import { SiteProvider } from "@/site/docs/provider";
import { SiteFooter } from "@/site/site-footer";
import { HomeContainer, HomeHeader } from "@/site/site-header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SiteProvider>
      <HomeLayout slots={{ header: HomeHeader, container: HomeContainer }}>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </HomeLayout>
    </SiteProvider>
  );
}
