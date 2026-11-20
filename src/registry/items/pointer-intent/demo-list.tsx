"use client";

import { IntentTrace, PointerIntent } from "@/components/miyuki-ui/pointer-intent";

const stations = [
  { name: "Otaru", depth: 86 },
  { name: "Hakuba", depth: 214 },
  { name: "Nozawa", depth: 192 },
  { name: "Shirakawa", depth: 131 },
  { name: "Aomori", depth: 157 },
  { name: "Lake Tōya", depth: 48 },
  { name: "Niseko", depth: 263 },
  { name: "Kiso", depth: 74 },
];

export default function PointerIntentListDemo() {
  return (
    <PointerIntent className="w-64 rounded-xl border border-border bg-card p-1.5 shadow-sm">
      <p className="px-2.5 pt-1.5 pb-1 text-xs text-muted-foreground">Snow depth this morning</p>
      {stations.map((s) => (
        <button
          key={s.name}
          type="button"
          data-intent-target
          className="flex h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring data-[aim]:bg-accent data-[intent]:bg-brand-soft"
        >
          {s.name}
          <span className="text-xs text-muted-foreground tabular-nums">{s.depth} cm</span>
        </button>
      ))}
      <IntentTrace />
    </PointerIntent>
  );
}
