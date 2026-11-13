"use client";

import { Compass } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { PointerPull } from "@/components/miyuki-ui/pointer-pull";

export default function PointerPullDemo() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-wrap items-center justify-center gap-5">
        <PointerPull inner>
          <Button size="lg">Book a guide</Button>
        </PointerPull>
        <PointerPull>
          <Button size="lg" variant="secondary">
            See the route
          </Button>
        </PointerPull>
        <PointerPull inner strength={0.45}>
          <IconButton size="lg" variant="brand" aria-label="Open the compass" className="rounded-full">
            <Compass />
          </IconButton>
        </PointerPull>
      </div>
      <p className="text-[13px] text-muted-foreground">Bring the pointer close.</p>
    </div>
  );
}
