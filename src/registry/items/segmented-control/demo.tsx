"use client";

import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

export default function SegmentedControlDemo() {
  return (
    <SegmentedControl aria-label="Forecast range" defaultSelectedKeys={["week"]}>
      <Segment id="day">Day</Segment>
      <Segment id="week">Week</Segment>
      <Segment id="season">Season</Segment>
    </SegmentedControl>
  );
}
