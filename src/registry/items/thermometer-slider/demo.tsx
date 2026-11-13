"use client";

import { ThermometerSlider } from "@/components/miyuki-ui/thermometer-slider";

export default function ThermometerSliderDemo() {
  return (
    <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-16 gap-y-10">
      <ThermometerSlider label="Alert me below" minValue={-30} maxValue={10} defaultValue={-12} />
      <div className="flex w-full max-w-xs flex-col gap-1">
        <ThermometerSlider label="Sauna" orientation="horizontal" minValue={40} maxValue={110} defaultValue={86} />
        <p className="text-[13px] text-muted-foreground">Ready in about 35 minutes.</p>
      </div>
    </div>
  );
}
