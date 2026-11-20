"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Button } from "react-aria-components";
import type { RegistryItem } from "@/registry/schema";
import { DemoSurface, previewUrl } from "@/site/demo-surface";
import { useDictionary } from "@/site/i18n/context";
import { fill } from "@/site/i18n/format";
import { iconButtonClass } from "@/site/icon-button";
import { Segmented } from "@/site/segmented";

type View = "preview" | "code";

export function DemoBlock({
  slug,
  name,
  demo,
  title,
  showTitle,
  preview,
  code,
}: {
  slug: string;
  name: string;
  demo: string;
  title: string;
  showTitle: boolean;
  preview: RegistryItem["preview"];
  code: ReactNode;
}) {
  const [view, setView] = useState<View>("preview");
  const [run, setRun] = useState(0);
  const reduce = useReducedMotion();
  const t = useDictionary().demo;
  const href = previewUrl(slug, demo);
  const height = preview.height;

  return (
    <section aria-label={showTitle ? title : fill(t.section, { name })} className="not-prose min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {showTitle ? <h3 className="text-[15px] font-semibold">{title}</h3> : null}
        <Segmented<View>
          label={t.view}
          value={view}
          onChange={setView}
          options={[
            { id: "preview", label: t.preview },
            { id: "code", label: t.code },
          ]}
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            aria-label={t.replay}
            onPress={() => {
              setView("preview");
              setRun((n) => n + 1);
            }}
            className={iconButtonClass()}
          >
            <motion.span
              className="inline-grid"
              initial={false}
              animate={{ rotate: reduce ? 0 : -360 * run }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <RotateCcw aria-hidden="true" />
            </motion.span>
          </Button>
          <a href={href} target="_blank" rel="noreferrer" aria-label={t.openInNewTab} className={iconButtonClass()}>
            <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </div>

      <div
        hidden={view !== "preview"}
        className="relative overflow-hidden rounded-2xl border border-border bg-background"
        style={{ contain: "layout paint" }}
      >
        {preview.iframe ? (
          <iframe
            key={run}
            src={href}
            title={fill(t.frameTitle, { name, title })}
            loading="lazy"
            className="block w-full border-0 bg-transparent"
            style={{ height }}
          />
        ) : (
          <DemoSurface
            key={run}
            slug={slug}
            demo={demo}
            layout={preview.layout}
            style={preview.layout === "fill" ? { height } : { minHeight: height }}
          />
        )}
      </div>

      <div hidden={view !== "code"}>{code}</div>
    </section>
  );
}
