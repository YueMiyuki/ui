"use client";

import { Button } from "@/components/miyuki-ui/button";
import { FlipLoader, ShuffleLoader } from "@/components/miyuki-ui/square-loaders";

const sizes = [16, 24, 32, 48];

export default function SquareLoadersSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <ShuffleLoader key={size} size={size} label="Sorting departures" />
          ))}
        </div>
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <FlipLoader key={size} size={size} label="Loading the forecast" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-8">
        <ShuffleLoader size={32} className="text-foreground" label="Sorting departures" />
        <FlipLoader size={32} className="text-foreground" label="Loading the forecast" />
        <ShuffleLoader size={32} className="text-muted-foreground" label="Sorting departures" />
        <FlipLoader size={32} className="text-muted-foreground" label="Loading the forecast" />
      </div>
      <Button variant="secondary" iconStart={<ShuffleLoader size={16} className="text-current" aria-hidden />}>
        Saving route
      </Button>
    </div>
  );
}
