"use client";

import { KintsugiCard } from "@/components/miyuki-ui/kintsugi-card";

export default function KintsugiCardDemo() {
  return (
    <KintsugiCard seed={12} className="flex h-[420px] w-full max-w-[360px] flex-col justify-between p-8">
      <div>
        <h3 className="font-display text-5xl leading-[1.05] font-semibold tracking-[-0.03em]">Kintsugi</h3>
        <p className="mt-4 max-w-[15rem] text-lg leading-snug text-balance">
          The bowl is worth more for having been broken.
        </p>
      </div>
      <p className="text-[13px] text-muted-foreground">Kanazawa, 1781</p>
    </KintsugiCard>
  );
}
