"use client";

import { SplashLine } from "@/components/miyuki-ui/splash-line";

export default function SplashLineDemo() {
  return (
    <SplashLine className="flex size-full items-center justify-center px-6 pb-[14%] text-center">
      <h2 className="max-w-xl font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        What falls as snow returns as water
      </h2>
    </SplashLine>
  );
}
