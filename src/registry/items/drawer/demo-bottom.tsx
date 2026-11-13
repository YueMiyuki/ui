"use client";

import { CalendarPlus, Download, Flag, MoreHorizontal, Share2 } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/miyuki-ui/drawer";

const actions = [
  { label: "Share route", icon: Share2 },
  { label: "Download GPX file", icon: Download },
  { label: "Add to a trip", icon: CalendarPlus },
  { label: "Report a problem", icon: Flag },
];

export default function DrawerBottomDemo() {
  return (
    <DrawerTrigger>
      <Button variant="secondary" iconStart={<MoreHorizontal />}>
        Route options
      </Button>
      <Drawer side="bottom">
        <DrawerHeader>
          <DrawerTitle>Hakuba traverse</DrawerTitle>
          <p className="text-[13px] text-muted-foreground tabular-nums">18.4 km · 24 waypoints · Grade 3</p>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-0.5 px-3 pt-1 pb-3">
          {actions.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              slot="close"
              iconStart={<Icon className="text-muted-foreground" />}
              className="h-11 w-full justify-start gap-3 px-3 font-normal"
            >
              {label}
            </Button>
          ))}
          <Button variant="soft" slot="close" className="mt-2 h-11 w-full">
            Cancel
          </Button>
        </DrawerBody>
      </Drawer>
    </DrawerTrigger>
  );
}
