"use client";

import { Button } from "@/components/miyuki-ui/button";
import { ArcsLoader, BeadsLoader, RingLoader } from "@/components/miyuki-ui/orbit-loaders";

const sizes = [16, 24, 32, 48];

export default function OrbitLoadersSizesDemo() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-10 gap-y-6">
        <div className="flex items-end gap-4">
          {sizes.map((size) => (
            <ArcsLoader key={size} size={size} label="Loading rain radar" />
          ))}
        </div>
        <div className="flex items-end gap-4">
          {sizes.map((size) => (
            <BeadsLoader key={size} size={size} label="Checking the timetable" />
          ))}
        </div>
      </div>
      <div className="flex items-end gap-6">
        <ArcsLoader size={32} className="text-foreground" label="Loading rain radar" />
        <BeadsLoader size={32} className="text-foreground" label="Checking the timetable" />
        <ArcsLoader size={32} className="text-muted-foreground" label="Loading rain radar" />
        <BeadsLoader size={32} className="text-muted-foreground" label="Checking the timetable" />
      </div>
      <Button variant="secondary" iconStart={<RingLoader size={16} className="text-current" aria-hidden="true" />}>
        Saving route
      </Button>
    </div>
  );
}
