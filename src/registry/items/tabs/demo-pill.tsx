"use client";

import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";

export default function TabsPillDemo() {
  return (
    <Tabs variant="pill" className="w-full max-w-md">
      <TabList aria-label="Hakuba weather">
        <Tab id="overview">Overview</Tab>
        <Tab id="forecast">Forecast</Tab>
        <Tab id="history">History</Tab>
      </TabList>
      <TabPanel id="overview" className="min-h-10 text-muted-foreground">
        −6 °C at the summit, light snow easing by noon. Winds 18 km/h from the north-west.
      </TabPanel>
      <TabPanel id="forecast" className="min-h-10 text-muted-foreground">
        34 cm of new snow expected over the next three days, heaviest on Thursday night.
      </TabPanel>
      <TabPanel id="history" className="min-h-10 text-muted-foreground">
        This is the deepest base for mid-January since 2018, at 212 cm on the upper slopes.
      </TabPanel>
    </Tabs>
  );
}
