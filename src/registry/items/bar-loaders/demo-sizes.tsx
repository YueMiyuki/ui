"use client";

import { ChargeLoader, EqualizerLoader } from "@/components/miyuki-ui/bar-loaders";
import { Button } from "@/components/miyuki-ui/button";

const sizes = [16, 24, 32, 48];

export default function BarLoadersSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <EqualizerLoader key={size} size={size} label="Buffering the harbour radio" />
          ))}
        </div>
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <ChargeLoader key={size} size={size} label="Charging the trail camera" />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <EqualizerLoader size={32} className="text-foreground" label="Buffering the harbour radio" />
        <ChargeLoader size={32} className="text-foreground" label="Charging the trail camera" />
        <EqualizerLoader size={32} className="text-muted-foreground" label="Buffering the harbour radio" />
        <ChargeLoader size={32} className="text-muted-foreground" label="Charging the trail camera" />
      </div>
      <Button variant="secondary" iconStart={<EqualizerLoader size={16} className="text-current" aria-hidden />}>
        Saving route
      </Button>
    </div>
  );
}
