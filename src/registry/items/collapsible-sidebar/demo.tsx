"use client";

import { Bell, CloudSnow, LayoutGrid, RadioTower, Settings, Snowflake } from "lucide-react";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarFooter, SidebarLink } from "@/components/miyuki-ui/collapsible-sidebar";
import { people } from "@/registry/lib/data";

const links = [
  { id: "overview", label: "Overview", icon: <LayoutGrid /> },
  { id: "forecasts", label: "Forecasts", icon: <CloudSnow /> },
  { id: "stations", label: "Stations", icon: <RadioTower /> },
  { id: "alerts", label: "Alerts", icon: <Bell /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

export default function CollapsibleSidebarDemo() {
  const [current, setCurrent] = useState("forecasts");
  const user = people[2];
  const page = links.find((link) => link.id === current) ?? links[0];

  return (
    <div className="flex size-full flex-col bg-background md:flex-row">
      <Sidebar
        name="Hoshizora"
        logo={
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Snowflake className="size-4" aria-hidden="true" />
          </span>
        }
      >
        <SidebarBody>
          {links.map((link) => (
            <SidebarLink
              key={link.id}
              href={`#${link.id}`}
              icon={link.icon}
              label={link.label}
              current={link.id === current}
              onClick={(event) => {
                event.preventDefault();
                setCurrent(link.id);
              }}
            />
          ))}
        </SidebarBody>
        <SidebarFooter avatar={user.avatar} name={user.name} detail={user.role} />
      </Sidebar>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.01em]">{page.label}</h1>
          <p className="text-[13px] text-muted-foreground">Hakuba valley, updated 6 minutes ago</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
        <div className="min-h-40 flex-1 rounded-xl bg-muted" />
      </main>
    </div>
  );
}
