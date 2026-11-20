"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DemoSurface, previewUrl } from "@/site/demo-surface";
import type { ItemSummary } from "@/site/registry";
import { isSiteTheme, type SiteTheme } from "@/site/theme";

const DEFAULT_THEMES: SiteTheme[] = ["light", "dark"];

const scopeClass = (theme: SiteTheme) => (theme === "ink" ? "dark ink" : theme);

function Tile({ item, demo, theme, zoom }: { item: ItemSummary; demo: string; theme: SiteTheme; zoom: number }) {
  const close = !item.preview.iframe && item.preview.layout === "center" && (item.preview.height ?? 420) <= 420;
  const base = close ? 0.6 : 0.4;
  const scale = base * zoom;
  const width = 360 / base;
  const height = Math.max(225 / base, Math.min(item.preview.height ?? 420, 900));
  return (
    <div
      className={cn(
        scopeClass(theme),
        "relative shrink-0 overflow-hidden rounded-lg bg-background text-foreground ring-1 ring-border",
      )}
      style={{ width: 360 * zoom, height: height * scale, transform: "translateZ(0)" }}
    >
      <div
        className="absolute top-0 left-0"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        {item.preview.iframe ? (
          <iframe
            src={previewUrl(item.slug, demo, theme)}
            title={`${item.name}, ${theme}`}
            width={width}
            height={height}
            className="block border-0 bg-transparent"
          />
        ) : (
          <DemoSurface slug={item.slug} demo={demo} layout={item.preview.layout} className="size-full" />
        )}
      </div>
    </div>
  );
}

export function ReviewSheet({ items }: { items: ItemSummary[] }) {
  const params = useSearchParams();
  const requested = (params.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const zoom = Math.min(3, Math.max(1, Number(params.get("zoom")) || 1));
  const asked = (params.get("themes") ?? "").split(",").filter(isSiteTheme);
  const themes = asked.length ? [...new Set(asked)] : DEFAULT_THEMES;

  if (requested.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Add <code className="font-mono">?slugs=button,hiding-banner</code> to the address. {items.length} items are
        available.
      </p>
    );
  }

  return (
    <div
      className={cn("grid w-max gap-x-4 gap-y-6 p-3", zoom > 1 ? "grid-cols-1" : "grid-cols-[repeat(2,max-content)]")}
      data-review-ready=""
    >
      {requested.map((entry) => {
        const [slug, demoName] = entry.split(":");
        const item = bySlug.get(slug);
        const demo = item && demoName && item.demos.includes(demoName) ? demoName : item?.firstDemo;
        return (
          <section key={entry} aria-label={entry}>
            <h2 className="mb-1.5 font-mono text-xs text-muted-foreground">
              {slug}
              {demo && demo !== "default" ? `:${demo}` : ""}
              {item ? "" : " (not in the registry)"}
            </h2>
            <div className="flex gap-2">
              {themes.map((theme) =>
                item && demo ? (
                  <Tile key={theme} item={item} demo={demo} theme={theme} zoom={zoom} />
                ) : (
                  <div
                    key={theme}
                    className={cn(scopeClass(theme), "rounded-lg bg-background ring-1 ring-border")}
                    style={{ width: 360 * zoom, height: 225 * zoom }}
                  />
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
