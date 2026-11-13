"use client";

import { Marker, MarkerHeadline } from "@/components/miyuki-ui/marker-headline";

export default function MarkerHeadlineDemo() {
  return (
    <MarkerHeadline className="flex size-full flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="max-w-3xl font-display text-[34px] leading-[1.18] font-bold tracking-[-0.03em] text-balance text-foreground sm:text-5xl sm:leading-[1.16]">
        Forecasts you can plan a week around, <Marker>and a morning by.</Marker>
      </h1>
      <p className="mt-5 max-w-md text-base text-balance text-muted-foreground">
        Hourly snow, wind and road conditions for 1,284 towns across Hokkaido.
      </p>
    </MarkerHeadline>
  );
}
