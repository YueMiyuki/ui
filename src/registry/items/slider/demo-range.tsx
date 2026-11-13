"use client";

import { Slider } from "@/components/miyuki-ui/slider";

export default function SliderRangeDemo() {
  return (
    <Slider
      className="max-w-sm"
      label="Budget per night"
      minValue={4000}
      maxValue={40000}
      step={500}
      defaultValue={[8000, 24000]}
      formatOptions={{ style: "currency", currency: "JPY" }}
    />
  );
}
