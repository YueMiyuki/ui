"use client";

import { Button } from "@/components/miyuki-ui/button";
import { HaloFrame } from "@/components/miyuki-ui/halo-frame";
import { landscape } from "@/registry/lib/art";

export default function HaloFrameDemo() {
  return (
    <HaloFrame className="w-full max-w-xs">
      <article className="overflow-hidden bg-card">
        <img
          src={landscape("niseko-night-pass", { width: 640, height: 400, mood: "night" })}
          alt="Snow ridges under a night sky"
          className="aspect-[16/10] w-full object-cover"
        />
        <div className="p-5">
          <h3 className="text-base font-semibold">Niseko night pass</h3>
          <p className="mt-1 text-sm text-muted-foreground">Six lifts, floodlit until 20:30.</p>
          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="text-lg font-semibold tabular-nums">¥4,800</span>
            <Button size="sm">Reserve</Button>
          </div>
        </div>
      </article>
    </HaloFrame>
  );
}
