"use client";

import { ColorPickerPanel } from "@/components/miyuki-ui/color-picker";

export default function ColorPickerInlineDemo() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <ColorPickerPanel label="Hut marker" defaultValue="#2E8F7E" showAlpha />
    </div>
  );
}
