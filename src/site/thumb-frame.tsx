"use client";

import type { SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { DemoSurface, previewUrl } from "@/site/demo-surface";
import type { ItemSummary } from "@/site/registry";
import { thumbSize } from "@/site/thumb-size";

function whenFrameReady(event: SyntheticEvent<HTMLIFrameElement>, onReady?: () => void) {
  if (!onReady) return;
  const doc = event.currentTarget.contentDocument;
  const ready = () => doc?.querySelector("[data-demo-ready]");
  if (!doc || ready()) return onReady();
  const observer = new MutationObserver(() => {
    if (!ready()) return;
    observer.disconnect();
    onReady();
  });
  observer.observe(doc, { childList: true, subtree: true });
}

export function ThumbFrame({
  item,
  scale = 1,
  onReady,
  className,
}: {
  item: ItemSummary;
  scale?: number;
  onReady?: () => void;
  className?: string;
}) {
  const { width, height } = thumbSize(item);
  return (
    <div
      inert
      data-thumb-frame=""
      className={cn(
        "pointer-events-none absolute top-0 left-0 overflow-clip bg-background text-foreground select-none [contain:strict]",
        className,
      )}
      style={{ width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}
    >
      {item.preview.iframe ? (
        <iframe
          src={previewUrl(item.slug, item.firstDemo)}
          title={`${item.name} preview`}
          tabIndex={-1}
          onLoad={(event) => whenFrameReady(event, onReady)}
          className="block size-full border-0 bg-transparent"
        />
      ) : (
        <DemoSurface
          slug={item.slug}
          demo={item.firstDemo}
          layout={item.preview.layout}
          onReady={onReady}
          className="size-full"
        />
      )}
    </div>
  );
}
