"use client";

import type { LucideIcon } from "lucide-react";
import { BedDouble, Snowflake, TrafficCone, TriangleAlert, Wind } from "lucide-react";
import { EdgeGlint } from "@/components/miyuki-ui/edge-glint";
import { cn } from "@/lib/utils";

const cells: { title: string; text: string; icon: LucideIcon; className: string }[] = [
  {
    title: "Avalanche bulletins",
    text: "Considerable above 1,800 m on north and east slopes. Next issue at 17:00.",
    icon: TriangleAlert,
    className: "md:col-span-2",
  },
  {
    title: "Summit wind",
    text: "Gusts to 64 km/h on the ridge after noon.",
    icon: Wind,
    className: "",
  },
  {
    title: "Snow depth",
    text: "182 cm at the summit station, with 34 cm of new snow since Monday.",
    icon: Snowflake,
    className: "md:row-span-2",
  },
  {
    title: "Road closures",
    text: "Route 406 shut past Kamishiro until the plough is through.",
    icon: TrafficCone,
    className: "",
  },
  {
    title: "Hut availability",
    text: "Eleven bunks free at Tengu-no-Atama for Saturday night.",
    icon: BedDouble,
    className: "sm:col-span-2",
  },
];

export default function EdgeGlintDemo() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2">
      {cells.map(({ title, text, icon: Icon, className }) => (
        <article
          key={title}
          className={cn(
            "relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 md:min-h-40",
            className,
          )}
        >
          <EdgeGlint blur={6} />
          <Icon className="size-5 text-brand-strong" strokeWidth={1.75} aria-hidden="true" />
          <div className="mt-6">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
