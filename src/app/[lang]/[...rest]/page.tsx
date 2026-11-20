import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NotFoundView } from "@/site/not-found-view";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return [{ rest: ["not-found"] }];
}

async function Missing(): Promise<never> {
  notFound();
}

export default function UnknownPage() {
  return (
    <>
      <NotFoundView />
      <Suspense>
        <Missing />
      </Suspense>
    </>
  );
}
