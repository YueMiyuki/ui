"use client";

import { Bell, CloudSun, House, MountainSnow, PanelLeft, Plus, RadioTower, Route } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer } from "@/components/miyuki-ui/drawer";
import { FloatingSidebar, type FloatingSidebarItem } from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { people } from "@/registry/lib/data";

const teams = [{ id: "hoshizora", name: "Hoshizora Weather", plan: "Ridge plan, 24 members", logo: <MountainSnow /> }];

const items: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House /> },
  { id: "forecasts", label: "Forecasts", icon: <CloudSun /> },
  { id: "stations", label: "Stations", icon: <RadioTower /> },
  { id: "routes", label: "Routes", icon: <Route /> },
  { id: "alerts", label: "Alerts", icon: <Bell />, count: 3, countTone: "solid" },
];

const yuna = people[2];

export default function FloatingSidebarDrawerDemo() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("home");

  return (
    <div className="flex size-full flex-col bg-muted p-3 dark:bg-background">
      <header className="flex h-11 items-center gap-2">
        <IconButton variant="ghost" size="sm" aria-label="Open navigation" onPress={() => setOpen(true)}>
          <PanelLeft />
        </IconButton>
        <span className="text-sm font-medium text-foreground">{items.find((i) => i.id === current)?.label}</span>
      </header>
      <Drawer
        side="left"
        isOpen={open}
        onOpenChange={setOpen}
        closeButton={false}
        aria-label="Navigation"
        className="top-3 bottom-3 left-3 w-[264px] border-0 bg-transparent shadow-none"
      >
        <FloatingSidebar
          teams={teams}
          items={items}
          user={{ name: yuna.name, email: "yuna@hoshizora.example", avatar: yuna.avatar }}
          current={current}
          onNavigate={(id) => {
            setCurrent(id);
            setOpen(false);
          }}
          collapsible={false}
          action={
            <Button size="sm" iconStart={<Plus />} onPress={() => setOpen(false)}>
              New forecast
            </Button>
          }
          className="min-h-0 flex-1"
        />
      </Drawer>
    </div>
  );
}
