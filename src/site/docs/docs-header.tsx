"use client";

import { useNotebookLayout } from "fumadocs-ui/layouts/notebook";
import type { ComponentProps } from "react";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import { iconButtonClass } from "@/site/icon-button";
import { SiteHeader } from "@/site/site-header";

export function DocsHeader({ className, ...props }: ComponentProps<"header">) {
  const { slots } = useNotebookLayout();
  const { open } = slots.sidebar.useSidebar();
  const Trigger = slots.sidebar.trigger;
  return (
    <SiteHeader
      {...props}
      className={cn("top-(--fd-docs-row-1) [grid-area:header] layout:[--fd-header-height:--spacing(14)]", className)}
      menu={
        <Trigger className={iconButtonClass("-mr-1.5 size-9 md:hidden")}>
          <MorphIcon shapes={morphIcons.menuClose} shape={open ? "close" : "menu"} />
        </Trigger>
      }
    />
  );
}
