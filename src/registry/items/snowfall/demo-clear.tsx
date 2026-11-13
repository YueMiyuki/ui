"use client";

import { useRef } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Snowfall, type SnowfallHandle } from "@/components/miyuki-ui/snowfall";

export default function SnowfallClearDemo() {
  const snow = useRef<SnowfallHandle>(null);
  return (
    <Snowfall ref={snow} density={1.6} wind={-0.3} className="flex size-full items-center justify-center px-6 py-10">
      <div data-snow-ledge className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium">Platform 2, Otaru</p>
        <p className="mt-1 text-[13px] text-muted-foreground">The 07:12 to Sapporo is running nine minutes late.</p>
        <Button size="sm" variant="secondary" className="mt-4" onPress={() => snow.current?.clear()}>
          Clear the snow
        </Button>
      </div>
    </Snowfall>
  );
}
