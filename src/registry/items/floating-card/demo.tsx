"use client";

import { Button } from "@/components/miyuki-ui/button";
import { FloatingCard } from "@/components/miyuki-ui/floating-card";
import { landscape } from "@/registry/lib/art";

export default function FloatingCardDemo() {
  return (
    <div className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        <FloatingCard tone="water" containerClassName="min-h-[15rem] @2xl:col-span-2 @2xl:min-h-[19rem]">
          <div className="relative z-10 max-w-[19rem]">
            <h3 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.015em] text-balance">
              Forecasts that read the mountain, not the valley
            </h3>
            <p className="mt-3 text-sm/6 text-foreground/85">
              Wind, freezing level and new snow at the summit, the mid station and the base, every hour.
            </p>
          </div>
          <img
            src={landscape("wobble-ridge", { mood: "snow", width: 640, height: 440 })}
            alt=""
            className="absolute -right-12 -bottom-10 hidden w-[19rem] rotate-[-7deg] rounded-xl border border-foreground/15 shadow-2xl @lg:block"
          />
        </FloatingCard>

        <FloatingCard tone="ink" containerClassName="min-h-[13rem] @2xl:min-h-[19rem]">
          <h3 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.015em] text-balance">
            No ads. No noise.
          </h3>
          <p className="mt-3 max-w-[16rem] text-sm/6 text-foreground/85">
            One forecast a morning, sent at 05:30, and nothing else unless the lifts close.
          </p>
        </FloatingCard>

        <FloatingCard tone="wisteria" containerClassName="min-h-[12rem] @2xl:col-span-3">
          <div className="flex h-full flex-col items-start justify-between gap-6 @xl:flex-row">
            <div className="max-w-md">
              <h3 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.015em] text-balance">
                Powder alerts for the 38 resorts you actually ski
              </h3>
              <p className="mt-3 text-sm/6 text-foreground/85">
                Pick them once. We tell you the evening before a deep morning.
              </p>
            </div>
            <Button variant="secondary" size="sm" className="light shrink-0 @xl:self-end">
              Choose resorts
            </Button>
          </div>
        </FloatingCard>
      </div>
    </div>
  );
}
