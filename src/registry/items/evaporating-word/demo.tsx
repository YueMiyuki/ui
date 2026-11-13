"use client";

import { EvaporatingWord } from "@/components/miyuki-ui/evaporating-word";

export default function EvaporatingWordDemo() {
  return (
    <div className="@container w-full">
      <h2 className="text-center font-display text-[32px] leading-[1.15] font-semibold tracking-[-0.025em] text-foreground @xl:text-[40px] @3xl:text-5xl @3xl:leading-[1.1]">
        <span className="block @xl:inline">Plan routes that are </span>
        <EvaporatingWord className="text-brand-strong" words={["safer", "shorter", "quieter", "yours"]} />
      </h2>
    </div>
  );
}
