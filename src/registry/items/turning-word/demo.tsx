"use client";

import { TurningWord } from "@/components/miyuki-ui/turning-word";

export default function TurningWordDemo() {
  return (
    <div className="@container flex w-full flex-col items-center gap-4 text-center">
      <h2 className="font-display text-[38px] leading-[1.2] font-bold tracking-[-0.03em] text-foreground @lg:text-5xl @2xl:text-[56px] @2xl:leading-[1.15]">
        <span className="block @lg:inline">Make it </span>
        <TurningWord words={["colder", "brighter", "slower", "deeper"]} />
      </h2>
      <p className="max-w-sm text-base text-balance text-muted-foreground">
        Grade your winter footage with presets shot in Hakuba and Otaru.
      </p>
    </div>
  );
}
