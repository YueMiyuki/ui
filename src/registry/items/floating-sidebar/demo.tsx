"use client";

import { Bell, CloudSun, CreditCard, House, MountainSnow, RadioTower, Route, Users } from "lucide-react";
import { useState } from "react";
import { FloatingSidebar, type FloatingSidebarItem } from "@/components/miyuki-ui/floating-sidebar";
import { people } from "@/registry/lib/data";

const teams = [
  { id: "hoshizora", name: "Hoshizora Weather", plan: "Ridge plan, 24 members", logo: <MountainSnow /> },
  { id: "kitakaze", name: "Kitakaze Outfitters", plan: "Summit plan, 61 members" },
  { id: "northline", name: "Northline Rail", plan: "Valley plan, 9 members" },
];

const items: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House />, count: 152 },
  { id: "forecasts", label: "Forecasts", icon: <CloudSun /> },
  { id: "stations", label: "Stations", icon: <RadioTower /> },
  { id: "routes", label: "Routes", icon: <Route /> },
  { id: "alerts", label: "Alerts", icon: <Bell />, count: 3, countTone: "solid" },
];

const groups = [
  {
    label: "Workspace",
    items: [
      { id: "team", label: "Team", icon: <Users /> },
      { id: "billing", label: "Billing", icon: <CreditCard /> },
    ],
  },
];

const titles: Record<string, string> = {
  home: "Home",
  forecasts: "Forecasts",
  stations: "Stations",
  routes: "Routes",
  alerts: "Alerts",
  team: "Team",
  billing: "Billing",
  support: "Support",
  settings: "Settings",
};

const yuna = people[2];

export default function FloatingSidebarDemo() {
  const [current, setCurrent] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex size-full gap-3 bg-muted p-3 dark:bg-background">
      <FloatingSidebar
        teams={teams}
        items={items}
        groups={groups}
        user={{ name: yuna.name, email: "yuna@hoshizora.example", avatar: yuna.avatar }}
        current={current}
        onNavigate={setCurrent}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-hidden px-4 py-5 max-[520px]:hidden sm:px-6">
        <div>
          <h1 className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">{titles[current]}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Northern Alps and Hokkaido, updated 06:00 JST</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-foreground/[0.04] ring-1 ring-foreground/[0.04] ring-inset" />
          ))}
        </div>
        <div className="min-h-0 flex-1 rounded-xl bg-foreground/[0.04] ring-1 ring-foreground/[0.04] ring-inset" />
      </main>
    </div>
  );
}
