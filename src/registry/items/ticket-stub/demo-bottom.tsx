"use client";

import { TicketStub } from "@/components/miyuki-ui/ticket-stub";

export default function TicketStubBottomDemo() {
  return (
    <TicketStub
      side="bottom"
      aria-label="Bath ticket, Ōyu, Nozawa"
      className="w-[260px]"
      stub={
        <div className="flex w-full items-center justify-between gap-3 px-1 text-xs">
          <span className="font-medium">Admit one</span>
          <span className="tabular-nums opacity-80">No. 0718</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium opacity-80">Nozawa Onsen</p>
        <p className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em]">Ōyu bath</p>
        <div className="flex justify-between text-sm">
          <span>Adult</span>
          <span className="tabular-nums">¥500</span>
        </div>
        <p className="text-xs opacity-80">Open 5:00 to 23:00.</p>
      </div>
    </TicketStub>
  );
}
