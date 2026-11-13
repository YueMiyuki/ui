"use client";

import { Button } from "@/components/miyuki-ui/button";
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { NorenDrawer, NorenDrawerTrigger } from "@/components/miyuki-ui/noren-drawer";

const teas = [
  { name: "Sencha", note: "First flush from Yame, steeped at 70°C", price: "¥680" },
  { name: "Hōjicha", note: "Roasted over charcoal, low in caffeine", price: "¥620" },
  { name: "Genmaicha", note: "Green tea with toasted brown rice", price: "¥580" },
  { name: "Matcha", note: "Whisked to order, with a chestnut sweet", price: "¥980" },
];

export default function NorenDrawerDemo() {
  return (
    <NorenDrawerTrigger>
      <Button variant="secondary">Step inside</Button>
      <NorenDrawer>
        <DrawerHeader className="pt-3">
          <DrawerTitle className="pe-9">Teas today</DrawerTitle>
          <p className="text-[13px] text-muted-foreground">Shirakawa tea room · served until 17:00</p>
        </DrawerHeader>
        <DrawerBody className="pt-0 pb-1">
          <ul className="flex flex-col divide-y divide-border">
            {teas.map((tea) => (
              <li key={tea.name} className="flex items-baseline gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{tea.name}</span>
                  <span className="text-[13px] text-muted-foreground">{tea.note}</span>
                </div>
                <span className="text-sm tabular-nums">{tea.price}</span>
              </li>
            ))}
          </ul>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" slot="close">
            Not today
          </Button>
          <Button slot="close">Order a pot</Button>
        </DrawerFooter>
      </NorenDrawer>
    </NorenDrawerTrigger>
  );
}
