"use client";

import { SnowTrail } from "@/components/miyuki-ui/snow-trail";

export default function SnowTrailDemo() {
  return (
    <SnowTrail className="grid h-[380px] w-full max-w-3xl place-items-center overflow-clip rounded-3xl border border-border bg-muted/70 px-4">
      <div className="w-full max-w-[300px] rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-[13px] text-muted-foreground tabular-nums">Hakuba, 06:40</p>
        <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Move here</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Thirty-two centimetres overnight and still coming down. Click to throw a handful.
        </p>
      </div>
    </SnowTrail>
  );
}
