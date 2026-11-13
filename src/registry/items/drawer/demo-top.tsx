"use client";

import { TrainFront } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/miyuki-ui/drawer";

const alerts: { line: string; status: string; tone: BadgeTone; text: string }[] = [
  {
    line: "Hakodate line",
    status: "Delays",
    tone: "warning",
    text: "Trains every 30 minutes until 10:00 while snow is cleared near Zenibako.",
  },
  {
    line: "Otaru",
    status: "Notice",
    tone: "brand",
    text: "The 22:40 last train runs as normal tonight, from platform 3.",
  },
  {
    line: "Chitose line",
    status: "Resolved",
    tone: "success",
    text: "Signal fault at Kitahiroshima fixed at 06:55. Trains are back on time.",
  },
];

export default function DrawerTopDemo() {
  return (
    <DrawerTrigger>
      <Button variant="secondary" iconStart={<TrainFront />}>
        Service alerts
      </Button>
      <Drawer side="top">
        <DrawerHeader>
          <DrawerTitle>Northline service alerts</DrawerTitle>
          <p className="text-[13px] text-muted-foreground tabular-nums">Updated 07:42</p>
        </DrawerHeader>
        <DrawerBody className="pt-1 pb-5">
          <ul className="flex flex-col divide-y divide-border">
            {alerts.map(({ line, status, tone, text }) => (
              <li key={line} className="flex flex-col gap-1 py-3 first:pt-1 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm leading-5 font-medium">{line}</span>
                  <Badge size="sm" tone={tone} dot>
                    {status}
                  </Badge>
                </div>
                <p className="text-[13px] leading-5 text-pretty text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </DrawerBody>
      </Drawer>
    </DrawerTrigger>
  );
}
