import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HideDevChrome } from "@/site/hide-dev-chrome";
import { items, summarize } from "@/site/registry";
import { ReviewSheet } from "@/site/review-sheet";

const available = process.env.NODE_ENV === "development";

export function generateMetadata(): Metadata {
  if (!available) notFound();
  return { title: "Review", robots: { index: false, follow: false } };
}

export default function ReviewPage() {
  if (!available) notFound();
  return (
    <main className="min-h-dvh bg-background">
      <HideDevChrome />
      <Suspense fallback={null}>
        <ReviewSheet items={items.map(summarize)} />
      </Suspense>
    </main>
  );
}
