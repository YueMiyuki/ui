"use client";

import { CloudSnow, Droplet, type LucideIcon, Snowflake } from "lucide-react";
import { useState } from "react";
import { DotFlood } from "@/components/miyuki-ui/dot-flood";
import { cn } from "@/lib/utils";

const cards: { word: string; line: string; icon: LucideIcon; colors: string[] }[] = [
  { word: "Snow", line: "Falls at −2°C.", icon: CloudSnow, colors: ["var(--brand)", "var(--chart-1)"] },
  { word: "Ice", line: "Holds until March.", icon: Snowflake, colors: ["var(--chart-2)"] },
  { word: "Water", line: "Runs to the sea.", icon: Droplet, colors: ["var(--chart-3)"] },
];

function RevealCard({ word, line, icon: Icon, colors }: (typeof cards)[number]) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;

  return (
    <a
      href={`#${word.toLowerCase()}`}
      onClick={(event) => event.preventDefault()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="relative isolate flex h-[360px] w-full max-w-[280px] items-center justify-center overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <DotFlood
        active={active}
        colors={colors}
        origin="pointer"
        className="[mask-image:radial-gradient(ellipse_58%_34%_at_50%_50%,rgb(0_0_0/0.1)_35%,#000)]"
      />
      <div className="relative grid grid-rows-[1.75rem_auto_1.75rem] items-center justify-items-center gap-3 text-center">
        <Icon
          aria-hidden="true"
          strokeWidth={1.5}
          className={cn(
            "size-7 text-muted-foreground transition-[opacity,translate] duration-200 ease-settle",
            active && "-translate-y-1 opacity-0",
          )}
        />
        <span className="font-display text-4xl leading-none font-semibold tracking-[-0.02em]">{word}</span>
        <span
          className={cn(
            "translate-y-1 text-sm font-medium opacity-0 transition-[opacity,translate] duration-200 ease-settle",
            active && "translate-y-0 opacity-100",
          )}
        >
          {line}
        </span>
      </div>
    </a>
  );
}

export default function DotFloodDemo() {
  return (
    <div className="grid w-full max-w-[888px] grid-cols-1 justify-items-center gap-6 sm:grid-cols-3">
      {cards.map((card) => (
        <RevealCard key={card.word} {...card} />
      ))}
    </div>
  );
}
