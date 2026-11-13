"use client";

import { VerticalText } from "@/components/miyuki-ui/vertical-text";
import { landscape } from "@/registry/lib/art";

const passage = [
  "Snow on the Kiso road, 14 February.",
  "“The pass shuts at 16:00,” the innkeeper says.",
  "By morning, 38 cm and a clear sky over Ontake.",
];

export default function VerticalTextDemo() {
  return (
    <div className="flex w-full max-w-[600px] overflow-clip rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative w-[34%] shrink-0 sm:w-[42%]">
        <img
          src={landscape("kiso-pass", { width: 360, height: 760, mood: "snow" })}
          alt="A snowy pass between dark pines under a pale sky"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-8 px-5 pt-10 pb-6 sm:px-9">
        <div className="flex flex-row-reverse items-start gap-5 sm:gap-8">
          <VerticalText
            latin="upright"
            className="font-display text-[40px] leading-none font-semibold tracking-[-0.36em] sm:text-[52px]"
          >
            KISO
          </VerticalText>
          <VerticalText reveal gap="0.95em" className="text-[15px] leading-[1.7] sm:text-[17px]">
            {passage}
          </VerticalText>
        </div>
        <p className="text-xs text-muted-foreground">Narai-juku, first bus 08:40</p>
      </div>
    </div>
  );
}
