"use client";

import { Plus, Search, Settings } from "lucide-react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";

export default function TooltipShortcutDemo() {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs">
      <TooltipTrigger>
        <IconButton variant="ghost" aria-label="Search">
          <Search />
        </IconButton>
        <Tooltip shortcut="⌘K">Search</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <IconButton variant="ghost" aria-label="New route">
          <Plus />
        </IconButton>
        <Tooltip shortcut="N">New route</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <IconButton variant="ghost" aria-label="Settings">
          <Settings />
        </IconButton>
        <Tooltip shortcut="⌘,">Settings</Tooltip>
      </TooltipTrigger>
    </div>
  );
}
