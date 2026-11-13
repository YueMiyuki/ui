"use client";

import { ColorPicker } from "@/components/miyuki-ui/color-picker";

export default function ColorPickerDemo() {
  return (
    <ColorPicker
      className="w-full max-w-[15rem]"
      label="Trail colour"
      defaultValue="#D4553A"
      description="Draws the Kiso forest trail on the map."
    />
  );
}
