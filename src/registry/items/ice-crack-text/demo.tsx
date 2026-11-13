"use client";

import { IceCrackText } from "@/components/miyuki-ui/ice-crack-text";

export default function IceCrackTextDemo() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="cursor-default font-display text-[96px] leading-none font-extrabold tracking-[-0.02em] select-none sm:text-[150px]">
        <IceCrackText seed="thaw">THAW</IceCrackText>
      </h2>
      <p className="text-sm text-muted-foreground">Hover to crack the ice. Click to break it.</p>
    </div>
  );
}
