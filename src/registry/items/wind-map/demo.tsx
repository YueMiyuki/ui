"use client";

import { WindMap } from "@/components/miyuki-ui/wind-map";
import { topo } from "@/registry/lib/art";

const CONTOURS = `url("${topo("ishikari", { width: 1200, height: 650, color: "#000" })}")`;

export default function WindMapDemo() {
  return (
    <WindMap className="size-full">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-border-strong dark:bg-border"
        style={{
          maskImage: CONTOURS,
          WebkitMaskImage: CONTOURS,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "center",
        }}
      />
      <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-popover/85 px-3 py-2.5 shadow-sm backdrop-blur-sm">
        <p className="text-[13px] font-medium">Wind at 850 hPa</p>
        <div className="mt-2 h-1.5 w-36 rounded-full bg-linear-to-r from-brand/25 via-brand to-[color-mix(in_oklab,var(--brand)_45%,var(--foreground))] dark:to-[color-mix(in_oklab,var(--brand)_38%,white)]" />
        <div className="mt-1 flex w-36 justify-between text-xs text-muted-foreground tabular-nums">
          <span>0</span>
          <span>40</span>
          <span>80 km/h</span>
        </div>
      </div>
    </WindMap>
  );
}
