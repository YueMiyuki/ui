"use client";

import { FoilTicket } from "@/components/miyuki-ui/foil-ticket";
import { landscape } from "@/registry/lib/art";

export default function FoilTicketDemo() {
  return (
    <FoilTicket className="aspect-[5/7] w-full max-w-75">
      <div className="flex h-full flex-col">
        <img
          src={landscape("nozawa-ticket", { mood: "day", width: 600, height: 560 })}
          alt="Ski runs above Nozawa Onsen under clear sky"
          draggable={false}
          className="h-2/3 w-full object-cover"
        />
        <div className="h-7 shrink-0" />
        <div className="flex min-h-0 flex-1 flex-col justify-between px-5 pt-2.5 pb-4">
          <div>
            <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em]">
              <a href="#nozawa-day-ticket" className="outline-none after:absolute after:inset-0">
                Nozawa Onsen
              </a>
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Day ticket, 14 February 2027</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">N7-2048</p>
        </div>
      </div>
    </FoilTicket>
  );
}
