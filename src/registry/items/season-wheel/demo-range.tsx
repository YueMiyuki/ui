"use client";

import { SeasonWheel } from "@/components/miyuki-ui/season-wheel";

export default function SeasonWheelRangeDemo() {
  return <SeasonWheel range label="Ski season" defaultValue={[12, 3]} />;
}
