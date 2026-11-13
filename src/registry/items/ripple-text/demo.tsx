"use client";

import { RippleText } from "@/components/miyuki-ui/ripple-text";

export default function RippleTextDemo() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h2 className="font-display text-[44px] leading-[1.1] font-semibold tracking-[-0.03em] text-brand-strong sm:text-[72px]">
        <RippleText>Touch the water</RippleText>
      </h2>
      <p className="text-sm text-muted-foreground">Press a letter, or run the pointer along the line.</p>
    </div>
  );
}
