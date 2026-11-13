"use client";

import { OrigamiCard } from "@/components/miyuki-ui/origami-card";

export default function OrigamiCardDemo() {
  return (
    <OrigamiCard aria-label="Folded invitation" tone="water">
      <div className="flex size-full flex-col justify-between p-7">
        <div>
          <p className="text-sm opacity-75">Élodie Martin invites you to</p>
          <p className="mt-2 font-display text-[27px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            Tea at the Kiso post house
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="opacity-75">When</dt>
          <dd className="font-medium">Saturday 22 November, 15:00</dd>
          <dt className="opacity-75">Where</dt>
          <dd className="font-medium">Narai-juku, upper street</dd>
          <dt className="opacity-75">Served</dt>
          <dd className="font-medium">Gyokuro and chestnut sweets</dd>
        </dl>
        <p className="text-[13px] opacity-75">Reply by Thursday, so we can warm enough cups.</p>
      </div>
    </OrigamiCard>
  );
}
