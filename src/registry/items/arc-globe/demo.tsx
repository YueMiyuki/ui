"use client";

import { ArcGlobe, type ArcGlobeArc } from "@/components/miyuki-ui/arc-globe";

const sapporo: [number, number] = [43.06, 141.35];
const tokyo: [number, number] = [35.68, 139.69];
const oslo: [number, number] = [59.91, 10.75];
const reykjavik: [number, number] = [64.15, -21.94];
const vancouver: [number, number] = [49.28, -123.12];
const zurich: [number, number] = [47.38, 8.54];
const queenstown: [number, number] = [-45.03, 168.66];
const santiago: [number, number] = [-33.45, -70.67];

const arcs: ArcGlobeArc[] = [
  { from: sapporo, to: vancouver },
  { from: tokyo, to: queenstown },
  { from: sapporo, to: oslo },
  { from: reykjavik, to: vancouver },
  { from: zurich, to: oslo },
  { from: santiago, to: queenstown },
  { from: tokyo, to: zurich },
  { from: vancouver, to: santiago },
];

export default function ArcGlobeDemo() {
  return (
    <div className="relative size-full overflow-hidden">
      <ArcGlobe arcs={arcs} initialRotation={[160, 26]} className="absolute inset-x-0 top-[13%] -bottom-[5%]" />
      <div className="relative max-w-[26rem] px-6 pt-6 sm:px-8 sm:pt-8">
        <h2 className="font-display text-3xl leading-[1.08] font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
          Snow reports from 41 countries
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">Updated hourly from 1,284 stations.</p>
      </div>
    </div>
  );
}
