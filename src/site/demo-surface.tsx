"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { PreviewLayout } from "@/registry/schema";
import { DemoMount } from "@/site/demo-mount";
import type { SiteTheme } from "@/site/theme";

export function DemoSurface({
  slug,
  demo,
  layout,
  className,
  style,
  onReady,
}: {
  slug: string;
  demo: string;
  layout: PreviewLayout;
  className?: string;
  style?: CSSProperties;
  onReady?: () => void;
}) {
  return (
    <div
      className={cn(
        layout === "fill" ? "grid grid-cols-1" : "flex items-center-safe justify-center-safe p-5 sm:p-8",
        className,
      )}
      style={style}
    >
      <DemoMount slug={slug} demo={demo} onReady={onReady} />
    </div>
  );
}

export function previewUrl(slug: string, demo: string, theme?: SiteTheme) {
  return `/preview/${slug}/${demo}${theme ? `?theme=${theme}` : ""}`;
}
