"use client";

import { Archive, Copy, Folder, FolderInput, Pencil, SquareArrowOutUpRight, Trash2, Users } from "lucide-react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
} from "@/components/miyuki-ui/context-menu";

function PdfGlyph() {
  return (
    <svg
      viewBox="0 0 44 54"
      aria-hidden="true"
      className="h-[54px] w-11 drop-shadow-[0_1px_1px_oklch(0.42_0.09_250/0.12)]"
    >
      <path
        d="M6 1.5h22.5L42.5 15.5V48.5a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-43a4 4 0 0 1 4-4Z"
        className="fill-card stroke-border-strong"
      />
      <path d="M28.5 1.5V11.5a4 4 0 0 0 4 4H42.5" className="fill-muted stroke-border-strong" />
      <path d="M9 22h20M9 27h26M9 32h22" className="stroke-border-strong" strokeWidth={2} strokeLinecap="round" />
      <rect x="7" y="38" width="22" height="10" rx="3" className="fill-primary" />
      <text
        x="18"
        y="45.4"
        textAnchor="middle"
        className="fill-primary-foreground font-sans text-[6.5px] font-bold tracking-[0.06em]"
      >
        PDF
      </text>
    </svg>
  );
}

export default function ContextMenuDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <ContextMenu
        aria-label="File actions"
        menu={
          <>
            <ContextMenuItem icon={<SquareArrowOutUpRight />}>Open</ContextMenuItem>
            <ContextMenuItem icon={<Copy />} shortcut="⌘D">
              Duplicate
            </ContextMenuItem>
            <ContextMenuSubmenu label="Move to" icon={<FolderInput />}>
              <ContextMenuItem icon={<Folder />}>Reports</ContextMenuItem>
              <ContextMenuItem icon={<Archive />}>Archive</ContextMenuItem>
              <ContextMenuItem icon={<Users />}>Shared</ContextMenuItem>
            </ContextMenuSubmenu>
            <ContextMenuItem icon={<Pencil />}>Rename</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem icon={<Trash2 />} tone="destructive">
              Delete
            </ContextMenuItem>
          </>
        }
      >
        <button
          type="button"
          aria-label="Q3 snow report.pdf, 2.4 MB"
          className="flex w-40 cursor-default flex-col items-center gap-2.5 rounded-xl bg-brand-soft px-3 pt-5 pb-3.5 text-center ring-1 ring-brand/25 ring-inset outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring in-data-[open]:ring-brand/45"
        >
          <PdfGlyph />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm leading-5 font-medium text-foreground">Q3 snow report.pdf</span>
            <span className="text-xs text-muted-foreground tabular-nums">2.4 MB</span>
          </span>
        </button>
      </ContextMenu>
      <p className="text-[13px] text-muted-foreground">Right-click the file</p>
    </div>
  );
}
