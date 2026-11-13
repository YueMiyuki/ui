"use client";

import { Divider } from "@/components/miyuki-ui/divider";

export default function DividerDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-5 text-sm">
      <div className="flex flex-col gap-3">
        <p>Last train to Otaru leaves Sapporo at 22:41.</p>
        <Divider />
        <p>Night buses run every 40 minutes after that.</p>
      </div>
      <Divider label="or" />
      <Divider variant="double" />
      <Divider variant="dashed" />
      <Divider variant="filled" />
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>Timetable</span>
        <Divider orientation="vertical" className="h-4" />
        <span>Fares</span>
        <Divider orientation="vertical" className="h-4" />
        <span>Stations</span>
      </div>
    </div>
  );
}
