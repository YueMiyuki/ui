"use client";

import { Radio, RadioGroup } from "@/components/miyuki-ui/radio";

export default function RadioDemo() {
  return (
    <RadioGroup label="Forecast updates" defaultValue="daily" className="w-56">
      <Radio value="hourly">Hourly</Radio>
      <Radio value="daily">Daily</Radio>
      <Radio value="weekly">Weekly</Radio>
    </RadioGroup>
  );
}
