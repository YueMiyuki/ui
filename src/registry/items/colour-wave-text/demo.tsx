"use client";

import { ColourWaveText } from "@/components/miyuki-ui/colour-wave-text";

export default function ColourWaveTextDemo() {
  return (
    <h2 className="max-w-3xl text-center font-display text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-[64px] sm:leading-[1.05]">
      Every season in <ColourWaveText text="colour" />
    </h2>
  );
}
