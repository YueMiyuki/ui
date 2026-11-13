"use client";

import { useState } from "react";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { type PrintMode, TwoTonePrint } from "@/components/miyuki-ui/two-tone-print";
import { landscape } from "@/registry/lib/art";

const picture = landscape("kiso", { width: 1280, height: 800, mood: "dusk" });

const modes: { id: PrintMode; label: string }[] = [
  { id: "bayer", label: "Bayer" },
  { id: "halftone", label: "Halftone" },
  { id: "noise", label: "Noise" },
  { id: "crosshatch", label: "Crosshatch" },
];

export default function TwoTonePrintDemo() {
  const [mode, setMode] = useState<PrintMode>("bayer");
  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-4">
      <TwoTonePrint
        src={picture}
        alt="Peaks above the Kiso valley at dusk, printed in dots"
        mode={mode}
        className="aspect-[16/10] w-full rounded-xl ring-1 ring-border"
      />
      <SegmentedControl
        aria-label="Pattern"
        selectedKeys={[mode]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next) setMode(next as PrintMode);
        }}
      >
        {modes.map((m) => (
          <Segment key={m.id} id={m.id}>
            {m.label}
          </Segment>
        ))}
      </SegmentedControl>
    </div>
  );
}
