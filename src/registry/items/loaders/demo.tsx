"use client";

import {
  LoaderBars,
  LoaderCrystal,
  LoaderGrid,
  LoaderRipple,
  LoaderText,
  LoaderWave,
} from "@/components/miyuki-ui/loaders";

const items = [
  { name: "Bars", node: <LoaderBars size={32} label="Loading tide levels" /> },
  { name: "Wave", node: <LoaderWave size={32} label="Loading swell forecast" /> },
  { name: "Crystal", node: <LoaderCrystal size={32} label="Loading snow report" /> },
  { name: "Ripple", node: <LoaderRipple size={32} label="Loading harbour cams" /> },
  { name: "Grid", node: <LoaderGrid size={32} label="Loading lift status" /> },
  { name: "Text", node: <LoaderText size={15}>Reading the forecast</LoaderText> },
];

export default function LoadersDemo() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {items.map(({ name, node }) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div className="grid h-10 place-items-center">{node}</div>
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}
