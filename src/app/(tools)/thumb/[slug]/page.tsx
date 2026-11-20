import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HideDevChrome } from "@/site/hide-dev-chrome";
import { PreviewTheme } from "@/site/preview-theme";
import { getItem, items, PLACEHOLDER_SLUG, summarize } from "@/site/registry";
import { ThumbFrame } from "@/site/thumb-frame";

export function generateStaticParams() {
  return items.length > 0 ? items.map((item) => ({ slug: item.slug })) : [{ slug: PLACEHOLDER_SLUG }];
}

export const metadata: Metadata = { title: "Thumbnail", robots: { index: false, follow: false } };

export default function ThumbPage({ params }: PageProps<"/thumb/[slug]">) {
  return (
    <>
      <PreviewTheme />
      <HideDevChrome />
      <Suspense fallback={null}>
        <Thumb params={params} />
      </Suspense>
    </>
  );
}

async function Thumb({ params }: { params: PageProps<"/thumb/[slug]">["params"] }) {
  const { slug } = await params;
  const item = getItem(slug);
  if (!item) notFound();
  return (
    <main data-thumb={slug} className="relative min-h-dvh bg-background">
      <ThumbFrame item={summarize(item, "en")} />
    </main>
  );
}
