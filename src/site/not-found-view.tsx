import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import { SiteProvider } from "@/site/docs/provider";
import { sectionHref } from "@/site/docs/urls";
import { getI18n } from "@/site/i18n/server";
import { inkLinkClass } from "@/site/link-button";
import { SiteFooter } from "@/site/site-footer";
import { HomeContainer, HomeHeader } from "@/site/site-header";

export async function NotFoundView() {
  const { locale, t } = await getI18n();
  return (
    <SiteProvider>
      <HomeLayout slots={{ header: HomeHeader, container: HomeContainer }}>
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pt-24 pb-32 sm:pt-32 lg:px-10">
          <p className="text-[13px] text-muted-foreground tabular-nums">404</p>
          <h1 className="mt-2 font-display text-[clamp(36px,5vw,56px)] leading-[1.05] font-semibold tracking-[-0.02em] zh:tracking-normal">
            {t.notFound.title}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">{t.notFound.body}</p>
          <Link href={sectionHref("components", locale)} className={inkLinkClass("mt-8")}>
            {t.notFound.browse}
          </Link>
        </main>
        <SiteFooter />
      </HomeLayout>
    </SiteProvider>
  );
}
