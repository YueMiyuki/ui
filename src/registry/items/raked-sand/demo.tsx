"use client";

import { Clock, CupSoda } from "lucide-react";
import { RakedSand } from "@/components/miyuki-ui/raked-sand";

const STONE =
  "absolute flex items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground shadow-md bg-[radial-gradient(90%_120%_at_32%_22%,var(--card)_35%,color-mix(in_oklab,var(--muted)_60%,color-mix(in_oklab,var(--brand)_8%,var(--card))))] dark:bg-[radial-gradient(90%_120%_at_32%_22%,var(--accent),var(--card))]";

export default function RakedSandDemo() {
  return (
    <RakedSand className="size-full">
      <div data-stone className={`${STONE} top-[18%] left-[8%] h-24 w-40 sm:left-[17%] sm:h-28 sm:w-48`}>
        <CupSoda className="size-4 text-muted-foreground" aria-hidden="true" />
        Tea, 15:00
      </div>
      <div data-stone className={`${STONE} right-[6%] bottom-[16%] h-20 w-52 sm:right-[15%] sm:h-24 sm:w-60`}>
        <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
        Garden closes 17:00
      </div>
    </RakedSand>
  );
}
