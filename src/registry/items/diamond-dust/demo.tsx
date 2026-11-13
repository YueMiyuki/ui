"use client";

import { DiamondDust } from "@/components/miyuki-ui/diamond-dust";

const GLOW = "radial-gradient(ellipse 50% 100% at 50% 0%, #000 12%, rgb(0 0 0 / 0.4) 48%, transparent 78%)";

export default function DiamondDustDemo() {
  return (
    <div className="flex size-full flex-col items-center justify-center overflow-hidden px-6">
      <h2 className="font-display text-6xl leading-none font-semibold tracking-[-0.03em] sm:text-8xl">miyuki-ui</h2>
      <div className="relative mt-6 h-[120px] w-full max-w-3xl">
        <div className="absolute inset-x-[6%] top-0 h-px bg-linear-to-r from-transparent via-brand to-transparent" />
        <div className="absolute inset-x-[30%] -top-px h-[3px] bg-linear-to-r from-transparent via-brand/70 to-transparent blur-[2px]" />
        <DiamondDust
          density={1400}
          maxSize={1.5}
          className="absolute inset-0"
          style={{ maskImage: GLOW, WebkitMaskImage: GLOW }}
        />
      </div>
    </div>
  );
}
