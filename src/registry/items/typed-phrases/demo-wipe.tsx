"use client";

import { TypedPhrases } from "@/components/miyuki-ui/typed-phrases";

const phrases = ["Yoichi 06:31", "Niseko 07:48", "Oshamambe 09:15", "Hakodate 11:40"];

export default function TypedPhrasesWipeDemo() {
  return (
    <div className="w-full max-w-xl">
      <p className="text-sm text-muted-foreground">The 06:02 from Otaru calls at</p>
      <p className="mt-2">
        <TypedPhrases
          mode="wipe"
          className="font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.015em] text-foreground tabular-nums sm:text-[36px]"
          phrases={phrases}
          typeSpeed={45}
          pause={1800}
        />
      </p>
    </div>
  );
}
