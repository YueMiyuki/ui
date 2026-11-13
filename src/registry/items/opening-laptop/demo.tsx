"use client";

import { Snowflake } from "lucide-react";
import { OpeningLaptop } from "@/components/miyuki-ui/opening-laptop";
import { landscape } from "@/registry/lib/art";

const notes = [
  ["Snow depth", "Measured at 212 stakes and updated every hour, with the overnight change beside each one."],
  ["Wind", "Gusts at the ridge stations, so you know which lifts are likely to stop before you queue."],
  ["Lifts", "Open, on hold or closed for all 94 lifts across the eleven resorts, straight from the operators."],
];

export default function OpeningLaptopDemo() {
  return (
    <div>
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-sm">
          <span className="font-semibold">Hoshizora Weather</span>
          <span className="text-muted-foreground">Range view</span>
        </div>
      </header>

      <OpeningLaptop
        src={landscape("range-view", { mood: "day", width: 1440, height: 880 })}
        alt="The Northern Alps under fresh snow, seen across the valley"
        title={
          <>
            <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-5xl">
              The whole range on one screen
            </h2>
            <p className="mt-3 text-base text-muted-foreground">Snow, wind and lifts for every valley, side by side.</p>
          </>
        }
        badge={
          <span className="grid size-9 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm">
            <Snowflake className="size-4" aria-hidden="true" />
          </span>
        }
      />

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pt-8 pb-24 sm:grid-cols-3">
        {notes.map(([title, text]) => (
          <div key={title}>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm/6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
