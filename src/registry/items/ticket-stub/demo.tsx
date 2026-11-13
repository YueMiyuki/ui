"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { TicketStub } from "@/components/miyuki-ui/ticket-stub";

export default function TicketStubDemo() {
  const [issue, setIssue] = useState(1);
  const [torn, setTorn] = useState(false);
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <TicketStub
        key={issue}
        aria-label="Rail ticket, Sapporo to Otaru"
        onTear={() => setTorn(true)}
        stub={
          <div className="flex flex-col items-center gap-3">
            <span className="rotate-180 text-xs font-medium opacity-80 [writing-mode:vertical-rl]">Admit one</span>
            <span className="font-display text-lg leading-none font-semibold tracking-[-0.02em]">11A</span>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium">Rapid Airport, Hakodate Line</span>
            <span className="shrink-0 tabular-nums opacity-80">No. 20413</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div>
              <p className="font-display text-[22px] leading-none font-semibold tracking-[-0.03em] sm:text-[26px]">
                Sapporo
              </p>
              <p className="mt-1.5 text-sm tabular-nums opacity-80">06:12</p>
            </div>
            <div aria-hidden="true" className="mb-6 flex flex-1 items-center">
              <span className="size-1.5 rounded-full bg-current" />
              <span className="h-px flex-1 bg-current opacity-35" />
              <span className="size-1.5 rounded-full border border-current" />
            </div>
            <div className="text-right">
              <p className="font-display text-[22px] leading-none font-semibold tracking-[-0.03em] sm:text-[26px]">
                Otaru
              </p>
              <p className="mt-1.5 text-sm tabular-nums opacity-80">06:44</p>
            </div>
          </div>
          <dl className="flex gap-5 text-xs">
            {[
              ["Car", "3"],
              ["Seat", "11A"],
              ["Fare", "¥750"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="opacity-80">{k}</dt>
                <dd className="text-sm font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </TicketStub>
      {torn ? (
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            setTorn(false);
            setIssue((n) => n + 1);
          }}
        >
          Issue a new ticket
        </Button>
      ) : (
        <p className="flex h-8 items-center text-sm text-muted-foreground">Pull the stub to tear it.</p>
      )}
    </div>
  );
}
