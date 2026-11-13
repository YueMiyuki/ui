"use client";

import { Bookmark, CalendarDays, CircleHelp, CloudSnow, House, Menu, Route, Settings } from "lucide-react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Button } from "@/components/miyuki-ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/miyuki-ui/drawer";
import { cn } from "@/lib/utils";
import { people } from "@/registry/lib/data";

const main = [
  { label: "Routes", icon: Route },
  { label: "Huts and inns", icon: House },
  { label: "Snow report", icon: CloudSnow, current: true },
  { label: "Saved", icon: Bookmark, count: 12 },
  { label: "Bookings", icon: CalendarDays, count: 2 },
];

const more = [
  { label: "Settings", icon: Settings },
  { label: "Help", icon: CircleHelp },
];

type NavItem = { label: string; icon: typeof Route; current?: boolean; count?: number };

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`}
      aria-current={item.current ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate();
      }}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-foreground outline-none select-none",
        "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
        item.current ? "bg-brand-soft font-medium" : "hover:bg-accent",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 shrink-0", item.current ? "text-brand-strong" : "text-muted-foreground")}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.count != null && <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>}
    </a>
  );
}

export default function DrawerLeftDemo() {
  const me = people[0];
  return (
    <DrawerTrigger>
      <Button variant="secondary" iconStart={<Menu />}>
        Menu
      </Button>
      <Drawer side="left">
        {({ close }) => (
          <>
            <DrawerHeader className="flex-row items-center gap-2.5">
              <Avatar name="Kitakaze Outfitters" shape="rounded" size="sm" aria-hidden />
              <DrawerTitle>Kitakaze Outfitters</DrawerTitle>
            </DrawerHeader>
            <DrawerBody className="px-3 py-3">
              <nav aria-label="Main" className="flex flex-col gap-0.5">
                {main.map((item) => (
                  <NavLink key={item.label} item={item} onNavigate={close} />
                ))}
              </nav>
              <nav aria-label="More" className="mt-6 flex flex-col gap-0.5">
                {more.map((item) => (
                  <NavLink key={item.label} item={item} onNavigate={close} />
                ))}
              </nav>
            </DrawerBody>
            <DrawerFooter className="justify-start gap-3 border-t border-border pt-4 pb-4">
              <Avatar src={me.avatar} name={me.name} size="md" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{me.name}</span>
                <span className="truncate text-[13px] text-muted-foreground">{me.email}</span>
              </div>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </DrawerTrigger>
  );
}
