"use client";

import { BookOpen, CloudSun, Map, RadioTower, Route, Search, SunMoon, UserPlus } from "lucide-react";
import { Button, DialogTrigger } from "react-aria-components";
import { CommandGroup, CommandItem, CommandPalette } from "@/components/miyuki-ui/command-palette";

export default function CommandPaletteDemo() {
  return (
    <DialogTrigger>
      <Button className="flex h-9 w-64 max-w-full cursor-default items-center gap-2 rounded-lg border border-input bg-card ps-3 pe-1.5 text-sm text-muted-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:border-border-strong">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1 text-start">Search…</span>
        <kbd className="flex h-6 items-center rounded-sm border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <CommandPalette>
        <CommandGroup title="Go to">
          <CommandItem icon={<CloudSun />}>Forecast</CommandItem>
          <CommandItem icon={<Map />}>Maps</CommandItem>
          <CommandItem icon={<RadioTower />}>Stations</CommandItem>
          <CommandItem icon={<BookOpen />}>Journal</CommandItem>
        </CommandGroup>
        <CommandGroup title="Actions">
          <CommandItem icon={<Route />} shortcut="N">
            New route
          </CommandItem>
          <CommandItem icon={<UserPlus />}>Invite teammate</CommandItem>
          <CommandItem icon={<SunMoon />} shortcut="⌘ ⇧ L" keywords={["dark", "light", "appearance"]}>
            Switch theme
          </CommandItem>
        </CommandGroup>
      </CommandPalette>
    </DialogTrigger>
  );
}
