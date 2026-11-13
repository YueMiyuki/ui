import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { ComponentPage } from "@/site/docs/component-page";
import { GalleryPage } from "@/site/docs/gallery-page";
import { getMDXComponents } from "@/site/docs/mdx";
import { PageDescription, PageTitle, pageFooterClass } from "@/site/docs/page-parts";
import { DocsPageSkeleton } from "@/site/docs/page-skeleton";
import { source } from "@/site/docs/source";
import { docsHref } from "@/site/docs/urls";
import { getItem } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

// An unknown slug then waits for the whole render, so notFound() can still send a 404 status.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return { title: "Not found" };

  const metadata: Metadata = {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
  };
  if (page.type !== "registry" || !page.data.slug) return metadata;

  const images = [
    { url: `/thumbs/${page.data.slug}.light.webp`, width: 720, height: 450, alt: `${page.data.title} preview` },
  ];
  return {
    ...metadata,
    openGraph: { type: "website", siteName: "miyuki-ui", images },
    twitter: { card: "summary_large_image", images },
  };
}

export default function Page({ params }: PageProps<"/docs/[[...slug]]">) {
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

async function Content({ params }: { params: PageProps<"/docs/[[...slug]]">["params"] }) {
  const { slug = [] } = await params;
  const page = source.getPage(slug);

  if (!page) {
    const moved =
      slug.length === 2 && (slug[0] === "components" || slug[0] === "templates") ? getItem(slug[1]) : undefined;
    if (moved) permanentRedirect(docsHref(moved));
    notFound();
  }

  if (page.type === "registry") {
    return page.data.slug ? <ComponentPage data={page.data} /> : <GalleryPage data={page.data} />;
  }

  const MDX = page.data.body;
  return (
    <DocsPage
      toc={page.data.toc}
      breadcrumb={{ enabled: false }}
      footer={{ className: pageFooterClass, children: <DocsFooter /> }}
    >
      <PageTitle>{page.data.title}</PageTitle>
      <PageDescription>{page.data.description}</PageDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}
