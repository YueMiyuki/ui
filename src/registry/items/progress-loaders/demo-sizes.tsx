"use client";

import { Button } from "@/components/miyuki-ui/button";
import { PieLoader, SpokesLoader } from "@/components/miyuki-ui/progress-loaders";

const sizes = [16, 24, 32, 48];

export default function ProgressLoadersSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <SpokesLoader key={size} size={size} label="Loading lift status" />
          ))}
        </div>
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <PieLoader key={size} size={size} label="Checking the timetable" />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <SpokesLoader size={32} className="text-foreground" label="Loading lift status" />
        <PieLoader size={32} className="text-foreground" label="Checking the timetable" />
        <SpokesLoader size={32} className="text-muted-foreground" label="Loading lift status" />
        <PieLoader size={32} className="text-muted-foreground" label="Checking the timetable" />
      </div>
      <Button variant="secondary" iconStart={<SpokesLoader size={16} className="text-current" aria-hidden />}>
        Saving route
      </Button>
    </div>
  );
}
