"use client";

import { Slipstream } from "@/components/miyuki-ui/slipstream";

export default function SlipstreamDemo() {
  return (
    <h2 className="text-center font-display text-[2.75rem] leading-[1.2] font-semibold tracking-[-0.025em] text-balance">
      From summit to valley
      <br />
      <Slipstream>in ninety seconds</Slipstream>
    </h2>
  );
}
