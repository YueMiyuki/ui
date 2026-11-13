import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { DemoMount } from "@/site/demo-mount";
import { HideDevChrome } from "@/site/hide-dev-chrome";
import { PreviewTheme } from "@/site/preview-theme";
import { getItem, items, PLACEHOLDER_SLUG } from "@/site/registry";

export function generateStaticParams() {
  const params = items.flatMap((item) => item.demos.map((demo) => ({ slug: item.slug, demo: demo.name })));
  return params.length > 0 ? params : [{ slug: PLACEHOLDER_SLUG, demo: "default" }];
}

export async function generateMetadata({ params }: PageProps<"/preview/[slug]/[demo]">): Promise<Metadata> {
  const { slug, demo } = await params;
  const item = getItem(slug);
  const title = item?.demos.find((d) => d.name === demo)?.title;
  return {
    title: item ? `${item.name}${title && item.demos.length > 1 ? `: ${title}` : ""} preview` : "Not found",
    robots: { index: false, follow: false },
  };
}

export default function PreviewPage({ params }: PageProps<"/preview/[slug]/[demo]">) {
  return (
    <>
      <PreviewTheme />
      <HideDevChrome />
      <Suspense fallback={<main className="min-h-dvh bg-background" />}>
        <Preview params={params} />
      </Suspense>
    </>
  );
}

async function Preview({ params }: { params: PageProps<"/preview/[slug]/[demo]">["params"] }) {
  const { slug, demo } = await params;
  const item = getItem(slug);
  if (!item?.demos.some((d) => d.name === demo)) notFound();
  const fill = item.preview.layout === "fill";

  return (
    <main
      data-preview={`${slug}/${demo}`}
      className={cn(
        "min-h-dvh bg-background text-foreground",
        fill ? "grid grid-cols-1" : "flex items-center justify-center p-6 sm:p-10",
      )}
    >
      <DemoMount slug={slug} demo={demo} />
    </main>
  );
}
