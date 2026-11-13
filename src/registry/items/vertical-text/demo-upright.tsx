"use client";

import { VerticalText } from "@/components/miyuki-ui/vertical-text";

export default function VerticalTextUprightDemo() {
  return (
    <div className="flex items-start gap-10">
      <div className="rounded-xl border border-border bg-card px-6 pt-8 pb-14 shadow-sm">
        <VerticalText latin="upright" gap="0.5em" className="font-display text-[34px] leading-none font-semibold">
          {["YUKIMI", "TEA, 1962."]}
        </VerticalText>
      </div>
      <VerticalText latin="upright" gap="0.8em" className="pt-8 text-lg leading-none text-muted-foreground">
        {["OPEN 10–18", "(CLOSED WED)"]}
      </VerticalText>
    </div>
  );
}
