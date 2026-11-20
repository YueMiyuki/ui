"use client";

import { Murmuration } from "@/components/miyuki-ui/murmuration";

export default function MurmurationDemo() {
  return (
    <Murmuration className="size-full">
      <div className="absolute top-8 left-8 max-w-[22rem] pr-8 sm:top-11 sm:left-11">
        <h2 className="font-display text-3xl leading-[1.06] font-semibold tracking-[-0.03em] text-balance sm:text-[2.6rem]">
          Dusk over the reed beds, 16:42.
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground">Lake Izunuma, 14 November</p>
      </div>
    </Murmuration>
  );
}
