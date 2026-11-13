"use client";

import { TypedPhrases } from "@/components/miyuki-ui/typed-phrases";

const phrases = ["light snow from nine", "clear by midnight", "minus eleven at the summit"];

export default function TypedPhrasesDemo() {
  return (
    <p className="w-full max-w-4xl">
      <TypedPhrases
        className="font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.015em] text-foreground sm:text-[38px] sm:leading-[1.12]"
        prefix={<span className="text-muted-foreground">Tonight in Hakuba:</span>}
        phrases={phrases}
      />
    </p>
  );
}
