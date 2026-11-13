"use client";

import { ArrivingText } from "@/components/miyuki-ui/arriving-text";

export default function ArrivingTextDemo() {
  return (
    <div className="w-full max-w-2xl">
      <ArrivingText
        className="font-display text-[22px] leading-[1.4] font-semibold tracking-[-0.01em] text-pretty text-foreground sm:text-[28px] sm:leading-[1.35]"
        text="Snow fell on Otaru all night, and by morning the canal had gone quiet. The first train left at six. Nobody on it said a word."
      />
    </div>
  );
}
