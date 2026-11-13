import Link from "next/link";
import { IdleSection } from "@/site/home/idle";
import { componentHref } from "@/site/home/links";
import { LiveThumb } from "@/site/live-thumb";
import type { ItemSummary } from "@/site/registry";

function Row({ items, reverse = false }: { items: ItemSummary[]; reverse?: boolean }) {
  const loop = [...items, ...items];
  return (
    <div
      className="flex w-max gap-5 pr-5 [animation:miyuki-wall_var(--wall-duration)_linear_infinite] group-hover/wall:[animation-play-state:paused] group-focus-within/wall:[animation-play-state:paused] motion-reduce:[animation:none]"
      style={{ animationDirection: reverse ? "reverse" : "normal" }}
    >
      {loop.map((item, index) => {
        const copy = index >= items.length;
        return (
          <div
            key={`${item.slug}-${index}`}
            aria-hidden={copy || undefined}
            className="group/tile relative h-[212px] w-[340px] shrink-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-[box-shadow,border-color] duration-200 ease-settle hover:border-border-strong hover:shadow-md has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring"
          >
            <LiveThumb item={item} play="always" />
            <Link
              href={componentHref(item.slug)}
              tabIndex={copy ? -1 : undefined}
              className="group/link absolute inset-0 rounded-2xl outline-none"
            >
              <span className="absolute bottom-3 left-3 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-visible/link:opacity-100">
                {item.name}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function Wall({ items }: { items: ItemSummary[] }) {
  if (items.length < 6) return null;
  const half = Math.ceil(items.length / 2);
  return (
    <IdleSection aria-label="Live components" className="pt-6 pb-24">
      <style
        href="miyuki-home-wall"
        precedence="miyuki"
      >{`@keyframes miyuki-wall { to { transform: translateX(-50%); } }`}</style>
      <div className="mx-auto mb-8 flex max-w-[1240px] items-baseline justify-between gap-6 px-6 lg:px-10">
        <p className="text-[15px] text-muted-foreground">Every tile is the real component, running.</p>
        <Link
          href="/docs/components"
          className="shrink-0 rounded-sm text-sm font-medium text-brand-strong underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          See all {items.length > 0 ? "components" : ""}
        </Link>
      </div>
      <div
        className="group/wall relative flex flex-col gap-5 overflow-hidden"
        style={{ "--wall-duration": `${Math.max(60, half * 11)}s` } as React.CSSProperties}
      >
        <Row items={items.slice(0, half)} />
        <Row items={items.slice(half)} reverse />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-linear-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-linear-to-l from-background to-transparent"
        />
      </div>
    </IdleSection>
  );
}
