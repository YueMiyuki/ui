"use client";

import { TideText } from "@/components/miyuki-ui/tide-text";

export default function TideTextScrollDemo() {
  return (
    <div className="h-[360px] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card">
      <div className="flex h-[300px] items-end justify-center pb-6 text-sm text-muted-foreground">Scroll down</div>
      <div className="flex justify-center px-6 py-10">
        <h2 className="font-display text-[44px] leading-none font-semibold tracking-[-0.03em] sm:text-[72px]">
          <TideText>Spring tide</TideText>
        </h2>
      </div>
      <p className="mx-auto h-[420px] max-w-sm px-6 text-center text-sm text-muted-foreground">
        Otaru harbour, 2.1 m above chart datum at 06:42. The level follows the headline up the panel.
      </p>
    </div>
  );
}
