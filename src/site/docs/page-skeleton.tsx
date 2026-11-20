"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/miyuki-ui/skeleton";
import { cn } from "@/lib/utils";
import { type Section, sectionPath } from "@/site/docs/urls";
import { stripLocale } from "@/site/i18n/href";

type Shape = { kind: "gallery"; section: Section } | { kind: "item" } | { kind: "prose" };

const sections: Section[] = ["components", "templates"];

function shapeOf(pathname: string): Shape {
  const path = stripLocale(pathname);
  for (const section of sections) {
    const href = sectionPath(section);
    if (path === href) return { kind: "gallery", section };
    if (path.startsWith(`${href}/`)) return { kind: "item" };
  }
  return { kind: "prose" };
}

function Line({ className }: { className?: string }) {
  return (
    <div className="flex h-[1lh] items-center">
      <Skeleton className={cn("h-[0.8em] rounded-sm", className)} />
    </div>
  );
}

function Title({ className }: { className: string }) {
  return (
    <div className="flex h-[1lh] items-center text-[2.25rem] leading-[1.1]">
      <Skeleton className={cn("h-[1em] rounded-lg", className)} />
    </div>
  );
}

function Description({ widths }: { widths: string[] }) {
  return (
    <div className="mb-4 max-w-[62ch] text-[17px] leading-relaxed">
      {widths.map((width) => (
        <Line key={width} className={width} />
      ))}
    </div>
  );
}

const tiles = ["a", "b", "c", "d", "e", "f"];

function Gallery({ section }: { section: Section }) {
  const several = section === "components";
  return (
    <>
      <Title className="w-[min(15rem,70%)]" />
      <Description widths={["w-[min(34rem,100%)]"]} />
      <div className="flex-1">
        {several ? (
          <>
            <div className="text-xl leading-tight">
              <Line className="w-32" />
            </div>
            <div className="mt-1 text-sm">
              <Line className="w-[min(18rem,80%)]" />
            </div>
          </>
        ) : null}
        <div className={cn("grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2", several && "mt-6 xl:grid-cols-3")}>
          {tiles.map((tile) => (
            <div key={tile}>
              <Skeleton className="aspect-[16/10] rounded-2xl" />
              <div className="mt-3.5 text-[15px] leading-snug">
                <Line className="w-2/5" />
              </div>
              <div className="mt-1 text-sm leading-normal">
                <Line className="w-full" />
                <Line className="w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Item() {
  return (
    <>
      <div className="text-sm">
        <Line className="w-48" />
      </div>
      <Title className="w-[min(13rem,70%)]" />
      <Description widths={["w-full", "w-3/5"]} />
      <div className="flex-1">
        <Skeleton className="mt-13 h-[420px] rounded-2xl border border-border" />
        <div className="mt-12 text-2xl">
          <Line className="w-24" />
        </div>
        <Skeleton className="mt-5 h-24 rounded-xl" />
      </div>
    </>
  );
}

const paragraphs = [
  { id: "a", heading: false, lines: ["w-full", "w-[97%]", "w-[99%]", "w-3/5"] },
  { id: "b", heading: false, lines: ["w-[98%]", "w-full", "w-2/5"] },
  { id: "c", heading: true, lines: ["w-full", "w-[95%]", "w-[98%]", "w-1/3"] },
];

function Prose() {
  return (
    <>
      <Title className="w-[min(14rem,70%)]" />
      <Description widths={["w-full", "w-1/2"]} />
      <div className="flex-1 text-base leading-7">
        {paragraphs.map((paragraph) => (
          <div key={paragraph.id} className="mt-5 first:mt-0">
            {paragraph.heading ? (
              <div className="mt-10 mb-4 text-2xl">
                <Line className="w-44" />
              </div>
            ) : null}
            {paragraph.lines.map((width) => (
              <Line key={width} className={width} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Page({ shape }: { shape: Shape }) {
  const tocBar = !(shape.kind === "gallery" && shape.section === "templates");
  return (
    <>
      {tocBar ? (
        <div className="[grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]">
          <div className="h-10 border-b" />
        </div>
      ) : null}
      <main aria-busy="true" className="grid [grid-area:main]">
        <div
          aria-hidden="true"
          className="flex min-w-0 animate-[miyuki-site-skeleton-in_150ms_ease-out_150ms_both] flex-col gap-4 px-4 py-6 *:max-w-[900px] motion-reduce:[animation-duration:0s] md:px-6 md:pt-8 xl:px-8 xl:pt-14"
        >
          {shape.kind === "gallery" ? (
            <Gallery section={shape.section} />
          ) : shape.kind === "item" ? (
            <Item />
          ) : (
            <Prose />
          )}
        </div>
      </main>
      <div className="hidden xl:layout:[--fd-toc-width:268px]" />
    </>
  );
}

function Current() {
  return <Page shape={shapeOf(usePathname())} />;
}

export function DocsPageSkeleton() {
  return (
    <Suspense fallback={<Page shape={{ kind: "prose" }} />}>
      <Current />
    </Suspense>
  );
}
