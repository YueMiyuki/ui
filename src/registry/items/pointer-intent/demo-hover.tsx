"use client";

import { useRef, useState } from "react";
import { PointerIntent } from "@/components/miyuki-ui/pointer-intent";
import { cn } from "@/lib/utils";

const trips = [
  { name: "Otaru", line: "Canal walk and glassworks", detail: "32 min from Sapporo" },
  { name: "Hakuba", line: "Ridge trails above the valley", detail: "Last gondola at 16:30" },
  { name: "Kiso", line: "Post towns on the old road", detail: "Walk Magome to Tsumago" },
  { name: "Lake Tōya", line: "Island cruise and lakeside baths", detail: "Fireworks every night" },
];

const plain = {
  card: "group-hover:border-border-strong group-hover:shadow-sm motion-safe:group-hover:-translate-y-0.5",
  detail: "group-hover:translate-y-0 group-hover:opacity-100",
};
const early = {
  card: "group-data-[aim]:border-border-strong group-data-[aim]:shadow-sm motion-safe:group-data-[aim]:-translate-y-0.5",
  detail: "group-data-[aim]:translate-y-0 group-data-[aim]:opacity-100",
};

function Card({ trip, look }: { trip: (typeof trips)[number]; look: typeof plain }) {
  return (
    <span
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-xs transition-[translate,scale,border-color,box-shadow] duration-200 ease-in-out group-active:scale-[0.98]",
        look.card,
      )}
    >
      <span className="text-sm font-medium">{trip.name}</span>
      <span className="mt-0.5 text-[13px] text-muted-foreground">{trip.line}</span>
      <span
        className={cn(
          "mt-3 translate-y-1 text-xs font-medium text-brand-strong opacity-0 transition-[translate,opacity] duration-200 ease-in-out motion-reduce:translate-y-0",
          look.detail,
        )}
      >
        {trip.detail}
      </span>
    </span>
  );
}

const cell = "group block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

export default function PointerIntentHoverDemo() {
  const [note, setNote] = useState("The second row starts its hover while the pointer is on its way");
  const aimed = useRef<{ el: Element; at: number } | null>(null);

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-2 text-[13px] text-muted-foreground">Plain hover</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {trips.map((t) => (
          <button key={t.name} type="button" className={cell}>
            <Card trip={t} look={plain} />
          </button>
        ))}
      </div>
      <p className="mt-6 mb-2 text-[13px] text-muted-foreground">With pointer intent</p>
      <PointerIntent
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        onAim={(el) => {
          aimed.current = { el, at: performance.now() };
        }}
      >
        {trips.map((t) => (
          <button
            key={t.name}
            type="button"
            data-intent-target
            className={cell}
            onPointerEnter={(e) => {
              const a = aimed.current;
              if (!a || a.el !== e.currentTarget) return;
              const ms = Math.round(performance.now() - a.at);
              if (ms > 0) setNote(`Began ${ms} ms before the pointer arrived`);
            }}
          >
            <Card trip={t} look={early} />
          </button>
        ))}
      </PointerIntent>
      <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">{note}</p>
    </div>
  );
}
