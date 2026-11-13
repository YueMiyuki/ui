"use client";

import { useRef } from "react";
import { DepthGauge } from "@/components/miyuki-ui/depth-gauge";

const stops = [
  {
    depth: "0 m",
    title: "Off the breakwater",
    text: "Kit up on the steps by the old warehouses. In March the water is three degrees and the visibility is the best of the year.",
  },
  {
    depth: "6 m",
    title: "The kelp line",
    text: "A band of kelp grows on the harbour wall, thick enough to hide the rock. Look for rockfish sheltering at its foot.",
  },
  {
    depth: "12 m",
    title: "The mooring blocks",
    text: "Concrete blocks from the old ferry berth, each one covered in anemones. Keep off the chains; they still hold buoys above you.",
  },
  {
    depth: "18 m",
    title: "Sand and silt",
    text: "The wall gives way to a slope of grey silt. Fin gently or you will lose the light in a cloud of it.",
  },
  {
    depth: "24 m",
    title: "The end of the dive",
    text: "A wreck of a herring boat lies on its side at the foot of the slope. Turn here and follow the wall back up.",
  },
];

export default function DepthGaugePanelDemo() {
  const panel = useRef<HTMLDivElement>(null);
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
      <div
        ref={panel}
        className="h-[440px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background shadow-sm"
      >
        <DepthGauge container={panel} max={24} aria-label="Dive depth" className="mr-2" />
        <article className="px-5 pt-6 pr-24 pb-10 sm:px-7 sm:pr-24">
          <p className="text-[13px] text-muted-foreground">Dive log · Otaru harbour</p>
          <h2 className="mt-1.5 font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">
            Along the north breakwater
          </h2>
          <div className="mt-8 space-y-14">
            {stops.map((stop) => (
              <section key={stop.title} className="min-h-40">
                <p className="text-sm font-medium text-brand-strong tabular-nums">{stop.depth}</p>
                <h3 className="mt-1 text-base font-semibold">{stop.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">{stop.text}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
