"use client";

import { MoonJellies } from "@/components/miyuki-ui/moon-jellies";

export default function MoonJelliesDayDemo() {
  return (
    <MoonJellies className="light flex size-full flex-col items-start justify-end bg-background px-7 pb-9 text-foreground sm:px-12 sm:pb-12">
      <h2 className="max-w-md font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
        Moon jellies are fed at 11:30.
      </h2>
      <p className="mt-3 text-base text-muted-foreground">Hall 2, beside the tide pools. Free with entry.</p>
    </MoonJellies>
  );
}
