"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { GateTransition } from "@/components/miyuki-ui/gate-transition";

const journeys = {
  outbound: {
    title: "Outbound",
    date: "Fri 14 Feb",
    from: { time: "06:12", place: "Otaru" },
    to: { time: "06:52", place: "Sapporo" },
    train: "Rapid Airport 3704",
    seat: "Car 3 · Seat 11A",
    platform: "Platform 2",
  },
  return: {
    title: "Return",
    date: "Sun 16 Feb",
    from: { time: "18:40", place: "Sapporo" },
    to: { time: "19:21", place: "Otaru" },
    train: "Rapid Airport 3851",
    seat: "Car 4 · Seat 7D",
    platform: "Platform 5",
  },
};

type Leg = keyof typeof journeys;

export default function GateTransitionDemo() {
  const [leg, setLeg] = useState<Leg>("outbound");
  const j = journeys[leg];
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <GateTransition viewKey={leg} className="w-full">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <header className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{j.title}</h3>
            <p className="text-sm text-muted-foreground">{j.date}</p>
          </header>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-3xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {j.from.time}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{j.from.place}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-label="to" />
            <div className="text-right">
              <p className="font-display text-3xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {j.to.time}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{j.to.place}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-dashed border-border-strong pt-4 text-[13px]">
            <div>
              <dt className="text-muted-foreground">Train</dt>
              <dd className="mt-0.5 font-medium">{j.train}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seat</dt>
              <dd className="mt-0.5 font-medium">{j.seat}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">From</dt>
              <dd className="mt-0.5 font-medium">{j.platform}</dd>
            </div>
          </dl>
        </article>
      </GateTransition>
      <Button variant="secondary" onPress={() => setLeg(leg === "outbound" ? "return" : "outbound")}>
        {leg === "outbound" ? "Show return journey" : "Show outbound journey"}
      </Button>
    </div>
  );
}
