"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/site/copy-button";

const COLLAPSED = 420;

const surface = "bg-muted/40 shadow-none [&_figcaption]:font-mono [&_figcaption]:text-[13px]";

function codeOf(target: Element) {
  return target.closest("figure")?.querySelector("pre")?.textContent?.replace(/\n$/, "") ?? undefined;
}

function copyActions(label: string) {
  return function Actions({ className }: { className?: string }) {
    return (
      <div className={cn(className, "top-1.5 right-1.5 flex backdrop-blur-none")}>
        <CopyButton label={label} text={codeOf} />
      </div>
    );
  };
}

export function SourceBlock({
  html,
  title,
  expandable = false,
  maxHeight,
  className,
}: {
  html: string;
  title?: string;
  expandable?: boolean;
  maxHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [tall, setTall] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!expandable) return;
    const content = ref.current?.querySelector<HTMLElement>("[role=region] > div");
    if (!content) return;
    const measure = () => setTall(content.scrollHeight > COLLAPSED + 80);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [expandable]);

  const clipped = expandable && tall && !open;

  return (
    <div className={cn("relative min-w-0 not-prose", className)}>
      <CodeBlock
        ref={ref}
        title={title}
        allowCopy={false}
        Actions={copyActions(title ? `Copy ${title}` : "Copy")}
        className={cn("my-0", surface)}
        viewportProps={{
          className: cn("py-3", clipped ? "max-h-[420px] overflow-hidden" : expandable && "max-h-none"),
          style: maxHeight && !expandable ? { maxHeight } : undefined,
        }}
      >
        <div
          className="[&_code]:flex [&_code]:flex-col [&_pre]:w-max [&_pre]:min-w-full [&_pre]:bg-transparent!"
          dangerouslySetInnerHTML={{ __html: html.replace(' tabindex="0"', "") }}
        />
      </CodeBlock>
      {expandable && tall ? (
        <div
          className={cn(
            "flex justify-center",
            clipped
              ? "absolute inset-x-px bottom-px rounded-b-[13px] bg-[linear-gradient(to_top,color-mix(in_oklab,var(--muted)_40%,var(--background))_35%,transparent)] pt-16 pb-3"
              : "pt-3",
          )}
        >
          <Button
            onPress={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="h-8 cursor-default rounded-lg border border-border-strong bg-card px-3 text-[13px] font-medium text-foreground shadow-xs outline-none transition-colors data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:bg-accent"
          >
            {open ? "Show less" : "Show all"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MdxPre({
  title,
  icon,
  children,
  className,
  ...props
}: ComponentProps<"pre"> & { title?: string; icon?: ReactNode }) {
  return (
    <CodeBlock
      {...(props as Omit<ComponentProps<typeof CodeBlock>, "ref">)}
      title={title}
      icon={icon}
      allowCopy={false}
      Actions={copyActions(title ? `Copy ${title}` : "Copy")}
      className={cn(surface, className)}
      viewportProps={{ className: "py-3" }}
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}
