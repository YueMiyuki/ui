"use client";

import { FallingStars, StarField } from "@/components/miyuki-ui/star-field";

export default function StarFieldDemo() {
  return (
    <div className="dark relative isolate flex size-full flex-col items-center justify-center overflow-hidden bg-background px-6 pb-12 text-center text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,color-mix(in_oklab,var(--brand)_14%,transparent),transparent)]" />
      <StarField />
      <FallingStars />
      <svg
        aria-hidden="true"
        viewBox="0 0 960 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-24 w-full"
      >
        <path
          className="fill-[color-mix(in_oklab,var(--brand)_12%,var(--background))]"
          d="M0 120V58l58-10 70 18 96-42 58 20 64-14 90 34 74-26 66 12 104-38 76 30 70-12 94 26 40-6V120Z"
        />
        <path
          className="fill-[color-mix(in_oklab,var(--background)_72%,black)]"
          d="M0 120V86l64-14 48 8 82-32 64 22 42-8 86 28 56-14 72 12 92-38 80 32 56-11 92 24 66-13 60 9V120Z"
        />
      </svg>
      <div className="relative">
        <h2 className="font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
          Observatory open tonight
        </h2>
        <p className="mt-4 text-base text-muted-foreground">Hakuba, 1,830 m. Doors at 20:00.</p>
      </div>
    </div>
  );
}
