"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { InkBleedText } from "@/components/miyuki-ui/ink-bleed-text";

export default function InkBleedTextDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="flex flex-col items-center gap-9 text-center">
      <InkBleedText
        key={run}
        as="p"
        text="Snow has no sound of its own."
        className="max-w-3xl font-display text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-[56px]"
      />
      <Button variant="secondary" size="sm" iconStart={<RotateCcw />} onPress={() => setRun((r) => r + 1)}>
        Replay
      </Button>
    </div>
  );
}
