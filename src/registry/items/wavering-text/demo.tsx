"use client";

import { WaveringText } from "@/components/miyuki-ui/wavering-text";

export default function WaveringTextDemo() {
  return (
    <div className="flex flex-col items-center gap-3 text-center font-display font-semibold tracking-[-0.02em]">
      <WaveringText as="p" mode="ripple" className="text-[52px] leading-[1.05] text-brand-strong sm:text-[80px]">
        under water
      </WaveringText>
      <WaveringText as="p" mode="boil" className="text-[28px] leading-[1.1] text-foreground sm:text-[40px]">
        drawn by hand
      </WaveringText>
    </div>
  );
}
