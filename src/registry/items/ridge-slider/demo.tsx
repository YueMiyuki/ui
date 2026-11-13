"use client";

import { RidgeSlider } from "@/components/miyuki-ui/ridge-slider";

export default function RidgeSliderDemo() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-1">
      <RidgeSlider label="Turn-around point" minAltitude={760} maxAltitude={2932} defaultValue={64} seed={5} />
      <p className="text-[13px] text-muted-foreground">Turn back by 13:00 wherever you are on the ridge.</p>
    </div>
  );
}
