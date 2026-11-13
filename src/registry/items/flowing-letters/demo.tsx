"use client";

import { FlowingLetters } from "@/components/miyuki-ui/flowing-letters";

export default function FlowingLettersDemo() {
  return (
    <div className="@container flex w-full max-w-3xl flex-col items-center text-center">
      <h2 className="font-display text-[clamp(48px,18cqi,120px)] leading-none font-extrabold tracking-[-0.025em]">
        <FlowingLetters text="Meltwater" />
      </h2>
      <p className="mt-4 max-w-sm text-base text-muted-foreground">
        Spring runoff from the Hakuba valley, gauged every hour from April to June.
      </p>
    </div>
  );
}
