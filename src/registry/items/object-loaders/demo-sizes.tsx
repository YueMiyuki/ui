"use client";

import { Button } from "@/components/miyuki-ui/button";
import { BellLoader, PlaneLoader, SkyLoader } from "@/components/miyuki-ui/object-loaders";

const sizes = [16, 24, 32, 48];

export default function ObjectLoadersSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-8">
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <BellLoader key={size} size={size} label="Checking for notices" />
          ))}
        </div>
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <SkyLoader key={size} size={size} label="Loading the forecast" />
          ))}
        </div>
      </div>
      <div className="flex items-end gap-5">
        <BellLoader size={32} className="text-foreground" />
        <SkyLoader size={32} className="text-foreground" />
        <BellLoader size={32} className="text-muted-foreground" />
        <SkyLoader size={32} className="text-muted-foreground" />
      </div>
      <Button variant="secondary" iconStart={<PlaneLoader size={16} aria-hidden className="text-current" />}>
        Sending itinerary
      </Button>
    </div>
  );
}
