"use client";

import {
  ChevronRight,
  File,
  FileBraces,
  FileCode,
  FileCodeCorner,
  FileImage,
  FileText,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, type Ref, useEffect, useRef } from "react";
import {
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  type TreeItemProps as AriaTreeItemProps,
  type TreeProps as AriaTreeProps,
  Button,
  composeRenderProps,
  TreeItemContent,
} from "react-aria-components";
import { cn } from "@/lib/utils";

const PAD = 8;
const CHEVRON = 16;
const INDENT = 20;

const byExtension: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,
  css: FileCodeCorner,
  scss: FileCodeCorner,
  json: FileBraces,
  md: FileText,
  mdx: FileText,
  txt: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  avif: FileImage,
};

function iconFor(name: string, isFolder: boolean): LucideIcon {
  if (isFolder) return Folder;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return byExtension[ext] ?? File;
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

export interface TreeProps<T extends object = object> extends AriaTreeProps<T> {
  ref?: Ref<HTMLDivElement>;
}

export function Tree<T extends object>({ className, ref, selectionBehavior = "replace", ...props }: TreeProps<T>) {
  const local = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => local.current?.setAttribute("data-miyuki-tree-ready", ""));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <AriaTree
      {...props}
      selectionBehavior={selectionBehavior}
      ref={(node) => {
        local.current = node;
        setRef(ref, node);
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/tree flex w-full flex-col rounded-lg outline-none",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          cls,
        ),
      )}
    />
  );
}

export interface TreeItemProps<T extends object = object> extends Omit<AriaTreeItemProps<T>, "children" | "textValue"> {
  title: ReactNode;
  textValue?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function TreeItem<T extends object>({
  title,
  textValue,
  icon,
  children,
  className,
  ...props
}: TreeItemProps<T>) {
  const isFolder = children != null && children !== false;
  const label = textValue ?? (typeof title === "string" ? title : "");
  const Icon = iconFor(label, isFolder);

  return (
    <AriaTreeItem
      {...props}
      textValue={label}
      className={composeRenderProps(className, (cls) =>
        cn(
          "relative flex h-8 shrink-0 cursor-default items-start overflow-hidden rounded-md pe-2 text-sm text-foreground outline-none select-none",
          "transition-[background-color,box-shadow,height,opacity] duration-200 ease-settle",
          "data-[hovered]:bg-accent data-[selected]:bg-brand-soft",
          "data-[focus-visible]:z-10 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "group-data-[miyuki-tree-ready]/tree:starting:h-0 group-data-[miyuki-tree-ready]/tree:starting:opacity-0",
          "motion-reduce:transition-[background-color,box-shadow,opacity]",
          cls,
        ),
      )}
      style={{ paddingInlineStart: PAD }}
    >
      <TreeItemContent>
        {({ level, isExpanded, hasChildItems, state, id }) => (
          <>
            {Array.from({ length: level - 1 }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/10"
                style={{
                  insetInlineStart: PAD + i * INDENT + CHEVRON / 2 - 0.5,
                }}
              />
            ))}
            <span className="flex h-8 min-w-0 flex-1 items-center">
              <span aria-hidden="true" className="shrink-0" style={{ width: (level - 1) * INDENT }} />
              {hasChildItems ? (
                <Button
                  slot="chevron"
                  className={cn(
                    "grid size-4 shrink-0 cursor-default place-items-center rounded-sm text-muted-foreground outline-none",
                    "transition-colors duration-150 data-[hovered]:text-foreground",
                  )}
                >
                  <ChevronRight
                    aria-hidden="true"
                    strokeWidth={2}
                    className={cn(
                      "size-3.5 transition-[rotate] duration-200 ease-settle rtl:-scale-x-100 motion-reduce:transition-none",
                      isExpanded && "rotate-90 rtl:-rotate-90",
                    )}
                  />
                </Button>
              ) : (
                <span aria-hidden="true" className="size-4 shrink-0" />
              )}
              <span
                className="flex min-w-0 flex-1 items-center self-stretch"
                onClick={hasChildItems ? () => state.toggleKey(id) : undefined}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "ms-1 me-2 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
                    isFolder ? "text-brand [&_svg]:fill-brand/15" : "text-muted-foreground",
                  )}
                >
                  {icon ?? <Icon strokeWidth={1.75} />}
                </span>
                <span className="min-w-0 truncate">{title}</span>
              </span>
            </span>
          </>
        )}
      </TreeItemContent>
      {children}
    </AriaTreeItem>
  );
}
