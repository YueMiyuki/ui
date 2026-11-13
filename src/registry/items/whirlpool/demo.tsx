"use client";

import { Whirlpool } from "@/components/miyuki-ui/whirlpool";

export default function WhirlpoolDemo() {
  return (
    <Whirlpool className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="font-display text-5xl leading-[1.04] font-semibold tracking-[-0.02em] sm:text-6xl">
        Naruto, <span className="tabular-nums">13:20</span>
      </h2>
      <p className="mt-4 max-w-sm text-base text-balance text-muted-foreground">
        The whirlpools are strongest an hour either side of the tide.
      </p>
    </Whirlpool>
  );
}
