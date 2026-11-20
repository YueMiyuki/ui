import Link from "next/link";
import { cn } from "@/lib/utils";
import { topo } from "@/registry/lib/art";
import "@/site/art-files";
import { docsHref } from "@/site/docs/urls";
import { LiveThumb } from "@/site/live-thumb";
import type { ItemSummary } from "@/site/registry";
import { THUMB_HEIGHT, THUMB_WIDTH } from "@/site/thumb-size";

const THEMES = ["light", "dark"] as const;

function Picture({ slug, version }: { slug: string; version: string }) {
  return THEMES.map((theme) => (
    <img
      key={theme}
      src={`/thumbs/${slug}.${theme}.webp?v=${version}`}
      alt=""
      width={THUMB_WIDTH}
      height={THUMB_HEIGHT}
      loading="lazy"
      decoding="async"
      className={cn(
        "absolute inset-0 size-full object-cover object-left-top",
        theme === "light" ? "dark:hidden" : "hidden dark:block",
      )}
    />
  ));
}

function Placeholder({ item }: { item: ItemSummary }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <img src={topo(item.slug)} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
      <span className="relative px-6 text-center font-display text-xl font-semibold text-muted-foreground">
        {item.name}
      </span>
    </div>
  );
}

export function ComponentTile({ item }: { item: ItemSummary }) {
  return (
    <div data-thumb-tile="" className="group relative">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted/40 transition-[border-color,box-shadow] duration-200 ease-settle group-hover:border-border-strong group-hover:shadow-md group-has-[a[data-aim]]:border-border-strong group-has-[a[data-aim]]:shadow-md group-has-[a:focus-visible]:ring-[3px] group-has-[a:focus-visible]:ring-ring">
        {item.picture ? <Picture slug={item.slug} version={item.picture} /> : <Placeholder item={item} />}
        {item.preview.thumb ? <LiveThumb item={item} /> : null}
      </div>
      <h3 className="mt-3.5 text-[15px] leading-snug font-semibold text-foreground">
        <Link
          href={docsHref(item)}
          data-thumb-demo={item.preview.thumb && !item.preview.iframe ? `${item.slug}/${item.firstDemo}` : undefined}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {item.name}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-3 text-sm leading-normal text-muted-foreground">{item.description}</p>
    </div>
  );
}
