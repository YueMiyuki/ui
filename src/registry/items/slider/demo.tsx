"use client";

import { Slider } from "@/components/miyuki-ui/slider";

export default function SliderDemo() {
  return (
    <Slider
      className="max-w-sm"
      label="Elevation"
      minValue={0}
      maxValue={3000}
      step={50}
      defaultValue={1650}
      formatOptions={{ style: "unit", unit: "meter" }}
      marks={[0, 500, 1000, 1500, 2000, 2500, 3000]}
    />
  );
}
