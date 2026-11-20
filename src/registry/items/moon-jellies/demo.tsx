"use client";

import { Button } from "@/components/miyuki-ui/button";
import { MoonJellies } from "@/components/miyuki-ui/moon-jellies";

export default function MoonJelliesDemo() {
  return (
    <div className="dark size-full bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--brand)_24%,var(--background)),color-mix(in_oklab,var(--brand)_8%,var(--background))_45%,color-mix(in_oklab,var(--background)_72%,black))] text-foreground">
      <MoonJellies className="flex size-full flex-col items-start justify-end px-7 pb-9 sm:px-12 sm:pb-12">
        <h2 className="max-w-md font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
          The aquarium is open late on Fridays.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">Otaru, until 21:00, with the jelly hall lit low.</p>
        <Button className="mt-6">Book a visit</Button>
      </MoonJellies>
    </div>
  );
}
