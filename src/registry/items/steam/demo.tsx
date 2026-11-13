"use client";

import { Steam } from "@/components/miyuki-ui/steam";

export default function SteamDemo() {
  return (
    <Steam className="flex size-full items-end justify-center px-6 pb-10 sm:pb-12">
      <article className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Kiso Fukushima</p>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-strong">
            Open now
          </span>
        </div>
        <h2 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.03em]">
          Outdoor bath, <span className="tabular-nums">41°C</span>
        </h2>
        <p className="mt-2 text-sm">
          Open <span className="tabular-nums">06:00–09:30</span> and <span className="tabular-nums">15:00–23:00</span>
        </p>
        <p className="mt-5 border-t border-border pt-4 text-sm text-pretty">
          Fed by the spring above the inn and cooled only by the river air. Towels at the front desk.
        </p>
      </article>
    </Steam>
  );
}
