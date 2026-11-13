"use client";

import { StationClock } from "@/components/miyuki-ui/station-clock";

export default function StationClockSizesDemo() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-10">
      <StationClock timeZone="Asia/Tokyo" size={120} label="120 px" />
      <StationClock timeZone="Asia/Tokyo" size={240} label="240 px" />
      <StationClock timeZone="Asia/Tokyo" size={120} seconds={false} label="No second hand" />
    </div>
  );
}
