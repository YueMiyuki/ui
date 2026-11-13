"use client";

import { BookOpen, CloudSun, Map, RadioTower, Route, SunMoon, UserPlus } from "lucide-react";
import { CommandGroup, CommandItem, CommandPalettePanel } from "@/components/miyuki-ui/command-palette";

export default function CommandPaletteInlineDemo() {
  return (
    <div className="flex w-full justify-center">
      <CommandPalettePanel>
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
      </CommandPalettePanel>
    </div>
  );
}
