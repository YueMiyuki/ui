"use client";

import { useState } from "react";
import { LakeFreeze } from "@/components/miyuki-ui/lake-freeze";
import { Switch } from "@/components/miyuki-ui/switch";
import { topo } from "@/registry/lib/art";

export default function LakeFreezeDemo() {
  const [frozen, setFrozen] = useState(true);
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-2 shadow-sm">
      <LakeFreeze frozen={frozen} className="h-52 rounded-xl">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,color-mix(in_oklab,var(--brand)_26%,var(--card)),color-mix(in_oklab,var(--brand)_55%,var(--card))_70%,color-mix(in_oklab,var(--brand-strong)_70%,var(--card)))] dark:bg-[radial-gradient(120%_90%_at_30%_20%,color-mix(in_oklab,var(--brand)_34%,var(--background)),color-mix(in_oklab,var(--brand)_18%,var(--background))_70%,var(--background))]" />
        <img
          src={topo("suwa", { width: 760, height: 420, color: "#ffffff" })}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-45 mix-blend-soft-light dark:opacity-30"
        />
      </LakeFreeze>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em]">Lake Suwa</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">Shore station, 06:00</p>
          </div>
          <p className="font-display text-3xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {frozen ? "−6.4°" : "2.1°"}
          </p>
        </div>
        <Switch
          className="mt-5 border-t border-border pt-4"
          isSelected={frozen}
          onChange={setFrozen}
          description={frozen ? "Ice 4 cm and thickening." : "Open water across the lake."}
        >
          Below zero
        </Switch>
      </div>
    </div>
  );
}
