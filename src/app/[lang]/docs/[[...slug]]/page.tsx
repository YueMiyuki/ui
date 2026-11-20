import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { ComponentPage } from "@/site/docs/component-page";
import { GalleryPage } from "@/site/docs/gallery-page";
import { getMDXComponents, localeLinks } from "@/site/docs/mdx";
import { PageDescription, PageTitle, pageFooterClass } from "@/site/docs/page-parts";
import { DocsPageSkeleton } from "@/site/docs/page-skeleton";
import { source } from "@/site/docs/source";
import { docsHref } from "@/site/docs/urls";
import { fill } from "@/site/i18n/format";
import { localeAlternates, stripLocale } from "@/site/i18n/href";
import { getI18n, getLocale } from "@/site/i18n/server";
import { getItem } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

// An unknown slug then waits for the whole render, so notFound() can still send a 404 status.
export const ensureStatic = "navigation";

export function generateStaticParams({ params }: { params: { lang: string } }) {
  return source.generateParams("slug", "lang").filter((entry) => entry.lang === params.lang);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale, t } = await getI18n();
  const page = source.getPage(slug, locale);
  if (!page) return { title: t.meta.notFound };

  const metadata: Metadata = {
    title: page.data.title,
    description: page.data.description,
    alternates: localeAlternates(locale, stripLocale(page.url)),
  };
  if (page.type !== "registry" || !page.data.slug) return metadata;

  const images = [
    {
      url: `/thumbs/${page.data.slug}.light.webp`,
      width: 720,
      height: 450,
      alt: fill(t.meta.previewAlt, { title: page.data.title }),
    },
  ];
  return {
    ...metadata,
    openGraph: { type: "website", siteName: "miyuki-ui", images },
    twitter: { card: "summary_large_image", images },
  };
}

export default function Page({ params }: PageProps<"/[lang]/docs/[[...slug]]">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="page-out" default="none">
          <DocsPageSkeleton />
        </ViewTransition>
      }
    >
      <ViewTransition enter="page-in" exit="page-out" default="none">
        <Content params={params} />
      </ViewTransition>
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/docs/[[...slug]]">["params"] }) {
  const { slug = [] } = await params;
  const locale = await getLocale();
  const page = source.getPage(slug, locale);

  if (!page) {
    const moved =
      slug.length === 2 && (slug[0] === "components" || slug[0] === "templates") ? getItem(slug[1]) : undefined;
    if (moved) permanentRedirect(docsHref(moved, locale));
    notFound();
  }

  if (page.type === "registry") {
    return page.data.slug ? (
      <ComponentPage data={page.data} locale={locale} />
    ) : (
      <GalleryPage data={page.data} locale={locale} />
    );
  }

  const MDX = page.data.body;
  const links = localeLinks(locale);
  return (
    <DocsPage
      toc={page.data.toc}
      breadcrumb={{ enabled: false }}
      footer={{ className: pageFooterClass, children: <DocsFooter /> }}
    >
      <PageTitle>{page.data.title}</PageTitle>
      <PageDescription>{page.data.description}</PageDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page, links.a), Card: links.Card })} />
      </DocsBody>
    </DocsPage>
  );
}
