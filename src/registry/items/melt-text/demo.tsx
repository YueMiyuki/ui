"use client";

import { MeltText } from "@/components/miyuki-ui/melt-text";

export default function MeltTextDemo() {
  return (
    <div className="flex flex-col items-center gap-10 text-center">
      <MeltText className="font-display text-[96px] leading-none font-extrabold tracking-[-0.035em] text-brand sm:text-[140px]">
        March
      </MeltText>
      <p className="text-sm text-muted-foreground">Hover to start the thaw.</p>
    </div>
  );
}
