import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import { SiteProvider } from "@/site/docs/provider";
import { sectionHref } from "@/site/docs/urls";
import { inkLinkClass } from "@/site/link-button";
import { SiteFooter } from "@/site/site-footer";
import { HomeContainer, HomeHeader } from "@/site/site-header";

export default function NotFound() {
  return (
    <SiteProvider>
      <HomeLayout slots={{ header: HomeHeader, container: HomeContainer }}>
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pt-24 pb-32 sm:pt-32 lg:px-10">
          <p className="text-[13px] text-muted-foreground tabular-nums">404</p>
          <h1 className="mt-2 font-display text-[clamp(36px,5vw,56px)] leading-[1.05] font-semibold tracking-[-0.02em]">
            Nothing here but snow.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
            The page you asked for does not exist, or it has moved. The components are all in one place.
          </p>
          <Link href={sectionHref("components")} className={inkLinkClass("mt-8")}>
            Browse components
          </Link>
        </main>
        <SiteFooter />
      </HomeLayout>
    </SiteProvider>
  );
}
