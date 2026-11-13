"use client";

import { MaskReveal } from "@/components/miyuki-ui/mask-reveal";

const text =
  "max-w-2xl font-display text-3xl leading-[1.12] font-semibold tracking-[-0.02em] text-balance sm:text-[44px]";

export default function MaskRevealDemo() {
  return (
    <MaskReveal
      aria-label="The river under the snow"
      className="size-full"
      reveal={<p className={text}>Four degrees, all winter, and never still.</p>}
    >
      <p className={`${text} text-muted-foreground`}>Under the snow the river keeps moving.</p>
    </MaskReveal>
  );
}
