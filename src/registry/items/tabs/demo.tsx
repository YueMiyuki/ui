"use client";

import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";

export default function TabsDemo() {
  return (
    <Tabs className="w-full max-w-lg">
      <TabList aria-label="Hakuba valley">
        <Tab id="stations" count={24}>
          Stations
        </Tab>
        <Tab id="alerts" count={3}>
          Alerts
        </Tab>
        <Tab id="routes" count={61}>
          Routes
        </Tab>
      </TabList>
      <TabPanel id="stations" className="min-h-10 text-muted-foreground">
        Snow depth, wind and temperature from every station in the valley, refreshed every ten minutes.
      </TabPanel>
      <TabPanel id="alerts" className="min-h-10 text-muted-foreground">
        Three warnings are active: wind above the tree line, one road closure and a delayed first lift.
      </TabPanel>
      <TabPanel id="routes" className="min-h-10 text-muted-foreground">
        Marked routes with today&apos;s conditions, from the valley floor to the Shirouma ridge.
      </TabPanel>
    </Tabs>
  );
}
