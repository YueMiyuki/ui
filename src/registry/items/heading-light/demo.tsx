"use client";

import { HeadingLight } from "@/components/miyuki-ui/heading-light";

export default function HeadingLightDemo() {
  return (
    <HeadingLight className="dark size-full justify-center bg-background px-6 pb-14 text-center text-foreground">
      <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Night bus to Hakuba
      </h2>
      <p className="mt-4 max-w-sm text-base text-balance text-muted-foreground tabular-nums">
        Leaves Shinjuku 23:15. Arrives before the lifts open.
      </p>
    </HeadingLight>
  );
}
