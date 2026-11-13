"use client";

import { RainOnGlass } from "@/components/miyuki-ui/rain-on-glass";
import { landscape } from "@/registry/lib/art";

export default function RainOnGlassDemo() {
  return (
    <RainOnGlass
      className="flex size-full items-start p-8 sm:p-12"
      overlay={
        <div className="relative max-w-md [text-shadow:0_0_22px_var(--background),0_0_10px_var(--background),0_0_3px_var(--background)]">
          <p className="text-sm font-medium text-foreground/80">Otaru, this evening</p>
          <h2 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            Rain until 21:00, then clearing.
          </h2>
        </div>
      }
    >
      <img
        src={landscape("otaru-harbour", { width: 1440, height: 720, mood: "dusk" })}
        alt="Hills above Otaru at dusk"
        className="size-full object-cover"
      />
    </RainOnGlass>
  );
}
