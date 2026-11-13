"use client";

import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";

export default function TabsVerticalDemo() {
  return (
    <Tabs orientation="vertical" className="w-full max-w-lg">
      <TabList aria-label="Account settings">
        <Tab id="profile">Profile</Tab>
        <Tab id="alerts" count={3}>
          Alerts
        </Tab>
        <Tab id="billing">Billing</Tab>
      </TabList>
      <TabPanel id="profile" className="text-muted-foreground">
        Your name, photo and the regions you follow.
      </TabPanel>
      <TabPanel id="alerts" className="text-muted-foreground">
        Three regions send powder alerts: Niseko, Hakuba and Nozawa.
      </TabPanel>
      <TabPanel id="billing" className="text-muted-foreground">
        The season pass renews on 1 December for ¥118,000.
      </TabPanel>
    </Tabs>
  );
}
