"use client";

import { ChartColumn, List, MapIcon } from "lucide-react";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

export default function SegmentedControlIconsDemo() {
  return (
    <SegmentedControl aria-label="View" defaultSelectedKeys={["map"]}>
      <Segment id="list">
        <List aria-hidden="true" />
        List
      </Segment>
      <Segment id="map">
        <MapIcon aria-hidden="true" />
        Map
      </Segment>
      <Segment id="chart">
        <ChartColumn aria-hidden="true" />
        Chart
      </Segment>
    </SegmentedControl>
  );
}
